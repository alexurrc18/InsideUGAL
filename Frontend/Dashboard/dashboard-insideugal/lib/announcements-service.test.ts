import { afterEach, expect, test, vi } from "vitest";

import { announcementsService } from "./announcements-service";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function stubLocalStorage() {
  vi.stubGlobal("window", {
    localStorage: {
      getItem: vi.fn((key: string) => (key === "access_token" ? "test-token" : null)),
    },
  });
}

function announcementPayload() {
  return {
    type: "NOUTATE",
    content: "Body",
    created_at: "2026-06-17T12:00:00+00:00",
    created_by: 1,
    id: 1,
    is_pinned: false,
    title: "Title",
    updated_at: "2026-06-17T12:00:00+00:00",
  };
}

test("announcementsService update uses PATCH with auth", async () => {
  stubLocalStorage();
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async (_url, _init) =>
    new Response(JSON.stringify(announcementPayload()), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    }),
  );
  vi.stubGlobal("fetch", fetchMock);

  await announcementsService.update(1, { title: "Updated" });

  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  const headers = new Headers(init?.headers);

  expect(url).toContain("/announcements/1");
  expect(init?.method).toBe("PATCH");
  expect(init?.credentials).toBe("include");
  expect(headers.get("Authorization")).toBe("Bearer test-token");
});

test("announcementsService create uses the authenticated collection endpoint", async () => {
  stubLocalStorage();
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async (url, init) => 
    new Response(JSON.stringify(announcementPayload()), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    }),
  );
  vi.stubGlobal("fetch", fetchMock);

  await announcementsService.create({ title: "Title", content: "Body" });

  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  const headers = new Headers(init?.headers);

  expect(url).toContain("/announcements/");
  expect(init?.method).toBe("POST");
  expect(init?.credentials).toBe("include");
  expect(headers.get("Authorization")).toBe("Bearer test-token");
});
