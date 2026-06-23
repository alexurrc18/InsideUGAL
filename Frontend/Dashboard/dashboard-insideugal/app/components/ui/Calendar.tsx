"use client";

import { useState, useEffect } from "react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import "react-day-picker/style.css";
import { MapPin, Clock } from "lucide-react";
import { announcementsService } from "@/lib/announcements-service";

// ─── Tipuri ───────────────────────────────────────────────────────────────────

type DashboardEvent = {
  date: string;
  slug: string;
  title: string;
  location?: string;
  description?: string;
  time?: string;
};

type AnnouncementItem = {
  id: number;
  type: "NOUTATE" | "EVENIMENT";
  title: string;
  content: string;
  created_at: string;
  start_date?: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function joinClasses(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateRO(date: Date): string {
  return date.toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Componenta ───────────────────────────────────────────────────────────────

export function Calendar() {
  const [selected, setSelected] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<DashboardEvent[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await announcementsService.list({ announcement_type: "EVENIMENT" });

        let items: AnnouncementItem[] = [];
        if (Array.isArray(data)) {
          items = data as AnnouncementItem[];
        } else if (data && typeof data === "object" && "items" in data && Array.isArray(data.items)) {
          items = data.items as AnnouncementItem[];
        }

        const mapped: DashboardEvent[] = items
          .filter((a) => a.type === "EVENIMENT")
          .map((a) => {
            const dateStr = a.start_date ?? a.created_at;
            return {
              slug: String(a.id),
              title: a.title,
              description: a.content,
              date: dateStr.split("T")[0],
              time: dateStr.includes("T")
                ? dateStr.split("T")[1].slice(0, 5)
                : undefined,
            };
          });

        setEvents(mapped);
      } catch (e) {
        console.error("Eroare calendar:", e);
      }
    };
    load();
  }, []);

  const eventDates = events.map((e) => new Date(e.date + "T00:00:00"));

  const selectedKey = selected ? toLocalDateString(selected) : null;
  const selectedEvents = selectedKey
    ? events.filter((e) => e.date === selectedKey)
    : [];

  const defaultClassNames = getDefaultClassNames();

  return (
    <div className="flex flex-col gap-4">
      <DayPicker
        mode="single"
        selected={selected}
        onSelect={setSelected}
        captionLayout="dropdown"
        modifiers={{ hasEvent: eventDates }}
        className={joinClasses(
          "text-foreground",
          "[--rdp-accent-color:var(--brand)]",
          "[--rdp-accent-background-color:color-mix(in_srgb,var(--brand)_12%,white)]",
          "[--rdp-day-height:2.4rem]",
          "[--rdp-day-width:2.4rem]",
          "[--rdp-day_button-height:2.25rem]",
          "[--rdp-day_button-width:2.25rem]",
          "[--rdp-day_button-border-radius:0.25rem]",
          "[&_.rdp-selected_.rdp-day_button]:!bg-brand",
          "[&_.rdp-selected_.rdp-day_button]:!text-white",
          "[&_.rdp-selected_.rdp-day_button]:!border-0",
          "[&_.rdp-selected_.rdp-day_button]:!rounded-sm",
          "[&_.rdp-today:not(.rdp-selected)_.rdp-day_button]:!bg-transparent",
          "[&_.rdp-today:not(.rdp-selected)_.rdp-day_button]:!border-0",
        )}
        classNames={{
          root: joinClasses(defaultClassNames.root, "w-full"),
          months: joinClasses(defaultClassNames.months, "max-w-none justify-center"),
          month: joinClasses(defaultClassNames.month, "w-full"),
          month_caption: joinClasses(
            defaultClassNames.month_caption,
            "relative flex mb-4 h-9 items-center justify-center text-sm font-semibold"
          ),
          dropdowns: joinClasses(defaultClassNames.dropdowns, "gap-2 justify-center mx-auto"),
          dropdown_root: joinClasses(
            defaultClassNames.dropdown_root,
            "rounded-lg border border-border bg-card px-2 py-1 text-sm font-medium text-foreground transition-colors hover:bg-background",
          ),
          caption_label: joinClasses(defaultClassNames.caption_label, "capitalize"),
          nav: joinClasses(
            defaultClassNames.nav,
            "absolute inset-x-0 top-0 flex items-center justify-between pointer-events-none z-10"
          ),
          button_previous: joinClasses(
            defaultClassNames.button_previous,
            "p-1.5 rounded-lg border border-border text-muted transition-colors hover:bg-background hover:text-foreground pointer-events-auto",
          ),
          button_next: joinClasses(
            defaultClassNames.button_next,
            "p-1.5 rounded-lg border border-border text-muted transition-colors hover:bg-background hover:text-foreground pointer-events-auto",
          ),
          chevron: joinClasses(defaultClassNames.chevron, "fill-brand h-4 w-4"),
          month_grid: joinClasses(defaultClassNames.month_grid, "mx-auto w-full table-fixed border-separate border-spacing-1"),
          weekday: joinClasses(defaultClassNames.weekday, "py-2 text-xs font-medium text-muted opacity-100"),
          day: joinClasses(defaultClassNames.day, "relative p-0 text-center text-sm"),
          day_button: joinClasses(
            defaultClassNames.day_button,
            "mx-auto rounded-sm border-0 transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
          ),
          outside: joinClasses(defaultClassNames.outside, "text-muted opacity-45"),
          today: joinClasses(defaultClassNames.today, "font-semibold text-brand"),
          selected: joinClasses(defaultClassNames.selected, "font-semibold"),
          disabled: joinClasses(defaultClassNames.disabled, "cursor-not-allowed opacity-40"),
        }}
        components={{
  DayButton: ({ day, modifiers, ...buttonProps }) => {
    const hasEvent = (modifiers as Record<string, boolean>)?.hasEvent;
    const isSelected = (modifiers as Record<string, boolean>)?.selected;
    const isToday = (modifiers as Record<string, boolean>)?.today;

    return (
      <button
  {...buttonProps}
  style={isSelected ? { fontSize: "1.125rem", fontWeight: 700 } : {}}
  className={joinClasses(
    "relative mx-auto flex items-center justify-center rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
    isSelected
      ? "w-[2.4rem] h-[2.4rem] bg-brand text-white"
      : isToday
      ? "w-[2.25rem] h-[2.25rem] text-brand font-semibold hover:bg-background text-sm"
      : "w-[2.25rem] h-[2.25rem] hover:bg-background text-sm",
  )}
>
        {day.date.getDate()}
        {hasEvent && (
          <span className={joinClasses(
  "absolute left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full",
  isSelected ? "bg-white bottom-1" : "bg-brand bottom-0.5"
)} />
        )}
      </button>
    );
  },
}}
      />

      {/* Lista evenimente */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-foreground">Evenimente</span>
          {selected && (
            <span className="text-xs text-muted">{formatDateRO(selected)}</span>
          )}
        </div>

        {selectedEvents.length === 0 ? (
          <p className="text-sm text-muted py-1">Niciun eveniment în această zi.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {selectedEvents.map((ev) => (
              <li
                key={ev.slug}
                className="rounded-lg border border-border bg-card px-4 py-3 flex flex-col gap-1"
              >
                <span className="text-sm font-semibold text-foreground">{ev.title}</span>
                <div className="flex items-center gap-3 text-xs text-muted">
                  {ev.time && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {ev.time}
                    </span>
                  )}
                  {ev.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {ev.location}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}