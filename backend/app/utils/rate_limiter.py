import logging
from collections import defaultdict
from datetime import datetime, timedelta
from threading import Lock
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.models import ApiUsageLog

logger = logging.getLogger(__name__)

TIER_LIMITS: Dict[str, Dict[str, int]] = {
    "free": {
        "posts_per_month": 1500,
        "reads_per_month": 0,
        "follows_per_day": 0,
    },
    "basic": {
        "posts_per_month": 50000,
        "reads_per_month": 10000,
        "follows_per_day": 400,
    },
    "pro": {
        "posts_per_month": 300000,
        "reads_per_month": 1000000,
        "follows_per_day": 1000,
    },
    "enterprise": {
        "posts_per_month": 1000000,
        "reads_per_month": 10000000,
        "follows_per_day": 5000,
    },
}

# Mapping from endpoint category to the limit key
ENDPOINT_LIMIT_MAP: Dict[str, str] = {
    "post": "posts_per_month",
    "read": "reads_per_month",
    "follow": "follows_per_day",
}


class RateLimiter:
    def __init__(self) -> None:
        self._call_log: Dict[str, List[datetime]] = defaultdict(list)
        self._lock = Lock()

    def check_limit(self, endpoint_category: str, tier: str, is_admin: bool = False) -> bool:
        # Admin users bypass all rate limits
        if is_admin:
            return True

        limits = TIER_LIMITS.get(tier, TIER_LIMITS["free"])
        limit_key = ENDPOINT_LIMIT_MAP.get(endpoint_category)
        if not limit_key:
            return True

        max_calls = limits.get(limit_key, 0)
        if max_calls == 0:
            return False

        # Determine the window based on the limit key
        if "per_month" in limit_key:
            window = timedelta(days=30)
        elif "per_day" in limit_key:
            window = timedelta(days=1)
        else:
            window = timedelta(hours=1)

        now = datetime.utcnow()
        cutoff = now - window

        with self._lock:
            # Clean old entries
            self._call_log[endpoint_category] = [
                t for t in self._call_log[endpoint_category] if t > cutoff
            ]
            current_count = len(self._call_log[endpoint_category])

        return current_count < max_calls

    def log_usage(
        self,
        endpoint_category: str,
        tier: str,
        endpoint: str = "",
        method: str = "POST",
        status_code: int = 200,
        db: Optional[Session] = None,
    ) -> None:
        now = datetime.utcnow()

        with self._lock:
            self._call_log[endpoint_category].append(now)

        # Persist to database if session is provided
        if db is not None:
            log_entry = ApiUsageLog(
                endpoint=endpoint or endpoint_category,
                method=method,
                tier_required=tier,
                status_code=status_code,
            )
            db.add(log_entry)
            db.commit()

    def get_usage_count(self, endpoint_category: str, window_days: int = 30) -> int:
        now = datetime.utcnow()
        cutoff = now - timedelta(days=window_days)

        with self._lock:
            self._call_log[endpoint_category] = [
                t for t in self._call_log[endpoint_category] if t > cutoff
            ]
            return len(self._call_log[endpoint_category])

    def get_usage_from_db(
        self,
        db: Session,
        tier: str,
        window_days: int = 30,
    ) -> Dict[str, int]:
        cutoff = datetime.utcnow() - timedelta(days=window_days)
        from sqlalchemy import func

        result = (
            db.query(
                ApiUsageLog.endpoint,
                func.count(ApiUsageLog.id).label("count"),
            )
            .filter(ApiUsageLog.created_at >= cutoff)
            .group_by(ApiUsageLog.endpoint)
            .all()
        )
        usage = {row.endpoint: row.count for row in result}
        return usage

    def get_limit_for_tier(self, endpoint_category: str, tier: str) -> int:
        limits = TIER_LIMITS.get(tier, TIER_LIMITS["free"])
        limit_key = ENDPOINT_LIMIT_MAP.get(endpoint_category, "")
        return limits.get(limit_key, 0)


# Global singleton rate limiter instance
rate_limiter = RateLimiter()
