"use client";

import { DayPicker, getDefaultClassNames } from "react-day-picker";
import "react-day-picker/style.css";
import type * as React from "react";

type CalendarProps = React.ComponentProps<typeof DayPicker>;

function joinClasses(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

export function Calendar({ className, classNames, ...props }: CalendarProps) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      className={joinClasses(
        "text-foreground [--rdp-accent-color:var(--brand)] [--rdp-accent-background-color:color-mix(in_srgb,var(--brand)_12%,white)] [--rdp-day-height:2.4rem] [--rdp-day-width:2.4rem] [--rdp-day_button-height:2.25rem] [--rdp-day_button-width:2.25rem] [--rdp-day_button-border-radius:0.25rem] [&_.rdp-selected_.rdp-day_button]:rounded-sm [&_.rdp-selected_.rdp-day_button]:border-brand [&_.rdp-selected_.rdp-day_button]:bg-brand [&_.rdp-selected_.rdp-day_button]:text-white",
        className,
      )}
      classNames={{
        root: joinClasses(defaultClassNames.root, "w-full"),
        months: joinClasses(defaultClassNames.months, "max-w-none justify-center"),
        month: joinClasses(defaultClassNames.month, "w-full"),
        
        // Centrare titlu și creare context relativ pentru săgețile absolute
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
        
        // Întinde bara de navigare pe toată lățimea pentru a izola butoanele în margini
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
        selected: joinClasses(defaultClassNames.selected, "font-semibold text-white"),
        disabled: joinClasses(defaultClassNames.disabled, "cursor-not-allowed opacity-40"),
        ...classNames,
      }}
      {...props}
    />
  );
}