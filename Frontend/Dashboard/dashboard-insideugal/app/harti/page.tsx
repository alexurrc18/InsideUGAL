"use client";

import React, { useCallback, useEffect, useState } from "react";
import Table, { Column } from "../components/ui/Table";
import Modal from "../components/ui/Modal";
import { Card, CardContent } from "../components/ui/Card";
import MapView from "../components/MapView";
import MapComponent from "../components/MapComponent";
import { apiBaseUrl, getAuthHeaders } from "@/lib/api-client";
import { canAccessMaps, useRequireDashboardAccess } from "@/lib/dashboard-auth";

type PaginatedResponse<T> = {
  items?: T[];
};

interface LocationApiItem {
  id: number;
  name: string;
  marker?: string | null;
  faculty_ids: number[];
  facility_id?: number | null;
  coordinates: { latitude: number; longitude: number } | null;
}

interface Cladire {
  id: number;
  name: string;
  marker?: string | null;
  faculty_ids: number[];
  facility_id?: number | null;
  coordinates: { latitude: number; longitude: number } | null;
}

interface FormState {
  name: string;
  faculty_ids: string;
  lat: string;
  lng: string;
}

const emptyForm: FormState = {
  name: "",
  faculty_ids: "",
  lat: "",
  lng: "",
};

function itemsFromResponse<T>(payload: PaginatedResponse<T> | T[]): T[] {
  return Array.isArray(payload) ? payload : payload.items ?? [];
}

function parseFacultyIds(value: string): number[] {
  return value
    .split(",")
    .map((part) => parseInt(part.trim(), 10))
    .filter((id) => Number.isFinite(id));
}

function formToPayload(form: FormState) {
  return {
    name: form.name,
    faculty_ids: parseFacultyIds(form.faculty_ids),
    coordinates: form.lat && form.lng ? {
      latitude: parseFloat(form.lat),
      longitude: parseFloat(form.lng),
    } : null,
  };
}

function formFromCladire(cladire: Cladire): FormState {
  return {
    name: cladire.name,
    faculty_ids: cladire.faculty_ids.join(", "),
    lat: cladire.coordinates?.latitude.toString() ?? "",
    lng: cladire.coordinates?.longitude.toString() ?? "",
  };
}

function CladireForm({
  formState,
  setFormState,
  onSave,
  onCancel,
}: {
  formState: FormState;
  setFormState: React.Dispatch<React.SetStateAction<FormState>>;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col w-full max-h-[calc(90vh-120px)] overflow-hidden">
      <div className="flex-1 overflow-y-auto pr-1 space-y-4">
        <div>
          <label className="block text-xs font-bold text-muted uppercase mb-1">Denumire</label>
          <input value={formState.name} onChange={(event) => setFormState({ ...formState, name: event.target.value })} className="w-full p-2 rounded-lg border border-border bg-background text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-muted uppercase mb-1">Latitudine</label>
            <input value={formState.lat} onChange={(event) => setFormState({ ...formState, lat: event.target.value })} className="w-full p-2 rounded-lg border border-border bg-background text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted uppercase mb-1">Longitudine</label>
            <input value={formState.lng} onChange={(event) => setFormState({ ...formState, lng: event.target.value })} className="w-full p-2 rounded-lg border border-border bg-background text-sm" />
          </div>
        </div>
        <div className="h-[260px] rounded-lg overflow-hidden border border-border">
          <MapComponent onLocationSelect={(lat, lng) => setFormState({ ...formState, lat: lat.toFixed(6), lng: lng.toFixed(6) })} />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 bg-card border-t border-border flex-shrink-0">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground">Anulează</button>
        <button type="button" onClick={onSave} className="px-4 py-2 bg-sidebar text-white rounded-lg text-sm font-medium hover:opacity-90">Salvează</button>
      </div>
    </div>
  );
}

