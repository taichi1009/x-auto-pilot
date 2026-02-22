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


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and start scheduler
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created.")

    # Create default admin user if not exists
    from app.database import SessionLocal
    from app.models.models import User, UserRole, SubscriptionTier
    from app.utils.auth import hash_password
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == "admin@example.com").first()
        if not admin:
            admin = User(
                email="admin@example.com",
                hashed_password=hash_password("admin123"),
                name="Admin",
                role=UserRole.admin,
                subscription_tier=SubscriptionTier.enterprise,
                is_active=True,
            )
            db.add(admin)
            db.commit()
            logger.info("Default admin user created (admin@example.com / admin123)")
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
