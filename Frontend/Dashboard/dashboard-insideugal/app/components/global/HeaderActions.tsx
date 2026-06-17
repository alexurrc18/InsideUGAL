"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, UserCircle } from "lucide-react";
import { apiBaseUrl } from "@/lib/api-client";

interface Announcement {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

interface AnnouncementsResponse {
  items?: Announcement[];
}

export default function HeaderActions() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(`${apiBaseUrl}/announcements/`, {
          method: "GET",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json() as AnnouncementsResponse | Announcement[];
        setAnnouncements(Array.isArray(data) ? data : data.items ?? []);
      } catch (error) {
        console.error("Eroare la preluarea anunturilor:", error);
        setAnnouncements([]);
      }
    };

    void fetchAnnouncements();
  }, []);

  return (
    <div className="relative flex items-center gap-1">
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="p-2 rounded-lg hover:bg-accent relative"
          aria-label="Notificari"
        >
          <Bell className="h-5 w-5 text-foreground" />
          {announcements.length > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-lg p-4 z-50 max-h-96 overflow-y-auto">
            <h3 className="font-bold text-sm text-foreground mb-3">Notificari si anunturi</h3>
            {announcements.length === 0 ? (
              <p className="text-xs text-muted text-center py-4">Nu exista anunturi noi.</p>
            ) : (
              <div className="space-y-3">
                {announcements.map((ann) => (
                  <div key={ann.id} className="border-b border-border/50 pb-2 last:border-0 last:pb-0">
                    <h4 className="font-semibold text-xs text-foreground">{ann.title}</h4>
                    <p className="text-[11px] text-muted mt-0.5 line-clamp-2">{ann.content}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 border-t border-border/60 pt-3">
              <Link href="/noutati" className="block text-center text-xs font-semibold text-brand hover:underline" onClick={() => setIsOpen(false)}>
                Vezi toate anunturile
              </Link>
            </div>
          </div>
        )}
      </div>

      <Link href="/login" className="p-2 rounded-lg hover:bg-accent" aria-label="Autentificare">
        <UserCircle className="h-5 w-5 text-foreground" />
      </Link>
    </div>
  );
}
