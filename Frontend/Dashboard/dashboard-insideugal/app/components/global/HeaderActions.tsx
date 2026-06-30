"use client";

import { Bell, UserRound, LogOut, Sun, Moon } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation"; 
import Link from "next/link";
import { announcementsService } from "@/lib/announcements-service";
import { useTheme } from "../../providers";
import { setAuthToken } from "@/lib/api-client";

interface Announcement {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

const STORAGE_KEY = "last_seen_announcement_id";

export default function HeaderActions() {
  const router = useRouter(); 
  const { isDark, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [, setUnreadCount] = useState(0);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
  let isMounted = true;

  const loadUser = () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      if (isMounted) {
        setUserEmail(null);
      }
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));

      queueMicrotask(() => {
        if (isMounted) {
          setUserEmail(payload.email ?? null);
        }
      });

    } catch {
      queueMicrotask(() => {
        if (isMounted) {
          setUserEmail(null);
        }
      });
    }
  };

  loadUser();

  return () => {
    isMounted = false;
  };
}, []); // Already has empty dependency array - this is actually fine

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const data = await announcementsService.list();
        
        let items: Announcement[] = [];
        if (Array.isArray(data)) {
          items = data;
        } else if (data && typeof data === 'object' && Array.isArray((data as Record<string, unknown>).items)) {
          items = (data as Record<string, unknown>).items as Announcement[];
        } else {
          console.error("Backend-ul nu a returnat un format recunoscut:", data);
        }

        if (items.length > 0) {
          const latest = items.slice(0, 5);
          setAnnouncements(latest);

          const lastSeen = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
          const unseen = latest.filter((a) => a.id > lastSeen).length;
          setUnreadCount(unseen);
        }

      } catch (error) {
        console.error("Eroare la preluarea anunturilor:", error);
        setAnnouncements([]);
      }
    };

    fetchAnnouncements();
  }, []);

  const handleToggleNotifications = () => {
    const willOpen = !open;
    setOpen(willOpen);
    setProfileOpen(false);

    if (willOpen && announcements.length > 0) {
      const maxId = Math.max(...announcements.map((a) => a.id));
      localStorage.setItem(STORAGE_KEY, String(maxId));
      setUnreadCount(0);
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    router.replace("/login");
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        profileRef.current && !profileRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative flex items-center gap-1">
      {/* Light Mode */}
      
<button
  type="button"
  aria-label="Mod luminos"
  onClick={() => isDark && toggleTheme()}
  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted transition-colors hover:bg-background hover:text-foreground"
>
  <Sun size={18} />
</button>

{/* Dark Mode */}
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
          <Bell className="h-5 w-5 text-foreground" />
          {announcements.length > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
          )}
        </button>

        {open && (
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
              <Link href="/noutati" className="block text-center text-xs font-semibold text-brand hover:underline" onClick={() => setOpen(false)}>
                Vezi toate anunturile
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Profil */}
      <div className="relative" ref={profileRef}>
        <button
          type="button"
          aria-label="Cont"
          onClick={() => { setProfileOpen((v) => !v); setOpen(false); }}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted transition-colors hover:bg-background hover:text-foreground"
        >
          <UserRound size={18} />
        </button>

        {profileOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-lg p-4 z-50">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white">
                <UserRound size={18} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-foreground truncate">
                  {userEmail ?? "Utilizator"}
                </span>
                <span className="text-[11px] text-muted">Cont activ</span>
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut size={16} />
                Deconectare
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
