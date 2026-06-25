"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import "./globals.css";
import Sidebar from "./components/global/Sidebar";
import Header from "./components/global/PageHeader";
import { Providers } from "./providers";
import {
  canAccessDashboardPath,
  clearDashboardSession,
  fetchDashboardProfile,
  getStoredDashboardProfile,
  isDashboardRole,
  setDashboardAccessError,
  storeDashboardProfile,
} from "@/lib/dashboard-auth";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (pathname === "/login") {
      queueMicrotask(() => {
        setChecking(false);
      });
      return;
    }

    if (!token && pathname !== "/login") {
      router.replace("/login");
      return;
    }

    const validateAccess = async () => {
      try {
        const cachedProfile = getStoredDashboardProfile();
        if (cachedProfile && canAccessDashboardPath(cachedProfile.role, pathname)) {
          setChecking(false);
          return;
        }

        const profile = await fetchDashboardProfile();
        storeDashboardProfile(profile);

        if (!isDashboardRole(profile.role)) {
          clearDashboardSession();
          setDashboardAccessError("Conturile de student nu au acces la dashboard.");
          router.replace("/login");
          return;
        }

        if (!canAccessDashboardPath(profile.role, pathname)) {
          router.replace("/");
          return;
        }

        setChecking(false);
      } catch {
        clearDashboardSession();
        router.replace("/login");
      }
    };

    void validateAccess();
  }, [pathname, router]);

  if (checking && pathname !== "/login") return null;

  return <>{children}</>;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <html lang="ro">
      <body className="bg-background">
        <Providers>
          <AuthGuard>
            {isLoginPage ? (
              <div className="w-full min-h-screen flex items-center justify-center">
                {children}
              </div>
            ) : (
              /* MODIFICAT: h-screen și overflow-hidden blochează scroll-ul pe toată fereastra */
              <div className="flex h-screen overflow-hidden">
                <Sidebar />
                <div className="flex-1 flex flex-col min-w-0 h-full">
                  <Header />
                  {/* MODIFICAT: overflow-y-auto pe main lasă doar conținutul paginii să facă scroll */}
                  <main className="p-6 flex-1 bg-background overflow-y-auto custom-scrollbar">
                    {children}
                  </main>
                </div>
              </div>
            )}
          </AuthGuard>
        </Providers>
      </body>
    </html>
  );
}
