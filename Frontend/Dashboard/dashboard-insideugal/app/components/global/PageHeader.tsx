"use client";

import { usePathname } from "next/navigation";
import HeaderActions from "./HeaderActions";

const pageTitles: Record<string, string> = {
  "/": "Acasă",
  "/noutati": "Anunțuri",
  "/evenimente": "Evenimente",
  "/facultati": "Facultăți",
  "/harti": "Hărți",
  "/sesizari": "Sesizări",
  "/cantina": "Cantină",
  "/conturi": "Conturi",
};

export default function PageHeader() {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? "Dashboard";

  return (
    /* MODIFICAT: Adăugat sticky top-0 și z-40 pentru a rămâne fixat deasupra conținutului la scroll */
    <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-border bg-card px-4 sm:px-6 lg:px-8 sticky top-0 z-40 shadow-xs">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
      </div>
      <HeaderActions />
    </header>
  );
}