from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, ConfigDict, Field


# ---- Post ----

class PostCreate(BaseModel):
    content: str = Field(..., max_length=280)
    status: str = "draft"
    post_type: str = "original"
    schedule_id: Optional[int] = None


class PostUpdate(BaseModel):
    content: Optional[str] = Field(None, max_length=280)
    status: Optional[str] = None
    post_type: Optional[str] = None
    schedule_id: Optional[int] = None


class PostResponse(BaseModel):
    id: int
    content: str
    status: str
    post_type: str
    x_tweet_id: Optional[str] = None
    posted_at: Optional[datetime] = None
    retry_count: int
    schedule_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---- Template ----

class TemplateCreate(BaseModel):
    name: str
    content_pattern: str
    variables: Optional[List[str]] = []
    category: Optional[str] = None
    is_active: bool = True


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    content_pattern: Optional[str] = None
    variables: Optional[List[str]] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None


class TemplateResponse(BaseModel):
    id: int
    name: str
    content_pattern: str
    variables: Optional[List[str]] = []
    category: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---- Schedule ----

class ScheduleCreate(BaseModel):
    name: str
    schedule_type: str
    cron_expression: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    is_active: bool = True
    post_type: str = "original"
    ai_prompt: Optional[str] = None
    template_id: Optional[int] = None


class ScheduleUpdate(BaseModel):
    name: Optional[str] = None
    schedule_type: Optional[str] = None
    cron_expression: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    is_active: Optional[bool] = None
    post_type: Optional[str] = None
    ai_prompt: Optional[str] = None
    template_id: Optional[int] = None


class ScheduleResponse(BaseModel):
    id: int
    name: str
    schedule_type: str
    cron_expression: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    is_active: bool
    post_type: str
    ai_prompt: Optional[str] = None
    template_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---- FollowTarget ----

class FollowTargetCreate(BaseModel):
    x_user_id: str
    x_username: str
    action: str = "follow"


class FollowTargetResponse(BaseModel):
    id: int
    x_user_id: str
    x_username: str
    action: str
    status: str
    followed_at: Optional[datetime] = None
    unfollowed_at: Optional[datetime] = None
    follow_back: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---- PostAnalytics ----

class PostAnalyticsResponse(BaseModel):
    id: int
    post_id: int
    impressions: int
    likes: int
    retweets: int
    replies: int
    quotes: int
    bookmarks: int
    profile_visits: int
    collected_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---- AppSetting ----

class AppSettingCreate(BaseModel):
    key: str
    value: str
    category: Optional[str] = None


class AppSettingResponse(BaseModel):
    id: int
    key: str
    value: str
    category: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---- PdcaLog ----

class PdcaLogResponse(BaseModel):
    id: int
    analysis_type: str
    period_start: datetime
    period_end: datetime
    analysis_result: Dict[str, Any]
    recommendations: List[Any]
    applied_changes: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---- ApiUsageLog ----

class ApiUsageResponse(BaseModel):
    id: int
    endpoint: str
    method: str
    tier_required: str
    status_code: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---- AI ----

class AIGenerateRequest(BaseModel):
    genre: str = Field(..., description="Genre/topic for the post")
    style: str = Field("casual", description="Writing style: casual, professional, humorous, etc.")
    count: int = Field(3, ge=1, le=10, description="Number of posts to generate")
    custom_prompt: Optional[str] = Field(None, description="Additional instructions for generation")


class AIGenerateResponse(BaseModel):
    posts: List[str]
    genre: str
    style: str


class AIImproveRequest(BaseModel):
    content: str = Field(..., max_length=280)
    feedback: Optional[str] = Field(None, description="Specific feedback for improvement")


class AIImproveResponse(BaseModel):
    original: str
    improved: str
    explanation: str


# ---- Dashboard ----

class DashboardResponse(BaseModel):
    total_posts: int
    posts_today: int
    api_usage_count: int
    api_usage_limit: int
    recent_posts: List[PostResponse]


# ---- Follow Stats ----

class FollowStatsResponse(BaseModel):
    total_targets: int
    pending: int
    completed: int
    failed: int
    follow_backs: int
