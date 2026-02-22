import logging
from typing import Optional, Dict, Any

from sqlalchemy.orm import Session

from app.models.models import AppSetting

logger = logging.getLogger(__name__)

# Default settings for auto-pilot
DEFAULT_SETTINGS: Dict[str, str] = {
    "auto_pilot_enabled": "false",
    "auto_post_enabled": "true",
    "auto_post_count": "3",
    "auto_post_with_image": "true",
    "auto_follow_enabled": "false",
    "auto_follow_keywords": "",
    "auto_follow_daily_limit": "10",
}


class AutoPilotService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def is_enabled(self, user_id: Optional[int] = None) -> bool:
        return self.get_setting("auto_pilot_enabled", user_id=user_id) == "true"

    def get_setting(self, key: str, user_id: Optional[int] = None) -> str:
        query = (
            self.db.query(AppSetting)
            .filter(AppSetting.key == key)
        )
        if user_id is not None:
            query = query.filter(AppSetting.user_id == user_id)
        setting = query.first()
        if setting:
            return setting.value
        return DEFAULT_SETTINGS.get(key, "")

    def set_setting(self, key: str, value: str, user_id: Optional[int] = None) -> None:
        query = (
            self.db.query(AppSetting)
            .filter(AppSetting.key == key)
        )
        if user_id is not None:
            query = query.filter(AppSetting.user_id == user_id)
        setting = query.first()
        if setting:
            setting.value = value
        else:
            setting = AppSetting(key=key, value=value, category="auto_pilot")
            setting.user_id = user_id
            self.db.add(setting)
        self.db.commit()

    def get_status(self, user_id: Optional[int] = None) -> Dict[str, Any]:
        return {
            "enabled": self.get_setting("auto_pilot_enabled", user_id=user_id) == "true",
            "auto_post_enabled": self.get_setting("auto_post_enabled", user_id=user_id) == "true",
            "auto_post_count": int(self.get_setting("auto_post_count", user_id=user_id) or "3"),
            "auto_post_with_image": self.get_setting("auto_post_with_image", user_id=user_id) == "true",
            "auto_follow_enabled": self.get_setting("auto_follow_enabled", user_id=user_id) == "true",
            "auto_follow_keywords": self.get_setting("auto_follow_keywords", user_id=user_id),
            "auto_follow_daily_limit": int(
                self.get_setting("auto_follow_daily_limit", user_id=user_id) or "10"
            ),
        }

    def toggle(self, user_id: Optional[int] = None) -> Dict[str, Any]:
        current = self.is_enabled(user_id=user_id)
        self.set_setting("auto_pilot_enabled", "false" if current else "true", user_id=user_id)
        logger.info("Auto-pilot toggled: %s", "OFF" if current else "ON")
        return self.get_status(user_id=user_id)

    def update_settings(self, settings: Dict[str, Any], user_id: Optional[int] = None) -> Dict[str, Any]:
        field_map = {
            "enabled": "auto_pilot_enabled",
            "auto_post_enabled": "auto_post_enabled",
            "auto_post_count": "auto_post_count",
            "auto_post_with_image": "auto_post_with_image",
            "auto_follow_enabled": "auto_follow_enabled",
            "auto_follow_keywords": "auto_follow_keywords",
            "auto_follow_daily_limit": "auto_follow_daily_limit",
        }
        for field, key in field_map.items():
            if field in settings:
                value = settings[field]
                if isinstance(value, bool):
                    value = "true" if value else "false"
                self.set_setting(key, str(value), user_id=user_id)
        return self.get_status(user_id=user_id)
