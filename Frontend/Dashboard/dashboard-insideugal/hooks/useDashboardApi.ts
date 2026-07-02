"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod"; // Adăugat pentru validarea schemei generice

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

// Definim o schemă Zod flexibilă pentru Sesizări pentru a satisface cerința useApiQuery
const complaintsGenericSchema = z.union([
  z.array(z.unknown()),
  z.object({
    items: z.array(z.unknown())
  }).passthrough()
]);

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

// Hook-ul nou adăugat pentru al doilea card (Sesizări Active)
export function useComplaints() {
  return useApiQuery({
    path: "/complaints", // Schimbă cu '/sesizari' dacă ruta de backend diferă
    queryKey: ["complaints"],
    schema: complaintsGenericSchema, // Schema pasată obligatoriu pentru a rezolva eroarea TS2345
  });
}

// Adaugă acestea în src/hooks/useDashboardApi.ts
export function useFacilities() {
  return useApiQuery({
    path: "/facilities",
    queryKey: ["facilities"],
    // Presupunând că ai un schema pentru facilități sau folosești una generică
    schema: z.object({ items: z.array(z.unknown()), total: z.number() }).passthrough(),
  });
}

// În hooks/useDashboardApi.ts
export function useCreateFacility() {
  const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8002";
  
  return useApiMutation<any, any>({
    mutationFn: (data) => 
      fetch(`${apiUrl}/facilities/`, { // Adaugă URL-ul complet aici
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }).then((res) => {
        if (!res.ok) throw new Error("Eroare la salvare");
        return res.json();
      }),
    invalidateKeys: [["facilities"]],
  });
}

export function useUpdateFacility() {
  return useApiMutation<any, { id: number; data: any }>({
    mutationFn: ({ id, data }) => fetch(`/facilities/${id}`, { method: "PATCH", body: JSON.stringify(data) }).then(res => res.json()),
    invalidateKeys: [["facilities"]],
  });
}

// În hooks/useDashboardApi.ts
export function useDeleteFacility() {
  const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8002";
  
  return useApiMutation<unknown, number>({
    mutationFn: (id) => 
      fetch(`${apiUrl}/facilities/${id}`, { // Adaugă URL-ul complet aici
        method: "DELETE",
      }).then((res) => {
        if (!res.ok) throw new Error("Eroare la ștergere");
        return res;
      }),
    invalidateKeys: [["facilities"]],
  });
}