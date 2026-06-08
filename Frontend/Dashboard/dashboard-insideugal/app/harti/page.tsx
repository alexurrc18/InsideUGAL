"use client";

import React, { useState } from "react";
import Table, { Column } from "../components/ui/Table";
import Modal from "../components/ui/Modal";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import MapView from "../components/MapView";

interface Cladire {
  id: number;
  denumire: string;
  adresa: string;
  lat: string;
  lng: string;
  facultate: string;
}

const initialCladiri: Cladire[] = [
  {
    id: 1,
    denumire: "Corpul D - Facultatea de Inginerie",
    adresa: "Str. Domnească nr. 111",
    lat: "45.4475",
    lng: "28.0519",
    facultate: "Inginerie",
  },
  {
    id: 2,
    denumire: "Corpul G - Rectorat",
    adresa: "Str. Domnească nr. 47",
    lat: "45.4371",
    lng: "28.0552",
    facultate: "Toate",
  },
];

export default function HartiPage() {
  const [tab, setTab] = useState<"locatii" | "harta">("locatii");
  const [showModal, setShowModal] = useState(false);
  const [cladiri, setCladiri] = useState<Cladire[]>(initialCladiri);
  
  // Form State
  const [formState, setFormState] = useState({
    denumire: "",
    adresa: "",
    lat: "",
    lng: "",
    facultate: "",
  });

  const handleSave = () => {
    if (!formState.denumire) return;
    setCladiri([...cladiri, { id: Date.now(), ...formState }]);
    setFormState({ denumire: "", adresa: "", lat: "", lng: "", facultate: "" });
    setShowModal(false);
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
    {
      header: "Adresă",
      key: "adresa",
    },
    {
      header: "Coordonate",
      key: "lat",
      render: (item) => (
        <span className="text-xs text-muted font-mono">
          {item.lat}, {item.lng}
        </span>
      )
    },
    {
      header: "Acțiuni",
      key: "id",
      render: (item) => (
        <button
          onClick={() => setCladiri(cladiri.filter(x => x.id !== item.id))}
          className="text-rose-600 hover:text-rose-700 text-xs font-medium"
        >
          Ștergere
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2 p-1 bg-background border border-border rounded-xl">
          <button
            onClick={() => setTab("locatii")}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              tab === "locatii" ? "bg-sidebar text-white" : "text-muted hover:text-foreground"
            }`}
          >
            Locații
          </button>
          <button
            onClick={() => setTab("harta")}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              tab === "harta" ? "bg-sidebar text-white" : "text-muted hover:text-foreground"
            }`}
          >
            Hartă
          </button>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-sidebar text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + Adaugă Clădire
        </button>
      </div>

      {/* Content */}
      {tab === "locatii" ? (
        <Card>
          <CardHeader>
            <CardTitle>Clădiri înregistrate</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table data={cladiri} columns={columns} />
          </CardContent>
        </Card>
      ) : (
        <div className="h-[600px] rounded-2xl overflow-hidden border border-border">
          <MapView />
        </div>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Adaugă Clădire Nouă"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-bold text-muted uppercase mb-1">Denumire</label>
              <input
                type="text"
                className="w-full p-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-sidebar"
                value={formState.denumire}
                onChange={e => setFormState({...formState, denumire: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase mb-1">Adresă</label>
              <input
                type="text"
                className="w-full p-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-sidebar"
                value={formState.adresa}
                onChange={e => setFormState({...formState, adresa: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-muted uppercase mb-1">Latitudine</label>
                <input
                  type="text"
                  placeholder="ex: 45.44"
                  className="w-full p-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-sidebar"
                  value={formState.lat}
                  onChange={e => setFormState({...formState, lat: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase mb-1">Longitudine</label>
                <input
                  type="text"
                  placeholder="ex: 28.05"
                  className="w-full p-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-sidebar"
                  value={formState.lng}
                  onChange={e => setFormState({...formState, lng: e.target.value})}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase mb-1">Facultate</label>
              <input
                type="text"
                className="w-full p-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-sidebar"
                value={formState.facultate}
                onChange={e => setFormState({...formState, facultate: e.target.value})}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors"
            >
              Anulează
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-sidebar text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Salvează
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
