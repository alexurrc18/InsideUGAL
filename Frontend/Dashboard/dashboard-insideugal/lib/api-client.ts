import type { z } from "zod";

import {
  announcementsSchema,
  coursesSchema,
  facultiesSchema,
  facultySchema,
  userSchema,
} from "./api-schemas";
import type { ApiErrorBody, ApiRequestOptions } from "./api-types";

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ??
  "http://localhost:8002";

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

  if (!requestHeaders.has("Authorization") && typeof window !== "undefined") {
    const token = window.localStorage.getItem("access_token");
    if (token) {
      requestHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

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
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    body,
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
  getAnnouncements: () => apiRequest("/announcements", announcementsSchema),
  getCourses: () => apiRequest("/courses", coursesSchema),
  getFaculties: () => apiRequest("/faculties", facultiesSchema),
  getFaculty: (id: number) => apiRequest(`/faculties/${id}`, facultySchema),
  getCurrentUser: () => apiRequest("/users/me", userSchema),
};
