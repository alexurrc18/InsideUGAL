"use client";

import Image from 'next/image';
import React, { useState, useMemo, useRef, useEffect, Suspense } from 'react';
import Table, { Column } from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import { useSearchParams } from "next/navigation";

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

const availableFacultiesFromSystem = [
  "AC", "FIE", "ACIEE", "Mecanică", "SIA", "Litere", "Drept", "Medicină", "Economie"
];

function EventsPageContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<EventItem[]>([]);
  const [activeModal, setActiveModal] = useState<'add' | 'edit' | 'details' | null>(null);
  const [selectedItem, setSelectedItem] = useState<EventItem | null>(null);
  const [formState, setFormState] = useState<Partial<EventItem>>({});
  const [selectedFaculty, setSelectedFaculty] = useState<string>('Toate');
  const [newFacultyInput, setNewFacultyInput] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(false); 
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // 1. CONEXIUNE BACKEND: GET Evenimente + ALERTĂ EROARE CONEXIUNE
  const fetchEvents = async () => {
    setIsDataLoading(true);
    try {
      const res = await fetch(`${baseUrl}/announcements/`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const apiData = await res.json();
      
      const mappedEvents: EventItem[] = apiData.map((item: any) => ({
        id: String(item.id),
        title: item.title,
        description: item.description || '',
        publishDate: item.created_at ? item.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
        faculties: item.faculty ? [item.faculty.name] : [],
        thumbnail: item.image_url || '',
        eventLink: item.external_link || '',
        pdfFiles: item.attachments ? item.attachments.map((a: any) => ({ name: a.name, url: a.url })) : []
      }));
      setData(mappedEvents);
    } catch (error) {
      console.error("EEroare la preluarea datelor din backend:", error);
      alert("Nu există conexiune cu backend-ul pentru modulul de Evenimente! Verifică dacă serverul Python/FastAPI este pornit local.");
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (searchParams.get("open") === "true") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormState({ faculties: [], pdfFiles: [] });
      setNewFacultyInput('');
      setActiveModal('add');
    }
  }, [searchParams]);

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

  useEffect(() => {
    if (initialFaculties.length > 0) {
      setDynamicFaculties(initialFaculties);
    }
  }, [data]);

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

  const handleAiGenerate = async () => {
    if (!formState.title || !formState.description) {
      alert("Te rog adaugă un titlu și o descriere înainte de a genera imaginea!");
      return;
    }

    setIsAiLoading(true);

    try {
      const entitateSursa = formState.faculties && formState.faculties.length > 0 
        ? `Facultatea de ${formState.faculties[0]}` 
        : "Dashboard UGAL";

      const response = await fetch(`${baseUrl}/api/generate-banner`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          materie_sau_subiect: formState.title,
          entitate_sursa: entitateSursa, 
          tip_eveniment: "CONCURS",
          urgenta_estimata: "MEDIE",
          public_tinta: ["Studenti"],
          deadline_absolut: new Date().toISOString(),
          locatie: "Campus UGAL",
          rezumat_notificare: formState.description,
          actiuni_extrase: ["Detalii"],
          taguri_cheie: formState.faculties || ["Eveniment"]
        }),
      });

      if (!response.ok) {
        throw new Error(`Eroare de răspuns server: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.image_base64) {
        setFormState(prev => ({ ...prev, thumbnail: result.image_base64 }));
      } else {
        alert(`Eroare AI: ${result.error_message || "Generarea a eșuat."}`);
      }

    } catch (error) {
      console.error("Eroare LLM API Call:", error);
      alert("Nu s-a putut genera imaginea. Nu există conexiune cu serverul Python/FastAPI!");
    } finally {
      setIsAiLoading(false);
    }
  };

  // 2. CONEXIUNE BACKEND: POST / PATCH la salvare + ALERTĂ AVERTIZARE CONEXIUNE
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      title: formState.title || 'Eveniment Nou',
      description: formState.description || '',
      post_type: "EVENT", 
      image_url: formState.thumbnail || null,
      external_link: formState.eventLink || null,
      faculty_id: 1, 
    };

    try {
      if (activeModal === 'edit') {
        const response = await fetch(`${baseUrl}/announcements/${selectedItem?.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error("Eroare la actualizarea pe server.");
      } else {
        const response = await fetch(`${baseUrl}/announcements/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error("Eroare la crearea pe server.");
      }
      
      await fetchEvents();
      setActiveModal(null);
    } catch (error) {
      console.error("Eroare salvare backend:", error);
      alert("Salvarea a eșuat! Nu există conexiune activă cu backend-ul. Datele vor fi salvate local în sesiune, dar nu se vor propaga în baza de date.");
      
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
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (!confirm(`Sigur vrei să ștergi evenimentul "${name}"?`)) return;

    try {
      const response = await fetch(`${baseUrl}/announcements/${id}`, {
        method: "DELETE"
      });
      if (response.status === 204 || response.ok) {
        setData(data.filter(a => a.id !== id));
      } else {
        throw new Error("Eroare la ștergerea de pe server.");
      }
    } catch (error) {
      console.error("Eroare delete backend:", error);
      alert("Ștergerea a eșuat. Lipsește conexiunea cu serverul de backend!");
      setData(data.filter(a => a.id !== id));
    }
  };

  const columns: Column<EventItem>[] = [
    { 
      header: 'Titlu', 
      key: 'title',
      render: (item) => <span className="font-semibold text-foreground">{item.title}</span>
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
          <button type="button" className="text-green-600 hover:text-green-800 font-medium hover:underline cursor-pointer" onClick={() => console.info(`Shared: ${item.title}`)}>Share</button>
          <button 
            type="button" 
            className="text-red-500 hover:text-red-700 font-medium hover:underline cursor-pointer" 
            onClick={() => handleDeleteItem(item.id, item.title)}
          >
            Ștergere
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center gap-2 relative" ref={dropdownRef}>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filtrează:</span>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center justify-between min-w-[140px] border border-border px-4 py-2.5 rounded-xl bg-card text-sm font-semibold shadow-xs hover:border-slate-300 transition-all outline-none cursor-pointer text-foreground"
          >
            <span>{selectedFaculty}</span>
            <svg className={`w-4 h-4 ml-2 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isDropdownOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-48 bg-card border border-border rounded-xl shadow-lg py-1 z-50">
              {allFilterOptions.map(faculty => (
                <div
                  key={faculty}
                  onClick={() => { setSelectedFaculty(faculty); setIsDropdownOpen(false); }}
                  className={`flex items-center justify-between px-4 py-2 text-sm cursor-pointer transition-colors ${selectedFaculty === faculty ? 'bg-blue-50 text-blue-600 font-bold' : 'text-muted hover:bg-slate-50'}`}
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
          className="bg-brand text-white px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer hover:opacity-90 transition-all shadow-md self-end sm:self-auto"
        >
          + Adaugă
        </button>
      </div>
      
      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
        {isDataLoading ? (
          <div className="p-12 text-center text-sm text-slate-500 font-medium">Se încarcă evenimentele din baza de date reală...</div>
        ) : (
          <Table data={filteredData} columns={columns} onRowClick={(item) => { setSelectedItem(item); setActiveModal('details'); }} />
        )}
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
                  unoptimized={selectedItem.thumbnail.startsWith('data:') || selectedItem.thumbnail.startsWith('http')}
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
                <span className="block text-xs font-bold text-foreground">Documente atașate:</span>
                <div className="flex flex-col gap-1.5">
                  {selectedItem.pdfFiles.map((file) => (
                    <div key={file.name}>
                      <a href={file.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-100 transition-all">
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
                <a href={selectedItem.eventLink?.startsWith('http') ? selectedItem.eventLink : '#'} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1 font-medium">
                  Link către eveniment →
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={activeModal === 'add' || activeModal === 'edit'} onClose={() => setActiveModal(null)} title={activeModal === 'edit' ? "Editare Anunț" : "Adăugare Eveniment Nou"}>
        <form onSubmit={handleSave} className="flex flex-col max-h-[calc(100vh-200px)] text-sm">
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4 scrollbar-none">
            <style dangerouslySetInnerHTML={{__html: `
              .scrollbar-none::-webkit-scrollbar {
                display: none;
              }
            `}} />

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Titlu</label>
              <input type="text" value={formState.title || ''} onChange={e => setFormState({...formState, title: e.target.value})} className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand" required />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Descriere</label>
              <textarea value={formState.description || ''} onChange={e => setFormState({...formState, description: e.target.value})} className="w-full border border-border p-2 rounded-lg h-24 bg-background resize-none focus:outline-none focus:ring-1 focus:ring-brand" required />
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
                        className={`pr-7 pl-2.5 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer relative ${isSelected ? 'bg-blue-50 border-blue-200 text-blue-600 font-semibold' : 'bg-card border-border text-muted hover:border-slate-300'}`}
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
                    className="flex-1 flex items-center justify-center gap-2 border border-border px-4 py-2 rounded-md text-xs font-semibold text-foreground bg-card hover:bg-slate-50 transition-all cursor-pointer w-full"
                  >
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    {formState.thumbnail ? "Schimbă imaginea" : "Încarcă imagine din PC"}
                  </button>

                  <button
                    type="button"
                    onClick={handleAiGenerate}
                    disabled={isAiLoading}
                    className={`flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-md text-xs font-bold cursor-pointer hover:opacity-90 transition-all shadow-xs w-full sm:w-auto ${
                      isAiLoading ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                  >
                    <svg className={`w-3.5 h-3.5 ${isAiLoading ? "animate-spin" : "animate-pulse"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {isAiLoading ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      )}
                    </svg>
                    {isAiLoading ? "Se generează imaginea..." : "Generează cu AI"}
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
                      unoptimized={formState.thumbnail.startsWith('data:') || formState.thumbnail.startsWith('http')}
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
              <span className="block text-xs font-semibold text-foreground mb-1">Documente atașate (PDF)</span>
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
                    {formState.pdfFiles.map((file) => (
                      <div key={file.name} className="flex items-center justify-between bg-slate-50 border border-border rounded-lg p-2 text-xs text-slate-600">
                        <span className="truncate max-w-[250px] font-medium">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemovePdf(formState.pdfFiles!.indexOf(file))}
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
              <label className="block text-xs font-semibold text-foreground mb-1">Link către eveniment (opțional)</label>
              <input type="url" value={formState.eventLink || ''} onChange={e => setFormState({...formState, eventLink: e.target.value})} className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand" placeholder="https://..." />
            </div>
          </div>

          <div className="sticky bottom-0 bg-background pt-4 border-t border-border z-10 flex justify-end space-x-2">
            <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 border border-border rounded-lg text-muted text-xs cursor-pointer hover:bg-slate-50 transition-colors">Anulează</button>
            <button type="submit" className="px-4 py-2 bg-brand text-white rounded-lg text-xs font-bold cursor-pointer hover:opacity-90 transition-opacity">Salvează</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted">Se încarcă evenimentele...</div>}>
      <EventsPageContent />
    </Suspense>
  );
}