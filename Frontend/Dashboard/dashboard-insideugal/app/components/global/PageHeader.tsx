"use client";

import { usePathname } from "next/navigation";
import HeaderActions from "./HeaderActions";

const pageTitles: Record<string, string> = {
  "/": "Acasă",
  "/noutati": "Noutăți",
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
    <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-border bg-card px-4 sm:px-6 lg:px-8">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
      </div>
      <HeaderActions />
    </header>
  );
}
