import { apiBaseUrl, getAuthHeaders } from "@/lib/api-client";

export type DashboardRole =
  | "HEAD_ADMIN"
  | "HEAD_FACULTATI"
  | "HEAD_CANTINA"
  | "PROFESOR"
  | "STUDENT_RESPONSABIL"
  | "STUDENT";

export type DashboardProfile = {
  id: string;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  role: DashboardRole | string;
  faculty_id?: number | null;
};

const PROFILE_STORAGE_KEY = "dashboard_profile";
const ACCESS_ERROR_STORAGE_KEY = "dashboard_access_error";

export function normalizeRole(role?: string | null): string {
  return (role ?? "").trim().toUpperCase();
}

export function isDashboardRole(role?: string | null): boolean {
  return new Set(["HEAD_ADMIN", "HEAD_FACULTATI", "HEAD_CANTINA", "PROFESOR", "STUDENT_RESPONSABIL"]).has(
    normalizeRole(role),
  );
}

export function canAccessDashboardPath(role: string | null | undefined, pathname: string): boolean {
  const normalizedRole = normalizeRole(role);

  if (!isDashboardRole(normalizedRole)) {
    return false;
  }

  if (pathname.startsWith("/conturi")) {
    return normalizedRole === "HEAD_ADMIN";
  }

  return true;
}

export function canManageAnnouncements(role?: string | null): boolean {
  return new Set(["HEAD_ADMIN", "PROFESOR", "STUDENT_RESPONSABIL"]).has(normalizeRole(role));
}

export function canManageComplaints(role?: string | null): boolean {
  return new Set(["HEAD_ADMIN", "HEAD_FACULTATI", "PROFESOR"]).has(normalizeRole(role));
}

export function canManageAccounts(role?: string | null): boolean {
  return normalizeRole(role) === "HEAD_ADMIN";
}

export function getStoredDashboardProfile(): DashboardProfile | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as DashboardProfile;
  } catch {
    window.localStorage.removeItem(PROFILE_STORAGE_KEY);
    return null;
  }
}

export function storeDashboardProfile(profile: DashboardProfile): void {
  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

export function clearDashboardSession(): void {
  window.localStorage.removeItem("access_token");
  window.localStorage.removeItem("token_type");
  window.localStorage.removeItem(PROFILE_STORAGE_KEY);
}

export function setDashboardAccessError(message: string): void {
  window.localStorage.setItem(ACCESS_ERROR_STORAGE_KEY, message);
}

export function consumeDashboardAccessError(): string | null {
  const message = window.localStorage.getItem(ACCESS_ERROR_STORAGE_KEY);
  window.localStorage.removeItem(ACCESS_ERROR_STORAGE_KEY);
  return message;
}

export async function fetchDashboardProfile(): Promise<DashboardProfile> {
  const response = await fetch(`${apiBaseUrl}/profiles/me`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error("Nu s-a putut valida profilul curent.");
  }

  return (await response.json()) as DashboardProfile;
}
