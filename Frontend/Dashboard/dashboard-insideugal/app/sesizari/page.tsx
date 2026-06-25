"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Table, { Column } from "../components/ui/Table";
import Modal from "../components/ui/Modal";
import { apiBaseUrl, getAuthHeaders } from "@/lib/api-client";
import {
  canManageComplaints,
  fetchDashboardProfile,
  getStoredDashboardProfile,
  normalizeRole,
  storeDashboardProfile,
} from "@/lib/dashboard-auth";

export type TicketStatus = "In asteptare" | "In lucru" | "Respins" | "Inchis" | "Solutionat";

export type TicketItem = {
  id: string;
  title: string;
  description: string;
  building: string;
  locationId: number | null;
  status: TicketStatus;
  createdBy: string;
  authorName: string;
  image?: string;
  date: string;
};

type ApiComplaint = {
  id: number;
  title: string;
  description: string;
  location_id: number | null;
  image_url?: string | null;
  user_id: string;
  status: string;
  created_at: string;
};

type ApiLocation = {
  id: number;
  name: string;
  faculty_id?: number | null;
};

type Paginated<T> = {
  items: T[];
  total: number;
};

const statusOptions: TicketStatus[] = ["In asteptare", "In lucru", "Respins", "Inchis", "Solutionat"];

const statusToUi: Record<string, TicketStatus> = {
  in_asteptare: "In asteptare",
  in_lucru: "In lucru",
  respins: "Respins",
  finalizat: "Inchis",
  solutionat: "Solutionat",
};

const statusToApi: Record<TicketStatus, string> = {
  "In asteptare": "in_asteptare",
  "In lucru": "in_lucru",
  Respins: "respins",
  Inchis: "finalizat",
  Solutionat: "solutionat",
};

function formatDate(value: string | undefined | null): string {
  if (!value) return "---";
  const date = new Date(value);
  return isNaN(date.getTime()) ? value : date.toLocaleDateString("ro-RO");
}

