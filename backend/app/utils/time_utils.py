from datetime import datetime, timedelta, timezone
from typing import Optional, Dict

# Japan Standard Time (UTC+9)
JST = timezone(timedelta(hours=9))
UTC = timezone.utc


def utc_now() -> datetime:
    return datetime.now(UTC)


def to_jst(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(JST)


def to_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=JST)
    return dt.astimezone(UTC)


def format_datetime(dt: datetime, fmt: str = "%Y-%m-%d %H:%M:%S") -> str:
    return dt.strftime(fmt)


def parse_cron_expression(cron_expr: str) -> Dict[str, str]:
    """Parse a cron expression into its component parts.

    Expected format: minute hour day_of_month month day_of_week
    Example: "0 9 * * *" means every day at 09:00

    Returns a dict with keys: minute, hour, day, month, day_of_week
    """
    parts = cron_expr.strip().split()
    if len(parts) != 5:
        raise ValueError(
            f"Invalid cron expression '{cron_expr}': expected 5 fields, got {len(parts)}"
        )

    return {
        "minute": parts[0],
        "hour": parts[1],
        "day": parts[2],
        "month": parts[3],
        "day_of_week": parts[4],
    }


def get_optimal_posting_times() -> list:
    """Return a list of optimal posting times for X (Twitter) in JST.

    Based on common engagement patterns:
    - Morning commute: 7:00-8:00
    - Lunch: 12:00-13:00
    - Evening commute: 17:00-19:00
    - Night: 21:00-23:00
    """
    return [
        {"time": "07:30", "label": "Morning commute", "engagement_level": "high"},
        {"time": "08:00", "label": "Morning", "engagement_level": "medium"},
        {"time": "12:00", "label": "Lunch break", "engagement_level": "high"},
        {"time": "12:30", "label": "Lunch", "engagement_level": "medium"},
        {"time": "17:30", "label": "Evening commute", "engagement_level": "high"},
        {"time": "18:00", "label": "Evening", "engagement_level": "high"},
        {"time": "19:00", "label": "After work", "engagement_level": "medium"},
        {"time": "21:00", "label": "Night", "engagement_level": "high"},
        {"time": "22:00", "label": "Late night", "engagement_level": "medium"},
    ]


def is_within_posting_hours(dt: Optional[datetime] = None) -> bool:
    """Check if the given time (in JST) is within recommended posting hours."""
    if dt is None:
        dt = utc_now()
    jst_time = to_jst(dt)
    hour = jst_time.hour

    # Recommended hours: 7-9, 12-13, 17-19, 21-23
    posting_ranges = [(7, 9), (12, 13), (17, 19), (21, 23)]
    return any(start <= hour <= end for start, end in posting_ranges)
