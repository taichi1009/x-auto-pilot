// Post types
export interface Post {
  id: number;
  content: string;
  status: "draft" | "scheduled" | "posted" | "failed";
  post_type: "original" | "ai_generated" | "template";
  x_tweet_id?: string | null;
  posted_at?: string | null;
  retry_count: number;
  schedule_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface PostCreate {
  content: string;
  status?: string;
  post_type?: string;
  schedule_id?: number | null;
}

export interface PostUpdate {
  content?: string;
  status?: string;
  post_type?: string;
  schedule_id?: number | null;
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

// AI types
export interface AIGenerateRequest {
  genre: string;
  style: string;
  count: number;
  custom_prompt?: string | null;
}

export interface AIGenerateResponse {
  posts: string[];
  genre: string;
  style: string;
}

export interface AIImproveRequest {
  content: string;
  feedback?: string | null;
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
