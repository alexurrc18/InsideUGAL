"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "./components/ui/Card";
import DashboardCalendar from "./components/ui/DashboardCalendar";
import { dashboardEvents } from "./data/events";
import { CalendarPlus, Bell, Megaphone, X } from "lucide-react";

export default function Page() {
  const router = useRouter();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationData, setNotificationData] = useState({
    titlu: "",
    continut: "",
    actiune: "",
    catreCine: "Toate",
  });

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
    }
  }, [router]);

  const dateDefault = [
    { id: 1, titlu: "Evenimente Viitoare", numar: 14 },
    { id: 2, titlu: "Sesizări Active", numar: 8 },
    { id: 4, titlu: "Anunțuri Noi", numar: 5 },
  ];

  const listaFacultati = ["Toate", "AC", "FIE", "SIA", "Medicină", "Litere"];

  const handleNotificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsNotificationOpen(false);
    setNotificationData({ titlu: "", continut: "", actiune: "", catreCine: "Toate" });
  };

  return (
    <div className="space-y-6">
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

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        <div className="lg:col-span-4 space-y-4">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Acțiuni Rapide</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <button
                onClick={() => router.push("/evenimente?open=true")}
                className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-6 text-center shadow-sm transition-all hover:bg-accent hover:text-accent-foreground"
              >
                <CalendarPlus className="h-8 w-8 text-primary" />
                <span className="font-medium text-sm">Creează Eveniment</span>
              </button>

              <button
                onClick={() => setIsNotificationOpen(true)}
                className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-6 text-center shadow-sm transition-all hover:bg-accent hover:text-accent-foreground"
              >
                <Bell className="h-8 w-8 text-primary" />
                <span className="font-medium text-sm">Creează Notificare</span>
              </button>

              <button
                onClick={() => router.push("/noutati?open=true")}
                className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-6 text-center shadow-sm transition-all hover:bg-accent hover:text-accent-foreground"
              >
                <Megaphone className="h-8 w-8 text-primary" />
                <span className="font-medium text-sm">Creează Noutăți</span>
              </button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <DashboardCalendar events={dashboardEvents} />
        </div>
      </section>

      {isNotificationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="text-lg font-bold text-foreground">Adăugare Notificare Nouă</h3>
              <button 
                onClick={() => setIsNotificationOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleNotificationSubmit} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Titlu</label>
                <input
                  type="text"
                  required
                  value={notificationData.titlu}
                  onChange={(e) => setNotificationData({ ...notificationData, titlu: e.target.value })}
                  className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Conținut</label>
                <textarea
                  required
                  rows={4}
                  value={notificationData.continut}
                  onChange={(e) => setNotificationData({ ...notificationData, continut: e.target.value })}
                  className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Acțiune (opțional)</label>
                <input
                  type="text"
                  value={notificationData.actiune}
                  onChange={(e) => setNotificationData({ ...notificationData, actiune: e.target.value })}
                  className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Către cine</label>
                <select
                  value={notificationData.catreCine}
                  onChange={(e) => setNotificationData({ ...notificationData, catreCine: e.target.value })}
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {listaFacultati.map((fac, idx) => (
                    <option key={idx} value={fac}>{fac}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsNotificationOpen(false)}
                  className="rounded-lg border border-input bg-transparent px-4 py-2 text-sm font-medium hover:bg-accent text-foreground transition-colors"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#003366] px-4 py-2 text-sm font-medium text-white hover:bg-[#003366]/90 transition-colors"
                >
                  Salvează
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}