export type DashboardEvent = {
  date: string;
  slug: string;
  title: string;
};

//Doar niste date de test, nu sunt reale, doar pentru a avea ceva de afisat in pagina de evenimente.
export const dashboardEvents: DashboardEvent[] = [
  {
    date: "2026-06-05",
    slug: "eveniment-viitor",
    title: "Eveniment viitor",
  },
  {
    date: "2026-06-18",
    slug: "prezentare-campus",
    title: "Prezentare campus",
  },
];
