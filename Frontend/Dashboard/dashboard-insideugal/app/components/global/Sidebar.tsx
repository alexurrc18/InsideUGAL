"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  GraduationCap,
  Home,
  MapPin,
  Menu,
  Newspaper,
  Users,
  Utensils,
} from "lucide-react";

const menuItems = [
  { label: "Acasa", href: "/", icon: Home },
  { label: "Noutati", href: "/noutati", icon: Newspaper },
  { label: "Evenimente", href: "/evenimente", icon: Calendar },
  { label: "Facultati", href: "/facultati", icon: GraduationCap },
  { label: "Harti", href: "/harti", icon: MapPin },
  { label: "Sesizari", href: "/sesizari", icon: AlertTriangle },
  { label: "Cantina", href: "/cantina", icon: Utensils },
  { label: "Conturi", href: "/conturi", icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`sticky top-0 h-screen flex-shrink-0 flex flex-col justify-between bg-sidebar text-text-main pt-6 pb-6 select-none border-r border-white/5 overflow-hidden transition-[width] duration-200 ${
        collapsed ? "w-20 px-3" : "w-72 px-8"
      }`}
    >
      <div className="flex flex-col flex-1 min-h-0">
        <div className={`relative flex mb-6 w-full flex-shrink-0 ${collapsed ? "justify-center" : "justify-center"}`}>
          {!collapsed && (
            <div className="min-w-0 flex flex-col items-center text-center">
              <Image
                src="/logo_alb.png"
                alt="Inside UGAL"
                width={72}
                height={72}
                className="mb-3 h-[72px] w-[72px] object-contain"
              />
              <h2 className="text-xl font-bold tracking-tight text-text-main uppercase font-sans whitespace-nowrap">
                Inside UGAL
              </h2>
            </div>
          )}

          <button
            type="button"
            aria-label={collapsed ? "Arata sidebarul" : "Ascunde sidebarul"}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((current) => !current)}
            className={`h-10 w-10 flex items-center justify-center rounded-md text-text-muted transition-colors duration-150 hover:bg-white/10 hover:text-text-main ${
              collapsed ? "" : "absolute -right-6 -top-4"
            }`}
          >
            <Menu size={22} />
          </button>
        </div>

        <nav className={`flex-1 overflow-y-auto space-y-1.5 custom-scrollbar ${collapsed ? "" : "pr-1"}`}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-4 px-4 py-2.5 rounded-md font-semibold text-base transition-all duration-150 border w-full group ${
                  collapsed ? "justify-center" : ""
                } ${
                  active
                    ? "bg-white/20 border-white/20 text-text-main shadow-sm"
                    : "bg-transparent border-transparent text-text-muted hover:bg-white/10 hover:text-text-main"
                }`}
              >
                <div
                  className={`transition-opacity duration-150 flex-shrink-0 ${
                    active ? "opacity-100" : "opacity-60 group-hover:opacity-100"
                  }`}
                >
                  <Icon size={20} />
                </div>
                {!collapsed && <span className="tracking-wide whitespace-nowrap">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="w-full pt-4 border-t border-white/10 flex-shrink-0 mt-3">
        <div className="text-center text-xs font-medium text-text-muted opacity-40 w-full">
          <span>{collapsed ? "v1.0" : "v1.0 - 2026"}</span>
        </div>
      </div>
    </aside>
  );
}
