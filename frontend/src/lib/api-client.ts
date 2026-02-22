import type {
  Post,
  PostCreate,
  PostUpdate,
  Template,
  TemplateCreate,
  TemplateUpdate,
  Schedule,
  ScheduleCreate,
  ScheduleUpdate,
  FollowTarget,
  FollowStats,
  PostAnalytics,
  AppSetting,
  PdcaLog,
  DashboardData,
  AIGenerateRequest,
  AIGenerateResponse,
  AIImproveRequest,
  AIImproveResponse,
  AnalyticsOverview,
  AnalyticsTrend,
  ApiUsage,
  HealthCheck,
} from "@/types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const config: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    let message = `API error: ${response.status}`;
    try {
      const errorData = await response.json();
      message = errorData.detail || errorData.message || message;
    } catch {
      // Use default message
    }
    throw new ApiError(message, response.status);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Posts API
export const postsApi = {
  list: (params?: { status?: string; skip?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.skip) query.set("skip", String(params.skip));
    if (params?.limit) query.set("limit", String(params.limit));
    const qs = query.toString();
    return fetchApi<Post[]>(`/api/posts${qs ? `?${qs}` : ""}`);
  },

  get: (id: number) => fetchApi<Post>(`/api/posts/${id}`),

  create: (data: PostCreate) =>
    fetchApi<Post>("/api/posts", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: number, data: PostUpdate) =>
    fetchApi<Post>(`/api/posts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetchApi<void>(`/api/posts/${id}`, { method: "DELETE" }),

  publish: (id: number) =>
    fetchApi<Post>(`/api/posts/${id}/publish`, { method: "POST" }),
};

// Templates API
export const templatesApi = {
  list: (params?: { skip?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.skip) query.set("skip", String(params.skip));
    if (params?.limit) query.set("limit", String(params.limit));
    const qs = query.toString();
    return fetchApi<Template[]>(`/api/templates${qs ? `?${qs}` : ""}`);
  },

  create: (data: TemplateCreate) =>
    fetchApi<Template>("/api/templates", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: number, data: TemplateUpdate) =>
    fetchApi<Template>(`/api/templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetchApi<void>(`/api/templates/${id}`, { method: "DELETE" }),
};

// Schedules API
export const schedulesApi = {
  list: (params?: { skip?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.skip) query.set("skip", String(params.skip));
    if (params?.limit) query.set("limit", String(params.limit));
    const qs = query.toString();
    return fetchApi<Schedule[]>(`/api/schedules${qs ? `?${qs}` : ""}`);
  },

  create: (data: ScheduleCreate) =>
    fetchApi<Schedule>("/api/schedules", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: number, data: ScheduleUpdate) =>
    fetchApi<Schedule>(`/api/schedules/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetchApi<void>(`/api/schedules/${id}`, { method: "DELETE" }),

  toggle: (id: number) =>
    fetchApi<Schedule>(`/api/schedules/${id}/toggle`, { method: "POST" }),
};

// Follows API
export const followsApi = {
  list: (params?: { status?: string; skip?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.skip) query.set("skip", String(params.skip));
    if (params?.limit) query.set("limit", String(params.limit));
    const qs = query.toString();
    return fetchApi<FollowTarget[]>(`/api/follows${qs ? `?${qs}` : ""}`);
  },

  discover: (keyword: string) =>
    fetchApi<FollowTarget[]>(`/api/follows/discover`, {
      method: "POST",
      body: JSON.stringify({ keyword }),
    }),

  execute: (id: number) =>
    fetchApi<FollowTarget>(`/api/follows/${id}/execute`, { method: "POST" }),

  stats: () => fetchApi<FollowStats>("/api/follows/stats"),
};

// Analytics API
export const analyticsApi = {
  overview: () => fetchApi<AnalyticsOverview>("/api/analytics/overview"),

  postAnalytics: (postId: number) =>
    fetchApi<PostAnalytics[]>(`/api/analytics/posts/${postId}`),

  trends: (params?: { days?: number }) => {
    const query = new URLSearchParams();
    if (params?.days) query.set("days", String(params.days));
    const qs = query.toString();
    return fetchApi<AnalyticsTrend[]>(
      `/api/analytics/trends${qs ? `?${qs}` : ""}`
    );
  },

  collect: () =>
    fetchApi<{ message: string }>("/api/analytics/collect", {
      method: "POST",
    }),
};

// AI API
export const aiApi = {
  generate: (data: AIGenerateRequest) =>
    fetchApi<AIGenerateResponse>("/api/ai/generate", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  improve: (data: AIImproveRequest) =>
    fetchApi<AIImproveResponse>("/api/ai/improve", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Settings API
export const settingsApi = {
  get: (category?: string) => {
    const query = new URLSearchParams();
    if (category) query.set("category", category);
    const qs = query.toString();
    return fetchApi<AppSetting[]>(`/api/settings${qs ? `?${qs}` : ""}`);
  },

  update: (key: string, value: string) =>
    fetchApi<AppSetting>(`/api/settings/${key}`, {
      method: "PUT",
      body: JSON.stringify({ value }),
    }),

  testConnection: () =>
    fetchApi<{ success: boolean; message: string }>(
      "/api/settings/test-connection",
      { method: "POST" }
    ),

  apiUsage: () => fetchApi<ApiUsage>("/api/settings/api-usage"),
};

// Dashboard API
export const dashboardApi = {
  get: () => fetchApi<DashboardData>("/api/dashboard"),
};

// Health API
export const healthApi = {
  check: () => fetchApi<HealthCheck>("/api/health"),
};

// PDCA API
export const pdcaApi = {
  list: () => fetchApi<PdcaLog[]>("/api/pdca"),
  latest: () => fetchApi<PdcaLog>("/api/pdca/latest"),
};
