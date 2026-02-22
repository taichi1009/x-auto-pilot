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
from app.services.auto_pilot_service import AutoPilotService
from app.services.image_service import ImageService
from app.services.x_api import XApiService
from app.services.follow_service import FollowService
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


def auto_post_job() -> None:
    """Auto-pilot: generate and publish posts automatically."""
    db = SessionLocal()
    try:
        ap_service = AutoPilotService(db)
        if not ap_service.is_enabled():
            return
        if ap_service.get_setting("auto_post_enabled") != "true":
            return

        max_posts = int(ap_service.get_setting("auto_post_count") or "3")
        with_image = ap_service.get_setting("auto_post_with_image") == "true"

        # Check how many posts we've already made today
        from datetime import date
        today_start = datetime.combine(date.today(), datetime.min.time())
        today_count = (
            db.query(Post)
            .filter(
                Post.created_at >= today_start,
                Post.post_type == PostType.ai_generated,
            )
            .count()
        )
        if today_count >= max_posts:
            logger.info("Auto-post: daily limit reached (%d/%d)", today_count, max_posts)
            return

        persona_service = PersonaService(db)
        strategy_service = StrategyService(db)
        persona = persona_service.get_active_persona()
        strategy = strategy_service.get_active_strategy()

        if not strategy:
            logger.info("Auto-post: no active strategy, skipping")
            return

        post_format = _pick_format_from_strategy(strategy)

        ai_service = AIService()
        result = ai_service.generate_posts(
            genre=", ".join(strategy.content_pillars) if strategy.content_pillars else "general",
            style="casual",
            count=1,
            persona=persona,
            strategy=strategy,
            post_format=post_format,
            thread_length=5,
        )

        if post_format == "thread":
            threads = result.get("threads", [])
            content = threads[0][0] if threads and threads[0] else ""
            thread_contents = threads[0] if threads else []
        else:
            posts = result.get("posts", [])
            content = posts[0] if posts else ""
            thread_contents = None

        if not content:
            logger.warning("Auto-post: AI generation returned empty content")
            return

        post_service = PostService(db)
        post = post_service.create_post(
            type("PostCreate", (), {
                "content": content,
                "status": "draft",
                "post_type": "ai_generated",
                "post_format": post_format,
                "image_url": None,
                "persona_id": persona.id if persona else None,
                "schedule_id": None,
                "thread_contents": thread_contents,
            })()
        )

        # Generate and upload image if enabled
        media_ids = None
        image_path = None
        if with_image and post_format != "thread":
            try:
                image_service = ImageService()
                image_path = image_service.generate_image(
                    f"Create an eye-catching image for this social media post: {content[:200]}"
                )
                if image_path:
                    x_api = XApiService()
                    media_id = x_api.upload_media(image_path)
                    if media_id:
                        media_ids = [media_id]
                        post.image_url = image_path
                        db.commit()
            except Exception as exc:
                logger.warning("Auto-post: image generation failed: %s", exc)

        # Publish
        try:
            post_service.publish_post(post.id, media_ids=media_ids)
            logger.info("Auto-post: published post id=%d format=%s", post.id, post_format)
        except Exception as exc:
            logger.error("Auto-post: publish failed: %s", exc)
        finally:
            if image_path:
                ImageService().cleanup_image(image_path)

    except Exception as exc:
        logger.error("Auto-post job failed: %s", exc)
    finally:
        db.close()


def auto_follow_job() -> None:
    """Auto-pilot: discover and follow users based on keywords."""
    db = SessionLocal()
    try:
        ap_service = AutoPilotService(db)
        if not ap_service.is_enabled():
            return
        if ap_service.get_setting("auto_follow_enabled") != "true":
            return

        keywords_str = ap_service.get_setting("auto_follow_keywords")
        if not keywords_str.strip():
            logger.info("Auto-follow: no keywords configured, skipping")
            return

        daily_limit = int(ap_service.get_setting("auto_follow_daily_limit") or "10")
        keywords = [k.strip() for k in keywords_str.split(",") if k.strip()]

        follow_service = FollowService(db)
        x_api = XApiService()

        followed_count = 0
        for keyword in keywords:
            if followed_count >= daily_limit:
                break

            try:
                # Discover users
                users = x_api.search_users(keyword, max_results=10)
                for user_data in users:
                    if followed_count >= daily_limit:
                        break

                    # Check if already in targets
                    from app.models.models import FollowTarget
                    existing = (
                        db.query(FollowTarget)
                        .filter(FollowTarget.x_user_id == user_data["id"])
                        .first()
                    )
                    if existing:
                        continue

                    # Create follow target
                    target = FollowTarget(
                        x_user_id=user_data["id"],
                        x_username=user_data["username"],
                    )
                    db.add(target)
                    db.commit()
                    db.refresh(target)

                    # Execute follow
                    try:
                        follow_service.execute_follow(target.id)
                        followed_count += 1
                        logger.info(
                            "Auto-follow: followed @%s (%d/%d)",
                            user_data["username"], followed_count, daily_limit,
                        )
                        # Rate limit pause
                        import time
                        time.sleep(2)
                    except Exception as exc:
                        logger.warning("Auto-follow: failed to follow @%s: %s", user_data["username"], exc)

            except Exception as exc:
                logger.warning("Auto-follow: search failed for '%s': %s", keyword, exc)

        logger.info("Auto-follow job completed: %d users followed", followed_count)

    except Exception as exc:
        logger.error("Auto-follow job failed: %s", exc)
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
        system_jobs = {"analytics_collector", "schedule_sync", "prediction_tracker", "auto_post", "auto_follow"}
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

    # Auto-pilot: auto post job runs 4 times a day
    scheduler.add_job(
        auto_post_job,
        CronTrigger(hour="8,12,17,21"),
        id="auto_post",
        name="Auto-Pilot Post",
        replace_existing=True,
    )

    # Auto-pilot: auto follow job runs once a day
    scheduler.add_job(
        auto_follow_job,
        CronTrigger(hour=10, minute=0),
        id="auto_follow",
        name="Auto-Pilot Follow",
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
