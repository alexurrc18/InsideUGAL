"use client";

import { Bell, UserRound } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface Announcement {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

export default function HeaderActions() {
  const [open, setOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchAnnouncements() {
      setLoading(true);
      try {
        const res = await fetch("https://api.insideugal.ro/announcements/");
        const data = await res.json();
        setAnnouncements(data.slice(0, 5));
      } catch {
        setAnnouncements([]);
      } finally {
        setLoading(false);
      }
    }
    fetchAnnouncements();
  }, []);

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
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          aria-label="Notificări"
          onClick={() => setOpen(!open)}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted transition-colors hover:bg-background hover:text-foreground"
        >
          <Bell size={18} />
          {announcements.length > 0 && (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand" />
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Notificări</h3>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="px-4 py-6 text-center text-sm text-muted">Se încarcă...</div>
              ) : announcements.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-muted">Nicio notificare</div>
              ) : (
                announcements.map((a) => (
                  <div key={a.id} className="px-4 py-3 border-b border-border hover:bg-background transition-colors cursor-pointer">
                    <p className="text-sm font-medium text-foreground">{a.title}</p>
                    <p className="text-xs text-muted mt-0.5 line-clamp-2">{a.content}</p>
                    <p className="text-xs text-muted mt-1">{new Date(a.created_at).toLocaleDateString("ro-RO")}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        aria-label="Cont"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted transition-colors hover:bg-background hover:text-foreground"
      >
        <UserRound size={18} />
      </button>
    </div>
  );
}