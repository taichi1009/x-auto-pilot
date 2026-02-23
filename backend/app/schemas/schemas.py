from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, ConfigDict, Field


# ---- Auth ----

class UserRegister(BaseModel):
    email: str
    password: str = Field(..., min_length=6)
    name: str


class UserLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    subscription_tier: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminUserUpdate(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None
    subscription_tier: Optional[str] = None


class AdminStats(BaseModel):
    total_users: int
    active_users: int
    tier_breakdown: Dict[str, int]
    total_posts: int
    monthly_revenue: float


# ---- Post ----

class PostCreate(BaseModel):
    content: str = Field(..., max_length=25000)
    status: str = "draft"
    post_type: str = "original"
    post_format: str = "tweet"
    image_url: Optional[str] = None
    persona_id: Optional[int] = None
    schedule_id: Optional[int] = None
    thread_contents: Optional[List[str]] = None


class PostUpdate(BaseModel):
    content: Optional[str] = Field(None, max_length=25000)
    status: Optional[str] = None
    post_type: Optional[str] = None
    post_format: Optional[str] = None
    image_url: Optional[str] = None
    persona_id: Optional[int] = None
    schedule_id: Optional[int] = None
    thread_contents: Optional[List[str]] = None


class ThreadPostResponse(BaseModel):
    id: int
    parent_post_id: int
    content: str
    thread_order: int
    x_tweet_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PostResponse(BaseModel):
    id: int
    content: str
    status: str
    post_type: str
    post_format: str = "tweet"
    x_tweet_id: Optional[str] = None
    posted_at: Optional[datetime] = None
    retry_count: int
    predicted_impressions: Optional[int] = None
    image_url: Optional[str] = None
    persona_id: Optional[int] = None
    schedule_id: Optional[int] = None
    thread_posts: List[ThreadPostResponse] = []
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
    post_format: str = Field("tweet", description="Format: tweet, long_form, thread")
    use_persona: bool = Field(False, description="Use active persona for generation")
    thread_length: int = Field(3, ge=2, le=25, description="Number of tweets in thread")
    language: Optional[str] = Field(None, description="Language code for content generation (e.g. ja, en, zh)")


class AIGenerateResponse(BaseModel):
    posts: List[str]
    threads: Optional[List[List[str]]] = None
    genre: str
    style: str
    post_format: str = "tweet"


class AIImproveRequest(BaseModel):
    content: str = Field(..., max_length=25000)
    feedback: Optional[str] = Field(None, description="Specific feedback for improvement")
    post_format: str = Field("tweet", description="Format: tweet, long_form, thread")
    language: Optional[str] = Field(None, description="Language code for content generation (e.g. ja, en, zh)")


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


# ---- Persona ----

class PersonaCreate(BaseModel):
    name: str
    description: Optional[str] = None
    personality_traits: Optional[List[str]] = []
    background_story: Optional[str] = None
    target_audience: Optional[str] = None
    expertise_areas: Optional[List[str]] = []
    communication_style: Optional[str] = None
    tone: Optional[str] = None
    language_patterns: Optional[List[str]] = []
    example_posts: Optional[List[str]] = []


class PersonaUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    personality_traits: Optional[List[str]] = None
    background_story: Optional[str] = None
    target_audience: Optional[str] = None
    expertise_areas: Optional[List[str]] = None
    communication_style: Optional[str] = None
    tone: Optional[str] = None
    language_patterns: Optional[List[str]] = None
    example_posts: Optional[List[str]] = None


class PersonaResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    personality_traits: List[str] = []
    background_story: Optional[str] = None
    target_audience: Optional[str] = None
    expertise_areas: List[str] = []
    communication_style: Optional[str] = None
    tone: Optional[str] = None
    language_patterns: List[str] = []
    example_posts: List[str] = []
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---- ContentStrategy ----

class ContentStrategyCreate(BaseModel):
    name: str
    content_pillars: Optional[List[str]] = []
    hashtag_groups: Optional[Dict[str, List[str]]] = {}
    posting_frequency: int = 3
    optimal_posting_times: Optional[List[str]] = []
    impression_target: int = 10000
    follower_growth_target: int = 5000
    engagement_rate_target: float = 3.0
    content_mix: Optional[Dict[str, float]] = {}
    avoid_topics: Optional[List[str]] = []
    competitor_accounts: Optional[List[str]] = []


class ContentStrategyUpdate(BaseModel):
    name: Optional[str] = None
    content_pillars: Optional[List[str]] = None
    hashtag_groups: Optional[Dict[str, List[str]]] = None
    posting_frequency: Optional[int] = None
    optimal_posting_times: Optional[List[str]] = None
    impression_target: Optional[int] = None
    follower_growth_target: Optional[int] = None
    engagement_rate_target: Optional[float] = None
    content_mix: Optional[Dict[str, float]] = None
    avoid_topics: Optional[List[str]] = None
    competitor_accounts: Optional[List[str]] = None


class ContentStrategyResponse(BaseModel):
    id: int
    name: str
    content_pillars: List[str] = []
    hashtag_groups: Dict[str, List[str]] = {}
    posting_frequency: int
    optimal_posting_times: List[str] = []
    impression_target: int
    follower_growth_target: int
    engagement_rate_target: float
    content_mix: Dict[str, float] = {}
    avoid_topics: List[str] = []
    competitor_accounts: List[str] = []
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---- ImpressionPrediction ----

class AutoPilotSettings(BaseModel):
    enabled: bool = False
    auto_post_enabled: bool = True
    auto_post_count: int = 3
    auto_post_with_image: bool = True
    auto_follow_enabled: bool = False
    auto_follow_keywords: str = ""
    auto_follow_daily_limit: int = 10


class ImpressionPredictRequest(BaseModel):
    content: str = Field(..., max_length=25000)
    post_format: str = "tweet"


class ImpressionPredictResponse(BaseModel):
    predicted_impressions: int
    predicted_likes: int
    predicted_retweets: int
    confidence_score: float
    factors: Dict[str, Any] = {}
    suggestions: List[str] = []
