"use client";

import { useApiQuery } from "@/hooks/useApiQuery";
import {
  announcementsSchema,
  coursesSchema,
  facultiesSchema,
  userSchema,
} from "@/lib/api-schemas";

export function useAnnouncements() {
  return useApiQuery({
    path: "/announcements/",
    queryKey: ["announcements"],
    schema: announcementsSchema,
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
