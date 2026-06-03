"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import type { DayButtonProps } from "react-day-picker";
import { ro } from "react-day-picker/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./Card";
import { Calendar } from "./Calendar";

type CalendarEvent = {
  date: string;
  slug: string;
  title: string;
};

type DashboardCalendarProps = {
  events?: CalendarEvent[];
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

export default function DashboardCalendar({ events = [] }: DashboardCalendarProps) {
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(today);
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
  const monthLabel = new Intl.DateTimeFormat("ro-RO", {
    month: "long",
    year: "numeric",
  }).format(selectedDate ?? today);
  const startMonth = useMemo(() => new Date(today.getFullYear() - 6, 0, 1), [today]);
  const endMonth = useMemo(() => new Date(today.getFullYear() + 6, 11, 31), [today]);
  const EventDayButton = ({ day, modifiers, className, style, ...props }: DayButtonProps) => {
    const hasEvent = eventDates.has(toDateKey(day.date));
    const selectedClasses = modifiers.selected
      ? "bg-brand text-white hover:bg-brand"
      : "";
    const selectedStyle: CSSProperties | undefined = modifiers.selected
      ? {
          backgroundColor: "var(--brand)",
          borderColor: "var(--brand)",
          color: "#ffffff",
        }
      : undefined;

    return (
      <button
        {...props}
        style={{ ...style, ...selectedStyle }}
        className={`${className ?? ""} ${selectedClasses} ${hasEvent ? "relative" : ""}`}
      >
        <span className="relative z-10">{day.date.getDate()}</span>
        {hasEvent && (
          <span
            className={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
              modifiers.selected ? "bg-white" : "bg-brand"
            }`}
          />
        )}
      </button>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Calendar</CardTitle>
            <CardDescription className="capitalize">{monthLabel}</CardDescription>
          </div>
          <div className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground">
            Azi, {today.getDate()}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          captionLayout="dropdown"
          navLayout="after"
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
            <h3 className="text-sm font-semibold text-foreground">
              Evenimente
            </h3>
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
