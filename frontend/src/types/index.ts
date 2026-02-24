// Post Format
export type PostFormat = "tweet" | "long_form" | "thread";

// Thread Post
export interface ThreadPost {
  id: number;
  parent_post_id: number;
  content: string;
  thread_order: number;
  x_tweet_id?: string | null;
  created_at: string;
}

// Post types
export interface Post {
  id: number;
  content: string;
  status: "draft" | "scheduled" | "posted" | "failed";
  post_type: "original" | "ai_generated" | "template";
  post_format: PostFormat;
  x_tweet_id?: string | null;
  posted_at?: string | null;
  retry_count: number;
  predicted_impressions?: number | null;
  image_url?: string | null;
  persona_id?: number | null;
  schedule_id?: number | null;
  thread_posts: ThreadPost[];
  created_at: string;
  updated_at: string;
}

export interface PostCreate {
  content: string;
  status?: string;
  post_type?: string;
  post_format?: PostFormat;
  persona_id?: number | null;
  schedule_id?: number | null;
  thread_contents?: string[];
}

export interface PostUpdate {
  content?: string;
  status?: string;
  post_type?: string;
  post_format?: PostFormat;
  persona_id?: number | null;
  schedule_id?: number | null;
  thread_contents?: string[];
}

// Template types
export interface Template {
  id: number;
  name: string;
  content_pattern: string;
  variables: string[];
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateCreate {
  name: string;
  content_pattern: string;
  variables?: string[];
  category?: string | null;
  is_active?: boolean;
}

export interface TemplateUpdate {
  name?: string;
  content_pattern?: string;
  variables?: string[];
  category?: string | null;
  is_active?: boolean;
}

// Schedule types
export interface Schedule {
  id: number;
  name: string;
  schedule_type: "once" | "recurring";
  cron_expression?: string | null;
  scheduled_at?: string | null;
  is_active: boolean;
  post_type: string;
  ai_prompt?: string | null;
  template_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleCreate {
  name: string;
  schedule_type: string;
  cron_expression?: string | null;
  scheduled_at?: string | null;
  is_active?: boolean;
  post_type?: string;
  ai_prompt?: string | null;
  template_id?: number | null;
}

export interface ScheduleUpdate {
  name?: string;
  schedule_type?: string;
  cron_expression?: string | null;
  scheduled_at?: string | null;
  is_active?: boolean;
  post_type?: string;
  ai_prompt?: string | null;
  template_id?: number | null;
}

// Follow Target types
export interface FollowTarget {
  id: number;
  x_user_id: string;
  x_username: string;
  action: "follow" | "unfollow";
  status: "pending" | "completed" | "failed";
  followed_at?: string | null;
  unfollowed_at?: string | null;
  follow_back: boolean;
  created_at: string;
  updated_at: string;
}

// Post Analytics types
export interface PostAnalytics {
  id: number;
  post_id: number;
  impressions: number;
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
  bookmarks: number;
  profile_visits: number;
  collected_at: string;
  created_at: string;
}

// App Setting types
export interface AppSetting {
  id: number;
  key: string;
  value: string;
  category: string | null;
  created_at: string;
  updated_at: string;
}

// PDCA Log types
export interface PdcaLog {
  id: number;
  analysis_type: string;
  period_start: string;
  period_end: string;
  analysis_result: Record<string, unknown>;
  recommendations: unknown[];
  applied_changes?: Record<string, unknown> | null;
  created_at: string;
}

// Dashboard types
export interface DashboardData {
  total_posts: number;
  posts_today: number;
  api_usage_count: number;
  api_usage_limit: number;
  recent_posts: Post[];
}

// Persona types
export interface Persona {
  id: number;
  name: string;
  description?: string | null;
  personality_traits: string[];
  background_story?: string | null;
  target_audience?: string | null;
  expertise_areas: string[];
  communication_style?: string | null;
  tone?: string | null;
  language_patterns: string[];
  example_posts: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PersonaCreate {
  name: string;
  description?: string;
  personality_traits?: string[];
  background_story?: string;
  target_audience?: string;
  expertise_areas?: string[];
  communication_style?: string;
  tone?: string;
  language_patterns?: string[];
  example_posts?: string[];
}

export interface PersonaUpdate {
  name?: string;
  description?: string;
  personality_traits?: string[];
  background_story?: string;
  target_audience?: string;
  expertise_areas?: string[];
  communication_style?: string;
  tone?: string;
  language_patterns?: string[];
  example_posts?: string[];
}

// Content Strategy types
export interface ContentStrategy {
  id: number;
  name: string;
  content_pillars: string[];
  hashtag_groups: Record<string, string[]>;
  posting_frequency: number;
  optimal_posting_times: string[];
  impression_target: number;
  follower_growth_target: number;
  engagement_rate_target: number;
  content_mix: Record<string, number>;
  avoid_topics: string[];
  competitor_accounts: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContentStrategyCreate {
  name: string;
  content_pillars?: string[];
  hashtag_groups?: Record<string, string[]>;
  posting_frequency?: number;
  optimal_posting_times?: string[];
  impression_target?: number;
  follower_growth_target?: number;
  engagement_rate_target?: number;
  content_mix?: Record<string, number>;
  avoid_topics?: string[];
  competitor_accounts?: string[];
}

export interface ContentStrategyUpdate {
  name?: string;
  content_pillars?: string[];
  hashtag_groups?: Record<string, string[]>;
  posting_frequency?: number;
  optimal_posting_times?: string[];
  impression_target?: number;
  follower_growth_target?: number;
  engagement_rate_target?: number;
  content_mix?: Record<string, number>;
  avoid_topics?: string[];
  competitor_accounts?: string[];
}

// Impression Prediction
export interface ImpressionPrediction {
  predicted_impressions: number;
  predicted_likes: number;
  predicted_retweets: number;
  confidence_score: number;
  factors: Record<string, unknown>;
  suggestions: string[];
}

// AI types
export interface AIGenerateRequest {
  genre: string;
  style: string;
  count: number;
  custom_prompt?: string | null;
  post_format?: PostFormat;
  use_persona?: boolean;
  thread_length?: number;
  language?: string;
  max_length?: number;
}

export interface AIGenerateResponse {
  posts: string[];
  threads?: string[][] | null;
  genre: string;
  style: string;
  post_format: PostFormat;
}

export interface AIImproveRequest {
  content: string;
  feedback?: string | null;
  post_format?: PostFormat;
  language?: string;
  max_length?: number;
}

export interface AIImproveResponse {
  original: string;
  improved: string;
  explanation: string;
}

// Follow Stats
export interface FollowStats {
  total_targets: number;
  pending: number;
  completed: number;
  failed: number;
  follow_backs: number;
}

// Analytics Overview
export interface AnalyticsOverview {
  total_impressions: number;
  total_likes: number;
  total_retweets: number;
  total_replies: number;
  avg_engagement_rate: number;
  top_post: Post | null;
}

// Analytics Trends
export interface AnalyticsTrend {
  date: string;
  impressions: number;
  likes: number;
  retweets: number;
  replies: number;
}

// API Usage
export interface ApiUsage {
  count: number;
  limit: number;
  tier: string;
}

// Health
export interface HealthCheck {
  status: string;
  version?: string;
}

// Auto-Pilot
export interface AutoPilotStatus {
  enabled: boolean;
  auto_post_enabled: boolean;
  auto_post_count: number;
  auto_post_with_image: boolean;
  auto_follow_enabled: boolean;
  auto_follow_keywords: string;
  auto_follow_daily_limit: number;
}

// Auth
export interface User {
  id: number;
  email: string;
  name: string;
  role: "admin" | "user";
  subscription_tier: "free" | "basic" | "pro" | "enterprise";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

// Admin
export interface AdminStats {
  total_users: number;
  active_users: number;
  tier_breakdown: Record<string, number>;
  total_posts: number;
  monthly_revenue: number;
}
