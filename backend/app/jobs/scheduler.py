import logging
from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.date import DateTrigger

from app.database import SessionLocal
from app.models.models import Schedule, ScheduleType, PostType, Post, PostStatus
from app.services.post_service import PostService
from app.services.ai_service import AIService
from app.services.template_service import TemplateService
from app.services.analytics_service import AnalyticsService
from app.utils.time_utils import parse_cron_expression

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def execute_scheduled_post(schedule_id: int) -> None:
    """Execute a scheduled post job."""
    db = SessionLocal()
    try:
        schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
        if not schedule or not schedule.is_active:
            logger.info("Schedule %d is inactive or not found, skipping.", schedule_id)
            return

        content = _generate_content(schedule, db)
        if not content:
            logger.error("Failed to generate content for schedule %d", schedule_id)
            return

        post_service = PostService(db)
        post = post_service.create_post(
            type(
                "PostCreate",
                (),
                {
                    "content": content,
                    "status": "draft",
                    "post_type": schedule.post_type.value if schedule.post_type else "original",
                    "schedule_id": schedule.id,
                },
            )()
        )

        # Attempt to publish
        try:
            post_service.publish_post(post.id)
            logger.info(
                "Scheduled post published: schedule=%d, post=%d", schedule_id, post.id
            )
        except Exception as exc:
            logger.error(
                "Failed to publish scheduled post: schedule=%d, error=%s",
                schedule_id,
                exc,
            )

        # Deactivate one-time schedules after execution
        if schedule.schedule_type == ScheduleType.once:
            schedule.is_active = False
            db.commit()

    except Exception as exc:
        logger.error("Error executing schedule %d: %s", schedule_id, exc)
    finally:
        db.close()


def _generate_content(schedule: Schedule, db) -> str:
    """Generate post content based on the schedule configuration."""
    if schedule.post_type == PostType.ai_generated and schedule.ai_prompt:
        ai_service = AIService()
        posts = ai_service.generate_posts(
            genre=schedule.ai_prompt,
            style="casual",
            count=1,
        )
        if posts:
            return posts[0]
        return ""

    if schedule.post_type == PostType.template and schedule.template_id:
        template_service = TemplateService(db)
        template = template_service.get_template(schedule.template_id)
        return template.content_pattern

    if schedule.ai_prompt:
        return schedule.ai_prompt

    return ""


def collect_analytics_job() -> None:
    """Periodic job to collect analytics for posted tweets."""
    db = SessionLocal()
    try:
        analytics_service = AnalyticsService(db)
        result = analytics_service.collect_analytics()
        logger.info("Analytics collection job completed: %s", result)
    except Exception as exc:
        logger.error("Analytics collection job failed: %s", exc)
    finally:
        db.close()


def sync_schedules() -> None:
    """Synchronize active schedules from the database to APScheduler."""
    db = SessionLocal()
    try:
        active_schedules = (
            db.query(Schedule).filter(Schedule.is_active == True).all()
        )

        # Get current APScheduler job IDs
        existing_job_ids = {job.id for job in scheduler.get_jobs()}
        schedule_job_ids = set()

        for schedule in active_schedules:
            job_id = f"schedule_{schedule.id}"
            schedule_job_ids.add(job_id)

            if job_id in existing_job_ids:
                continue

            if schedule.schedule_type == ScheduleType.recurring and schedule.cron_expression:
                try:
                    cron_parts = parse_cron_expression(schedule.cron_expression)
                    trigger = CronTrigger(
                        minute=cron_parts["minute"],
                        hour=cron_parts["hour"],
                        day=cron_parts["day"],
                        month=cron_parts["month"],
                        day_of_week=cron_parts["day_of_week"],
                    )
                    scheduler.add_job(
                        execute_scheduled_post,
                        trigger=trigger,
                        args=[schedule.id],
                        id=job_id,
                        name=f"Schedule: {schedule.name}",
                        replace_existing=True,
                    )
                    logger.info("Added recurring job: %s", job_id)
                except ValueError as exc:
                    logger.error(
                        "Invalid cron expression for schedule %d: %s",
                        schedule.id,
                        exc,
                    )

            elif schedule.schedule_type == ScheduleType.once and schedule.scheduled_at:
                if schedule.scheduled_at > datetime.utcnow():
                    trigger = DateTrigger(run_date=schedule.scheduled_at)
                    scheduler.add_job(
                        execute_scheduled_post,
                        trigger=trigger,
                        args=[schedule.id],
                        id=job_id,
                        name=f"Schedule: {schedule.name}",
                        replace_existing=True,
                    )
                    logger.info("Added one-time job: %s", job_id)

        # Remove jobs for deactivated or deleted schedules
        stale_jobs = existing_job_ids - schedule_job_ids - {"analytics_collector", "schedule_sync"}
        for job_id in stale_jobs:
            if job_id.startswith("schedule_"):
                scheduler.remove_job(job_id)
                logger.info("Removed stale job: %s", job_id)

    except Exception as exc:
        logger.error("Failed to sync schedules: %s", exc)
    finally:
        db.close()


def start_scheduler() -> None:
    """Start the background scheduler with default jobs."""
    if scheduler.running:
        logger.info("Scheduler is already running.")
        return

    # Add a periodic job to collect analytics every 6 hours
    scheduler.add_job(
        collect_analytics_job,
        CronTrigger(hour="*/6"),
        id="analytics_collector",
        name="Analytics Collector",
        replace_existing=True,
    )

    # Add a periodic job to sync schedules every 5 minutes
    scheduler.add_job(
        sync_schedules,
        CronTrigger(minute="*/5"),
        id="schedule_sync",
        name="Schedule Sync",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("Background scheduler started.")

    # Do an initial sync
    sync_schedules()


def shutdown_scheduler() -> None:
    """Shutdown the background scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Background scheduler shut down.")
