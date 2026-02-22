import enum
from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    DateTime,
    Enum,
    JSON,
    ForeignKey,
    func,
)
from sqlalchemy.orm import relationship

from app.database import Base


class PostStatus(str, enum.Enum):
    draft = "draft"
    scheduled = "scheduled"
    posted = "posted"
    failed = "failed"


class PostType(str, enum.Enum):
    original = "original"
    ai_generated = "ai_generated"
    template = "template"


class ScheduleType(str, enum.Enum):
    once = "once"
    recurring = "recurring"


class FollowAction(str, enum.Enum):
    follow = "follow"
    unfollow = "unfollow"


class FollowStatus(str, enum.Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"


class AnalysisType(str, enum.Enum):
    weekly = "weekly"
    monthly = "monthly"


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    content = Column(Text, nullable=False)
    status = Column(Enum(PostStatus), default=PostStatus.draft, nullable=False)
    post_type = Column(Enum(PostType), default=PostType.original, nullable=False)
    x_tweet_id = Column(String(64), nullable=True)
    posted_at = Column(DateTime, nullable=True)
    retry_count = Column(Integer, default=0, nullable=False)
    schedule_id = Column(Integer, ForeignKey("schedules.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    schedule = relationship("Schedule", back_populates="posts")
    analytics = relationship(
        "PostAnalytics", back_populates="post", cascade="all, delete-orphan"
    )


class Template(Base):
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    content_pattern = Column(Text, nullable=False)
    variables = Column(JSON, default=list)
    category = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    schedules = relationship("Schedule", back_populates="template")


class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    schedule_type = Column(Enum(ScheduleType), nullable=False)
    cron_expression = Column(String(100), nullable=True)
    scheduled_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    post_type = Column(Enum(PostType), default=PostType.original, nullable=False)
    ai_prompt = Column(Text, nullable=True)
    template_id = Column(Integer, ForeignKey("templates.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    template = relationship("Template", back_populates="schedules")
    posts = relationship("Post", back_populates="schedule")


class FollowTarget(Base):
    __tablename__ = "follow_targets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    x_user_id = Column(String(64), unique=True, nullable=False)
    x_username = Column(String(255), nullable=False)
    action = Column(Enum(FollowAction), default=FollowAction.follow, nullable=False)
    status = Column(Enum(FollowStatus), default=FollowStatus.pending, nullable=False)
    followed_at = Column(DateTime, nullable=True)
    unfollowed_at = Column(DateTime, nullable=True)
    follow_back = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )


class PostAnalytics(Base):
    __tablename__ = "post_analytics"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    impressions = Column(Integer, default=0, nullable=False)
    likes = Column(Integer, default=0, nullable=False)
    retweets = Column(Integer, default=0, nullable=False)
    replies = Column(Integer, default=0, nullable=False)
    quotes = Column(Integer, default=0, nullable=False)
    bookmarks = Column(Integer, default=0, nullable=False)
    profile_visits = Column(Integer, default=0, nullable=False)
    collected_at = Column(DateTime, server_default=func.now(), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    post = relationship("Post", back_populates="analytics")


class AppSetting(Base):
    __tablename__ = "app_settings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    key = Column(String(255), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=False)
    category = Column(String(100), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )


class PdcaLog(Base):
    __tablename__ = "pdca_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    analysis_type = Column(Enum(AnalysisType), nullable=False)
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    analysis_result = Column(JSON, default=dict)
    recommendations = Column(JSON, default=list)
    applied_changes = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)


class ApiUsageLog(Base):
    __tablename__ = "api_usage_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    endpoint = Column(String(255), nullable=False)
    method = Column(String(10), nullable=False)
    tier_required = Column(String(20), nullable=False)
    status_code = Column(Integer, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