export default function SesizariPage() {
  const [activeTab, setActiveTab] = useState<"all" | "my" | "active" | "closed">("all");
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [locations, setLocations] = useState<ApiLocation[]>([]);
  const [currentProfile, setCurrentProfile] = useState(getStoredDashboardProfile());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeModal, setActiveModal] = useState<"add" | "edit" | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ticketForm, setTicketForm] = useState<Partial<TicketItem>>({});

  const role = normalizeRole(currentProfile?.role);
  const canModerate = canManageComplaints(role);
  const isAdmin = role === "HEAD_ADMIN";

  const locationById = useMemo(() => new Map(locations.map((loc) => [loc.id, loc])), [locations]);
  const availableBuildings = useMemo(() => locations.map((loc) => loc.name), [locations]);

  const mapComplaint = useCallback((item: ApiComplaint): TicketItem => {
    const location = item.location_id ? locationById.get(item.location_id) : null;
    return {
      id: String(item.id),
      title: item.title || "Fără titlu",
      description: item.description || "",
      building: location?.name || "Locație necunoscută",
      locationId: item.location_id,
      status: statusToUi[item.status] || "In asteptare",
      createdBy: item.user_id,
      authorName: item.user_id,
      image: item.image_url || undefined,
      date: formatDate(item.created_at),
    };
  }, [locationById]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profile, locationsResponse] = await Promise.all([
        fetchDashboardProfile(),
        fetch(`${apiBaseUrl}/locations/?size=100&page=1`, { headers: getAuthHeaders() }),
      ]);

      if (!locationsResponse.ok) throw new Error("Nu s-au putut incarca locatiile.");
      const locationsData = (await locationsResponse.json()) as Paginated<ApiLocation>;
      
      const loadedLocations = locationsData.items || [];
      setCurrentProfile(profile);
      storeDashboardProfile(profile);
      setLocations(loadedLocations);

      const complaintsResponse = await fetch(`${apiBaseUrl}/complaints/?size=100&page=1`, {
        headers: getAuthHeaders(),
      });

      if (!complaintsResponse.ok) throw new Error("Nu s-au putut incarca sesizarile.");
      const complaintsData = (await complaintsResponse.json()) as Paginated<ApiComplaint>;
      
      setTickets((complaintsData.items || []).map(mapComplaint));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la încărcare.");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [mapComplaint]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredTickets = useMemo(() => {
    switch (activeTab) {
      case "my": return tickets.filter((t) => t.createdBy === currentProfile?.id);
      case "active": return tickets.filter((t) => t.status === "In asteptare" || t.status === "In lucru");
      case "closed": return tickets.filter((t) => t.status === "Inchis" || t.status === "Respins" || t.status === "Solutionat");
      default: return tickets;
    }
  }, [activeTab, currentProfile?.id, tickets]);

  const getStatusClass = (status: TicketStatus) => {
    switch (status) {
      case "In asteptare": return "bg-amber-50 text-amber-700 border-amber-100";
      case "In lucru": return "bg-blue-50 text-blue-700 border-blue-100";
      case "Respins": return "bg-red-50 text-red-700 border-red-100";
      case "Solutionat": return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "Inchis": return "bg-background text-muted border-border";
    }
  };

  const handleOpenAddModal = () => {
    setSelectedId(null);
    const firstLocation = locations[0];
    setTicketForm({
      building: firstLocation?.name || "",
      locationId: firstLocation?.id ?? null,
      status: "In asteptare",
    });
    setActiveModal("add");
  };

  const handleEdit = (item: TicketItem) => {
    setSelectedId(item.id);
    setTicketForm({ ...item });
    setActiveModal("edit");
  };

  const handleDelete = async (item: TicketItem) => {
    if (!confirm(`Stergi sesizarea "${item.title}"?`)) return;

    const response = await fetch(`${apiBaseUrl}/complaints/${item.id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      alert("Sesizarea nu a putut fi stearsa.");
      return;
    }

    setTickets((current) => current.filter((ticket) => ticket.id !== item.id));
  };

  const columns: Column<TicketItem>[] = [
    {
      header: "Titlu",
      key: "title",
      render: (item) => (
        <div className="space-y-1">
          <p className="font-semibold text-foreground">{item.title}</p>
          <p className="text-xs text-muted line-clamp-1">{item.description}</p>
        </div>
      ),
    },
    {
      header: "Locatie",
      key: "building",
      render: (item) => <span className="text-foreground font-medium">{item.building}</span>,
    },
    {
      header: "Depus de",
      key: "authorName",
      render: (item) => <span className="text-muted">{isAdmin ? item.authorName : item.createdBy === currentProfile?.id ? "Eu" : "---"}</span>,
    },
    {
      header: "Data",
      key: "date",
      render: (item) => <span className="text-muted text-xs whitespace-nowrap">{item.date}</span>,
    },
    {
      header: "Status",
      key: "status",
      render: (item) => (
        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${getStatusClass(item.status)}`}>
          {item.status}
        </span>
      ),
    },
    {
      header: "Actiuni",
      key: "actions",
      render: (item) => {
        const ownsTicket = item.createdBy === currentProfile?.id;
        if (!canModerate && !ownsTicket) return <span className="text-slate-400 text-xs">---</span>;
        return (
          <div className="flex space-x-3 text-xs" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="text-blue-600 hover:text-blue-800 font-medium hover:underline" onClick={() => handleEdit(item)}>Editare</button>
            <button type="button" className="text-red-500 hover:text-red-700 font-medium hover:underline" onClick={() => void handleDelete(item)}>Stergere</button>
          </div>
        );
      },
    },
  ];

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const selectedLocation = locations.find((loc) => loc.name === ticketForm.building);
    const locationId = selectedLocation?.id ?? ticketForm.locationId ?? null;

    try {
      const payload = activeModal === "edit" && selectedId
        ? { title: ticketForm.title, description: ticketForm.description, ...(canModerate ? { status: statusToApi[ticketForm.status || "In asteptare"] } : {}) }
        : { title: ticketForm.title, description: ticketForm.description, location_id: locationId, image_url: ticketForm.image || null };

      const response = await fetch(
        activeModal === "edit" && selectedId ? `${apiBaseUrl}/complaints/${selectedId}` : `${apiBaseUrl}/complaints/`,
        {
          method: activeModal === "edit" && selectedId ? "PATCH" : "POST",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) throw new Error("Sesizarea nu a putut fi salvata.");
      setActiveModal(null);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Sesizarea nu a putut fi salvata.");
    } finally {
      setSaving(false);
    }
  };

  const isEditingOthersTicket = activeModal === "edit" && selectedId !== null && ticketForm.createdBy !== currentProfile?.id;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ... (Restul JSX-ului tău de la liniile 350-466) ... */}
      {/* Asigură-te că folosești variabilele de mai sus în JSX */}
    </div>
  );
}