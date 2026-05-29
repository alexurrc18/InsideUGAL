"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/": "Panou Principal",
  "/noutati": "Noutati",
  "/evenimente": "Evenimente",
  "/facultati": "Facultati",
  "/harti": "Harti",
  "/sesizari": "Sesizari",
  "/cantina": "Cantina",
  "/conturi": "Conturi",
};

export default function PageHeader() {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? "Panou Principal";

  return (
    <header className="h-16 flex-shrink-0 bg-white border-b border-neutral-100 flex items-center px-6 md:px-10 justify-between shadow-sm">
      <strong className="text-h5 text-neutral-900 font-bold">{title}</strong>
      <span className="text-p-xsmall text-neutral-500">Galati, Romania</span>
    </header>
  );
}
