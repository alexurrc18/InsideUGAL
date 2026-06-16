"use client";

import React, { useCallback, useEffect, useState } from "react";
import Table, { Column } from "../components/ui/Table";
import Modal from "../components/ui/Modal";
import { Card, CardContent } from "../components/ui/Card";
import MapView from "../components/MapView";
import MapComponent from "../components/MapComponent";

type PaginatedResponse<T> = {
  items?: T[];
};

interface LocationApiItem {
  id: number;
  name: string;
  faculty_id: number | null;
  coordinates: { latitude: number; longitude: number } | null;
}

interface Cladire {
  id: number;
  name: string;
  faculty_id: number | null;
  coordinates: { latitude: number; longitude: number } | null;
}

interface FormState {
  name: string;
  faculty_id: string;
  lat: string;
  lng: string;
}

const emptyForm: FormState = {
  name: "",
  faculty_id: "",
  lat: "",
  lng: "",
};

const apiBaseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8002").replace(/\/$/, "");

function itemsFromResponse<T>(payload: PaginatedResponse<T> | T[]): T[] {
  return Array.isArray(payload) ? payload : payload.items ?? [];
}

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function formToPayload(form: FormState) {
  return {
    name: form.name,
    faculty_id: form.faculty_id ? parseInt(form.faculty_id, 10) : null,
    coordinates: form.lat && form.lng ? {
      latitude: parseFloat(form.lat),
      longitude: parseFloat(form.lng),
    } : null,
  };
}

function formFromCladire(cladire: Cladire): FormState {
  return {
    name: cladire.name,
    faculty_id: cladire.faculty_id?.toString() ?? "",
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
        <div>
          <label className="block text-xs font-bold text-muted uppercase mb-1">Faculty ID</label>
          <input type="number" value={formState.faculty_id} onChange={(event) => setFormState({ ...formState, faculty_id: event.target.value })} className="w-full p-2 rounded-lg border border-border bg-background text-sm" />
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
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground">Anuleaza</button>
        <button type="button" onClick={onSave} className="px-4 py-2 bg-sidebar text-white rounded-lg text-sm font-medium hover:opacity-90">Salveaza</button>
      </div>
    </div>
  );
}

export default function HartiPage() {
  const [tab, setTab] = useState<"locatii" | "harta">("locatii");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [cladiri, setCladiri] = useState<Cladire[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [addForm, setAddForm] = useState<FormState>(emptyForm);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${apiBaseUrl}/locations/`);
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const payload = await response.json() as PaginatedResponse<LocationApiItem> | LocationApiItem[];
      setCladiri(itemsFromResponse(payload).map((item) => ({
        id: item.id,
        name: item.name,
        faculty_id: item.faculty_id ?? null,
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
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
      });
      if (!response.ok && response.status !== 204) throw new Error(`Status ${response.status}`);
      await fetchLocations();
    } catch (error) {
      console.error("Eroare la stergerea locatiei:", error);
      setErrorMessage("Stergerea locatiei nu a reusit. Verifica autentificarea si permisiunile.");
    }
  };

  const cladiriForMap = cladiri
    .filter((cladire) => cladire.coordinates)
    .map((cladire) => ({
      id: cladire.id,
      denumire: cladire.name,
      adresa: cladire.coordinates ? `${cladire.coordinates.latitude}, ${cladire.coordinates.longitude}` : "",
      lat: cladire.coordinates!.latitude.toString(),
      lng: cladire.coordinates!.longitude.toString(),
      facultate: cladire.faculty_id === null ? "f8" : `f${cladire.faculty_id}`,
    }));

  const columns: Column<Cladire>[] = [
    {
      header: "Cladire",
      key: "name",
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{item.name}</span>
          <span className="text-xs text-muted">{item.faculty_id ? `Facultate ${item.faculty_id}` : "UGAL"}</span>
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
      header: "Actiuni",
      key: "id",
      render: (item) => (
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => handleEditOpen(item)} className="text-blue-600 hover:text-blue-700 text-xs font-medium">Editare</button>
          <button type="button" onClick={() => void handleDelete(item.id)} className="text-rose-600 hover:text-rose-700 text-xs font-medium">Stergere</button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex gap-2 p-1 bg-background border border-border rounded-xl">
          <button type="button" onClick={() => setTab("locatii")} className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${tab === "locatii" ? "bg-sidebar text-white" : "text-muted hover:text-foreground"}`}>Locatii</button>
          <button type="button" onClick={() => setTab("harta")} className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${tab === "harta" ? "bg-sidebar text-white" : "text-muted hover:text-foreground"}`}>Harta</button>
        </div>
        <button type="button" onClick={() => { setAddForm(emptyForm); setShowAddModal(true); }} className="px-4 py-2 bg-sidebar text-white rounded-lg text-sm font-medium hover:opacity-90">+ Adauga cladire</button>
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

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Adauga cladire" className="max-w-lg">
        <CladireForm formState={addForm} setFormState={setAddForm} onSave={() => void handleAdd()} onCancel={() => setShowAddModal(false)} />
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Editare cladire" className="max-w-lg">
        <CladireForm formState={editForm} setFormState={setEditForm} onSave={() => void handleEditSave()} onCancel={() => setShowEditModal(false)} />
      </Modal>
    </div>
  );
}
