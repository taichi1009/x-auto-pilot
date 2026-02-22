import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.api.posts import router as posts_router
from app.api.templates import router as templates_router
from app.api.schedules import router as schedules_router
from app.api.follows import router as follows_router
from app.api.analytics import router as analytics_router
from app.api.ai import router as ai_router
from app.api.settings import router as settings_router
from app.api.persona import router as persona_router
from app.api.strategy import router as strategy_router
from app.api.auto_pilot import router as auto_pilot_router
from app.api.auth import router as auth_router
from app.api.admin import router as admin_router
from app.api.payment import router as payment_router
from app.jobs.scheduler import start_scheduler, shutdown_scheduler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def _seed_admin_settings(db, admin_id: int) -> None:
    """Seed AppSetting rows from env vars for the admin user.

    Only creates a setting if it doesn't already exist, so user edits are preserved.
    """
    from app.models.models import AppSetting

    env_to_key = {
        "X_API_KEY": "x_api_key",
        "X_API_SECRET": "x_api_secret",
        "X_ACCESS_TOKEN": "x_access_token",
        "X_ACCESS_TOKEN_SECRET": "x_access_token_secret",
        "X_BEARER_TOKEN": "x_bearer_token",
        "CLAUDE_API_KEY": "claude_api_key",
        "OPENAI_API_KEY": "openai_api_key",
        "AI_PROVIDER": "ai_provider",
        "X_API_TIER": "api_tier",
    }

    seeded = 0
    for env_attr, setting_key in env_to_key.items():
        env_value = getattr(settings, env_attr, "")
        if not env_value:
            continue

        existing = (
            db.query(AppSetting)
            .filter(AppSetting.user_id == admin_id, AppSetting.key == setting_key)
            .first()
        )
        if not existing:
            db.add(AppSetting(
                user_id=admin_id,
                key=setting_key,
                value=env_value,
                category="api",
            ))
            seeded += 1

    if seeded:
        db.commit()
        logger.info("Seeded %d admin settings from env vars", seeded)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and start scheduler
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created.")

    # Create default admin user if not exists and seed settings from env
    from app.database import SessionLocal
    from app.models.models import User, UserRole, SubscriptionTier, AppSetting
    from app.utils.auth import hash_password
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == "admin@example.com").first()
        if not admin:
            admin = User(
                email="admin@example.com",
                hashed_password=hash_password("Admin@2026!"),
                name="Admin",
                role=UserRole.admin,
                subscription_tier=SubscriptionTier.enterprise,
                is_active=True,
            )
            db.add(admin)
            db.commit()
            logger.info("Default admin user created (admin@example.com / Admin@2026!)")

        # Seed admin API key settings from env vars (every startup)
        _seed_admin_settings(db, admin.id)
    finally:
        db.close()

    logger.info("Starting background scheduler...")
    start_scheduler()
    logger.info("Background scheduler started.")

    yield

    # Shutdown: stop scheduler
    logger.info("Shutting down background scheduler...")
    shutdown_scheduler()
    logger.info("Application shutdown complete.")


app = FastAPI(
    title="X Auto-Pilot API",
    description="Automated X (Twitter) posting, scheduling, and analytics platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(posts_router)
app.include_router(templates_router)
app.include_router(schedules_router)
app.include_router(follows_router)
app.include_router(analytics_router)
app.include_router(ai_router)
app.include_router(settings_router)
app.include_router(persona_router)
app.include_router(strategy_router)
app.include_router(auto_pilot_router)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(payment_router)


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "tier": settings.X_API_TIER,
    }