export default function HartiPage() {
  const access = useRequireDashboardAccess(canAccessMaps);
  const [tab, setTab] = useState<"locatii" | "harta">("locatii");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [cladiri, setCladiri] = useState<Cladire[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("");
  const [addForm, setAddForm] = useState<FormState>(emptyForm);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${apiBaseUrl}/locations/?size=200`, {
        cache: "no-store",
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const payload = await response.json() as PaginatedResponse<LocationApiItem> | LocationApiItem[];
      setCladiri(itemsFromResponse(payload).map((item) => ({
        id: item.id,
        name: item.name,
        marker: item.marker ?? null,
        faculty_ids: Array.isArray(item.faculty_ids) ? item.faculty_ids : [],
        facility_id: item.facility_id ?? null,
        coordinates: item.coordinates ?? null,
      })));
    } catch (error) {
      console.error("Eroare la incarcarea locatiilor:", error);
      setCladiri([]);
      setErrorMessage("Nu am putut incarca locatiile reale. Verifica backend-ul si conexiunea la Supabase.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchLocations);
  }, [fetchLocations]);

  const handleAdd = async () => {
    if (!addForm.name) return;
    setErrorMessage(null);

    try {
      const response = await fetch(`${apiBaseUrl}/locations/`, {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(formToPayload(addForm)),
      });
      if (!response.ok) throw new Error(`Status ${response.status}`);
      setAddForm(emptyForm);
      setShowAddModal(false);
      await fetchLocations();
    } catch (error) {
      console.error("Eroare la adaugarea locatiei:", error);
      setErrorMessage("Adaugarea locatiei nu a reusit. Verifica autentificarea si permisiunile.");
    }
  };

  const handleEditOpen = (cladire: Cladire) => {
    setEditingId(cladire.id);
    setEditForm(formFromCladire(cladire));
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!editingId) return;
    setErrorMessage(null);

    try {
      const response = await fetch(`${apiBaseUrl}/locations/${editingId}`, {
        method: "PATCH",
        credentials: "include",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(formToPayload(editForm)),
      });
      if (!response.ok) throw new Error(`Status ${response.status}`);
      setShowEditModal(false);
      setEditingId(null);
      await fetchLocations();
    } catch (error) {
      console.error("Eroare la editarea locatiei:", error);
      setErrorMessage("Editarea locatiei nu a reusit. Verifica autentificarea si permisiunile.");
    }
  };

  const handleDelete = async (id: number) => {
    setErrorMessage(null);

    try {
      const response = await fetch(`${apiBaseUrl}/locations/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (!response.ok && response.status !== 204) throw new Error(`Status ${response.status}`);
      await fetchLocations();
    } catch (error) {
      console.error("Eroare la stergerea locatiei:", error);
      setErrorMessage("Stergerea locatiei nu a reusit. Verifica autentificarea si permisiunile.");
    }
  };

  const filteredCladiri = selectedFacultyId === "facilities"
    ? cladiri.filter((cladire) => cladire.facility_id !== null && cladire.facility_id !== undefined)
    : selectedFacultyId
      ? cladiri.filter((cladire) => cladire.faculty_ids.includes(parseInt(selectedFacultyId, 10)))
      : cladiri;

  const facultyFilterOptions = Array.from(new Set(cladiri.flatMap((cladire) => cladire.faculty_ids))).sort((a, b) => a - b);

  const cladiriForMap = filteredCladiri
    .filter((cladire) => cladire.coordinates)
    .map((cladire) => ({
      id: cladire.id,
      denumire: cladire.name,
      marker: cladire.marker ?? null,
      adresa: cladire.coordinates ? `${cladire.coordinates.latitude}, ${cladire.coordinates.longitude}` : "",
      lat: cladire.coordinates!.latitude.toString(),
      lng: cladire.coordinates!.longitude.toString(),
      facultate: cladire.facility_id !== null && cladire.facility_id !== undefined ? "f8" : `f${cladire.faculty_ids[0] ?? ""}`,
    }));

  const columns: Column<Cladire>[] = [
    {
      header: "Clădire",
      key: "name",
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{item.name}</span>
          <span className="text-xs text-muted">
            {item.facility_id ? "Facilitate UGAL" : item.faculty_ids.length ? `Facultati ${item.faculty_ids.join(", ")}` : "UGAL"}
          </span>
        </div>
      ),
    },
    {
      header: "Coordonate",
      key: "coordinates",
      render: (item) => (
        <span className="text-xs text-muted font-mono">
          {item.coordinates ? `${item.coordinates.latitude}, ${item.coordinates.longitude}` : "-"}
        </span>
      ),
    },
    {
      header: "Acțiuni",
      key: "id",
      render: (item) => (
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => handleEditOpen(item)} className="text-blue-600 hover:text-blue-700 text-xs font-medium">Editare</button>
          <button type="button" onClick={() => void handleDelete(item.id)} className="text-rose-600 hover:text-rose-700 text-xs font-medium">Ștergere</button>
        </div>
      ),
    },
  ];

  if (access.loading || !access.allowed) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex gap-2 p-1 bg-background border border-border rounded-xl">
  <button type="button" onClick={() => setTab("locatii")} className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${tab === "locatii" ? "bg-card text-foreground shadow-sm" : "text-muted hover:text-foreground"}`}>Locații</button>
  <button type="button" onClick={() => setTab("harta")} className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${tab === "harta" ? "bg-card text-foreground shadow-sm" : "text-muted hover:text-foreground"}`}>Hartă</button>
</div>
        
        <button type="button" onClick={() => { setAddForm(emptyForm); setShowAddModal(true); }} className="px-4 py-2 bg-sidebar text-white rounded-lg text-sm font-medium hover:opacity-90">Adaugă clădire</button>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {tab === "locatii" ? (
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted text-sm">Se incarca locatiile reale...</div>
            ) : cladiri.length === 0 ? (
              <div className="p-8 text-center text-muted text-sm">Nicio locatie inregistrata.</div>
            ) : (
              <Table data={cladiri} columns={columns} />
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="h-[600px] rounded-2xl overflow-hidden border border-border">
          <MapView cladiri={cladiriForMap} />
        </div>
      )}

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Adaugă clădire" className="max-w-lg">
        <CladireForm formState={addForm} setFormState={setAddForm} onSave={() => void handleAdd()} onCancel={() => setShowAddModal(false)} />
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Editare clădire" className="max-w-lg">
        <CladireForm formState={editForm} setFormState={setEditForm} onSave={() => void handleEditSave()} onCancel={() => setShowEditModal(false)} />
      </Modal>
    </div>
  );
}
