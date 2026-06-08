"use client";

import Image from 'next/image';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import Table, { Column } from '../components/ui/Table';
import Modal from '../components/ui/Modal';

export type PdfFile = {
  name: string;
  url: string;
};

export type EventItem = {
  id: string;
  title: string;
  description: string;
  publishDate: string;
  faculties: string[];
  thumbnail?: string;
  eventLink?: string;
  pdfFiles?: PdfFile[];
};

const myCustomEvents: EventItem[] = [
  {
    id: "ev-1",
    title: "Sesiune măriri și restanțe",
    description: "Detalii despre programarea examenelor de măriri pentru toate facultățile.",
    publishDate: "2026-06-01",
    faculties: ["AC", "FIE", "ACIEE"],
    pdfFiles: []
  },
  {
    id: "ev-2",
    title: "Campionat Fotbal Campus",
    description: "Meciuri inter-facultăți organizate pe terenul sintetic din campus.",
    publishDate: "2026-06-03",
    faculties: ["Mecanică", "AC"],
    pdfFiles: []
  }
];

const availableFacultiesFromSystem = [
  "AC",
  "FIE",
  "ACIEE",
  "Mecanică",
  "SIA",
  "Litere",
  "Drept",
  "Medicină",
  "Economie"
];

export default function Page() {
  const [data, setData] = useState<EventItem[]>(myCustomEvents);
  const [activeModal, setActiveModal] = useState<'add' | 'edit' | 'details' | null>(null);
  const [selectedItem, setSelectedItem] = useState<EventItem | null>(null);
  const [formState, setFormState] = useState<Partial<EventItem>>({});
  const [selectedFaculty, setSelectedFaculty] = useState<string>('Toate');
  const [newFacultyInput, setNewFacultyInput] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const initialFaculties = useMemo(() => {
    const facultiesSet = new Set<string>();
    data.forEach(item => {
      item.faculties?.forEach(f => {
        if (f !== 'Toate') facultiesSet.add(f);
      });
    });
    return Array.from(facultiesSet);
  }, [data]);

  const [dynamicFaculties, setDynamicFaculties] = useState<string[]>(initialFaculties);

  const allFilterOptions = useMemo(() => {
    return ['Toate', ...dynamicFaculties];
  }, [dynamicFaculties]);

  const filteredData = useMemo(() => {
    if (selectedFaculty === 'Toate') return data;
    return data.filter(item => item.faculties?.includes(selectedFaculty));
  }, [data, selectedFaculty]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const columns: Column<EventItem>[] = [
    { 
      header: 'Titlu', 
      key: 'title',
      render: (item) => <span className="font-semibold text-slate-900">{item.title}</span>
    },
    { 
      header: 'Descriere', 
      key: 'description', 
      render: (item) => <span className="block max-w-xs truncate text-muted">{item.description}</span> 
    },
    { 
      header: 'Facultăți relevante', 
      key: 'faculties',
      render: (item) => (
        <div className="flex flex-wrap gap-1">
          {item.faculties?.map((f) => (
            <span key={f} className="bg-blue-50 text-brand text-xs px-2.5 py-0.5 rounded-md font-medium border border-blue-100/50">
              {f}
            </span>
          ))}
        </div>
      )
    },
    { 
      header: 'Data publicării', 
      key: 'publishDate',
      render: (item) => <span className="text-muted text-xs">{item.publishDate}</span>
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
              setSelectedItem(item); 
              setFormState({ ...item }); 
              setActiveModal('edit'); 
            }}
          >
            Editare
          </button>
          <button type="button" className="text-green-600 hover:text-green-800 font-medium hover:underline cursor-pointer" onClick={() => alert(`Shared: ${item.title}`)}>Share</button>
          <button type="button" className="text-red-500 hover:text-red-700 font-medium hover:underline cursor-pointer" onClick={() => setData(data.filter(a => a.id !== item.id))}>Ștergere</button>
        </div>
      )
    }
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormState(prev => ({ ...prev, thumbnail: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles: PdfFile[] = Array.from(files).map(file => ({
        name: file.name,
        url: URL.createObjectURL(file)
      }));
      setFormState(prev => ({
        ...prev,
        pdfFiles: [...(prev.pdfFiles || []), ...newFiles]
      }));
    }
  };

  const handleRemovePdf = (indexToRemove: number) => {
    setFormState(prev => ({
      ...prev,
      pdfFiles: prev.pdfFiles?.filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleAddNewFaculty = () => {
    const trimmed = newFacultyInput.trim();
    if (trimmed && trimmed !== 'Toate' && !dynamicFaculties.includes(trimmed)) {
      setDynamicFaculties([...dynamicFaculties, trimmed]);
      const currentFaculties = formState.faculties || [];
      setFormState(prev => ({
        ...prev,
        faculties: [...currentFaculties, trimmed]
      }));
      setNewFacultyInput('');
    }
  };

  const handleRemoveFacultyFromSystem = (facultyToRemove: string) => {
    setDynamicFaculties(dynamicFaculties.filter(f => f !== facultyToRemove));
    if (formState.faculties?.includes(facultyToRemove)) {
      setFormState(prev => ({
        ...prev,
        faculties: prev.faculties?.filter(f => f !== facultyToRemove)
      }));
    }
    if (selectedFaculty === facultyToRemove) {
      setSelectedFaculty('Toate');
    }
  };

  const toggleFacultySelection = (faculty: string) => {
    const current = formState.faculties || [];
    if (current.includes(faculty)) {
      setFormState({ ...formState, faculties: current.filter(f => f !== faculty) });
    } else {
      setFormState({ ...formState, faculties: [...current, faculty] });
    }
  };

  const handleAiGenerate = () => {
    alert("Generare imagine AI... (Legătură LLM viitoare)");
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeModal === 'edit') {
      setData(data.map(item => item.id === selectedItem?.id ? { ...item, ...formState } as EventItem : item));
    } else {
      const today = new Date();
      const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const newEvent: EventItem = {
        id: `ev-${Date.now()}`,
        title: formState.title || 'Eveniment Nou',
        description: formState.description || '',
        publishDate: formattedDate,
        faculties: formState.faculties || [],
        thumbnail: formState.thumbnail || '',
        eventLink: formState.eventLink || '',
        pdfFiles: formState.pdfFiles || []
      };
      setData([newEvent, ...data]);
    }
    setActiveModal(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Evenimente viitoare</h1>
          <p className="text-sm text-muted">Gestionează și filtrează evenimentele programate în campus.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 relative" ref={dropdownRef}>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filtrează:</span>
            
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center justify-between min-w-[140px] border border-border px-4 py-2.5 rounded-xl bg-card text-sm font-semibold shadow-xs hover:border-slate-300 transition-all outline-none cursor-pointer text-slate-700"
            >
              <span>{selectedFaculty}</span>
              <svg className={`w-4 h-4 ml-2 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-border rounded-xl shadow-lg py-1 z-50">
                {allFilterOptions.map(faculty => (
                  <div
                    key={faculty}
                    onClick={() => { setSelectedFaculty(faculty); setIsDropdownOpen(false); }}
                    className={`flex items-center justify-between px-4 py-2 text-sm cursor-pointer transition-colors ${selectedFaculty === faculty ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    <span>{faculty}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button 
            type="button" 
            onClick={() => { setFormState({ faculties: [], pdfFiles: [] }); setNewFacultyInput(''); setActiveModal('add'); }} 
            className="bg-brand text-white px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer hover:opacity-90 transition-all shadow-md"
          >
            + Adaugă
          </button>
        </div>
      </div>
      
      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
        <Table 
          data={filteredData} 
          columns={columns} 
          onRowClick={(item) => { 
            setSelectedItem(item); 
            setActiveModal('details'); 
          }} 
        />
      </div>

      <Modal isOpen={activeModal === 'details'} onClose={() => setActiveModal(null)} title="Vizualizare Anunț">
        {selectedItem && (
          <div className="space-y-4 text-sm text-foreground">
            {selectedItem.thumbnail && (
              <div className="relative h-48 w-full overflow-hidden rounded-xl border border-border">
                <Image
                  src={selectedItem.thumbnail}
                  alt={selectedItem.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 512px"
                  className="object-cover"
                  unoptimized={selectedItem.thumbnail.startsWith('data:')}
                />
              </div>
            )}
            <div>
              <h4 className="text-lg font-bold">{selectedItem.title}</h4>
              <p className="text-xs text-muted mt-0.5">Publicat: {selectedItem.publishDate}</p>
            </div>

            <div className="flex flex-wrap gap-1">
              {selectedItem.faculties?.map((f) => (
                <span key={f} className="bg-background text-muted border border-border text-xs px-2 py-0.5 rounded-md font-medium">
                  {f}
                </span>
              ))}
            </div>

            <p className="text-muted leading-relaxed whitespace-pre-wrap">{selectedItem.description}</p>

            {selectedItem.pdfFiles && selectedItem.pdfFiles.length > 0 && (
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold text-foreground">Documente atașate:</label>
                <div className="flex flex-col gap-1.5">
                  {selectedItem.pdfFiles.map((file, idx) => (
                    <div key={idx}>
                      <a href={file.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-100 transition-all">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Vezi {file.name}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedItem.eventLink && (
              <div className="pt-2 border-t border-border">
                <a href={selectedItem.eventLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1 font-medium">
                  Link către eveniment →
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={activeModal === 'add' || activeModal === 'edit'} onClose={() => setActiveModal(null)} title={activeModal === 'edit' ? "Editare Anunț" : "Adăugare Eveniment Nou"}>
        <form onSubmit={handleSave} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Titlu</label>
            <input type="text" value={formState.title || ''} onChange={e => setFormState({...formState, title: e.target.value})} className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand" required />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Adaugă o facultate nouă în sistem</label>
            <div className="flex gap-2">
              <select
                value={newFacultyInput}
                onChange={e => setNewFacultyInput(e.target.value)}
                className="flex-1 border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand text-sm cursor-pointer"
              >
                <option value="">Alege o facultate...</option>
                {availableFacultiesFromSystem.map(fac => (
                  <option key={fac} value={fac}>{fac}</option>
                ))}
              </select>
              <button 
                type="button" 
                onClick={handleAddNewFaculty}
                className="bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold cursor-pointer hover:bg-slate-700 transition-all"
              >
                + Adaugă în listă
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 p-2.5 border border-border rounded-lg bg-slate-50/50 mt-2">
              {dynamicFaculties.map(faculty => {
                const isSelected = formState.faculties?.includes(faculty);
                return (
                  <div key={faculty} className="relative group">
                    <button
                      type="button"
                      onClick={() => toggleFacultySelection(faculty)}
                      className={`pr-7 pl-2.5 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer relative ${isSelected ? 'bg-blue-50 border-blue-200 text-blue-600 font-semibold' : 'bg-white border-border text-slate-500 hover:border-slate-300'}`}
                    >
                      {faculty}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRemoveFacultyFromSystem(faculty); }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 text-[10px] px-0.5 font-bold transition-colors cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Thumbnail</label>
            <div className="flex flex-col gap-3 p-3 border border-dashed border-border rounded-lg bg-background/50">
              <div className="flex flex-col sm:flex-row gap-2 items-center">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept="image/*" 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 border border-border px-4 py-2 rounded-md text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-all cursor-pointer w-full"
                >
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  {formState.thumbnail ? "Schimbă imaginea" : "Încarcă imagine din PC"}
                </button>

                <button
                  type="button"
                  onClick={handleAiGenerate}
                  className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-md text-xs font-bold cursor-pointer hover:opacity-90 transition-all shadow-xs w-full sm:w-auto"
                >
                  <svg className="w-3.5 h-3.5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generează cu AI
                </button>
              </div>

              {formState.thumbnail && (
                <div className="mt-1 relative w-32 h-20 rounded-md overflow-hidden border border-border mx-auto sm:mx-0">
                  <Image
                    src={formState.thumbnail}
                    alt="Preview"
                    fill
                    sizes="128px"
                    className="object-cover"
                    unoptimized={formState.thumbnail.startsWith('data:')}
                  />
                  <button 
                    type="button" 
                    onClick={() => setFormState(prev => ({ ...prev, thumbnail: '' }))} 
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Documente atașate (PDF)</label>
            <div className="p-3 border border-dashed border-border rounded-lg bg-background/50 flex flex-col gap-2">
              <input 
                type="file" 
                ref={pdfInputRef}
                accept=".pdf" 
                multiple
                onChange={handlePdfChange} 
                className="hidden" 
              />
              <button
                type="button"
                onClick={() => pdfInputRef.current?.click()}
                className="flex items-center justify-center gap-2 border border-border px-4 py-2 rounded-md text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-all cursor-pointer w-full"
              >
                <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Atașează fișiere PDF
              </button>

              {formState.pdfFiles && formState.pdfFiles.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-1">
                  {formState.pdfFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-50 border border-border rounded-lg p-2 text-xs text-slate-600">
                      <span className="truncate max-w-[250px] font-medium">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePdf(idx)}
                        className="text-red-500 hover:text-red-700 font-bold px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Descriere</label>
            <textarea value={formState.description || ''} onChange={e => setFormState({...formState, description: e.target.value})} className="w-full border border-border p-2 rounded-lg h-24 bg-background resize-none focus:outline-none focus:ring-1 focus:ring-brand" required />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Link către eveniment (opțional)</label>
            <input type="url" value={formState.eventLink || ''} onChange={e => setFormState({...formState, eventLink: e.target.value})} className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand" placeholder="https://..." />
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-border">
            <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 border border-border rounded-lg text-muted text-xs cursor-pointer hover:bg-background">Anulează</button>
            <button type="submit" className="px-4 py-2 bg-brand text-white rounded-lg text-xs font-bold cursor-pointer hover:opacity-90">Salvează</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
