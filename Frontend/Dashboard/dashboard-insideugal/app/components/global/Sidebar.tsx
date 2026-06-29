"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  Calendar,
  GraduationCap,
  Home,
  MapPin,
  Menu,
  Newspaper,
  Users,
  Utensils,
} from "lucide-react";

import {
  canAccessAccounts,
  canAccessCantina,
  canAccessComplaints,
  canAccessContent,
  canAccessDashboard,
  canAccessFaculties,
  canAccessMaps,
  useDashboardRole,
  type DashboardRole,
} from "@/lib/dashboard-auth";

const menuItems = [
  { label: "Acasă", href: "/", icon: Home, canAccess: canAccessDashboard },
  { label: "Anunțuri", href: "/noutati", icon: Newspaper, canAccess: canAccessContent },
  { label: "Notificări", href: "/notificari", icon: Bell, canAccess: canAccessContent },
  { label: "Facultăți", href: "/facultati", icon: GraduationCap, canAccess: canAccessFaculties },
  { label: "Hărți", href: "/harti", icon: MapPin, canAccess: canAccessMaps },
  { label: "Sesizări", href: "/sesizari", icon: AlertTriangle, canAccess: canAccessComplaints },
  { label: "Cantină", href: "/cantina", icon: Utensils, canAccess: canAccessCantina },
  { label: "Conturi", href: "/conturi", icon: Users, canAccess: canAccessAccounts },
] satisfies Array<{
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  canAccess: (role: DashboardRole | null) => boolean;
}>;

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { role } = useDashboardRole();
  const visibleMenuItems = menuItems.filter((item) => item.canAccess(role));

  return (
    <aside
      className={`sticky top-0 h-screen flex-shrink-0 flex flex-col justify-between overflow-hidden border-r border-white/10 bg-sidebar text-white select-none transition-[width] duration-200 ${
        collapsed ? "w-20 px-3 py-4" : "w-72 px-4 py-4"
      }`}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className={`mb-6 flex items-center gap-3 ${collapsed ? "justify-center" : "justify-between"}`}>
          {!collapsed && (
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <Image
                src="/logo_alb.png"
                alt="Inside UGAL"
                width={44}
                height={44}
                className="h-11 w-11 flex-shrink-0 rounded-md object-contain"
              />
              <span className="min-w-0">
                <span className="block truncate text-xl font-semibold leading-6">
                  Inside UGAL
                </span>
              </span>
            </Link>
          )}

          <button
            type="button"
            aria-label={collapsed ? "Arata sidebarul" : "Ascunde sidebarul"}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((current) => !current)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-sidebar-muted transition-colors hover:bg-card/10 hover:text-white"
          >
            <Menu size={18} />
          </button>
        </div>

        <nav className="custom-scrollbar flex-1 space-y-1 overflow-y-auto">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`group flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                  collapsed ? "justify-center" : ""
                } ${
                  active
                    ? "bg-sidebar-active text-white"
                    : "text-sidebar-muted hover:bg-card/10 hover:text-white"
                }`}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-4 border-t border-white/10 pt-4">
        <div className={`text-xs text-sidebar-muted ${collapsed ? "text-center" : "px-3"}`}>
          {collapsed ? "v1" : "v1.0 - 2026"}
        </div>
      </div>
    </aside>
  );
}
