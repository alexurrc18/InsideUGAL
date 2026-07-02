"use client";

import React, { useState } from "react";
import Image from "next/image";
import Table, { Column } from "../components/ui/Table";
import Modal from "../components/ui/Modal";
import { useFacilities, useCreateFacility, useUpdateFacility, useDeleteFacility } from "@/hooks/useDashboardApi";
import { canAccessFaculties, useRequireDashboardAccess } from "@/lib/dashboard-auth";

// Tipul corect pentru Facilități (fără abbreviation)
// types/facility.ts
export type FacilityItem = {
  id: number;
  name: string;
  description?: string;
  image_url?: string;
};
export default function FacilitiesPage() {
  const access = useRequireDashboardAccess(canAccessFaculties);
  const [activeModal, setActiveModal] = useState<"add" | "edit" | null>(null);
  const [viewModal, setViewModal] = useState<FacilityItem | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<FacilityItem>>({});

  const { data: facilitiesData, isLoading, refetch } = useFacilities();
  const createMutation = useCreateFacility();
  const updateMutation = useUpdateFacility();
  const deleteMutation = useDeleteFacility();

  const facilities = (facilitiesData as any)?.items ?? [];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (activeModal === "edit" && selectedId) {
        await updateMutation.mutateAsync({ id: selectedId, data: form });
      } else {
        await createMutation.mutateAsync(form);
      }
      setActiveModal(null);
      setForm({});
      refetch(); // Reîmprospătăm lista după salvare
    } catch (err) {
      console.error("Eroare la salvare (asigură-te că schema Zod permite câmpurile trimise):", err);
    }
  };

  const columns: Column<FacilityItem>[] = [
    {
      header: "Imagine",
      key: "image_url",
      render: (item: FacilityItem) => (
        <div className="w-12 h-12 relative rounded-lg overflow-hidden bg-gray-50">
          {item.image_url ? (
            <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="48px" />
          ) : (
            <span className="flex items-center justify-center h-full text-[10px] text-gray-400">N/A</span>
          )}
        </div>
      ),
    },
    { 
      header: "Nume Facilitate", 
      key: "name", 
      render: (item: FacilityItem) => (
        <span className="font-semibold cursor-pointer hover:text-blue-900" onClick={() => setViewModal(item)}>
          {item.name}
        </span>
      ) 
    },
    { 
      header: "Descriere", 
      key: "description", 
      render: (item: FacilityItem) => <span className="truncate max-w-[250px] block">{item.description || "-"}</span> 
    },
    {
      header: "Acțiuni",
      key: "actions",
      render: (item: FacilityItem) => (
        <div className="flex space-x-3 text-xs">
          <button type="button" className="text-blue-600 hover:underline" onClick={() => { setSelectedId(item.id); setForm(item); setActiveModal("edit"); }}>Editare</button>
          <button type="button" className="text-red-500 hover:underline" onClick={async () => { if(confirm("Ștergi?")) { await deleteMutation.mutateAsync(item.id); refetch(); }}}>Ștergere</button>
        </div>
      ),
    },
  ];

  if (access.loading || !access.allowed) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestionare Facilități</h1>
        <button 
          type="button"
          onClick={() => { setForm({}); setActiveModal("add"); }} 
          className="bg-brand text-white px-5 py-2 rounded-xl text-sm font-bold"
        >
          Adaugă Facilitate
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? <div className="p-12 text-center">Se încarcă...</div> : <Table data={facilities} columns={columns} />}
      </div>

      {/* Modal Vizualizare */}
      <Modal isOpen={viewModal !== null} onClose={() => setViewModal(null)} title="Detalii">
        {viewModal && (
          <div className="space-y-4">
            {viewModal.image_url && <Image src={viewModal.image_url} alt={viewModal.name} width={600} height={300} className="w-full h-64 object-cover rounded-lg" />}
            <h2 className="text-xl font-bold">{viewModal.name}</h2>
            <p className="text-sm text-gray-700">{viewModal.description}</p>
          </div>
        )}
      </Modal>

      {/* Modal Editare / Adăugare */}
      <Modal isOpen={activeModal !== null} onClose={() => setActiveModal(null)} title={activeModal === "edit" ? "Editare" : "Adăugare"}>
        <form onSubmit={handleSave} className="space-y-4">
          <input value={form.name || ""} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-gray-100 p-3 rounded-lg outline-none" placeholder="Nume Facilitate" required />
          <input value={form.image_url || ""} onChange={e => setForm({...form, image_url: e.target.value})} className="w-full bg-gray-100 p-3 rounded-lg outline-none" placeholder="URL Imagine" />
          <textarea value={form.description || ""} onChange={e => setForm({...form, description: e.target.value})} className="w-full bg-gray-100 p-3 rounded-lg outline-none" placeholder="Descriere" />
          <button type="submit" className="w-full bg-brand text-white py-3 rounded-lg font-semibold">Salvează</button>
        </form>
      </Modal>
    </div>
  );
}