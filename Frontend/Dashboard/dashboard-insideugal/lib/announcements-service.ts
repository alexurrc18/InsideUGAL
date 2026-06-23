import { z } from "zod";

import { apiRequest } from "./api-client";
import { announcementSchema, announcementsSchema } from "./api-schemas";
import type { Announcement } from "./api-types";

export const announcementsService = {
  list: () => apiRequest("/announcements/", announcementsSchema),

  create: (data: Partial<Announcement>) =>
    apiRequest("/announcements/", announcementSchema, {
      method: "POST",
      body: data,
    }),

  update: (id: number, data: Partial<Announcement>) =>
    apiRequest(`/announcements/${id}`, announcementSchema, {
      method: "PATCH",
      body: data,
    }),

  delete: (id: number) =>
    apiRequest(`/announcements/${id}`, z.unknown(), {
      method: "DELETE",
    }),
};
