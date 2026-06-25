"use client";

import { useQuery } from "@tanstack/react-query";

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

export function useAnnouncements(params?: { announcement_type?: string; faculty_id?: number; page?: number; size?: number }) {
  return useQuery({
    queryKey: ["announcements", params],
    queryFn: () => announcementsService.list(params),
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

export function useCourses() {
  return useApiQuery({
    path: "/courses",
    queryKey: ["courses"],
    schema: coursesSchema,
  });
}

export function useFaculties() {
  return useApiQuery({
    path: "/faculties",
    queryKey: ["faculties"],
    schema: facultiesSchema,
  });
}

export function useCurrentUser() {
  return useApiQuery({
    path: "/users/me",
    queryKey: ["users", "me"],
    retry: false,
    schema: userSchema,
  });
}
