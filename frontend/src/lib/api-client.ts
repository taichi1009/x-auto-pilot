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
  Persona,
  PersonaCreate,
  PersonaUpdate,
  ContentStrategy,
  ContentStrategyCreate,
  ContentStrategyUpdate,
  ImpressionPrediction,
  AutoPilotStatus,
  TokenResponse,
  User,
  AdminStats,
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

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refresh_token");
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) return null;

    const data: TokenResponse = await response.json();
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    return data.access_token;
  } catch {
    return null;
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const token = getAccessToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  let response = await fetch(url, config);

  // If 401, try refreshing the token
  if (response.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      response = await fetch(url, { ...config, headers });
    } else {
      // Refresh failed, redirect to login
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        document.cookie = "has_session=; path=/; max-age=0";
        window.location.href = "/login";
      }
      throw new ApiError("Session expired", 401);
    }
  }

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

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; name: string }) =>
    fetchApi<TokenResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    fetchApi<TokenResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  refresh: (refreshToken: string) =>
    fetchApi<TokenResponse>("/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    }),

  me: () => fetchApi<User>("/api/auth/me"),
};

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

  predict: (data: { content: string; post_format?: string }) =>
    fetchApi<ImpressionPrediction>("/api/ai/predict", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Persona API
export const personaApi = {
  list: () => fetchApi<Persona[]>("/api/persona"),

  getActive: () => fetchApi<Persona | null>("/api/persona/active"),

  create: (data: PersonaCreate) =>
    fetchApi<Persona>("/api/persona", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: number, data: PersonaUpdate) =>
    fetchApi<Persona>(`/api/persona/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetchApi<void>(`/api/persona/${id}`, { method: "DELETE" }),

  activate: (id: number) =>
    fetchApi<Persona>(`/api/persona/${id}/activate`, { method: "POST" }),
};

// Strategy API
export const strategyApi = {
  list: () => fetchApi<ContentStrategy[]>("/api/strategy"),

  getActive: () => fetchApi<ContentStrategy | null>("/api/strategy/active"),

  create: (data: ContentStrategyCreate) =>
    fetchApi<ContentStrategy>("/api/strategy", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: number, data: ContentStrategyUpdate) =>
    fetchApi<ContentStrategy>(`/api/strategy/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetchApi<void>(`/api/strategy/${id}`, { method: "DELETE" }),

  activate: (id: number) =>
    fetchApi<ContentStrategy>(`/api/strategy/${id}/activate`, { method: "POST" }),

  recommendations: () =>
    fetchApi<{ strategy_name?: string; message?: string; recommendations: string[] }>(
      "/api/strategy/recommendations"
    ),
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

// Auto-Pilot API
export const autoPilotApi = {
  status: () => fetchApi<AutoPilotStatus>("/api/auto-pilot/status"),

  toggle: () =>
    fetchApi<AutoPilotStatus>("/api/auto-pilot/toggle", { method: "POST" }),

  updateSettings: (data: Partial<AutoPilotStatus>) =>
    fetchApi<AutoPilotStatus>("/api/auto-pilot/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

// PDCA API
export const pdcaApi = {
  list: () => fetchApi<PdcaLog[]>("/api/pdca"),
  latest: () => fetchApi<PdcaLog>("/api/pdca/latest"),
};

// Admin API
export const adminApi = {
  users: () => fetchApi<User[]>("/api/admin/users"),

  getUser: (id: number) => fetchApi<User>(`/api/admin/users/${id}`),

  updateUser: (id: number, data: { role?: string; is_active?: boolean; subscription_tier?: string }) =>
    fetchApi<User>(`/api/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  stats: () => fetchApi<AdminStats>("/api/admin/stats"),

  posts: (params?: { skip?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.skip) query.set("skip", String(params.skip));
    if (params?.limit) query.set("limit", String(params.limit));
    const qs = query.toString();
    return fetchApi<Post[]>(`/api/admin/posts${qs ? `?${qs}` : ""}`);
  },
};

// Payment API
export const paymentApi = {
  checkout: (tier: string) =>
    fetchApi<{ url: string }>(`/api/payment/checkout?tier=${tier}`, {
      method: "POST",
    }),

  portal: () =>
    fetchApi<{ url: string }>("/api/payment/portal", {
      method: "POST",
    }),
};
