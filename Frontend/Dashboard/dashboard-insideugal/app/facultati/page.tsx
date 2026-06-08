"use client";

import React, { useState, useMemo } from 'react';
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

const initialFaculties: FacultyItem[] = [
  {
    id: "fac-1",
    name: "Facultatea de Automatică, Calculatoare, Electrică și Electronică (ACIEE)",
    address: "Str. Științei nr. 2",
    phone: "0336 130 236",
    email: "secretariat.aciee@ugal.ro",
    website: "https://aciee.ugal.ro"
  },
  {
    id: "fac-2",
    name: "Facultatea de Educație Fizică și Sport(FEFS)",
    address: "Strada Gării 63-65",
    phone: "0336 130 171",
    email: "secretariat.fefs@ugal.ro",
    website: "https://fefs.ugal.ro/index.php/ro/"
  },
  {
    id: "fac-3",
    name: "Facultatea de Științe ale Educației(FSED)",
    address: "Str. Științei nr. 2",
    phone: "0336 130 164",
    email: "secretariat.fsed@ugal.ro",
    website: "https://fsed.ugal.ro/"
  }
];

const initialBuildings: BuildingItem[] = [
  {
    id: "bld-1",
    name: "Corpul G",
    location: "Str. Științei nr. 2",
    faculties: ["ACIEE", "Științe ale Educației"]
  },
  {
    id: "bld-2",
    name: "Corpul A",
    location: "Strada Gării 63-65",
    faculties: ["Educație Fizică și sport", "Drept"]
  }
];

export default function Page() {
  const [activeTab, setActiveTab] = useState<'facultati' | 'cladiri'>('facultati');
  const [faculties, setFaculties] = useState<FacultyItem[]>(initialFaculties);
  const [buildings, setBuildings] = useState<BuildingItem[]>(initialBuildings);
  
  const [activeModal, setActiveModal] = useState<'add' | 'edit' | null>(null);
  const [targetType, setTargetType] = useState<'facultati' | 'cladiri'>('facultati');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const [facultyForm, setFacultyForm] = useState<Partial<FacultyItem>>({});
  const [buildingForm, setBuildingForm] = useState<Partial<BuildingItem>>({ faculties: [] });

  const availableAcronyms = useMemo(() => {
    return faculties.map(f => {
      const match = f.name.match(/\(([^)]+)\)/);
      return match ? match[1] : f.name.split(' ').map(w => w[0]).join('').toUpperCase();
    });
  }, [faculties]);

  const facultyColumns: Column<FacultyItem>[] = [
    {
      header: 'Nume Facultăți',
      key: 'name',
      render: (item) => <span className="font-semibold text-slate-900">{item.name}</span>
    },
    {
      header: 'Adresă',
      key: 'address',
      render: (item) => <span className="text-slate-600">{item.address}</span>
    },
    {
      header: 'Telefon',
      key: 'phone',
      render: (item) => <span className="text-slate-600 whitespace-nowrap">{item.phone}</span>
    },
    {
      header: 'E-mail',
      key: 'email',
      render: (item) => <span className="text-slate-600">{item.email}</span>
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
            onClick={() => setFaculties(faculties.filter(f => f.id !== item.id))}
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
      render: (item) => <span className="font-semibold text-slate-900">{item.name}</span>
    },
    {
      header: 'Locație',
      key: 'location',
      render: (item) => <span className="text-slate-600">{item.location}</span>
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
            onClick={() => setBuildings(buildings.filter(b => b.id !== item.id))}
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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (targetType === 'facultati') {
      if (activeModal === 'edit' && selectedId) {
        setFaculties(faculties.map(f => f.id === selectedId ? { ...f, ...facultyForm } as FacultyItem : f));
      } else {
        const newFaculty: FacultyItem = {
          id: `fac-${Date.now()}`,
          name: facultyForm.name || '',
          address: facultyForm.address || '',
          phone: facultyForm.phone || '',
          email: facultyForm.email || '',
          website: facultyForm.website || ''
        };
        setFaculties([...faculties, newFaculty]);
      }
    } else {
      if (activeModal === 'edit' && selectedId) {
        setBuildings(buildings.map(b => b.id === selectedId ? { ...b, ...buildingForm } as BuildingItem : b));
      } else {
        const newBuilding: BuildingItem = {
          id: `bld-${Date.now()}`,
          name: buildingForm.name || '',
          location: buildingForm.location || '',
          faculties: buildingForm.faculties || []
        };
        setBuildings([...buildings, newBuilding]);
      }
    }
    setActiveModal(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('facultati')}
            className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${activeTab === 'facultati' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Facultăți
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cladiri')}
            className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${activeTab === 'cladiri' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
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
        {activeTab === 'facultati' ? (
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
                className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand text-sm cursor-pointer font-medium text-slate-700"
              >
                <option value="facultati">Facultăți</option>
                <option value="cladiri">Clădiri</option>
              </select>
            </div>
          )}

          {targetType === 'facultati' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Nume Facultăți</label>
                <input 
                  type="text" 
                  value={facultyForm.name || ''} 
                  onChange={e => setFacultyForm({...facultyForm, name: e.target.value})} 
                  placeholder="Ex: Facultatea de Automatică... (AC)" 
                  className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand" 
                  required 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Adresă</label>
                <input 
                  type="text" 
                  value={facultyForm.address || ''} 
                  onChange={e => setFacultyForm({...facultyForm, address: e.target.value})} 
                  className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand" 
                  required 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Telefon</label>
                <input 
                  type="text" 
                  value={facultyForm.phone || ''} 
                  onChange={e => setFacultyForm({...facultyForm, phone: e.target.value})} 
                  className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand" 
                  required 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">E-mail secretariat</label>
                <input 
                  type="email" 
                  value={facultyForm.email || ''} 
                  onChange={e => setFacultyForm({...facultyForm, email: e.target.value})} 
                  placeholder="secretariat...@gal.ro"
                  className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand" 
                  required 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Website</label>
                <input 
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
                <label className="block text-xs font-semibold text-foreground mb-1">Nume Clădire</label>
                <input 
                  type="text" 
                  value={buildingForm.name || ''} 
                  onChange={e => setBuildingForm({...buildingForm, name: e.target.value})} 
                  className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand" 
                  required 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Locație</label>
                <input 
                  type="text" 
                  value={buildingForm.location || ''} 
                  onChange={e => setBuildingForm({...buildingForm, location: e.target.value})} 
                  placeholder="Str. Științei... (coordonate ptr hartă)" 
                  className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand" 
                  required 
                />
              </div>
              <div>
                <div className="grid grid-cols-2 gap-2 p-3 border border-border rounded-xl bg-slate-50/50 max-h-36 overflow-y-auto mt-2">
                  {availableAcronyms.map((acronym) => {
                    const isChecked = buildingForm.faculties?.includes(acronym);
                    return (
                      <label key={acronym} className="flex items-center space-x-2.5 text-xs font-medium text-slate-600 cursor-pointer select-none">
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
              className="px-4 py-2 border border-border rounded-lg text-muted text-xs cursor-pointer hover:bg-background"
            >
              Anulează
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-brand text-white rounded-lg text-xs font-bold cursor-pointer hover:opacity-90"
            >
              Salvează
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
