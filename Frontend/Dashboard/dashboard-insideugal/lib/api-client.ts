import { z } from "zod";

import {
  announcementSchema,
  announcementsSchema,
  coursesSchema,
  facultiesSchema,
  facultySchema,
  userSchema,
} from "./api-schemas";
import type { Announcement, ApiErrorBody, ApiRequestOptions } from "./api-types";

// 👉 REPARAT: Forțăm http în mod explicit pe local pentru a preveni ERR_SSL_PROTOCOL_ERROR
// Chiar dacă în .env ai din greșeală "https", codul de mai jos se va asigura că rămâne "http" pe localhost.
const rawUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ?? "http://localhost:8002";
export const apiBaseUrl = rawUrl.includes("localhost") ? rawUrl.replace("https://", "http://") : rawUrl;

export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const token = window.localStorage.getItem("access_token");
  if (!token || token === "undefined" || token === "null") {
    return null;
  }

  return token.replace(/^Bearer\s+/i, "").trim();
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const token = window.localStorage.getItem("refresh_token");
  if (!token || token === "undefined" || token === "null") {
    return null;
  }

  return token.trim();
}

type AuthSessionPayload = {
  access_token?: unknown;
  refresh_token?: unknown;
  token_type?: unknown;
  expires_in?: unknown;
  expires_at?: unknown;
};

export function storeAuthSession(payload: AuthSessionPayload): string | null {
  if (typeof window === "undefined" || typeof payload.access_token !== "string" || !payload.access_token.trim()) {
    return null;
  }

  const accessToken = payload.access_token.trim();
  window.localStorage.setItem("access_token", accessToken);

  if (typeof payload.refresh_token === "string" && payload.refresh_token.trim()) {
    window.localStorage.setItem("refresh_token", payload.refresh_token.trim());
  }

  window.localStorage.setItem("token_type", typeof payload.token_type === "string" ? payload.token_type : "bearer");

  if (typeof payload.expires_in === "number") {
    window.localStorage.setItem("expires_in", String(payload.expires_in));
  }

  if (typeof payload.expires_at === "number") {
    window.localStorage.setItem("expires_at", String(payload.expires_at));
  }

  return accessToken;
}

export function clearAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem("access_token");
  window.localStorage.removeItem("refresh_token");
  window.localStorage.removeItem("token_type");
  window.localStorage.removeItem("expires_in");
  window.localStorage.removeItem("expires_at");
}

export function getAuthHeaders(headers?: HeadersInit): Headers {
  const requestHeaders = new Headers(headers);
  if (!requestHeaders.has("Authorization")) {
    const token = getStoredAccessToken();
    if (token) {
      requestHeaders.set("Authorization", `Bearer ${token}`);
    }
  }
  return requestHeaders;
}

let refreshPromise: Promise<string | null> | null = null;

export async function refreshAuthSession(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = fetch(`${apiBaseUrl}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
      .then(async (response) => {
        const payload = (await readJson(response)) as AuthSessionPayload;

        if (!response.ok) {
          clearAuthSession();
          return null;
        }

        return storeAuthSession(payload);
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const execute = () =>
    fetch(`${apiBaseUrl}${path}`, {
      ...options,
      credentials: options.credentials ?? "include",
      headers: getAuthHeaders(options.headers),
    });

  let response = await execute();

  if (response.status === 401 && (await refreshAuthSession())) {
    response = await execute();
  }

  return response;
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

export async function apiRequest<TResponse>(
  path: string,
  schema: z.ZodType<TResponse>,
  options: ApiRequestOptions = {},
): Promise<TResponse> {
  const body = toBody(options.body);
  const execute = () =>
    fetch(`${apiBaseUrl}${path}`, {
      ...options,
      body,
      credentials: options.credentials ?? "include",
      headers: toHeaders(options.headers, body !== undefined),
    });

  let response = await execute();

  if (response.status === 401 && (await refreshAuthSession())) {
    response = await execute();
  }

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
  getCourses: () => apiRequest("/courses", coursesSchema),
  getFaculties: () => apiRequest("/faculties", facultiesSchema),
  getFaculty: (id: number) => apiRequest(`/faculties/${id}`, facultySchema),
  getCurrentUser: () => apiRequest("/users/me", userSchema),
};
