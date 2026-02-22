import logging
import random
from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.date import DateTrigger

from app.database import SessionLocal
from app.models.models import (
    Schedule,
    ScheduleType,
    PostType,
    Post,
    PostStatus,
    PostFormat,
    ImpressionPrediction,
    PostAnalytics,
)
from app.services.post_service import PostService
from app.services.ai_service import AIService
from app.services.template_service import TemplateService
from app.services.analytics_service import AnalyticsService
from app.services.persona_service import PersonaService
from app.services.strategy_service import StrategyService
from app.services.prediction_service import PredictionService
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

        content, post_format, thread_contents = _generate_content(schedule, db)
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
                    "post_format": post_format,
                    "persona_id": None,
                    "schedule_id": schedule.id,
                    "thread_contents": thread_contents,
                },
            )()
        )

        # Attempt to publish
        try:
            post_service.publish_post(post.id)
            logger.info(
                "Scheduled post published: schedule=%d, post=%d, format=%s",
                schedule_id, post.id, post_format,
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


def _generate_content(schedule: Schedule, db) -> tuple:
    """Generate post content based on the schedule configuration.

    Returns (content, post_format, thread_contents).
    """
    if schedule.post_type == PostType.ai_generated and schedule.ai_prompt:
        ai_service = AIService()
        persona_service = PersonaService(db)
        strategy_service = StrategyService(db)

        persona = persona_service.get_active_persona()
        strategy = strategy_service.get_active_strategy()

        # Determine format based on content_mix from strategy
        post_format = _pick_format_from_strategy(strategy)

        result = ai_service.generate_posts(
            genre=schedule.ai_prompt,
            style="casual",
            count=1,
            persona=persona,
            strategy=strategy,
            post_format=post_format,
            thread_length=5,
        )

        if post_format == "thread":
            threads = result.get("threads", [])
            if threads:
                return (threads[0][0] if threads[0] else "", "thread", threads[0])
            return ("", "thread", [])
        else:
            posts = result.get("posts", [])
            if posts:
                return (posts[0], post_format, None)
            return ("", post_format, None)

    if schedule.post_type == PostType.template and schedule.template_id:
        template_service = TemplateService(db)
        template = template_service.get_template(schedule.template_id)
        return (template.content_pattern, "tweet", None)

    if schedule.ai_prompt:
        return (schedule.ai_prompt, "tweet", None)

    return ("", "tweet", None)


def _pick_format_from_strategy(strategy) -> str:
    """Pick a post format based on the content_mix ratio from strategy."""
    if not strategy or not strategy.content_mix:
        return "tweet"

    content_mix = strategy.content_mix
    tweet_pct = content_mix.get("tweet", 70)
    thread_pct = content_mix.get("thread", 20)
    long_form_pct = content_mix.get("long_form", 10)

    total = tweet_pct + thread_pct + long_form_pct
    if total <= 0:
        return "tweet"

    roll = random.random() * total
    if roll < tweet_pct:
        return "tweet"
    elif roll < tweet_pct + thread_pct:
        return "thread"
    else:
        return "long_form"


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


def track_prediction_accuracy() -> None:
    """Periodic job to update prediction records with actual impression data."""
    db = SessionLocal()
    try:
        # Find predictions that have a post_id but no actual_impressions
        predictions = (
            db.query(ImpressionPrediction)
            .filter(
                ImpressionPrediction.post_id.isnot(None),
                ImpressionPrediction.actual_impressions.is_(None),
            )
            .all()
        )

        updated = 0
        for pred in predictions:
            # Get latest analytics for this post
            analytics = (
                db.query(PostAnalytics)
                .filter(PostAnalytics.post_id == pred.post_id)
                .order_by(PostAnalytics.collected_at.desc())
                .first()
            )
            if analytics and analytics.impressions > 0:
                pred.actual_impressions = analytics.impressions
                updated += 1

        db.commit()
        logger.info("Prediction accuracy tracking: updated %d records", updated)
    except Exception as exc:
        logger.error("Prediction accuracy tracking failed: %s", exc)
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
        system_jobs = {"analytics_collector", "schedule_sync", "prediction_tracker"}
        stale_jobs = existing_job_ids - schedule_job_ids - system_jobs
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

    # Add prediction accuracy tracking job every 12 hours
    scheduler.add_job(
        track_prediction_accuracy,
        CronTrigger(hour="*/12"),
        id="prediction_tracker",
        name="Prediction Accuracy Tracker",
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
