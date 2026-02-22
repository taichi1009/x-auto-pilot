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
    Float,
    ForeignKey,
    func,
)
from sqlalchemy.orm import relationship

from app.database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    user = "user"


class SubscriptionTier(str, enum.Enum):
    free = "free"
    basic = "basic"
    pro = "pro"
    enterprise = "enterprise"


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


class PostFormat(str, enum.Enum):
    tweet = "tweet"
    long_form = "long_form"
    thread = "thread"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.user, nullable=False)
    subscription_tier = Column(
        Enum(SubscriptionTier), default=SubscriptionTier.free, nullable=False
    )
    stripe_customer_id = Column(String(255), nullable=True)
    stripe_subscription_id = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    content = Column(Text, nullable=False)
    status = Column(Enum(PostStatus), default=PostStatus.draft, nullable=False)
    post_type = Column(Enum(PostType), default=PostType.original, nullable=False)
    x_tweet_id = Column(String(64), nullable=True)
    posted_at = Column(DateTime, nullable=True)
    retry_count = Column(Integer, default=0, nullable=False)
    post_format = Column(
        Enum(PostFormat), default=PostFormat.tweet, nullable=False,
        server_default="tweet"
    )
    predicted_impressions = Column(Integer, nullable=True)
    image_url = Column(Text, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    persona_id = Column(Integer, ForeignKey("personas.id"), nullable=True)
    schedule_id = Column(Integer, ForeignKey("schedules.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    schedule = relationship("Schedule", back_populates="posts")
    persona = relationship("Persona", back_populates="posts")
    analytics = relationship(
        "PostAnalytics", back_populates="post", cascade="all, delete-orphan"
    )
    thread_posts = relationship(
        "ThreadPost", back_populates="parent_post", cascade="all, delete-orphan",
        order_by="ThreadPost.thread_order"
    )


class Template(Base):
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
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
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
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
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
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
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
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


class Persona(Base):
    __tablename__ = "personas"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    personality_traits = Column(JSON, default=list)
    background_story = Column(Text, nullable=True)
    target_audience = Column(String(500), nullable=True)
    expertise_areas = Column(JSON, default=list)
    communication_style = Column(String(100), nullable=True)
    tone = Column(String(100), nullable=True)
    language_patterns = Column(JSON, default=list)
    example_posts = Column(JSON, default=list)
    is_active = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    posts = relationship("Post", back_populates="persona")


class ContentStrategy(Base):
    __tablename__ = "content_strategies"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String(255), nullable=False)
    content_pillars = Column(JSON, default=list)
    hashtag_groups = Column(JSON, default=dict)
    posting_frequency = Column(Integer, default=3)
    optimal_posting_times = Column(JSON, default=list)
    impression_target = Column(Integer, default=10000)
    follower_growth_target = Column(Integer, default=5000)
    engagement_rate_target = Column(Float, default=3.0)
    content_mix = Column(JSON, default=dict)
    avoid_topics = Column(JSON, default=list)
    competitor_accounts = Column(JSON, default=list)
    is_active = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )


class ThreadPost(Base):
    __tablename__ = "thread_posts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    parent_post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    content = Column(Text, nullable=False)
    thread_order = Column(Integer, nullable=False)
    x_tweet_id = Column(String(64), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    parent_post = relationship("Post", back_populates="thread_posts")


class ImpressionPrediction(Base):
    __tablename__ = "impression_predictions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=True)
    content_preview = Column(Text, nullable=False)
    post_format = Column(Enum(PostFormat), default=PostFormat.tweet, nullable=False)
    predicted_impressions = Column(Integer, nullable=False)
    predicted_likes = Column(Integer, default=0)
    predicted_retweets = Column(Integer, default=0)
    confidence_score = Column(Float, default=0.5)
    actual_impressions = Column(Integer, nullable=True)
    factors = Column(JSON, default=dict)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
