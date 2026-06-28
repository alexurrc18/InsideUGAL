import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api, { setAuthToken, getAuthToken, logout as apiLogout, setSessionExpiredCallback } from "@/services/api";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  faculty_id?: number | null;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const res = await api.get("/profiles/me");
      if (res.data) {
        setUser({
          id: res.data.id || "",
          name: [res.data.first_name, res.data.last_name].filter(Boolean).join(" ") || "Utilizator",
          email: res.data.email || "",
          role: res.data.role || "STUDENT",
          faculty_id: res.data.faculty_id ?? null,
        });
      }
    } catch {
      // Eșecul la profil nu invalidează sesiunea — tokenul poate fi valid
    }
  }, []);

  // Când tokenul de refresh expiră și API-ul face logout silențios, resetăm starea.
  useEffect(() => {
    setSessionExpiredCallback(() => {
      setIsAuthenticated(false);
      setUser(null);
    });
    return () => setSessionExpiredCallback(() => {});
  }, []);

  // Restaurare sesiune la pornirea aplicației.
  useEffect(() => {
    const restore = async () => {
      const token = await getAuthToken();
      if (token) {
        setIsAuthenticated(true);
        await loadProfile();
      }
      setIsLoading(false);
    };
    restore();
  }, [loadProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const body = `grant_type=password&username=${encodeURIComponent(email.trim())}&password=${encodeURIComponent(password)}`;
    const res = await api.post("/auth/login", body, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    
    let responseData = res.data;
    if (typeof responseData === "string" && responseData.trim().startsWith("{")) {
      try {
        responseData = JSON.parse(responseData);
      } catch (e) {
        console.warn("[AuthContext] Failed to parse response data as JSON:", e);
      }
    }

    const token = typeof responseData === "string" ? responseData : responseData?.access_token;
    const refreshToken = typeof responseData === "string" ? null : (responseData?.refresh_token ?? null);
    const expiresAt = typeof responseData === "string" ? null : (responseData?.expires_at ?? null);

    if (!token) throw new Error("Nu s-a putut obține token-ul de autentificare.");

    await setAuthToken(token, refreshToken, expiresAt);
    setIsAuthenticated(true);
    await loadProfile();
  }, [loadProfile]);

  const logout = useCallback(async () => {
    await apiLogout();
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
