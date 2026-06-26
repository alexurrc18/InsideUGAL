"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Table, { Column } from "../components/ui/Table";
import Modal from "../components/ui/Modal";
import { apiBaseUrl, getAuthHeaders } from "@/lib/api-client";
import { canAccessComplaints, useRequireDashboardAccess } from "@/lib/dashboard-auth";

type ComplaintStatus = "in_asteptare" | "in_lucru" | "finalizat" | "respins" | "solutionat";
type TicketStatus = "In asteptare" | "In lucru" | "Respins" | "Inchis";
type TicketTab = "all" | "active" | "closed";

type PaginatedResponse<T> = {
  items?: T[];
};

type ComplaintApiItem = {
  id: number;
  title: string;
  description: string;
  location_id: number | null;
  image_url?: string | null;
  user_id: string;
  status: ComplaintStatus;
  created_at: string;
  updated_at: string;
};

type LocationApiItem = {
  id: number;
  name: string;
};

type TicketItem = {
  id: string;
  title: string;
  description: string;
  locationId: number | null;
  building: string;
  status: TicketStatus;
  backendStatus: ComplaintStatus;
  createdBy: string;
  authorName: string;
  image?: string;
  date: string;
};

type TicketFormState = {
  title: string;
  description: string;
  locationId: string;
  status: ComplaintStatus;
  image?: string;
};

const emptyForm: TicketFormState = {
  title: "",
  description: "",
  locationId: "",
  status: "in_asteptare",
};

const statusOptions: Array<{ value: ComplaintStatus; label: TicketStatus }> = [
  { value: "in_asteptare", label: "In asteptare" },
  { value: "in_lucru", label: "In lucru" },
  { value: "respins", label: "Respins" },
  { value: "finalizat", label: "Inchis" },
  { value: "solutionat", label: "Inchis" },
];

function itemsFromResponse<T>(payload: PaginatedResponse<T> | T[]): T[] {
  return Array.isArray(payload) ? payload : payload.items ?? [];
}

function statusToLabel(status: ComplaintStatus): TicketStatus {
  if (status === "in_lucru") return "In lucru";
  if (status === "respins") return "Respins";
  if (status === "finalizat" || status === "solutionat") return "Inchis";
  return "In asteptare";
}

