// app/data/complaints.ts
export type ComplaintStatus = "in_asteptare" | "in_lucru" | "finalizat" | "respins";

export interface Complaint {
  id: string;
  title: string;
  description: string;
  location: string;
  status: ComplaintStatus;
  date: string;
  user: string;
}

export const mockComplaints: Complaint[] = [
  {
    id: "1",
    title: "Geam spart corpul D",
    description: "La etajul 2, sala D21, unul dintre geamuri este spart.",
    location: "Facultatea de Inginerie",
    status: "in_asteptare",
    date: "2026-06-04",
    user: "Andrei Popa",
  },
  {
    id: "2",
    title: "Lipsă săpun toaletă",
    description: "În corpul B, parter, nu mai este săpun de 2 zile.",
    location: "Corp B - Campus",
    status: "in_lucru",
    date: "2026-06-03",
    user: "Maria Ionescu",
  },
  {
    id: "3",
    title: "Problemă WiFi bibliotecă",
    description: "Semnalul WiFi este foarte slab în zona de lectură.",
    location: "Biblioteca Centrală",
    status: "finalizat",
    date: "2026-06-01",
    user: "Ion Radu",
  },
  {
    id: "4",
    title: "Zgomot excesiv noaptea",
    description: "În căminul C1 se ascultă muzică tare după ora 23:00.",
    location: "Cămin C1",
    status: "respins",
    date: "2026-05-30",
    user: "Elena Marinescu",
  },
];
