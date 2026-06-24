"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import type { DayButtonProps } from "react-day-picker";
import { ro } from "react-day-picker/locale";
import { announcementsService } from "@/lib/announcements-service";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./Card";
import { Calendar } from "./Calendar";

type CalendarEvent = {
  date: string;
  slug: string;
  title: string;
};

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatEventDate(dateKey: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateKey}T00:00:00`));
}

function parseDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`);
}

export default function DashboardCalendar() {
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(today);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await announcementsService.list({ announcement_type: "EVENIMENT" });

        let items: {
          id: number;
          title: string;
          type: string;
          start_date?: string | null;
          created_at: string;
        }[] = [];

        if (Array.isArray(data)) {
          items = data;
        } else if (data && typeof data === "object" && "items" in data && Array.isArray(data.items)) {
          items = data.items;
        }

        const mapped: CalendarEvent[] = items
          .filter((a) => a.type === "EVENIMENT")
          .map((a) => {
            const dateStr = a.start_date ?? a.created_at;
            return {
              slug: String(a.id),
              title: a.title,
              date: dateStr.split("T")[0],
            };
          });

        setEvents(mapped);
      } catch (e) {
        console.error("Eroare calendar:", e);
      }
    };
    load();
  }, []);

  const selectedDateKey = selectedDate ? toDateKey(selectedDate) : todayKey;

  const futureEvents = useMemo(
    () =>
      events
        .filter((event) => event.date >= todayKey)
        .sort((first, second) => first.date.localeCompare(second.date)),
    [events, todayKey],
  );

  const eventsByDate = useMemo(() => {
    return futureEvents.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
      acc[event.date] = [...(acc[event.date] ?? []), event];
      return acc;
    }, {});
  }, [futureEvents]);

  const selectedEvents = eventsByDate[selectedDateKey] ?? [];
  const eventDates = useMemo(() => new Set(Object.keys(eventsByDate)), [eventsByDate]);
  const eventDays = useMemo(
    () => Object.keys(eventsByDate).map((dateKey) => parseDateKey(dateKey)),
    [eventsByDate],
  );
  const startMonth = useMemo(() => new Date(today.getFullYear() - 6, 0, 1), [today]);
  const endMonth = useMemo(() => new Date(today.getFullYear() + 6, 11, 31), [today]);

  const EventDayButton = useMemo(() => {
  return function EventDayButton({ day, modifiers, ...props }: DayButtonProps) {
    const hasEvent = eventDates.has(toDateKey(day.date));
    const isSelected = modifiers.selected;
    const isToday = modifiers.today;

    const computedStyle: CSSProperties = isSelected
      ? {
          backgroundColor: "var(--brand)",
          border: "none",
          borderRadius: "0.25rem",
          color: "white",
          fontSize: "1.125rem",
          fontWeight: 700,
          opacity: 1,
        }
      : {
          backgroundColor: "transparent",
          border: "none",
          color: isToday ? "var(--brand)" : "inherit",
          fontWeight: isToday ? 600 : undefined,
          opacity: 1,
        };

    return (
      <button
        type="button"
        {...props}
        style={computedStyle}
        className={`${hasEvent ? "relative" : ""} h-[2.25rem] w-[2.25rem] rounded-sm mx-auto flex items-center justify-center text-sm transition-colors hover:bg-background focus-visible:outline-none`}
      >
        <span className="relative z-10">{day.date.getDate()}</span>
        {hasEvent && (
          <span
            className={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
              isSelected ? "bg-white" : "bg-brand"
            }`}
          />
        )}
      </button>
    );
  };
}, [eventDates]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          captionLayout="dropdown"
          startMonth={startMonth}
          endMonth={endMonth}
          fixedWeeks
          showOutsideDays
          locale={ro}
          weekStartsOn={1}
          modifiers={{ hasEvent: eventDays }}
          components={{ DayButton: EventDayButton }}
        />

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Evenimente</h3>
            <span className="text-xs text-muted">{formatEventDate(selectedDateKey)}</span>
          </div>

          {selectedEvents.length > 0 ? (
            <div className="space-y-2">
              {selectedEvents.map((event) => (
                <Link
                  key={event.slug}
                  href="/evenimente"
                  className="block rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-brand hover:bg-background"
                >
                  {event.title}
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted">
              Nu există evenimente.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}