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
    User,
)
from app.services.post_service import PostService
from app.services.ai_service import AIService, create_ai_service
from app.services.template_service import TemplateService
from app.services.analytics_service import AnalyticsService
from app.services.persona_service import PersonaService
from app.services.strategy_service import StrategyService
from app.services.prediction_service import PredictionService
from app.services.auto_pilot_service import AutoPilotService
from app.services.image_service import ImageService
from app.services.x_api import XApiService, create_x_api_service
from app.services.follow_service import FollowService
from app.services.user_settings import get_user_setting
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

        user_id = schedule.user_id
        content, post_format, thread_contents = _generate_content(schedule, db, user_id=user_id)
        if not content:
            logger.error("Failed to generate content for schedule %d", schedule_id)
            return

        post_service = PostService(db, user_id=user_id)
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
            )(),
            user_id=user_id,
        )

        # Attempt to publish
        try:
            post_service.publish_post(post.id, user_id=user_id)
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


def _generate_content(schedule: Schedule, db, user_id=None) -> tuple:
    """Generate post content based on the schedule configuration.

    Returns (content, post_format, thread_contents).
    """
    if schedule.post_type == PostType.ai_generated and schedule.ai_prompt:
        if user_id is not None:
            ai_service = create_ai_service(db, user_id)
        else:
            ai_service = AIService()
        persona_service = PersonaService(db)
        strategy_service = StrategyService(db)

        persona = persona_service.get_active_persona(user_id=user_id)
        strategy = strategy_service.get_active_strategy(user_id=user_id)

        # Resolve language from user settings
        language = (get_user_setting(db, user_id, "language") if user_id else "") or "ja"

        # Determine format based on content_mix from strategy
        post_format = _pick_format_from_strategy(strategy)

        # Resolve max_length from user settings
        if post_format == "long_form":
            ml_val = (get_user_setting(db, user_id, "max_length_long_form") if user_id else "") or ""
            max_length = int(ml_val) if ml_val else 5000
        else:
            ml_val = (get_user_setting(db, user_id, "max_length_tweet") if user_id else "") or ""
            max_length = int(ml_val) if ml_val else 280

        result = ai_service.generate_posts(
            genre=schedule.ai_prompt,
            style="casual",
            count=1,
            persona=persona,
            strategy=strategy,
            post_format=post_format,
            thread_length=5,
            language=language,
            max_length=max_length,
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
        # Collect analytics per user: group posts by user_id
        posted_posts = (
            db.query(Post)
            .filter(
                Post.status == PostStatus.posted,
                Post.x_tweet_id.isnot(None),
            )
            .all()
        )

        # Group by user_id
        user_posts = {}
        for post in posted_posts:
            uid = post.user_id
            if uid not in user_posts:
                user_posts[uid] = []
            user_posts[uid].append(post)

        total_collected = 0
        total_errors = 0
        for uid, posts in user_posts.items():
            if uid is not None:
                x_api = create_x_api_service(db, uid)
            else:
                x_api = XApiService()

            for post in posts:
                try:
                    metrics = x_api.get_tweet_metrics(post.x_tweet_id)
                    analytics = PostAnalytics(
                        post_id=post.id,
                        impressions=metrics.get("impressions", 0),
                        likes=metrics.get("likes", 0),
                        retweets=metrics.get("retweets", 0),
                        replies=metrics.get("replies", 0),
                        quotes=metrics.get("quotes", 0),
                        bookmarks=metrics.get("bookmarks", 0),
                        profile_visits=metrics.get("profile_visits", 0),
                        collected_at=datetime.utcnow(),
                    )
                    db.add(analytics)
                    total_collected += 1
                except Exception as exc:
                    logger.warning(
                        "Failed to collect analytics for post %d: %s",
                        post.id, exc,
                    )
                    total_errors += 1

        db.commit()
        logger.info(
            "Analytics collection job completed: %d succeeded, %d failed",
            total_collected, total_errors,
        )
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
    """Auto-pilot: generate and publish posts automatically for each user."""
    db = SessionLocal()
    try:
        # Find all users with auto_pilot enabled
        from app.models.models import AppSetting
        enabled_settings = (
            db.query(AppSetting)
            .filter(
                AppSetting.key == "auto_pilot_enabled",
                AppSetting.value == "true",
            )
            .all()
        )

        user_ids = [s.user_id for s in enabled_settings if s.user_id is not None]
        if not user_ids:
            return

        for user_id in user_ids:
            try:
                _auto_post_for_user(db, user_id)
            except Exception as exc:
                logger.error("Auto-post failed for user %d: %s", user_id, exc)

    except Exception as exc:
        logger.error("Auto-post job failed: %s", exc)
    finally:
        db.close()


def _auto_post_for_user(db, user_id: int) -> None:
    """Run auto-post logic for a single user."""
    ap_service = AutoPilotService(db)
    if ap_service.get_setting("auto_post_enabled", user_id=user_id) != "true":
        return

    max_posts = int(ap_service.get_setting("auto_post_count", user_id=user_id) or "3")
    with_image = ap_service.get_setting("auto_post_with_image", user_id=user_id) == "true"

    # Check how many posts we've already made today
    from datetime import date
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_count = (
        db.query(Post)
        .filter(
            Post.user_id == user_id,
            Post.created_at >= today_start,
            Post.post_type == PostType.ai_generated,
        )
        .count()
    )
    if today_count >= max_posts:
        logger.info("Auto-post: daily limit reached for user %d (%d/%d)", user_id, today_count, max_posts)
        return

    persona_service = PersonaService(db)
    strategy_service = StrategyService(db)
    persona = persona_service.get_active_persona(user_id=user_id)
    strategy = strategy_service.get_active_strategy(user_id=user_id)

    if not strategy:
        logger.info("Auto-post: no active strategy for user %d, skipping", user_id)
        return

    post_format = _pick_format_from_strategy(strategy)
    language = get_user_setting(db, user_id, "language") or "ja"

    # Resolve max_length from user settings
    if post_format == "long_form":
        ml_val = get_user_setting(db, user_id, "max_length_long_form") or ""
        max_length = int(ml_val) if ml_val else 5000
    else:
        ml_val = get_user_setting(db, user_id, "max_length_tweet") or ""
        max_length = int(ml_val) if ml_val else 280

    ai_service = create_ai_service(db, user_id)
    result = ai_service.generate_posts(
        genre=", ".join(strategy.content_pillars) if strategy.content_pillars else "general",
        style="casual",
        count=1,
        persona=persona,
        strategy=strategy,
        post_format=post_format,
        thread_length=5,
        language=language,
        max_length=max_length,
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
        logger.warning("Auto-post: AI generation returned empty content for user %d", user_id)
        return

    post_service = PostService(db, user_id=user_id)
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
        })(),
        user_id=user_id,
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
                x_api = create_x_api_service(db, user_id)
                media_id = x_api.upload_media(image_path)
                if media_id:
                    media_ids = [media_id]
                    post.image_url = image_path
                    db.commit()
        except Exception as exc:
            logger.warning("Auto-post: image generation failed for user %d: %s", user_id, exc)

    # Publish
    try:
        post_service.publish_post(post.id, media_ids=media_ids, user_id=user_id)
        logger.info("Auto-post: published post id=%d format=%s for user %d", post.id, post_format, user_id)
    except Exception as exc:
        logger.error("Auto-post: publish failed for user %d: %s", user_id, exc)
    finally:
        if image_path:
            ImageService().cleanup_image(image_path)


