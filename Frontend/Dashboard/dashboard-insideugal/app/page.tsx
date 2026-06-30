"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "./components/ui/Card";
import DashboardCalendar from "./components/ui/DashboardCalendar";
import { CalendarPlus, Bell, Megaphone, X } from "lucide-react";

// Importăm hook-urile din fișierul tău de API
import { useAnnouncements, useComplaints } from "@/hooks/useDashboardApi";
import type { Announcement } from "@/lib/api-types";

// Definim o interfață locală flexibilă pentru a înlocui tipul "any" la filtrare
interface GenericItem {
  type?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
}

export default function Page() {
  const router = useRouter();
  
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationData, setNotificationData] = useState({
    titlu: "",
    continut: "",
    actiune: "",
    catreCine: "Toate",
  });

  // Preluăm datele în timp real din backend folosind hook-urile
  const { data: announcementsData, isLoading: isLoadingAnnouncements } = useAnnouncements();
  const { data: complaintsData, isLoading: isLoadingComplaints } = useComplaints();

  // Calculăm dinamic numerele pentru carduri pe baza datelor reale
  const stats = useMemo(() => {
    // 1. Extragere Anunțuri / Evenimente
    const rawAnnouncements = announcementsData && typeof announcementsData === 'object' && 'items' in announcementsData 
      ? (announcementsData as Record<string, unknown>).items
      : announcementsData;

    const listAnnouncements: Announcement[] = Array.isArray(rawAnnouncements) ? rawAnnouncements : [];
    const acum = new Date();
    
    // Numărăm evenimentele viitoare (folosim tipul GenericItem în loc de any)
    const evenimenteCount = (listAnnouncements as unknown as GenericItem[]).filter((item: GenericItem) => {
      const isEveniment = item.type === "EVENIMENT";
      const limitaData = item.end_date || item.start_date;
      const esteInViitor = limitaData ? new Date(limitaData) >= acum : true;
      return isEveniment && esteInViitor;
    }).length;

    // Numărăm anunțurile (noutățile) (folosim tipul GenericItem în loc de any)
    const anunturiCount = (listAnnouncements as unknown as GenericItem[]).filter((item: GenericItem) => {
      return item.type === "NOUTATE" || !item.type;
    }).length;

    // 2. Extragere Sesizări
    const rawComplaints = complaintsData && typeof complaintsData === 'object' && 'items' in complaintsData
      ? (complaintsData as Record<string, unknown>).items
      : complaintsData;

    const listComplaints = Array.isArray(rawComplaints) ? rawComplaints : [];

    // Filtrare STRICTĂ: Doar cele în lucru sau în așteptare (folosim tipul GenericItem în loc de any)
    const sesizariActiveCount = (listComplaints as unknown as GenericItem[]).filter((item: GenericItem) => {
      const statusUpper = String(item.status || "").toUpperCase().trim();
      return (
        statusUpper === "PENDING" || 
        statusUpper === "IN_PROGRESS" || 
        statusUpper === "ACTIV" || 
        statusUpper === "IN_LUCRU" || 
        statusUpper === "IN LUCRU" || 
        statusUpper === "ASTEPTARE" || 
        statusUpper === "IN_ASTEPTARE" || 
        statusUpper === "IN ASTEPTARE"
      );
    }).length;

    return {
      evenimente: evenimenteCount,
      anunturi: anunturiCount,
      sesizari: sesizariActiveCount
    };
  }, [announcementsData, complaintsData]);

  const handleNotificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsNotificationOpen(false);
    setNotificationData({ titlu: "", continut: "", actiune: "", catreCine: "Toate" });
  };

  return (
    <div className="space-y-6">
      
      {/* Secțiunea de Carduri cu Date Reale */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        
        {/* Card 1: Evenimente Viitoare */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Evenimente Viitoare</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {isLoadingAnnouncements ? (
                <span className="text-sm font-normal text-muted animate-pulse">Se încarcă...</span>
              ) : (
                stats.evenimente
              )}
            </div>
            <p className="mt-1 text-xs text-muted">Evenimente active în platformă</p>
          </CardContent>
        </Card>

        {/* Card 2: Sesizări Active */}
        <Card 
          className="cursor-pointer hover:border-slate-300 hover:shadow-xs transition-all"
          onClick={() => router.push("/sesizari")}
        >
          <CardHeader className="pb-2">
            <CardTitle>Sesizări Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {isLoadingComplaints ? (
                <span className="text-sm font-normal text-muted animate-pulse">Se încarcă...</span>
              ) : (
                stats.sesizari
              )}
            </div>
            <p className="mt-1 text-xs text-muted">Sesizări în curs de soluționare</p>
          </CardContent>
        </Card>

        {/* Card 3: Anunțuri Noi */}
        <Card 
          className="cursor-pointer hover:border-slate-300 hover:shadow-xs transition-all"
          onClick={() => router.push("/noutati")}
        >
          <CardHeader className="pb-2">
            <CardTitle>Anunțuri Noi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {isLoadingAnnouncements ? (
                <span className="text-sm font-normal text-muted animate-pulse">Se încarcă...</span>
              ) : (
                stats.anunturi
              )}
            </div>
            <p className="mt-1 text-xs text-muted">Noutăți și anunțuri publicate</p>
          </CardContent>
        </Card>
      </section>

      {/* Secțiunea de jos: Acțiuni Rapide și Calendar */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-7 items-start">
        <div className="lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>Acțiuni Rapide</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <button
                onClick={() => router.push("/noutati?open=true&type=EVENIMENT")}
                className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-6 text-center shadow-sm transition-all hover:bg-accent hover:text-accent-foreground cursor-pointer"
              >
                <CalendarPlus className="h-8 w-8 text-primary" />
                <span className="font-medium text-sm">Creează Eveniment</span>
              </button>

              <button
                onClick={() => router.push("/notificari?open=true")}
                className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-6 text-center shadow-sm transition-all hover:bg-accent hover:text-accent-foreground cursor-pointer"
              >
                <Bell className="h-8 w-8 text-primary" />
                <span className="font-medium text-sm">Creează Notificare</span>
              </button>

              <button
                onClick={() => router.push("/noutati?open=true&type=NOUTATE")}
                className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-6 text-center shadow-sm transition-all hover:bg-accent hover:text-accent-foreground cursor-pointer"
              >
                <Megaphone className="h-8 w-8 text-primary" />
                <span className="font-medium text-sm">Creează Noutăți</span>
              </button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <DashboardCalendar />
        </div>
      </section>

      {/* Modal Adăugare Notificare */}
      {isNotificationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="text-lg font-bold text-foreground">Adăugare Notificare Nouă</h3>
              <button 
                onClick={() => setIsNotificationOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
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
                  className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Conținut</label>
                <textarea
                  required
                  rows={4}
                  value={notificationData.continut}
                  onChange={(e) => setNotificationData({ ...notificationData, continut: e.target.value })}
                  className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Către cine</label>
                <select
                  value={notificationData.catreCine}
                  onChange={(e) => setNotificationData({ ...notificationData, catreCine: e.target.value })}
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                >
                  <option value="Toate">Toate</option>
                  <option value="AC">AC</option>
                  <option value="FIE">FIE</option>
                  <option value="SIA">SIA</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsNotificationOpen(false)}
                  className="rounded-lg border border-input bg-transparent px-4 py-2 text-sm font-medium hover:bg-accent text-foreground transition-colors cursor-pointer"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#003366] px-4 py-2 text-sm font-medium text-white hover:bg-[#003366]/90 transition-colors cursor-pointer"
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