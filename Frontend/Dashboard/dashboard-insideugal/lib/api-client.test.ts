import { afterEach, expect, test, vi } from "vitest";
import { z } from "zod";

import { apiRequest, getAuthHeaders } from "./api-client";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function stubLocalStorage(token: string | null) {
  vi.stubGlobal("window", {
    localStorage: {
      getItem: vi.fn((key: string) => (key === "access_token" ? token : null)),
    },
  });
}

test("getAuthHeaders sends the saved access token as a Bearer token", () => {
  stubLocalStorage("test-token");

  const headers = getAuthHeaders();

  expect(headers.get("Authorization")).toBe("Bearer test-token");
});

test.each(["undefined", "null", null])("getAuthHeaders ignores invalid stored token %s", (token: any) => {
  stubLocalStorage(token);

  const headers = getAuthHeaders();

  expect(headers.has("Authorization")).toBe(false);
});

test("apiRequest includes auth headers and credentials for mutations", async () => {
  stubLocalStorage("Bearer test-token");
  const fetchMock = vi.fn<[string, RequestInit], Promise<Response>>(async () =>
    new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    }),
  );
  vi.stubGlobal("fetch", fetchMock);

  await apiRequest("/announcements/", z.object({ ok: z.boolean() }), {
    method: "POST",
    body: { title: "Test", content: "Body" },
  });

  expect(fetchMock).toHaveBeenCalledOnce();
  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  const headers = new Headers(init?.headers);

  expect(init?.credentials).toBe("include");
  expect(headers.get("Authorization")).toBe("Bearer test-token");
  expect(headers.get("Content-Type")).toBe("application/json");
});

test.each([
  { body: undefined, method: undefined, path: "/announcements/" },
  { body: { title: "Test", content: "Body" }, method: "POST", path: "/announcements/" },
  { body: { title: "Updated" }, method: "PATCH", path: "/announcements/1" },
  { body: undefined, method: "DELETE", path: "/announcements/1" },
])("$method request to $path is authenticated", async ({ body, method, path }: any) => {
  stubLocalStorage("test-token");
  const fetchMock = vi.fn<[string, RequestInit], Promise<Response>>(async () =>
    new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    }),
  );
  vi.stubGlobal("fetch", fetchMock);

  await apiRequest(path, z.object({ ok: z.boolean() }), { body, method });

  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  const headers = new Headers(init?.headers);

  expect(init?.credentials).toBe("include");
  expect(headers.get("Authorization")).toBe("Bearer test-token");
});