def auto_follow_job() -> None:
    """Auto-pilot: discover and follow users based on keywords, per user."""
    db = SessionLocal()
    try:
        from app.models.models import AppSetting
        enabled_settings = (
            db.query(AppSetting)
            .filter(
                AppSetting.key == "auto_pilot_enabled",
                AppSetting.value == "true",
            )
            .all()
        )

        user_ids = [s.user_id for s in enabled_settings if s.user_id is not None]
        if not user_ids:
            return

        for user_id in user_ids:
            try:
                _auto_follow_for_user(db, user_id)
            except Exception as exc:
                logger.error("Auto-follow failed for user %d: %s", user_id, exc)

    except Exception as exc:
        logger.error("Auto-follow job failed: %s", exc)
    finally:
        db.close()


def _auto_follow_for_user(db, user_id: int) -> None:
    """Run auto-follow logic for a single user."""
    ap_service = AutoPilotService(db)
    if ap_service.get_setting("auto_follow_enabled", user_id=user_id) != "true":
        return

    keywords_str = ap_service.get_setting("auto_follow_keywords", user_id=user_id)
    if not keywords_str.strip():
        logger.info("Auto-follow: no keywords configured for user %d, skipping", user_id)
        return

    daily_limit = int(ap_service.get_setting("auto_follow_daily_limit", user_id=user_id) or "10")
    keywords = [k.strip() for k in keywords_str.split(",") if k.strip()]

    follow_service = FollowService(db, user_id=user_id)
    x_api = create_x_api_service(db, user_id)

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
                    user_id=user_id,
                )
                db.add(target)
                db.commit()
                db.refresh(target)

                # Execute follow
                try:
                    follow_service.execute_follow(target.id, user_id=user_id)
                    followed_count += 1
                    logger.info(
                        "Auto-follow: followed @%s for user %d (%d/%d)",
                        user_data["username"], user_id, followed_count, daily_limit,
                    )
                    # Rate limit pause
                    import time
                    time.sleep(2)
                except Exception as exc:
                    logger.warning("Auto-follow: failed to follow @%s: %s", user_data["username"], exc)

        except Exception as exc:
            logger.warning("Auto-follow: search failed for '%s': %s", keyword, exc)

    logger.info("Auto-follow job completed for user %d: %d users followed", user_id, followed_count)


def refresh_expiring_tokens_job() -> None:
    """Pre-refresh OAuth 2.0 tokens that expire within 30 minutes."""
    import time
    from app.models.models import AppSetting
    from app.services.x_oauth_service import refresh_oauth2_token

    db = SessionLocal()
    try:
        threshold = str(int(time.time() + 1800))  # 30 min from now
        # Find all users using OAuth 2.0
        oauth2_users = (
            db.query(AppSetting)
            .filter(
                AppSetting.key == "x_oauth_method",
                AppSetting.value == "oauth2",
            )
            .all()
        )

        refreshed = 0
        for setting in oauth2_users:
            uid = setting.user_id
            if uid is None:
                continue
            expires_row = (
                db.query(AppSetting)
                .filter(
                    AppSetting.user_id == uid,
                    AppSetting.key == "x_oauth2_token_expires_at",
                )
                .first()
            )
            if not expires_row:
                continue

            try:
                expires_at = float(expires_row.value)
            except (ValueError, TypeError):
                continue

            if expires_at < float(threshold):
                if refresh_oauth2_token(db, uid):
                    refreshed += 1

        logger.info("Token refresh job: refreshed %d tokens", refreshed)
    except Exception as exc:
        logger.error("Token refresh job failed: %s", exc)
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
        system_jobs = {"analytics_collector", "schedule_sync", "prediction_tracker", "auto_post", "auto_follow", "token_refresh"}
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

    # OAuth 2.0 token refresh every 30 minutes
    scheduler.add_job(
        refresh_expiring_tokens_job,
        CronTrigger(minute="*/30"),
        id="token_refresh",
        name="OAuth2 Token Refresh",
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
