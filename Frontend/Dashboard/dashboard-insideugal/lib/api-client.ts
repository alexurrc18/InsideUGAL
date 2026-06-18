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
  const headers = toHeaders(options.headers, body !== undefined);

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    body,
    credentials: options.credentials ?? "include",
    headers,
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
  getCourses: () => apiRequest("/courses", coursesSchema),
  getFaculties: () => apiRequest("/faculties", facultiesSchema),
  getFaculty: (id: number) => apiRequest(`/faculties/${id}`, facultySchema),
  getCurrentUser: () => apiRequest("/users/me", userSchema),
};
