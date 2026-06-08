// app/data/announcements.ts
export interface Announcement {
  id: string;
  title: string;
  description: string;
  faculties: string[];
  publishDate: string;
  thumbnail?: string;
  eventLink?: string;
}

export const mockAnnouncements: Announcement[] = [
  { id: "1", title: "Sesiune măriri", description: "Detalii sesiune...", faculties: ["AC", "FIE"], publishDate: "2026-06-01", eventLink: "https://ugal.ro" },
  { id: "2", title: "Campionat Fotbal", description: "Meciuri în campus...", faculties: ["Toate"], publishDate: "2026-06-03" }
];