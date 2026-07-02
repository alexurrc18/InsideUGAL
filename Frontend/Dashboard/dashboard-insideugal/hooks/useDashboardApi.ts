"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/lib/api-client";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";
import { announcementsService } from "@/lib/announcements-service";
import type { GenerateBannerPayload, GenerateBannerResult } from "@/lib/announcements-service";
import {
  coursesSchema,
  facultiesSchema,
  userSchema,
} from "@/lib/api-schemas";
import type { Announcement } from "@/lib/api-types";

// Scheme Zod
const complaintsGenericSchema = z.union([
  z.array(z.unknown()),
  z.object({ items: z.array(z.unknown()) }).passthrough()
]);

// --- ANNOUNCEMENTS ---
export function useAnnouncements() {
  return useQuery({
    queryKey: ["announcements"],
    queryFn: () => announcementsService.list(),
  });
}

export function useCreateAnnouncement() {
  return useApiMutation<Announcement, Partial<Announcement>>({
    mutationFn: (data) => announcementsService.create(data),
    invalidateKeys: [["announcements"]],
  });
}

export function useUpdateAnnouncement() {
  return useApiMutation<Announcement, { id: number; data: Partial<Announcement> }>({
    mutationFn: ({ id, data }) => announcementsService.update(id, data),
    invalidateKeys: [["announcements"]],
  });
}

export function useDeleteAnnouncement() {
  return useApiMutation<unknown, number>({
    mutationFn: (id) => announcementsService.delete(id),
    invalidateKeys: [["announcements"]],
  });
}

export function useGenerateAiBanner() {
  return useApiMutation<GenerateBannerResult, GenerateBannerPayload>({
    mutationFn: (data) => announcementsService.generateBanner(data),
  });
}

// --- QUERIES ---
export function useCourses() {
  return useApiQuery({ path: "/courses", queryKey: ["courses"], schema: coursesSchema });
}

export function useFaculties() {
  return useApiQuery({ path: "/faculties", queryKey: ["faculties"], schema: facultiesSchema });
}

export function useCurrentUser() {
  return useApiQuery({ path: "/users/me", queryKey: ["users", "me"], retry: false, schema: userSchema });
}

export function useComplaints() {
  return useApiQuery({ path: "/complaints", queryKey: ["complaints"], schema: complaintsGenericSchema });
}

// --- FACILITIES ---
export function useFacilities() {
  return useApiQuery({
    path: "/facilities",
    queryKey: ["facilities"],
    schema: z.object({ items: z.array(z.unknown()), total: z.number() }).passthrough(),
  });
}

export function useCreateFacility() {
  return useApiMutation<any, any>({
    mutationFn: (data) => apiRequest("/facilities/", z.any(), { method: "POST", body: data }),
    invalidateKeys: [["facilities"]],
  });
}

export function useUpdateFacility() {
  return useApiMutation<any, { id: number; data: any }>({
    mutationFn: ({ id, data }) => apiRequest(`/facilities/${id}/`, z.any(), { method: "PATCH", body: data }),
    invalidateKeys: [["facilities"]],
  });
}

export function useDeleteFacility() {
  return useApiMutation<unknown, number>({
    mutationFn: (id) => apiRequest(`/facilities/${id}/`, z.any(), { method: "DELETE" }),
    invalidateKeys: [["facilities"]],
  });
}