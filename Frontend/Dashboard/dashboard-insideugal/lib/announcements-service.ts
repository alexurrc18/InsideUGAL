import { z } from "zod";

import { apiRequest } from "./api-client";
import { announcementSchema, announcementsSchema } from "./api-schemas";
import type { Announcement } from "./api-types";

export interface GenerateBannerPayload {
  title: string;
  description: string;
  faculty?: string;
}

const generateBannerSchema = z.object({
  success: z.boolean(),
  image_url: z.string().nullable().optional(),
  image_base64: z.string().nullable().optional(),
  error_message: z.string().nullable().optional(),
  used_controlnet: z.boolean().optional(),
});

export type GenerateBannerResult = z.infer<typeof generateBannerSchema>;

export const announcementsService = {
  list: (params?: { announcement_type?: string; faculty_id?: number }) => {
  const query = params
    ? "?" + new URLSearchParams(
        Object.fromEntries(
          Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
        )
      ).toString()
    : "";
  return apiRequest(`/announcements/${query}`, announcementsSchema);
},

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

  generateBanner: (data: GenerateBannerPayload) =>
    apiRequest("/api/v1/llm/generate-banner", generateBannerSchema, {
      method: "POST",
      body: data,
    }),
};