"use client";

import React, { useState, useEffect } from "react";
import Table, { Column } from "../components/ui/Table";
import Modal from "../components/ui/Modal";
import { Card, CardContent } from "../components/ui/Card";
import MapView from "../components/MapView";
import MapComponent from "../components/MapComponent";
import { apiBaseUrl } from "@/lib/api-client";

interface Cladire {
  id: number;
  name: string;
  faculty_id: number | null;
  coordinates: { latitude: number; longitude: number } | null;
  adresa?: string;
  telefon?: string;
  website?: string;
  program?: string;
  descriere?: string;
}

type BackendRecord = Record<string, unknown>;

function isRecord(value: unknown): value is BackendRecord {
  return typeof value === "object" && value !== null;
}

function normalizeCoordinates(value: unknown): Cladire["coordinates"] {
  if (!isRecord(value)) return null;

  const latitude = Number(value.latitude);
  const longitude = Number(value.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

function normalizeCladire(value: unknown): Cladire | null {
  if (!isRecord(value)) return null;

  const id = Number(value.id);
  if (!Number.isFinite(id) || typeof value.name !== "string") {
    return null;
  }

  const facultyId = value.faculty_id === null || value.faculty_id === undefined
    ? null
    : Number(value.faculty_id);

  return {
    id,
    name: value.name,
    faculty_id: Number.isFinite(facultyId) ? facultyId : null,
    coordinates: normalizeCoordinates(value.coordinates),
    adresa: typeof value.adresa === "string" ? value.adresa : undefined,
    telefon: typeof value.telefon === "string" ? value.telefon : undefined,
    website: typeof value.website === "string" ? value.website : undefined,
    program: typeof value.program === "string" ? value.program : undefined,
    descriere: typeof value.descriere === "string" ? value.descriere : undefined,
  };
}

function normalizeCladiri(value: unknown): Cladire[] {
  if (!Array.isArray(value)) return [];

  return value
    .map(normalizeCladire)
    .filter((cladire): cladire is Cladire => cladire !== null);
}

interface FormState {
  name: string;
  faculty_id: string;
  lat: string;
  lng: string;
  adresa: string;
  telefon: string;
  website: string;
  program: string;
  descriere: string;
}

const emptyForm: FormState = {
  name: "", faculty_id: "", lat: "", lng: "",
  adresa: "", telefon: "", website: "", program: "", descriere: ""
};

function authHeaders(): HeadersInit {
  const headers = new Headers({ "Content-Type": "application/json" });
  const token = typeof window !== "undefined" ? window.localStorage.getItem("access_token") : null;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
}

function CladireForm({
  formState,
  setFormState,
  onSave,
  onCancel,
  isExpanded,
  setIsExpanded,
}: {
  formState: FormState;
  setFormState: React.Dispatch<React.SetStateAction<FormState>>;
  onSave: () => void;
  onCancel: () => void;
  isExpanded: boolean;
  setIsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <div className="flex flex-col w-full h-[calc(90vh-120px)] overflow-hidden">

      {/* Checkbox Facilități */}
      <div className="flex justify-end mb-4 flex-shrink-0">
        <label className="flex items-center gap-2 text-xs font-bold text-muted uppercase cursor-pointer select-none hover:text-foreground transition-colors">
          <input
            type="checkbox"
            checked={isExpanded}
            onChange={(e) => setIsExpanded(e.target.checked)}
            className="w-4 h-4 rounded border-border text-sidebar focus:ring-sidebar cursor-pointer accent-sky-600"
          />
          Facilități clădire
        </label>
      </div>

      {/* Corp formular */}
      <div className="flex-1 overflow-y-auto pr-1">
        <div className={`grid grid-cols-1 ${isExpanded ? "md:grid-cols-2 gap-6" : "grid-cols-1"} items-start pb-4`}>

          {/* Coloana Stânga */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted uppercase mb-1">Denumire</label>
              <input type="text" className="w-full p-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-sidebar"
                value={formState.name} onChange={e => setFormState({...formState, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase mb-1">Adresă</label>
              <input type="text" className="w-full p-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-sidebar"
                value={formState.adresa} onChange={e => setFormState({...formState, adresa: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-muted uppercase mb-1">Latitudine</label>
                <input type="text" placeholder="ex: 45.44" className="w-full p-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-sidebar"
                  value={formState.lat} onChange={e => setFormState({...formState, lat: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase mb-1">Longitudine</label>
                <input type="text" placeholder="ex: 28.05" className="w-full p-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-sidebar"
                  value={formState.lng} onChange={e => setFormState({...formState, lng: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase mb-1">Faculty ID (opțional)</label>
              <input type="number" className="w-full p-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-sidebar"
                value={formState.faculty_id} onChange={e => setFormState({...formState, faculty_id: e.target.value})} />
            </div>
            <div style={{ height: "300px" }} className="rounded-lg overflow-hidden border border-border">
              <MapComponent onLocationSelect={(lat, lng) => setFormState({ ...formState, lat: lat.toFixed(6), lng: lng.toFixed(6) })} />
            </div>
          </div>

          {/* Coloana Dreaptă */}
          {isExpanded && (
            <div className="space-y-4 p-4 border border-border rounded-xl bg-muted/5 animate-in fade-in slide-in-from-right-4 duration-200">
              <div>
                <label className="block text-xs font-bold text-muted uppercase mb-1">Telefon</label>
                <input type="text" placeholder="Introduceți numărul de telefon" className="w-full p-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-sidebar"
                  value={formState.telefon} onChange={e => setFormState({...formState, telefon: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase mb-1">Website</label>
                <input type="text" placeholder="Introduceți link-ul website-ului" className="w-full p-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-sidebar"
                  value={formState.website} onChange={e => setFormState({...formState, website: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase mb-1">Program</label>
                <input type="text" placeholder="ex: Luni - Vineri: 08:00 - 16:00" className="w-full p-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-sidebar"
                  value={formState.program} onChange={e => setFormState({...formState, program: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase mb-1">Descriere</label>
                <textarea rows={6} placeholder="Adăugați o descriere detaliată..." className="w-full p-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-sidebar resize-none"
                  value={formState.descriere} onChange={e => setFormState({...formState, descriere: e.target.value})} />
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Footer fix */}
      <div className="flex justify-end gap-2 pt-4 bg-card border-t border-border flex-shrink-0">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors">Anulează</button>
        <button type="button" onClick={onSave} className="px-4 py-2 bg-sidebar text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">Salvează</button>
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
  const [loading, setLoading] = useState(true);
  const [isAddExpanded, setIsAddExpanded] = useState(false);
  const [isEditExpanded, setIsEditExpanded] = useState(false);
  const [addForm, setAddForm] = useState<FormState>(emptyForm);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    async function fetchLocations() {
      try {
        const res = await fetch(`${apiBaseUrl}/locations/`);
        if (!res.ok) {
          throw new Error(`Eroare API: ${res.status}`);
        }
        const data = await res.json();
        console.log("Date primite de la backend:", data);
        setCladiri(normalizeCladiri(data));
      } catch (error) {
        console.error("Eroare la preluarea locațiilor:", error);
        setCladiri([]);
      } finally {
        setLoading(false);
      }
    }
    fetchLocations();
  }, []);

  const handleAdd = async () => {
    if (!addForm.name) return;
    try {
      const res = await fetch(`${apiBaseUrl}/locations/`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name: addForm.name,
          faculty_id: addForm.faculty_id ? parseInt(addForm.faculty_id) : null,
          coordinates: addForm.lat && addForm.lng ? {
            latitude: parseFloat(addForm.lat),
            longitude: parseFloat(addForm.lng)
          } : null
        })
      });
      const newLocation = await res.json();
      const normalizedLocation = normalizeCladire(newLocation);
      if (normalizedLocation) {
        setCladiri([...cladiri, normalizedLocation]);
      }
      setAddForm(emptyForm);
      setIsAddExpanded(false);
      setShowAddModal(false);
    } catch (e) {
      console.error("Eroare la adăugare:", e);
    }
  };

  const handleEditOpen = (cladire: Cladire) => {
    setEditingId(cladire.id);
    setEditForm({
      name: cladire.name,
      faculty_id: cladire.faculty_id?.toString() ?? "",
      lat: cladire.coordinates?.latitude.toString() ?? "",
      lng: cladire.coordinates?.longitude.toString() ?? "",
      adresa: cladire.adresa ?? "",
      telefon: cladire.telefon ?? "",
      website: cladire.website ?? "",
      program: cladire.program ?? "",
      descriere: cladire.descriere ?? "",
    });
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!editingId) return;
    try {
      const res = await fetch(`${apiBaseUrl}/locations/${editingId}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          name: editForm.name,
          faculty_id: editForm.faculty_id ? parseInt(editForm.faculty_id) : null,
          coordinates: editForm.lat && editForm.lng ? {
            latitude: parseFloat(editForm.lat),
            longitude: parseFloat(editForm.lng)
          } : null
        })
      });
      const updated = await res.json();
      const normalizedLocation = normalizeCladire(updated);
      if (normalizedLocation) {
        setCladiri(cladiri.map(c => c.id === editingId ? normalizedLocation : c));
      }
      setShowEditModal(false);
      setEditingId(null);
      setIsEditExpanded(false);
    } catch (e) {
      console.error("Eroare la editare:", e);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`${apiBaseUrl}/locations/${id}`, { method: "DELETE", headers: authHeaders() });
      setCladiri(cladiri.filter(c => c.id !== id));
    } catch (e) {
      console.error("Eroare la ștergere:", e);
    }
  };

  const cladiriForMap = cladiri
    .filter(c => c.coordinates)
    .map(c => ({
      id: c.id,
      denumire: c.name,
      adresa: c.adresa ?? "",
      lat: c.coordinates!.latitude.toString(),
      lng: c.coordinates!.longitude.toString(),
      facultate: c.faculty_id === null ? "f8" : `f${c.faculty_id}`,
    }));

  const columns: Column<Cladire>[] = [
    {
      header: "Clădire",
      key: "name",
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{item.name}</span>
          <span className="text-xs text-muted">{item.faculty_id ? `Facultate ${item.faculty_id}` : "Facilitate"}</span>
        </div>
      )
    },
    {
      header: "Coordonate",
      key: "coordinates",
      render: (item) => (
        <span className="text-xs text-muted font-mono">
          {item.coordinates ? `${item.coordinates.latitude}, ${item.coordinates.longitude}` : "—"}
        </span>
      )
    },
    {
      header: "Acțiuni",
      key: "id",
      render: (item) => (
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => handleEditOpen(item)} className="text-blue-600 hover:text-blue-700 text-xs font-medium">Editare</button>
          <button type="button" onClick={() => handleDelete(item.id)} className="text-rose-600 hover:text-rose-700 text-xs font-medium">Ștergere</button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex gap-2 p-1 bg-background border border-border rounded-xl">
          <button type="button" onClick={() => setTab("locatii")} className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${tab === "locatii" ? "bg-sidebar text-white" : "text-muted hover:text-foreground"}`}>Locații</button>
          <button type="button" onClick={() => setTab("harta")} className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${tab === "harta" ? "bg-sidebar text-white" : "text-muted hover:text-foreground"}`}>Hartă</button>
        </div>
        <button type="button" onClick={() => { setAddForm(emptyForm); setIsAddExpanded(false); setShowAddModal(true); }} className="px-4 py-2 bg-sidebar text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">+ Adaugă Clădire</button>
      </div>

      {tab === "locatii" ? (
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted text-sm">Se încarcă locațiile...</div>
            ) : cladiri.length === 0 ? (
              <div className="p-8 text-center text-muted text-sm">Nicio locație înregistrată.</div>
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

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Adaugă Clădire Nouă"
        className={`transition-all duration-300 ease-in-out ${isAddExpanded ? "max-w-4xl" : "max-w-lg"}`}>
        <CladireForm formState={addForm} setFormState={setAddForm} onSave={handleAdd} onCancel={() => setShowAddModal(false)}
          isExpanded={isAddExpanded} setIsExpanded={setIsAddExpanded} />
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Editare Clădire"
        className={`transition-all duration-300 ease-in-out ${isEditExpanded ? "max-w-4xl" : "max-w-lg"}`}>
        <CladireForm formState={editForm} setFormState={setEditForm} onSave={handleEditSave} onCancel={() => setShowEditModal(false)}
          isExpanded={isEditExpanded} setIsExpanded={setIsEditExpanded} />
      </Modal>
    </div>
  );
}
