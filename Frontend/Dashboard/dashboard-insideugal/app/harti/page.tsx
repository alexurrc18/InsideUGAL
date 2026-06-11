"use client";

import React, { useState, useEffect } from "react";
import Table, { Column } from "../components/ui/Table";
import Modal from "../components/ui/Modal";
import { Card, CardContent } from "../components/ui/Card";
import MapView from "../components/MapView";
import MapComponent from "../components/MapComponent";

interface Cladire {
  id: number;
  denumire: string;
  adresa: string;
  lat: string;
  lng: string;
  facultate: string;
  telefon: string;
  website: string;
  program: string;
  descriere: string;
}

interface BackendLocation {
  id: number;
  name: string;
  coordinates?: { latitude: number; longitude: number };
}

function CladireForm({
  formState,
  setFormState,
  onSave,
  onCancel,
  isExpanded,
  setIsExpanded,
}: {
  formState: Omit<Cladire, "id">;
  setFormState: React.Dispatch<React.SetStateAction<Omit<Cladire, "id">>>;
  onSave: () => void;
  onCancel: () => void;
  isExpanded: boolean;
  setIsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    /* h-[calc(90vh-120px)] ne asigură că formularul folosește la maxim spațiul disponibil în modal */
    <div className="flex flex-col w-full h-[calc(90vh-120px)] overflow-hidden">
      
      {/* 1. Zona cu Checkbox-ul de Facilități */}
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

      {/* 2. CORPUL FORMULARULUI - Singurul care va primi scroll independent */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
        <div className={`grid grid-cols-1 ${isExpanded ? "md:grid-cols-2 gap-6" : "grid-cols-1"} items-start pb-4`}>
          
          {/* Coloana Stânga */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted uppercase mb-1">Denumire</label>
              <input type="text" className="w-full p-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-sidebar"
                value={formState.denumire} onChange={e => setFormState({...formState, denumire: e.target.value})} />
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
              <label className="block text-xs font-bold text-muted uppercase mb-1">Facultate</label>
              <input type="text" className="w-full p-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-sidebar"
                value={formState.facultate} onChange={e => setFormState({...formState, facultate: e.target.value})} />
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

      {/* 3. FOOTER FIX - Rămâne complet blocat în partea de jos, ferit de scroll */}
      <div className="flex justify-end gap-2 pt-4 bg-card border-t border-border flex-shrink-0">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors">
          Anulează
        </button>
        <button type="button" onClick={onSave}
          className="px-4 py-2 bg-sidebar text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
          Salvează
        </button>
      </div>
    </div>
  );
}

export default function HartiPage() {
  const [tab, setTab] = useState<"locatii" | "harta">("locatii");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCladire, setEditingCladire] = useState<Cladire | null>(null);
  const [cladiri, setCladiri] = useState<Cladire[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchLocations = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("http://localhost:8000/locations/");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: BackendLocation[] = await response.json();
        const mappedCladiri: Cladire[] = data.map((loc) => ({
          id: loc.id,
          denumire: loc.name,
          adresa: "",
          lat: loc.coordinates?.latitude?.toString() || "",
          lng: loc.coordinates?.longitude?.toString() || "",
          facultate: "",
          telefon: "",
          website: "",
          program: "",
          descriere: ""
        }));
        setCladiri(mappedCladiri);
      } catch (error) {
        console.error("Eroare la încărcarea locațiilor:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLocations();
  }, []);

  const [isAddExpanded, setIsAddExpanded] = useState(false);
  const [isEditExpanded, setIsEditExpanded] = useState(false);

  const emptyForm = { denumire: "", adresa: "", lat: "", lng: "", facultate: "", telefon: "", website: "", program: "", descriere: "" };
  const [addForm, setAddForm] = useState<Omit<Cladire, "id">>(emptyForm);
  const [editForm, setEditForm] = useState<Omit<Cladire, "id">>(emptyForm);

  const handleAdd = () => {
    if (!addForm.denumire) return;
    setCladiri([...cladiri, { id: Date.now(), ...addForm }]);
    setAddForm(emptyForm);
    setShowAddModal(false);
    setIsAddExpanded(false);
  };

  const handleEditOpen = (cladire: Cladire) => {
    setEditingCladire(cladire);
    setEditForm({ 
      denumire: cladire.denumire, 
      adresa: cladire.adresa, 
      lat: cladire.lat, 
      lng: cladire.lng, 
      facultate: cladire.facultate,
      telefon: cladire.telefon || "",
      website: cladire.website || "",
      program: cladire.program || "",
      descriere: cladire.descriere || ""
    });
    setShowEditModal(true);
  };

  const handleEditSave = () => {
    if (!editingCladire) return;
    setCladiri(cladiri.map(c => c.id === editingCladire.id ? { ...c, ...editForm } : c));
    setShowEditModal(false);
    setEditingCladire(null);
    setIsEditExpanded(false);
  };

  const columns: Column<Cladire>[] = [
    {
      header: "Clădire",
      key: "denumire",
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{item.denumire}</span>
          <span className="text-xs text-muted">{item.facultate}</span>
        </div>
      )
    },
    { header: "Adresă", key: "adresa" },
    {
      header: "Coordonate",
      key: "lat",
      render: (item) => <span className="text-xs text-muted font-mono">{item.lat}, {item.lng}</span>
    },
    {
      header: "Acțiuni",
      key: "id",
      render: (item) => (
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => handleEditOpen(item)} className="text-blue-600 hover:text-blue-700 text-xs font-medium">Editare</button>
          <button type="button" onClick={() => setCladiri(cladiri.filter(x => x.id !== item.id))} className="text-rose-600 hover:text-rose-700 text-xs font-medium">Ștergere</button>
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
            {isLoading ? (
              <div className="p-8 text-center text-muted">Se încarcă locațiile...</div>
            ) : (
              <Table data={cladiri} columns={columns} />
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="h-[600px] rounded-2xl overflow-hidden border border-border"><MapView cladiri={cladiri} /></div>
      )}

      <Modal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        title="Adaugă Clădire Nouă"
        className={`transition-all duration-300 ease-in-out ${isAddExpanded ? "max-w-4xl" : "max-w-lg"}`}
      >
        <CladireForm 
          formState={addForm} 
          setFormState={setAddForm} 
          onSave={handleAdd} 
          onCancel={() => setShowAddModal(false)} 
          isExpanded={isAddExpanded}
          setIsExpanded={setIsAddExpanded}
        />
      </Modal>

      <Modal 
        isOpen={showEditModal} 
        onClose={() => setShowEditModal(false)} 
        title="Editare Clădire"
        className={`transition-all duration-300 ease-in-out ${isEditExpanded ? "max-w-4xl" : "max-w-lg"}`}
      >
        <CladireForm 
          formState={editForm} 
          setFormState={setEditForm} 
          onSave={handleEditSave} 
          onCancel={() => setShowEditModal(false)} 
          isExpanded={isEditExpanded}
          setIsExpanded={setIsEditExpanded}
        />
      </Modal>
    </div>
  );
}