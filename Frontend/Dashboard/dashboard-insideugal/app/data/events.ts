export type DashboardEvent = {
  date: string;
  slug: string;
  title: string;
  location?: string;
  description?: string;
  time?: string;
};

// Doar niste date de test, nu sunt reale, doar pentru a avea ceva de afisat in pagina de evenimente.
export const dashboardEvents: DashboardEvent[] = [
  {
    date: "2026-06-05",
    slug: "workshop-react",
    title: "Workshop React & Next.js",
    location: "Sala D21",
    description: "Invata bazele dezvoltarii web moderne cu echipa InsideUGAL.",
    time: "14:00",
  },
  {
    date: "2026-06-10",
    slug: "conferinta-cariera",
    title: "Carieră în IT",
    location: "Aula Magna",
    description: "Invitați de la companii de top discută despre oportunități de internship.",
    time: "10:00",
  },
  {
    date: "2026-06-18",
    slug: "prezentare-campus",
    title: "Prezentare campus",
    location: "Curtea interioară",
    description: "Tur ghidat al campusului pentru studenții de anul 1.",
    time: "12:00",
  },
  {
    date: "2026-06-25",
    slug: "hackathon-ugal",
    title: "Hackathon UGAL 2026",
    location: "Facultatea de Inginerie",
    description: "24 de ore de codat, pizza și premii.",
    time: "09:00",
  },
];
