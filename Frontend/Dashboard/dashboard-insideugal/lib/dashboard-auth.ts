"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiBaseUrl, getAuthHeaders, getStoredAccessToken } from "@/lib/api-client";

export type DashboardRole =
  | "STUDENT"
  | "STUDENT_RESPONSABIL"
  | "PROFESOR"
  | "HEAD_CANTINA"
  | "HEAD_FACULTATI"
  | "HEAD_ADMIN";

type ProfileRoleResponse = {
  role?: string | null;
};

const normalizedRoleMap: Record<string, DashboardRole> = {
  STUDENT: "STUDENT",
  STUDENT_RESPONSABIL: "STUDENT_RESPONSABIL",
  PROFESOR: "PROFESOR",
  HEAD_CANTINA: "HEAD_CANTINA",
  HEAD_FACULTATI: "HEAD_FACULTATI",
  HEAD_ADMIN: "HEAD_ADMIN",
  ADMIN: "HEAD_ADMIN",
};

export function normalizeDashboardRole(role: string | null | undefined): DashboardRole | null {
  if (!role) return null;
  return normalizedRoleMap[role.trim().toUpperCase()] ?? null;
}

export function canAccessDashboard(role: DashboardRole | null): boolean {
  return role !== null && role !== "STUDENT";
}

export function canAccessAccounts(role: DashboardRole | null): boolean {
  return role === "HEAD_ADMIN" || role === "HEAD_FACULTATI";
}

export function canAccessMaps(role: DashboardRole | null): boolean {
  return role === "HEAD_ADMIN" || role === "HEAD_FACULTATI";
}

export function canAccessFaculties(role: DashboardRole | null): boolean {
  return canAccessMaps(role);
}

export function canAccessCantina(role: DashboardRole | null): boolean {
  return role === "HEAD_ADMIN" || role === "HEAD_CANTINA";
}

export function canAccessComplaints(role: DashboardRole | null): boolean {
  return role === "HEAD_ADMIN" || role === "HEAD_FACULTATI" || role === "PROFESOR";
}

export function canAccessContent(role: DashboardRole | null): boolean {
  return role === "HEAD_ADMIN" || role === "HEAD_FACULTATI" || role === "PROFESOR" || role === "STUDENT_RESPONSABIL";
}

export function canAccessPath(pathname: string, role: DashboardRole | null): boolean {
  if (!canAccessDashboard(role)) return false;
  if (pathname.startsWith("/conturi")) return canAccessAccounts(role);
  if (pathname.startsWith("/cantina")) return canAccessCantina(role);
  if (pathname.startsWith("/harti")) return canAccessMaps(role);
  if (pathname.startsWith("/facultati")) return canAccessFaculties(role);
  if (pathname.startsWith("/sesizari")) return canAccessComplaints(role);
  if (pathname.startsWith("/noutati") || pathname.startsWith("/evenimente")) return canAccessContent(role);
  return true;
}

export async function fetchCurrentDashboardRole(): Promise<DashboardRole | null> {
  const token = getStoredAccessToken();
  if (!token) return null;

  const response = await fetch(`${apiBaseUrl}/profiles/me`, {
    cache: "no-store",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  if (!response.ok) return null;
  const profile = (await response.json()) as ProfileRoleResponse;
  return normalizeDashboardRole(profile.role);
}

export function useDashboardRole() {
  const [role, setRole] = useState<DashboardRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchCurrentDashboardRole()
      .then((resolvedRole) => {
        if (!cancelled) setRole(resolvedRole);
      })
      .catch(() => {
        if (!cancelled) setRole(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { role, loading };
}

export function useRequireDashboardAccess(canAccess: (role: DashboardRole | null) => boolean) {
  const router = useRouter();
  const { role, loading } = useDashboardRole();

  useEffect(() => {
    if (!loading && !canAccess(role)) {
      router.replace("/login");
    }
  }, [canAccess, loading, role, router]);

  return { role, loading, allowed: !loading && canAccess(role) };
}
export function canSendNotifications(role: DashboardRole | null): boolean {
  return role === "HEAD_ADMIN" || role === "HEAD_FACULTATI";
}