import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./components/ui/Card";
import DashboardCalendar from "./components/ui/DashboardCalendar";
import { dashboardEvents } from "./data/events";

export default function Page() {
  const dateDefault = [
    { id: 1, titlu: "Evenimente Viitoare", numar: 14 },
    { id: 2, titlu: "Sesizări Active", numar: 8 },
    { id: 4, titlu: "Anunțuri Noi", numar: 5 },
  ];

  return (
    <div className="space-y-6">
      {/* Secțiunea de carduri de statistici (sus) */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {dateDefault.map((item) => (
          <Card key={item.id}>
            <CardHeader className="pb-2">
              <CardTitle>{item.titlu}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight text-foreground">
                {item.numar}
              </div>
              <p className="mt-1 text-sm text-muted">Total înregistrări</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Secțiunea de jos - Calendarul își păstrează poziția din dreapta */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        {/* Folosim lg:col-start-5 și lg:col-span-3 pentru a pune calendarul exact unde era înainte */}
        <div className="lg:col-start-5 lg:col-span-3">
          <DashboardCalendar events={dashboardEvents} />
        </div>
      </section>
    </div>
  );
}