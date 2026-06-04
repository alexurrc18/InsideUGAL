"use client";

import { Bell, UserRound } from "lucide-react";

export default function HeaderActions() {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Notificări"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted transition-colors hover:bg-background hover:text-foreground"
      >
        <Bell size={18} />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand" />
      </button>

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
