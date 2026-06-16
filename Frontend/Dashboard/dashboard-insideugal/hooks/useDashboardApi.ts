"use client";

import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";
import { apiClient } from "@/lib/api-client";
import {
  announcementsSchema,
  coursesSchema,
  facultiesSchema,
  userSchema,
} from "@/lib/api-schemas";
import type { Announcement } from "@/lib/api-types";

export function useAnnouncements() {
  return useApiQuery({
    path: "/announcements",
    queryKey: ["announcements"],
    schema: announcementsSchema,
  });
}

export function useCreateAnnouncement() {
  return useApiMutation<Announcement, Partial<Announcement>>({
    mutationFn: (data) => apiClient.createAnnouncement(data),
    invalidateKeys: [["announcements"]],
  });
}

export function useUpdateAnnouncement() {
  return useApiMutation<Announcement, { id: number; data: Partial<Announcement> }>({
    mutationFn: ({ id, data }) => apiClient.updateAnnouncement(id, data),
    invalidateKeys: [["announcements"]],
  });
}

export function useDeleteAnnouncement() {
  return useApiMutation<any, number>({
    mutationFn: (id) => apiClient.deleteAnnouncement(id),
    invalidateKeys: [["announcements"]],
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
