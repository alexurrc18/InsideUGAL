import { z } from "zod";

import {
    announcementSchema,
    announcementsSchema,
    coursesSchema,
    facultiesSchema,
    facilitySchema,
    facilitiesSchema,
    notificationSchema,
    notificationsSchema,
    profileSchema,
    userSchema,
} from "./api-schemas";
import type { Announcement, ApiErrorBody, ApiRequestOptions } from "./api-types";

import { FacilityItem } from "../types/facility"; // Ajustează calea dacă e nevoie
import { facultySchema } from "./api-schemas";

// 👉 REPARAT: Forțăm http în mod explicit pe local pentru a preveni ERR_SSL_PROTOCOL_ERROR
// Chiar dacă în .env ai din greșeală "https", codul de mai jos se va asigura că rămâne "http" pe localhost.
const rawUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ?? "http://localhost:8002";
export const apiBaseUrl = rawUrl.includes("localhost") ? rawUrl.replace("https://", "http://") : rawUrl;

export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  const token = window.localStorage.getItem("access_token");
  if (!token || token === "undefined" || token === "null") {
    return null;
  }

  return token.replace(/^Bearer\s+/i, "").trim();
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  return window.localStorage.getItem("refresh_token");
}

export function getTokenExpiresAt(): number | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  const stored = window.localStorage.getItem("token_expires_at");
  return stored ? Number(stored) : null;
}

export function setAuthToken(
  token: string | null,
  tokenType: string | null = null,
  refreshToken: string | null = null,
  expiresAt: number | null = null,
) {
  if (typeof window === "undefined" || !window.localStorage) return;
  if (token === null) {
    window.localStorage.removeItem("access_token");
    window.localStorage.removeItem("token_type");
    window.localStorage.removeItem("refresh_token");
    window.localStorage.removeItem("token_expires_at");
  } else {
    window.localStorage.setItem("access_token", token);
    window.localStorage.setItem("token_type", tokenType || "bearer");
    if (refreshToken) {
      window.localStorage.setItem("refresh_token", refreshToken);
    }
    if (expiresAt) {
      window.localStorage.setItem("token_expires_at", String(expiresAt));
    }
  }
}

export function getAuthHeaders(headers?: HeadersInit): Headers {
  const requestHeaders = new Headers(headers);
  const token = getStoredAccessToken();
  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }
  return requestHeaders;
}

export class ApiClientError extends Error {
  readonly body: ApiErrorBody | null;
  readonly status: number;

  constructor(message: string, status: number, body: ApiErrorBody | null) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.body = body;
  }
}

function toHeaders(headers: HeadersInit | undefined, hasJsonBody: boolean) {
  const requestHeaders = new Headers(headers);

  if (hasJsonBody && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (!requestHeaders.has("Accept")) {
    requestHeaders.set("Accept", "application/json");
  }

  getAuthHeaders(requestHeaders).forEach((value, key) => requestHeaders.set(key, value));

  return requestHeaders;
}

function toBody(body: unknown): BodyInit | undefined {
  if (body === undefined) {
    return undefined;
  }

  if (
    typeof body === "string" ||
    body instanceof Blob ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof ArrayBuffer
  ) {
    return body;
  }

  return JSON.stringify(body);
}

async function readJson(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();

  if (!text) {
    return null;
  }

  return JSON.parse(text) as unknown;
}

function parseErrorBody(payload: unknown): ApiErrorBody | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as Record<string, unknown>;
  const message = candidate.message ?? candidate.detail;

  if (typeof message !== "string") {
    return null;
  }

  return {
    code: typeof candidate.code === "string" ? candidate.code : undefined,
    message,
    status: typeof candidate.status === "number" ? candidate.status : undefined,
  };
}

let proactiveRefreshPromise: Promise<string | null> | null = null;

export async function proactiveRefreshIfNeeded(): Promise<string | null> {
  if (typeof window === "undefined" || !window.localStorage) return null;
  const expiresAt = getTokenExpiresAt();
  if (!expiresAt) return null;
  const secondsLeft = expiresAt - Math.floor(Date.now() / 1000);
  // Only refresh when within 60s of expiry and the token isn't already way past expiry
  if (secondsLeft > 60 || secondsLeft < -30) return null;

  if (proactiveRefreshPromise) return proactiveRefreshPromise;

  proactiveRefreshPromise = (async () => {
    try {
      const storedRefreshToken = getStoredRefreshToken();
      if (!storedRefreshToken) return null;

      const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({ refresh_token: storedRefreshToken }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      const newAccessToken = data?.access_token;
      const newRefreshToken = data?.refresh_token ?? null;
      const newExpiresAt = data?.expires_at ?? null;

      if (newAccessToken) {
        setAuthToken(newAccessToken, "bearer", newRefreshToken, newExpiresAt);
        return newAccessToken;
      }
      return null;
    } catch {
      return null;
    } finally {
      proactiveRefreshPromise = null;
    }
  })();

  return proactiveRefreshPromise;
}

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

async function handle401Error(retryRequest: () => Promise<Response>): Promise<Response> {
  if (isRefreshing) {
    return new Promise<string | null>((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    }).then(async (token) => {
      if (!token) {
        throw new Error("Session expired");
      }
      return retryRequest();
    });
  }

  isRefreshing = true;

  try {
    const storedRefreshToken = getStoredRefreshToken();
    if (!storedRefreshToken) {
      throw new Error("No refresh token found");
    }

    const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ refresh_token: storedRefreshToken }),
    });

    if (!response.ok) {
      throw new Error("Refresh token expired or invalid");
    }

    const data = await response.json();
    const newAccessToken = data?.access_token;
    const newRefreshToken = data?.refresh_token ?? null;
    const newExpiresAt = data?.expires_at ?? null;

    if (newAccessToken) {
      setAuthToken(newAccessToken, "bearer", newRefreshToken, newExpiresAt);
      processQueue(null, newAccessToken);
      return retryRequest();
    } else {
      throw new Error("No access token returned from refresh");
    }
  } catch (refreshError) {
    processQueue(refreshError, null);
    setAuthToken(null);
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw refreshError;
  } finally {
    isRefreshing = false;
  }
}

