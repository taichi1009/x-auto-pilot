from app.api.posts import router as posts_router
from app.api.templates import router as templates_router
from app.api.schedules import router as schedules_router
from app.api.follows import router as follows_router
from app.api.analytics import router as analytics_router
from app.api.ai import router as ai_router
from app.api.settings import router as settings_router

__all__ = [
    "posts_router",
    "templates_router",
    "schedules_router",
    "follows_router",
    "analytics_router",
    "ai_router",
    "settings_router",
]
