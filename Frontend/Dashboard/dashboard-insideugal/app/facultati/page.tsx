"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Table, { Column } from "../components/ui/Table";
import Modal from "../components/ui/Modal";

type PaginatedResponse<T> = {
  items?: T[];
};

type FacultyApiItem = {
  id: number;
  name: string;
  abbreviation?: string | null;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  website_url?: string | null;
};

type LocationApiItem = {
  id: number;
  name: string;
  faculty_id?: number | null;
  coordinates?: { latitude: number; longitude: number } | null;
};

export type FacultyItem = {
  id: string;
  name: string;
  abbreviation: string;
  description: string;
  address: string;
  phone: string;
  website: string;
};

export type BuildingItem = {
  id: string;
  name: string;
  location: string;
  faculties: string[];
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

export default function Page() {
  const [activeTab, setActiveTab] = useState<"facultati" | "cladiri">("facultati");
  const [faculties, setFaculties] = useState<FacultyItem[]>([]);
  const [buildings, setBuildings] = useState<BuildingItem[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<"add" | "edit" | null>(null);
  const [targetType, setTargetType] = useState<"facultati" | "cladiri">("facultati");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [facultyForm, setFacultyForm] = useState<Partial<FacultyItem>>({});
  const [buildingForm, setBuildingForm] = useState<Partial<BuildingItem>>({ faculties: [] });

  const fetchData = useCallback(async () => {
    setIsDataLoading(true);
    setErrorMessage(null);

    try {
      const [facultiesResponse, locationsResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/faculties/?size=200`),
        fetch(`${apiBaseUrl}/locations/?size=200`),
      ]);

      if (!facultiesResponse.ok) {
        throw new Error(`Facultati API a raspuns cu status ${facultiesResponse.status}.`);
      }
      if (!locationsResponse.ok) {
        throw new Error(`Locatii API a raspuns cu status ${locationsResponse.status}.`);
      }

      const facultiesPayload = await facultiesResponse.json() as PaginatedResponse<FacultyApiItem> | FacultyApiItem[];
      const locationsPayload = await locationsResponse.json() as PaginatedResponse<LocationApiItem> | LocationApiItem[];
      const facultyItems = itemsFromResponse(facultiesPayload);

      const mappedFaculties = facultyItems.map((item) => ({
        id: String(item.id),
        name: item.name,
        abbreviation: item.abbreviation ?? "",
        description: item.description ?? "",
        address: item.address ?? "",
        phone: item.phone ?? "",
        website: item.website_url ?? "",
      }));

      const facultyNamesById = new Map(facultyItems.map((faculty) => [faculty.id, faculty.abbreviation || faculty.name]));
      const mappedBuildings = itemsFromResponse(locationsPayload).map((item) => ({
        id: String(item.id),
        name: item.name,
        location: item.coordinates
          ? `${item.coordinates.latitude}, ${item.coordinates.longitude}`
          : "Coordonate necompletate",
        faculties: item.faculty_id ? [facultyNamesById.get(item.faculty_id) ?? `Facultatea #${item.faculty_id}`] : ["UGAL"],
      }));

      setFaculties(mappedFaculties);
      setBuildings(mappedBuildings);
    } catch (error) {
      console.error("Eroare la incarcarea facultatilor/hartilor:", error);
      setFaculties([]);
      setBuildings([]);
      setErrorMessage("Nu am putut incarca datele reale pentru Facultati si Harti. Verifica backend-ul si conexiunea la Supabase.");
    } finally {
      setIsDataLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchData);
  }, [fetchData]);

  const availableAcronyms = useMemo(() => {
    return faculties.map((faculty) => faculty.abbreviation || faculty.name);
  }, [faculties]);

  const handleOpenAddModal = () => {
    setTargetType(activeTab);
    setSelectedId(null);
    setFacultyForm({});
    setBuildingForm({ faculties: [] });
    setActiveModal("add");
  };

  const handleToggleBuildingFaculty = (acronym: string) => {
    const current = buildingForm.faculties || [];
    setBuildingForm({
      ...buildingForm,
      faculties: current.includes(acronym)
        ? current.filter((item) => item !== acronym)
        : [...current, acronym],
    });
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);

    try {
      if (targetType === "facultati") {
        const payload = {
          name: facultyForm.name || "",
          abbreviation: facultyForm.abbreviation || null,
          description: facultyForm.description || null,
          address: facultyForm.address || null,
          phone: facultyForm.phone || null,
          website_url: facultyForm.website || null,
        };
        const url = activeModal === "edit" && selectedId
          ? `${apiBaseUrl}/faculties/${selectedId}`
          : `${apiBaseUrl}/faculties/`;
        const method = activeModal === "edit" && selectedId ? "PATCH" : "POST";

        const response = await fetch(url, {
          method,
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(`Status ${response.status}`);
      } else {
        const selectedFaculty = faculties.find((faculty) => buildingForm.faculties?.includes(faculty.abbreviation || faculty.name));
        const payload = {
          name: buildingForm.name || "",
          faculty_id: selectedFaculty ? Number(selectedFaculty.id) : null,
          coordinates: null,
        };
        const url = activeModal === "edit" && selectedId
          ? `${apiBaseUrl}/locations/${selectedId}`
          : `${apiBaseUrl}/locations/`;
        const method = activeModal === "edit" && selectedId ? "PATCH" : "POST";

        const response = await fetch(url, {
          method,
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(`Status ${response.status}`);
      }

      await fetchData();
      setActiveModal(null);
    } catch (error) {
      console.error("Eroare la salvare:", error);
      setErrorMessage("Salvarea nu a reusit. Verifica autentificarea si permisiunile pentru acest modul.");
    }
  };

  const handleDeleteFaculty = async (id: string) => {
    try {
      const response = await fetch(`${apiBaseUrl}/faculties/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok && response.status !== 204) throw new Error(`Status ${response.status}`);
      await fetchData();
    } catch (error) {
      console.error("Eroare la stergerea facultatii:", error);
      setErrorMessage("Stergerea facultatii nu a reusit. Verifica autentificarea si permisiunile.");
    }
  };

  const handleDeleteBuilding = async (id: string) => {
    try {
      const response = await fetch(`${apiBaseUrl}/locations/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok && response.status !== 204) throw new Error(`Status ${response.status}`);
      await fetchData();
    } catch (error) {
      console.error("Eroare la stergerea locatiei:", error);
      setErrorMessage("Stergerea locatiei nu a reusit. Verifica autentificarea si permisiunile.");
    }
  };

  const facultyColumns: Column<FacultyItem>[] = [
    { header: "Nume facultate", key: "name", render: (item) => <span className="font-semibold text-foreground">{item.name}</span> },
    { header: "Descriere", key: "description", render: (item) => <span className="block max-w-xs truncate text-muted">{item.description || "-"}</span> },
    { header: "Adresa", key: "address", render: (item) => <span className="text-muted">{item.address || "-"}</span> },
    { header: "Telefon", key: "phone", render: (item) => <span className="text-muted whitespace-nowrap">{item.phone || "-"}</span> },
    { header: "Website", key: "website", render: (item) => item.website ? <a href={item.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{item.website}</a> : <span className="text-muted">-</span> },
    {
      header: "Actiuni",
      key: "actions",
      render: (item) => (
        <div className="flex space-x-3 text-xs" onClick={(event) => event.stopPropagation()}>
          <button type="button" className="text-blue-600 hover:underline" onClick={() => {
            setSelectedId(item.id);
            setTargetType("facultati");
            setFacultyForm({ ...item });
            setActiveModal("edit");
          }}>Editare</button>
          <button type="button" className="text-red-500 hover:underline" onClick={() => void handleDeleteFaculty(item.id)}>Stergere</button>
        </div>
      ),
    },
  ];

  const buildingColumns: Column<BuildingItem>[] = [
    { header: "Nume cladire", key: "name", render: (item) => <span className="font-semibold text-foreground">{item.name}</span> },
    { header: "Locatie", key: "location", render: (item) => <span className="text-muted">{item.location}</span> },
    {
      header: "Facultati",
      key: "faculties",
      render: (item) => (
        <div className="flex flex-wrap gap-1">
          {item.faculties.map((faculty) => (
            <span key={faculty} className="bg-blue-50 text-brand text-xs px-2 py-0.5 rounded-md border border-blue-100/50">{faculty}</span>
          ))}
        </div>
      ),
    },
    {
      header: "Actiuni",
      key: "actions",
      render: (item) => (
        <div className="flex space-x-3 text-xs" onClick={(event) => event.stopPropagation()}>
          <button type="button" className="text-blue-600 hover:underline" onClick={() => {
            setSelectedId(item.id);
            setTargetType("cladiri");
            setBuildingForm({ ...item });
            setActiveModal("edit");
          }}>Editare</button>
          <button type="button" className="text-red-500 hover:underline" onClick={() => void handleDeleteBuilding(item.id)}>Stergere</button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="flex bg-background p-1 rounded-xl border border-border/60 w-fit">
          <button type="button" onClick={() => setActiveTab("facultati")} className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${activeTab === "facultati" ? "bg-card text-foreground shadow-xs" : "text-muted hover:text-foreground"}`}>Facultati</button>
          <button type="button" onClick={() => setActiveTab("cladiri")} className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${activeTab === "cladiri" ? "bg-card text-foreground shadow-xs" : "text-muted hover:text-foreground"}`}>Cladiri</button>
        </div>
        <button type="button" onClick={handleOpenAddModal} className="bg-brand text-white px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer hover:opacity-90 transition-all shadow-md self-end md:self-auto">Adauga</button>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
        {isDataLoading ? (
          <div className="p-12 text-center text-sm text-slate-500 font-medium">Se incarca datele reale...</div>
        ) : activeTab === "facultati" ? (
          <Table data={faculties} columns={facultyColumns} />
        ) : (
          <Table data={buildings} columns={buildingColumns} />
        )}
      </div>

      <Modal isOpen={activeModal !== null} onClose={() => setActiveModal(null)} title={activeModal === "edit" ? "Editare" : "Adaugare"}>
        <form onSubmit={handleSave} className="space-y-4 text-sm">
          {activeModal === "add" && (
            <select value={targetType} onChange={(event) => setTargetType(event.target.value as "facultati" | "cladiri")} className="w-full border border-border p-2 rounded-lg bg-background">
              <option value="facultati">Facultati</option>
              <option value="cladiri">Cladiri</option>
            </select>
          )}

          {targetType === "facultati" ? (
            <>
              <input value={facultyForm.name || ""} onChange={(event) => setFacultyForm({ ...facultyForm, name: event.target.value })} placeholder="Nume facultate" className="w-full border border-border p-2 rounded-lg bg-background" required />
              <input value={facultyForm.abbreviation || ""} onChange={(event) => setFacultyForm({ ...facultyForm, abbreviation: event.target.value })} placeholder="Abreviere" className="w-full border border-border p-2 rounded-lg bg-background" />
              <textarea value={facultyForm.description || ""} onChange={(event) => setFacultyForm({ ...facultyForm, description: event.target.value })} placeholder="Descriere scurta" className="w-full border border-border p-2 rounded-lg bg-background h-20" />
              <input value={facultyForm.address || ""} onChange={(event) => setFacultyForm({ ...facultyForm, address: event.target.value })} placeholder="Adresa" className="w-full border border-border p-2 rounded-lg bg-background" />
              <input value={facultyForm.phone || ""} onChange={(event) => setFacultyForm({ ...facultyForm, phone: event.target.value })} placeholder="Telefon" className="w-full border border-border p-2 rounded-lg bg-background" />
              <input type="url" value={facultyForm.website || ""} onChange={(event) => setFacultyForm({ ...facultyForm, website: event.target.value })} placeholder="Website" className="w-full border border-border p-2 rounded-lg bg-background" />
            </>
          ) : (
            <>
              <input value={buildingForm.name || ""} onChange={(event) => setBuildingForm({ ...buildingForm, name: event.target.value })} placeholder="Nume cladire" className="w-full border border-border p-2 rounded-lg bg-background" required />
              <div className="grid grid-cols-2 gap-2 p-3 border border-border rounded-xl bg-slate-50/50">
                {availableAcronyms.map((acronym) => (
                  <label key={acronym} className="flex items-center gap-2 text-xs text-muted">
                    <input type="checkbox" checked={buildingForm.faculties?.includes(acronym) || false} onChange={() => handleToggleBuildingFaculty(acronym)} />
                    <span>{acronym}</span>
                  </label>
                ))}
              </div>
            </>
          )}

          <div className="flex justify-end space-x-2 pt-4 border-t border-border">
            <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 border border-border rounded-lg text-muted text-xs">Anuleaza</button>
            <button type="submit" className="px-4 py-2 bg-brand text-white rounded-lg text-xs font-bold">Salveaza</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