// Monkeypatch global fetch on client side to handle session refresh globally
if (typeof window !== "undefined" && window.fetch) {
  const originalFetch = window.fetch;

  window.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const urlString =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url;

    const isAuthEndpoint =
      urlString.includes("/auth/login") ||
      urlString.includes("/auth/refresh") ||
      urlString.includes("/auth/logout") ||
      urlString.includes("/login") ||
      urlString.includes("/refresh") ||
      urlString.includes("/logout");

    // 1. Proactive refresh before request
    if (!isAuthEndpoint) {
      await proactiveRefreshIfNeeded();
    }

    const runFetch = async (): Promise<Response> => {
      let finalInit = init;
      if (!isAuthEndpoint && init?.headers) {
        const token = getStoredAccessToken();
        if (token) {
          const newHeaders = new Headers(init.headers);
          newHeaders.set("Authorization", `Bearer ${token}`);
          finalInit = { ...init, headers: newHeaders };
        }
      }
      return originalFetch(input, finalInit);
    };

    let response = await runFetch();

    // 2. Reactive 401 handling
    if (response.status === 401 && !isAuthEndpoint) {
      try {
        response = await handle401Error(runFetch);
      } catch (err) {
        throw err;
      }
    }

    return response;
  };
}

export async function apiRequest<TResponse>(
  path: string,
  schema: z.ZodType<TResponse>,
  options: ApiRequestOptions = {},
): Promise<TResponse> {
  const body = toBody(options.body);
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    body,
    credentials: options.credentials ?? "include",
    headers: toHeaders(options.headers, body !== undefined),
  });

  const payload = await readJson(response);

  if (!response.ok) {
    const errorBody = parseErrorBody(payload);
    throw new ApiClientError(
      errorBody?.message ?? `API request failed with status ${response.status}`,
      response.status,
      errorBody,
    );
  }

  return schema.parse(payload);
}

export const apiClient = {
  getAnnouncements: () => apiRequest("/announcements/", announcementsSchema),
    
  createAnnouncement: (data: Partial<Announcement>) => 
    apiRequest("/announcements/", announcementSchema, {
      method: "POST",
      body: data,
    }),
  updateAnnouncement: (id: number, data: Partial<Announcement>) =>
    apiRequest(`/announcements/${id}`, announcementSchema, {
      method: "PATCH",
      body: data,
    }),
  deleteAnnouncement: (id: number) =>
    apiRequest(`/announcements/${id}`, z.unknown(), {
      method: "DELETE",
    }),

    getFaculties: () => apiRequest("/faculties", facultiesSchema),
  getFaculty: (id: number) => apiRequest(`/faculties/${id}`, facultySchema),
  
  getFacilities: () =>
    apiRequest("/facilities", facilitiesSchema),

createFacility: (data: Partial<FacilityItem>) =>
    apiRequest("/facilities/", facilitySchema, {
        method: "POST",
        body: data,
    }),

updateFacility: (id: number, data: Partial<FacilityItem>) =>
    apiRequest(`/facilities/${id}`, facilitySchema, {
        method: "PATCH",
        body: data,
    }),

deleteFacility: (id: number) =>
    apiRequest(`/facilities/${id}`, z.unknown(), {
        method: "DELETE",
    }),

  // Restul metodelor (getCourses, getNotifications etc.) rămân mai jos...
  getCourses: () => apiRequest("/courses", coursesSchema),
  getCurrentUser: () => apiRequest("/users/me", userSchema),
  getCurrentProfile: () => apiRequest("/profiles/me", profileSchema),
  getNotifications: (params?: { faculty_id?: number; page?: number; size?: number }) => {
    const query = params
      ? "?" + new URLSearchParams(
          Object.fromEntries(
            Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
          )
        ).toString()
      : "";
    return apiRequest(`/notifications/${query}`, notificationsSchema);
  },
  getMyNotifications: (params?: { page?: number; size?: number }) => {
    const query = params
      ? "?" + new URLSearchParams(
          Object.fromEntries(
            Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
          )
        ).toString()
      : "";
    return apiRequest(`/notifications/me${query}`, notificationsSchema);
  },
  sendNotification: (data: { title: string; body: string; action?: string; faculty_id?: number | null }) =>
    apiRequest("/notifications/send", notificationSchema, {
      method: "POST",
      body: data,
    }),
};
