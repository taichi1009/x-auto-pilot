from typing import List, Dict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.models.models import AppSetting, User
from app.schemas.schemas import AppSettingCreate, AppSettingResponse
from app.services.x_api import XApiService
from app.utils.auth import get_current_user
from app.utils.rate_limiter import rate_limiter, TIER_LIMITS

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=List[AppSettingResponse])
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    app_settings = (
        db.query(AppSetting)
        .filter(AppSetting.user_id == current_user.id)
        .all()
    )
    return app_settings


@router.put("")
def update_settings(
    settings_data: List[AppSettingCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    updated = []
    for item in settings_data:
        existing = (
            db.query(AppSetting)
            .filter(
                AppSetting.key == item.key,
                AppSetting.user_id == current_user.id,
            )
            .first()
        )
        if existing:
            existing.value = item.value
            existing.category = item.category
            updated.append(existing)
        else:
            new_setting = AppSetting(
                key=item.key,
                value=item.value,
                category=item.category,
                user_id=current_user.id,
            )
            db.add(new_setting)
            updated.append(new_setting)
    db.commit()
    for s in updated:
        db.refresh(s)
    return [
        AppSettingResponse.model_validate(s)
        for s in updated
    ]


@router.post("/test-connection")
def test_connection(
    current_user: User = Depends(get_current_user),
):
    x_api = XApiService()
    result = x_api.test_connection()
    return result


@router.get("/api-usage")
def get_api_usage(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tier = settings.X_API_TIER.lower()
    usage = rate_limiter.get_usage_from_db(db, tier)
    limits = TIER_LIMITS.get(tier, TIER_LIMITS["free"])

    return {
        "tier": tier,
        "usage": usage,
        "limits": limits,
        "posts_used": usage.get("post", 0),
        "posts_limit": limits.get("posts_per_month", 0),
        "reads_used": usage.get("read", 0),
        "reads_limit": limits.get("reads_per_month", 0),
    }
