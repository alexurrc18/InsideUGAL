"use client";

import { Bell, UserRound, Sun, Moon } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useTheme } from "../../providers";
import { useRouter } from "next/navigation"; // 1. Am adăugat importul pentru router

interface Announcement {
  id: number;
  title: string;
  content: string;
  created_at: string;
  announcement_type?: string;
}

const STORAGE_KEY = "last_seen_announcement_id";

export default function HeaderActions() {
  const router = useRouter(); // 2. Am inițializat router-ul aici
  const { isDark, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchAnnouncements() {
      setLoading(true);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";
        const res = await fetch(`${baseUrl}/announcements/`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data: Announcement[] = await res.json();
        const latest = data.slice(0, 5);
        setAnnouncements(latest);
        const lastSeen = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
        const unseen = latest.filter((a) => a.id > lastSeen).length;
        setUnreadCount(unseen);
      } catch (error) {
        console.error("Eroare la preluarea anunțurilor:", error);
        setAnnouncements([]);
      } finally {
        setLoading(false);
      }
    }
    fetchAnnouncements();
  }, []);

  const handleToggleNotifications = () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && announcements.length > 0) {
      const maxId = Math.max(...announcements.map((a) => a.id));
      localStorage.setItem(STORAGE_KEY, String(maxId));
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-2">

      {/* Buton Light Mode */}
      <button
        type="button"
        aria-label="Mod luminos"
        onClick={() => isDark && toggleTheme()}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted transition-colors hover:bg-background hover:text-foreground"
      >
        <Sun size={18} />
      </button>

      {/* Buton Dark Mode */}
      <button
        type="button"
        aria-label="Mod întunecat"
        onClick={() => !isDark && toggleTheme()}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted transition-colors hover:bg-background hover:text-foreground"
      >
        <Moon size={18} />
      </button>

      {/* Bell */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          aria-label="Notificări"
          onClick={handleToggleNotifications}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted transition-colors hover:bg-background hover:text-foreground"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Notificări</h3>
              {announcements.length > 0 && (
                <span className="text-xs text-muted">{announcements.length} anunțuri</span>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex flex-col gap-2 px-4 py-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse space-y-1.5">
                      <div className="h-3 w-3/4 rounded bg-border" />
                      <div className="h-2.5 w-full rounded bg-border" />
                      <div className="h-2 w-1/3 rounded bg-border" />
                    </div>
                  ))}
                </div>
              ) : announcements.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                  <Bell size={24} className="text-muted opacity-40" />
                  <p className="text-sm text-muted">Nicio notificare momentan</p>
                </div>
              ) : (
                announcements.map((a, idx) => (
                  <div key={a.id} className={`px-4 py-3 hover:bg-background transition-colors cursor-pointer ${idx < announcements.length - 1 ? "border-b border-border" : ""}`}>
                    <p className="text-sm font-medium text-foreground leading-snug">{a.title}</p>
                    <p className="text-xs text-muted mt-0.5 line-clamp-2 leading-relaxed">{a.content}</p>
                    <p className="text-xs text-muted mt-1.5 opacity-70">
                      {new Date(a.created_at).toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                ))
              )}
            </div>
            {announcements.length > 0 && (
              <div className="border-t border-border px-4 py-2.5">
                <button className="w-full text-center text-xs text-brand hover:underline">
                  Vezi toate anunțurile
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User - Acum trimite către pagina de login */}
      <button
        type="button"
        aria-label="Cont"
        onClick={() => router.push("/login")} // 3. Am adăugat acțiunea de navigare
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted transition-colors hover:bg-background hover:text-foreground"
      >
        <UserRound size={18} />
      </button>
    </div>
  );
}