function getStatusClass(status: TicketStatus) {
  switch (status) {
    case "In asteptare":
      return "bg-amber-50 text-amber-700 border-amber-100";
    case "In lucru":
      return "bg-blue-50 text-blue-700 border-blue-100";
    case "Respins":
      return "bg-red-50 text-red-700 border-red-100";
    case "Inchis":
      return "bg-background text-muted border-border";
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ro-RO");
}

export default function SesizariPage() {
  const access = useRequireDashboardAccess(canAccessComplaints);
  const [activeTab, setActiveTab] = useState<TicketTab>("all");
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [locations, setLocations] = useState<LocationApiItem[]>([]);
  const [activeModal, setActiveModal] = useState<"add" | "edit" | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ticketForm, setTicketForm] = useState<TicketFormState>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [complaintsResponse, locationsResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/complaints/?size=200`, {
          headers: getAuthHeaders(),
          cache: "no-store",
        }),
        fetch(`${apiBaseUrl}/locations/?size=200`, { cache: "no-store" }),
      ]);

      if (!complaintsResponse.ok) throw new Error(`Complaints status ${complaintsResponse.status}`);
      if (!locationsResponse.ok) throw new Error(`Locations status ${locationsResponse.status}`);

      const complaintsPayload = (await complaintsResponse.json()) as PaginatedResponse<ComplaintApiItem> | ComplaintApiItem[];
      const locationsPayload = (await locationsResponse.json()) as PaginatedResponse<LocationApiItem> | LocationApiItem[];
      const locationItems = itemsFromResponse(locationsPayload);
      const locationsById = new Map(locationItems.map((location) => [location.id, location.name]));

      setLocations(locationItems);
      setTickets(
        itemsFromResponse(complaintsPayload).map((item) => ({
          id: String(item.id),
          title: item.title,
          description: item.description,
          locationId: item.location_id,
          building: item.location_id ? locationsById.get(item.location_id) ?? `Locatie ${item.location_id}` : "-",
          status: statusToLabel(item.status),
          backendStatus: item.status,
          createdBy: item.user_id,
          authorName: item.user_id,
          image: item.image_url ?? undefined,
          date: formatDate(item.created_at),
        })),
      );
    } catch (error) {
      console.error("Eroare la incarcarea sesizarilor:", error);
      setTickets([]);
      setErrorMessage("Nu am putut incarca sesizarile reale. Verifica backend-ul si autentificarea.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (access.allowed) {
      void Promise.resolve().then(fetchData);
    }
  }, [access.allowed, fetchData]);

  const filteredTickets = useMemo(() => {
    switch (activeTab) {
      case "active":
        return tickets.filter((ticket) => ticket.status === "In asteptare" || ticket.status === "In lucru");
      case "closed":
        return tickets.filter((ticket) => ticket.status === "Inchis" || ticket.status === "Respins");
      case "all":
      default:
        return tickets;
    }
  }, [tickets, activeTab]);

  const handleOpenAddModal = () => {
    setSelectedId(null);
    setTicketForm({
      ...emptyForm,
      locationId: locations[0]?.id ? String(locations[0].id) : "",
    });
    setActiveModal("add");
  };

  const handleOpenEditModal = (item: TicketItem) => {
    setSelectedId(item.id);
    setTicketForm({
      title: item.title,
      description: item.description,
      locationId: item.locationId ? String(item.locationId) : "",
      status: item.backendStatus,
      image: item.image,
    });
    setActiveModal("edit");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Sigur vrei sa stergi aceasta sesizare?")) return;

    try {
      const response = await fetch(`${apiBaseUrl}/complaints/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok && response.status !== 204) throw new Error(`Status ${response.status}`);
      await fetchData();
    } catch (error) {
      console.error("Eroare stergere sesizare:", error);
      setErrorMessage("Stergerea sesizarii nu a reusit. Verifica permisiunile.");
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);

    const locationId = ticketForm.locationId ? Number(ticketForm.locationId) : null;
    const createPayload = {
      title: ticketForm.title,
      description: ticketForm.description,
      location_id: locationId,
      image_url: ticketForm.image || null,
    };
    const updatePayload = {
      title: ticketForm.title,
      description: ticketForm.description,
      status: ticketForm.status,
    };

    try {
      const response = await fetch(
        activeModal === "edit" && selectedId ? `${apiBaseUrl}/complaints/${selectedId}` : `${apiBaseUrl}/complaints/`,
        {
          method: activeModal === "edit" && selectedId ? "PATCH" : "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(activeModal === "edit" ? updatePayload : createPayload),
        },
      );

      if (!response.ok) throw new Error(`Status ${response.status}`);
      setActiveModal(null);
      await fetchData();
    } catch (error) {
      console.error("Eroare salvare sesizare:", error);
      setErrorMessage("Salvarea sesizarii nu a reusit. Verifica payload-ul si permisiunile.");
    }
  };

  const columns: Column<TicketItem>[] = [
    {
      header: "Titlu",
      key: "title",
      render: (item) => {
        const isClosed = item.status === "Inchis" || item.status === "Respins";
        return (
          <div className={`space-y-1 ${isClosed ? "opacity-50 text-slate-400" : ""}`}>
            <p className="font-semibold text-foreground">{item.title}</p>
            <p className="text-xs text-muted line-clamp-1">{item.description}</p>
          </div>
        );
      },
    },
    {
      header: "Locatie Cladire",
      key: "building",
      render: (item) => <span className="text-foreground font-medium">{item.building}</span>,
    },
    {
      header: "Depus de",
      key: "authorName",
      render: (item) => <span className="text-muted">{item.authorName}</span>,
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
      render: (item) => (
        <div className="flex space-x-3 text-xs" onClick={(event) => event.stopPropagation()}>
          <button type="button" className="text-blue-600 hover:text-blue-800 font-medium hover:underline" onClick={() => handleOpenEditModal(item)}>
            Editare
          </button>
          <button type="button" className="text-red-500 hover:text-red-700 font-medium hover:underline" onClick={() => void handleDelete(item.id)}>
            Stergere
          </button>
        </div>
      ),
    },
  ];

  if (access.loading || !access.allowed) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="flex bg-background p-1 rounded-xl border border-border/60 w-fit">
          {(["all", "active", "closed"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all uppercase ${
                activeTab === tab ? "bg-card text-foreground shadow-xs" : "text-muted hover:text-foreground"
              }`}
            >
              {tab === "all" && "Toate"}
              {tab === "active" && "Active"}
              {tab === "closed" && "Inchise"}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="bg-brand text-white px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer hover:opacity-90 transition-all shadow-md self-end md:self-auto"
        >
          Adauga Sesizare
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500 font-medium">Se incarca sesizarile reale...</div>
        ) : (
          <Table data={filteredTickets} columns={columns} />
        )}
      </div>

      <Modal
        isOpen={activeModal !== null}
        onClose={() => setActiveModal(null)}
        title={activeModal === "edit" ? "Editare Sesizare" : "Adauga Sesizare"}
      >
        <form onSubmit={handleSave} className="space-y-4 text-sm max-h-[80vh] flex flex-col justify-between">
          <div className="space-y-4 overflow-y-auto pr-1 pb-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Titlu</label>
              <input
                type="text"
                value={ticketForm.title}
                onChange={(event) => setTicketForm({ ...ticketForm, title: event.target.value })}
                className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand"
                required
              />
            </div>

            {activeModal === "edit" && (
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Modifica Status</label>
                <select
                  value={ticketForm.status}
                  onChange={(event) => setTicketForm({ ...ticketForm, status: event.target.value as ComplaintStatus })}
                  className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand text-sm font-semibold text-foreground"
                >
                  {statusOptions.map((option) => (
                    <option key={`${option.value}-${option.label}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Selecteaza Cladirea / Corpul</label>
              <select
                value={ticketForm.locationId}
                onChange={(event) => setTicketForm({ ...ticketForm, locationId: event.target.value })}
                className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand text-sm font-medium text-foreground"
                disabled={activeModal === "edit"}
              >
                <option value="">Fara locatie</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Descriere detaliata</label>
              <textarea
                value={ticketForm.description}
                onChange={(event) => setTicketForm({ ...ticketForm, description: event.target.value })}
                rows={4}
                className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand resize-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Imagine URL optional</label>
              <input
                type="url"
                value={ticketForm.image || ""}
                onChange={(event) => setTicketForm({ ...ticketForm, image: event.target.value })}
                placeholder="https://exemplu.ro/imagine.jpg"
                className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand"
                disabled={activeModal === "edit"}
              />
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onloadend = () => setTicketForm((current) => ({ ...current, image: reader.result as string }));
                  reader.readAsDataURL(file);
                }}
                className="hidden"
              />
              {activeModal === "add" && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 px-4 py-2 rounded-lg text-xs font-semibold border bg-card border-border text-foreground hover:bg-slate-50"
                >
                  Alege fisier
                </button>
              )}
            </div>
          </div>

          <div className="sticky bottom-0 bg-background pt-4 border-t border-border z-10 flex justify-end space-x-2">
            <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 border border-border rounded-lg text-muted text-xs hover:bg-background">
              Anuleaza
            </button>
            <button type="submit" className="px-4 py-2 bg-brand text-white rounded-lg text-xs font-bold hover:opacity-90">
              Salveaza
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
