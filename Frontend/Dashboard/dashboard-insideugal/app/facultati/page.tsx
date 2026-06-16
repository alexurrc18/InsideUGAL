"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Table, { Column } from '../components/ui/Table';
import Modal from '../components/ui/Modal';

export type FacultyItem = {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
};

export type BuildingItem = {
  id: string;
  name: string;
  location: string;
  faculties: string[];
};

export default function Page() {
  const [activeTab, setActiveTab] = useState<'facultati' | 'cladiri'>('facultati');
  const [faculties, setFaculties] = useState<FacultyItem[]>([]);
  const [buildings, setBuildings] = useState<BuildingItem[]>([]);
  
  const [activeModal, setActiveModal] = useState<'add' | 'edit' | null>(null);
  const [targetType, setTargetType] = useState<'facultati' | 'cladiri'>('facultati');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const [facultyForm, setFacultyForm] = useState<Partial<FacultyItem>>({});
  const [buildingForm, setBuildingForm] = useState<Partial<BuildingItem>>({ faculties: [] });
  const [isDataLoading, setIsDataLoading] = useState<boolean>(false);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // 1. CONEXIUNE BACKEND: GET Facultăți + ALERTĂ EROARE CONEXIUNE
  const fetchFaculties = async () => {
    setIsDataLoading(true);
    try {
      const res = await fetch(`${baseUrl}/faculties/`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const apiData = await res.json();
      
      const mappedFaculties: FacultyItem[] = apiData.map((item: any) => ({
        id: String(item.id),
        name: item.name,
        address: item.address || '',
        phone: item.phone || '',
        email: item.email || '',
        website: item.website || ''
      }));
      setFaculties(mappedFaculties);
    } catch (error) {
      console.error("Eroare la încărcarea facultăților:", error);
      alert("Nu există conexiune cu backend-ul pentru modulul de Facultăți! Verifică dacă serverul Python/FastAPI este pornit local.");
    } finally {
      setIsDataLoading(false);
    }
  };

  // 2. CONEXIUNE BACKEND: GET Clădiri/Locații + ALERTĂ EROARE CONEXIUNE
  const fetchBuildings = async () => {
    setIsDataLoading(true);
    try {
      const res = await fetch(`${baseUrl}/locations/`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const apiData = await res.json();
      
      const mappedBuildings: BuildingItem[] = apiData.map((item: any) => ({
        id: String(item.id),
        name: item.name || 'Corp clădire',
        location: item.address || item.coordinates || 'Campus UGAL',
        faculties: item.faculty ? [item.faculty.name] : (item.faculty_id ? [`ID Facultate: ${item.faculty_id}`] : ['UGAL'])
      }));
      setBuildings(mappedBuildings);
    } catch (error) {
      console.error("Eroare la încărcarea locațiilor:", error);
      alert("Nu există conexiune cu backend-ul pentru modulul de Clădiri! Verifică dacă serverul Python/FastAPI este pornit local.");
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    fetchFaculties();
    fetchBuildings();
  }, []);

  const availableAcronyms = useMemo(() => {
    return faculties.map(f => {
      const match = f.name.match(/\(([^)]+)\)/);
      return match ? match[1] : f.name.split(' ').map(w => w[0]).join('').toUpperCase();
    });
  }, [faculties]);

  const handleDeleteFaculty = async (id: string, name: string) => {
    if (!confirm(`Sigur dorești să ștergi facultatea "${name}"?`)) return;
    try {
      const response = await fetch(`${baseUrl}/faculties/${id}`, { method: "DELETE" });
      if (response.ok || response.status === 204) {
        setFaculties(prev => prev.filter(f => f.id !== id));
      }
    } catch (error) {
      console.error("Eroare delete facultate:", error);
      alert("Ștergerea a eșuat. Nu există conexiune cu backend-ul!");
      setFaculties(prev => prev.filter(f => f.id !== id));
    }
  };

  const handleDeleteBuilding = async (id: string, name: string) => {
    if (!confirm(`Sigur dorești să ștergi clădirea "${name}"?`)) return;
    try {
      const response = await fetch(`${baseUrl}/locations/${id}`, { method: "DELETE" });
      if (response.ok || response.status === 204) {
        setBuildings(prev => prev.filter(b => b.id !== id));
      }
    } catch (error) {
      console.error("Eroare delete locație:", error);
      alert("Ștergerea a eșuat. Nu există conexiune cu backend-ul!");
      setBuildings(prev => prev.filter(b => b.id !== id));
    }
  };

  const facultyColumns: Column<FacultyItem>[] = [
    {
      header: 'Nume Facultăți',
      key: 'name',
      render: (item) => <span className="font-semibold text-foregrounddd">{item.name}</span>
    },
    {
      header: 'Adresă',
      key: 'address',
      render: (item) => <span className="text-muted">{item.address}</span>
    },
    {
      header: 'Telefon',
      key: 'phone',
      render: (item) => <span className="text-muted whitespace-nowrap">{item.phone}</span>
    },
    {
      header: 'E-mail',
      key: 'email',
      render: (item) => <span className="text-muted">{item.email}</span>
    },
    {
      header: 'Website',
      key: 'website',
      render: (item) => (
        <a href={item.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline whitespace-nowrap">
          {item.website}
        </a>
      )
    },
    {
      header: 'Acțiuni',
      key: 'actions',
      render: (item) => (
        <div className="flex space-x-3 text-xs" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="text-blue-600 hover:text-blue-800 font-medium hover:underline cursor-pointer"
            onClick={() => {
              setSelectedId(item.id);
              setTargetType('facultati');
              setFacultyForm({ ...item });
              setActiveModal('edit');
            }}
          >
            Editare
          </button>
          <button
            type="button"
            className="text-red-500 hover:text-red-700 font-medium hover:underline cursor-pointer"
            onClick={() => handleDeleteFaculty(item.id, item.name)}
          >
            Ștergere
          </button>
        </div>
      )
    }
  ];

  const buildingColumns: Column<BuildingItem>[] = [
    {
      header: 'Nume Clădire',
      key: 'name',
      render: (item) => <span className="font-semibold text-foreground">{item.name}</span>
    },
    {
      header: 'Locație',
      key: 'location',
      render: (item) => <span className="text-muted">{item.location}</span>
    },
    {
      header: 'Facultăți',
      key: 'faculties',
      render: (item) => (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {item.faculties.map((f) => (
            <span key={f} className="bg-blue-50 text-brand text-xs px-2 py-0.5 rounded-md font-medium border border-blue-100/50 truncate max-w-[180px]">
              {f}
            </span>
          ))}
        </div>
      )
    },
    {
      header: 'Acțiuni',
      key: 'actions',
      render: (item) => (
        <div className="flex space-x-3 text-xs" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="text-blue-600 hover:text-blue-800 font-medium hover:underline cursor-pointer"
            onClick={() => {
              setSelectedId(item.id);
              setTargetType('cladiri');
              setBuildingForm({ ...item });
              setActiveModal('edit');
            }}
          >
            Editare
          </button>
          <button
            type="button"
            className="text-red-500 hover:text-red-700 font-medium hover:underline cursor-pointer"
            onClick={() => handleDeleteBuilding(item.id, item.name)}
          >
            Ștergere
          </button>
        </div>
      )
    }
  ];

  const handleOpenAddModal = () => {
    setTargetType(activeTab);
    setSelectedId(null);
    setFacultyForm({});
    setBuildingForm({ faculties: [] });
    setActiveModal('add');
  };

  const handleToggleBuildingFaculty = (acronym: string) => {
    const current = buildingForm.faculties || [];
    if (current.includes(acronym)) {
      setBuildingForm({ ...buildingForm, faculties: current.filter(f => f !== acronym) });
    } else {
      setBuildingForm({ ...buildingForm, faculties: [...current, acronym] });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (targetType === 'facultati') {
      const payload = {
        name: facultyForm.name || '',
        address: facultyForm.address || '',
        phone: facultyForm.phone || '',
        email: facultyForm.email || '',
        website: facultyForm.website || ''
      };

      try {
        if (activeModal === 'edit' && selectedId) {
          await fetch(`${baseUrl}/faculties/${selectedId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
        } else {
          await fetch(`${baseUrl}/faculties/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
        }
        await fetchFaculties();
      } catch (error) {
        console.error("Eroare la salvarea facultății:", error);
        alert("Salvarea a eșuat. Nu s-a putut trimite pachetul de date către backend!");
      }
    } else {
      const payload = {
        name: buildingForm.name || '',
        address: buildingForm.location || '',
        faculty_id: faculties.length > 0 ? Number(faculties[0].id) : null 
      };

      try {
        if (activeModal === 'edit' && selectedId) {
          await fetch(`${baseUrl}/locations/${selectedId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
        } else {
          await fetch(`${baseUrl}/locations/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
        }
        await fetchBuildings();
      } catch (error) {
        console.error("Eroare la salvarea locației:", error);
        alert("Salvarea a eșuat. Nu s-a putut trimite clădirea către backend!");
        
        if (activeModal === 'edit' && selectedId) {
          setBuildings(buildings.map(b => b.id === selectedId ? { ...b, ...buildingForm } as BuildingItem : b));
        } else {
          setBuildings([...buildings, { id: `bld-${Date.now()}`, name: payload.name, location: payload.address, faculties: buildingForm.faculties || [] }]);
        }
      }
    }
    setActiveModal(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="flex bg-background p-1 rounded-xl border border-border/60 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('facultati')}
            className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${activeTab === 'facultati' ? 'bg-card text-foreground shadow-xs' : 'text-muted hover:text-foreground'}`}
          >
            Facultăți
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cladiri')}
            className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${activeTab === 'cladiri' ? 'bg-card text-foreground shadow-xs' : 'text-muted hover:text-foreground'}`}
          >
            Clădiri
          </button>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="bg-brand text-white px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer hover:opacity-90 transition-all shadow-md self-end md:self-auto"
        >
          Adaugă
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
        {isDataLoading ? (
          <div className="p-12 text-center text-sm text-slate-500 font-medium">Se încarcă datele din baza de date reală UGAL...</div>
        ) : activeTab === 'facultati' ? (
          <Table data={faculties} columns={facultyColumns} />
        ) : (
          <Table data={buildings} columns={buildingColumns} />
        )}
      </div>

      <Modal 
        isOpen={activeModal !== null} 
        onClose={() => setActiveModal(null)} 
        title={activeModal === 'edit' ? "Editare" : "Adăugare"}
      >
        <form onSubmit={handleSave} className="space-y-4 text-sm">
          {activeModal === 'add' && (
            <div>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value as 'facultati' | 'cladiri')}
                className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand text-sm cursor-pointer font-medium text-foreground"
              >
                <option value="facultati">Facultăți</option>
                <option value="cladiri">Clădiri</option>
              </select>
            </div>
          )}

          {targetType === 'facultati' ? (
            <>
              <div>
                <label htmlFor="fac-name" className="block text-xs font-semibold text-foreground mb-1">Nume Facultăți</label>
                <input 
                  id="fac-name"
                  type="text" 
                  value={facultyForm.name || ''} 
                  onChange={e => setFacultyForm({...facultyForm, name: e.target.value})} 
                  placeholder="Ex: Facultatea de Automatică... (AC)" 
                  className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand" 
                  required 
                />
              </div>
              <div>
                <label htmlFor="fac-address" className="block text-xs font-semibold text-foreground mb-1">Adresă</label>
                <input 
                  id="fac-address"
                  type="text" 
                  value={facultyForm.address || ''} 
                  onChange={e => setFacultyForm({...facultyForm, address: e.target.value})} 
                  className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand" 
                  required 
                />
              </div>
              <div>
                <label htmlFor="fac-phone" className="block text-xs font-semibold text-foreground mb-1">Telefon</label>
                <input 
                  id="fac-phone"
                  type="text" 
                  value={facultyForm.phone || ''} 
                  onChange={e => setFacultyForm({...facultyForm, phone: e.target.value})} 
                  className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand" 
                  required 
                />
              </div>
              <div>
                <label htmlFor="fac-email" className="block text-xs font-semibold text-foreground mb-1">E-mail secretariat</label>
                <input 
                  id="fac-email"
                  type="email" 
                  value={facultyForm.email || ''} 
                  onChange={e => setFacultyForm({...facultyForm, email: e.target.value})} 
                  placeholder="secretariat...@gal.ro"
                  className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand" 
                  required 
                />
              </div>
              <div>
                <label htmlFor="fac-web" className="block text-xs font-semibold text-foreground mb-1">Website</label>
                <input 
                  id="fac-web"
                  type="url" 
                  value={facultyForm.website || ''} 
                  onChange={e => setFacultyForm({...facultyForm, website: e.target.value})} 
                  placeholder="http://..." 
                  className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand" 
                  required 
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label htmlFor="bld-name" className="block text-xs font-semibold text-foreground mb-1">Nume Clădire</label>
                <input 
                  id="bld-name"
                  type="text" 
                  value={buildingForm.name || ''} 
                  onChange={e => setBuildingForm({...buildingForm, name: e.target.value})} 
                  className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand" 
                  required 
                />
              </div>
              <div>
                <label htmlFor="bld-loc" className="block text-xs font-semibold text-foreground mb-1">Locație</label>
                <input 
                  id="bld-loc"
                  type="text" 
                  value={buildingForm.location || ''} 
                  onChange={e => setBuildingForm({...buildingForm, location: e.target.value})} 
                  placeholder="Str. Științei... (coordonate ptr hartă)" 
                  className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand" 
                  required 
                />
              </div>
              <div>
                <span className="block text-xs font-semibold text-foreground mb-1">Selectează Facultățile Corpului</span>
                <div className="grid grid-cols-2 gap-2 p-3 border border-border rounded-xl bg-slate-50/50 max-h-36 overflow-y-auto mt-2">
                  {availableAcronyms.map((acronym) => {
                    const isChecked = buildingForm.faculties?.includes(acronym);
                    return (
                      <label key={acronym} className="flex items-center space-x-2.5 text-xs font-medium text-muted cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked || false}
                          onChange={() => handleToggleBuildingFaculty(acronym)}
                          className="w-4 h-4 rounded-md border-slate-300 text-brand focus:ring-brand cursor-pointer"
                        />
                        <span>{acronym}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end space-x-2 pt-4 border-t border-border">
            <button 
              type="button" 
              onClick={() => setActiveModal(null)} 
              className="px-4 py-2 border border-border rounded-lg text-slate-500 text-xs cursor-pointer hover:bg-slate-50 transition-colors"
            >
              Anulează
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-brand text-white rounded-lg text-xs font-bold cursor-pointer hover:opacity-90 transition-opacity"
            >
              Salvează
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}