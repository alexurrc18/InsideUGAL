"use client";

import { Bell, UserRound } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation"; 
import { announcementsService } from "@/lib/announcements-service";

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
  const router = useRouter(); 
  const [open, setOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const data = await announcementsService.list();
        
        // 👉 REZOLVARE PENTRU data.items: Gestionăm formatul paginat { items: [], total: ... }
        let items: Announcement[] = [];
        if (Array.isArray(data)) {
          items = data;
        } else if (data && typeof data === 'object' && Array.isArray((data as any).items)) {
          items = (data as any).items;
        } else {
          console.error("Backend-ul nu a returnat un format recunoscut:", data);
        }

        if (items.length > 0) {
          const latest = items.slice(0, 5);
          setAnnouncements(latest);

          // Calculează câte sunt "necitite" față de ultima vizită
          const lastSeen = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
          const unseen = latest.filter((a) => a.id > lastSeen).length;
          setUnreadCount(unseen);
        }

      } catch (error) {
        console.error("Eroare la preluarea anunturilor:", error);
        setAnnouncements([]);
      }
    };

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
    <div className="relative flex items-center gap-1">
      <div className="relative">
        <button
          type="button"
          aria-label="Notificări"
          onClick={handleToggleNotifications} 
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted transition-colors hover:bg-background hover:text-foreground"
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

      <button
        type="button"
        aria-label="Cont"
        onClick={() => router.push("/login")} 
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted transition-colors hover:bg-background hover:text-foreground"
      >
        <UserRound size={18} />
      </button>
    </div>
  );
}
