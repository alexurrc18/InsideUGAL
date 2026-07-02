"use client";

import Image from 'next/image';
import React, { useState, useMemo, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Table, { Column } from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import { Announcement, PdfFile } from '../data/announcements';

import { 
  useAnnouncements, 
  useCreateAnnouncement, 
  useUpdateAnnouncement, 
  useDeleteAnnouncement,
  useGenerateAiBanner
} from '@/hooks/useDashboardApi';
import { Announcement as BackendAnnouncement } from '@/lib/api-types';
import { canAccessContent, useRequireDashboardAccess } from '@/lib/dashboard-auth';

type ExtendedAnnouncement = Announcement & { 
  type: 'NOUTATE' | 'EVENIMENT';
  locationName?: string;
  startDate?: string;
  endDate?: string;
};

const formatToDatetimeLocal = (dateString?: string) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  } catch {
    return '';
  }
};

function AnnouncementsContent() {
  const access = useRequireDashboardAccess(canAccessContent);
  const { data: backendData, isLoading: isLoadingAnnouncements, isError: isErrorAnnouncements, refetch } = useAnnouncements();
  
  const createMutation = useCreateAnnouncement();
  const updateMutation = useUpdateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();
  const generateBannerMutation = useGenerateAiBanner();

  const [activeModal, setActiveModal] = useState<'add' | 'edit' | 'details' | null>(null);
  const [selectedItem, setSelectedItem] = useState<ExtendedAnnouncement | null>(null);
  const [formState, setFormState] = useState<Partial<ExtendedAnnouncement>>({});
  const [selectedType, setSelectedType] = useState<string>('TOATE'); 
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState<boolean>(false);

  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const searchParams = useSearchParams();

  const data = useMemo((): ExtendedAnnouncement[] => {
    const list = backendData && typeof backendData === 'object' && 'items' in backendData 
      ? (backendData as Record<string, unknown>).items 
      : backendData;

    if (!list || !Array.isArray(list)) return [];

    return (list as BackendAnnouncement[]).map((item: BackendAnnouncement): ExtendedAnnouncement => {
      const itemRaw = item as unknown as Record<string, unknown>;
      const rawType = itemRaw.type as string | undefined;
      const validType: 'NOUTATE' | 'EVENIMENT' = (rawType === 'EVENIMENT' || rawType === 'NOUTATE') ? rawType : 'NOUTATE';

      let announcementFaculties: string[] = [];
      if (Array.isArray(itemRaw.faculties)) {
        announcementFaculties = itemRaw.faculties as string[];
      }

      let backendFiles: PdfFile[] = [];
      if (Array.isArray(itemRaw.files)) {
        backendFiles = itemRaw.files.map((f: unknown) => {
          if (typeof f === 'string') {
            const nameFromUrl = f.split('/').pop() || 'Document atașat';
            return { name: nameFromUrl, url: f };
          }
          if (f && typeof f === 'object') {
            const obj = f as Record<string, unknown>;
            const urlValue = String(obj.url || obj.file_url || obj.path || '');
            const nameValue = String(obj.name || obj.file_name || urlValue.split('/').pop() || 'Document atașat');
            return { name: nameValue, url: urlValue };
          }
          return { name: 'Document', url: '' };
        }).filter(f => f.url !== '');
      }

      return {
        id: item.id.toString(),
        title: item.title,
        description: item.content || '', 
        publishDate: item.created_at ? new Date(item.created_at).toLocaleDateString('ro-RO') : 'Fără dată',
        faculties: announcementFaculties, 
        thumbnail: item.image_url || '',
        image_url: item.image_url,
        eventLink: (itemRaw.event_link as string) || '', 
        pdfFiles: backendFiles,
        type: validType,
        locationName: (itemRaw.location_name as string) || '',
        startDate: (itemRaw.start_date as string) || '',
        endDate: (itemRaw.end_date as string) || ''
      };
    });
  }, [backendData]);

  // Facultățile disponibile sunt derivate direct din coloana "faculties" a
  // anunțurilor existente în baza de date (nu mai există un endpoint separat / listă hardcodată).
  const availableFacultiesFromSystem = useMemo(() => {
    const facultySet = new Set<string>();
    data.forEach(item => {
      item.faculties?.forEach(f => {
        if (f) facultySet.add(f);
      });
    });
    return Array.from(facultySet).sort((a, b) => a.localeCompare(b));
  }, [data]);

  useEffect(() => {
    let timerId: NodeJS.Timeout;
    if (searchParams.get("open") === "true") {
      const urlType = searchParams.get("type");
      const defaultType = (urlType === 'EVENIMENT' || urlType === 'NOUTATE') ? urlType : 'NOUTATE';

      timerId = setTimeout(() => {
        setFormState({ 
          faculties: [], 
          pdfFiles: [], 
          type: defaultType,
          locationName: '', 
          startDate: '', 
          endDate: '',
          eventLink: ''
        });
        setActiveModal('add');
      }, 0);
    }
    return () => { if (timerId) clearTimeout(timerId); };
  }, [searchParams]);

  const filteredData = useMemo(() => {
    let result = data;
    if (selectedType !== 'TOATE') {
      result = result.filter(item => item.type === selectedType);
    }
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.title.toLowerCase().includes(query) || 
        item.description.toLowerCase().includes(query)
      );
    }
    return result;
  }, [data, selectedType, searchQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setIsTypeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleForceDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();

    if (!confirm('Ești sigur că vrei să ștergi acest anunț?')) return;

    try {
      await deleteMutation.mutateAsync(Number(id));
      await refetch();
    } catch (err) {
      console.error("Eroare la ștergerea anunțului:", err);
      alert('A apărut o eroare la ștergerea anunțului. Te rugăm să încerci din nou.');
    }
  };

  const handleShare = async (item: ExtendedAnnouncement) => {
    const shareData = {
      title: item.title,
      text: item.description,
      url: window.location.origin + `/noutati/${item.id}`,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch (err) { console.error('Error sharing:', err); }
    } else {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.url)}`, '_blank');
    }
  };

  const columns: Column<ExtendedAnnouncement>[] = [
    {
      header: 'Imagine',
      key: 'thumbnail',
      render: (item) => {
        const imageSrc = item.thumbnail || item.image_url;
        return imageSrc ? (
          <Image
            src={imageSrc}
            alt="img"
            width={44}
            height={44}
            className="rounded-md object-cover border border-border"
            unoptimized={imageSrc.startsWith('data:') || imageSrc.startsWith('http')}
          />
        ) : (
          <div className="w-11 h-11 bg-slate-100 rounded-md border border-slate-200" />
        );
      },
    },
    { 
      header: 'Titlu', 
      key: 'title',
      render: (item) => <span className="font-semibold text-foreground">{item.title}</span>
    },
    { 
      header: 'Tip', 
      key: 'type',
      render: (item) => (
        <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${item.type === 'EVENIMENT' ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'}`}>
          {item.type}
        </span>
      )
    },
    { 
      header: 'Descriere', 
      key: 'description', 
      render: (item) => <span className="block max-w-xs truncate text-muted">{item.description}</span> 
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
          <button type="button" className="text-green-600 hover:text-green-800 font-medium hover:underline cursor-pointer" onClick={() => handleShare(item)}>Share</button>
          <button 
            type="button" 
            className="text-red-500 hover:text-red-700 font-medium hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" 
            onClick={(e) => handleForceDelete(e, item.id)}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Se șterge...' : 'Ștergere'}
          </button>
        </div>
      )
    }
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const image = reader.result as string;
        setFormState(prev => ({ ...prev, thumbnail: image, image_url: image }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAiGenerate = () => {
    if (!formState.title?.trim() || !formState.description?.trim()) {
      alert('Completează titlul și descrierea înainte de a genera o imagine cu AI.');
      return;
    }
    generateBannerMutation.mutate(
      { title: formState.title, description: formState.description, faculty: formState.faculties?.[0] },
      {
        onSuccess: (result) => {
          const image = result.image_url || result.image_base64;
          if (image) setFormState(prev => ({ ...prev, thumbnail: image, image_url: image }));
          else alert(result.error_message || 'Generarea imaginii a eșuat.');
        },
        onError: (error) => alert(error.message || 'Generarea imaginii a eșuat.'),
      }
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const isEveniment = formState.type === 'EVENIMENT';
    
    const backendPayload: Record<string, unknown> = {
      type: formState.type || 'NOUTATE', 
      title: formState.title || '',
      content: formState.description || '', 
      image_url: formState.image_url || formState.thumbnail || null,
      faculties: formState.faculties && formState.faculties.length > 0 ? formState.faculties : [], 
      event_link: formState.eventLink && formState.eventLink.trim() !== '' ? formState.eventLink : null, 
      location_name: isEveniment && formState.locationName && formState.locationName.trim() !== '' ? formState.locationName : null,
      start_date: isEveniment && formState.startDate && formState.startDate.trim() !== '' ? new Date(formState.startDate).toISOString() : null,
      end_date: isEveniment && formState.endDate && formState.endDate.trim() !== '' ? new Date(formState.endDate).toISOString() : null
    };

    if (activeModal === 'edit' && selectedItem) {
      updateMutation.mutate({ id: Number(selectedItem.id), data: backendPayload }, { onSuccess: () => setActiveModal(null) });
    } else {
      createMutation.mutate(backendPayload, { onSuccess: () => setActiveModal(null) });
    }
  };

  if (access.loading || !access.allowed) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full bg-card p-4 border border-border rounded-2xl shadow-xs">
        <div className="flex flex-wrap items-center gap-4 flex-1 w-full">
          <div className="relative flex-1 min-w-[240px]">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Caută după titlu sau descriere..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-border rounded-xl bg-background text-sm font-medium focus:outline-none focus:ring-1 focus:ring-brand placeholder:text-slate-400 text-foreground"
            />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 text-xs">✕</button>}
          </div>

          <div className="flex items-center gap-2 relative" ref={typeDropdownRef}>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tip Anunț:</span>
            <button
              type="button"
              onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
              className="flex items-center justify-between min-w-[130px] border border-border px-3 py-2 rounded-xl bg-card text-sm font-semibold shadow-xs hover:border-slate-300 transition-all outline-none cursor-pointer text-foreground"
            >
              <span>{selectedType}</span>
              <svg className={`w-4 h-4 ml-1 text-slate-400 transition-transform duration-200 ${isTypeDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isTypeDropdownOpen && (
              <div className="absolute left-14 top-full mt-1.5 w-48 bg-card border border-border rounded-xl shadow-lg py-1 z-50">
                {['TOATE', 'NOUTATE', 'EVENIMENT'].map(type => (
                  <div
                    key={type}
                    onClick={() => { setSelectedType(type); setIsTypeDropdownOpen(false); }}
                    className={`flex items-center justify-between px-4 py-2 text-sm cursor-pointer transition-colors ${selectedType === type ? 'bg-blue-50 text-blue-600 font-bold' : 'text-muted hover:bg-slate-50'}`}
                  >
                    <span>{type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button 
          type="button" 
          onClick={() => { setFormState({ faculties: [], pdfFiles: [], type: 'NOUTATE', eventLink: '', locationName: '', startDate: '', endDate: '' }); setActiveModal('add'); }} 
          className="bg-brand text-white px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer hover:opacity-90 transition-all shadow-md w-full lg:w-auto text-center"
        >
          + Adaugă Anunț
        </button>
      </div>
        
      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
        {isLoadingAnnouncements ? (
          <div className="p-12 text-center text-sm text-muted animate-pulse">Se încarcă noutățile...</div>
        ) : isErrorAnnouncements ? (
          <div className="p-12 text-center text-sm text-red-500">Eroare la încărcarea noutăților.</div>
        ) : (
          <Table data={filteredData} columns={columns} onRowClick={(item) => { setSelectedItem(item); setActiveModal('details'); }} />
        )}
      </div>

      {/* MODAL DETALII */}
      <Modal isOpen={activeModal === 'details'} onClose={() => setActiveModal(null)} title="Vizualizare Detalii Anunț">
        {selectedItem && (() => {
          const imageSrc = selectedItem.image_url || selectedItem.thumbnail;
          const isEveniment = selectedItem.type === 'EVENIMENT';
          return (
            <div className="space-y-5 text-sm text-foreground max-h-[calc(100vh-200px)] overflow-y-auto pr-1 scrollbar-none">
              {imageSrc ? (
                <div className="relative h-56 w-full overflow-hidden rounded-xl border border-border bg-slate-50">
                  <Image src={imageSrc} alt={selectedItem.title} fill sizes="(max-width: 768px) 100vw, 600px" className="object-cover" unoptimized={imageSrc.startsWith('data:') || imageSrc.startsWith('http')} />
                </div>
              ) : (
                <div className="h-24 w-full bg-slate-50 border border-dashed border-border rounded-xl flex items-center justify-center text-xs text-slate-400 italic">Fără imagine atașată</div>
              )}

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-xl font-bold tracking-tight text-foreground">{selectedItem.title}</h4>
                  <span className={`text-xs px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wide ${isEveniment ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-purple-100 text-purple-700 border border-purple-200'}`}>{selectedItem.type}</span>
                </div>
                <p className="text-xs text-muted">Publicat la data: <span className="font-medium">{selectedItem.publishDate}</span></p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {selectedItem.faculties && selectedItem.faculties.length > 0 ? (
                  selectedItem.faculties.map((f) => <span key={f} className="bg-blue-50 text-brand border border-blue-100/70 text-xs px-2.5 py-0.5 rounded-lg font-bold">Facultatea {f}</span>)
                ) : (
                  <span className="bg-slate-50 text-slate-500 border border-slate-200 text-xs px-2.5 py-0.5 rounded-lg font-medium">Anunț General / Toate facultățile</span>
                )}
              </div>

              {isEveniment && (selectedItem.locationName || selectedItem.startDate) && (
                <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl space-y-2 text-xs text-slate-700 shadow-2xs">
                  <span className="block font-bold text-amber-800 uppercase tracking-wider text-[10px]">Detalii desfășurare eveniment</span>
                  {selectedItem.locationName && (
                    <div className="flex items-start gap-1.5">
                      <span className="shrink-0 text-sm">📍</span>
                      <div>
                        <span className="font-bold block text-slate-600">Locație:</span>
                        <span className="font-medium text-slate-800">{selectedItem.locationName}</span>
                      </div>
                    </div>
                  )}
                  {selectedItem.startDate && (
                    <div className="flex items-start gap-1.5 pt-1">
                      <span className="shrink-0 text-sm">📅</span>
                      <div>
                        <span className="font-bold block text-slate-600">Perioadă programată:</span>
                        <span className="font-medium text-slate-800">
                          {new Date(selectedItem.startDate).toLocaleString('ro-RO', { dateStyle: 'long', timeStyle: 'short' })}
                          {selectedItem.endDate ? ` — ${new Date(selectedItem.endDate).toLocaleString('ro-RO', { dateStyle: 'long', timeStyle: 'short' })}` : ''}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Descriere:</span>
                <p className="text-muted leading-relaxed whitespace-pre-wrap font-medium bg-slate-50/40 p-3 rounded-xl border border-border/60">{selectedItem.description}</p>
              </div>

              {selectedItem.eventLink && (
                <div className="pt-2 border-t border-border">
                  <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Link Sursă / Înregistrare:</span>
                  <a href={selectedItem.eventLink.startsWith('http') ? selectedItem.eventLink : `https://${selectedItem.eventLink}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-2 font-bold text-xs bg-blue-50/50 hover:bg-blue-50 border border-blue-100 px-4 py-2.5 rounded-xl transition-colors w-full sm:w-auto justify-center sm:justify-start shadow-2xs">
                    <span>Deschide link extern atașat</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* MODAL ADĂUGARE / EDITARE */}
      <Modal isOpen={activeModal === 'add' || activeModal === 'edit'} onClose={() => setActiveModal(null)} title={activeModal === 'edit' ? "Editare Anunț" : "Adăugare Anunț Nou"}>
        <form onSubmit={handleSave} className="flex flex-col max-h-[calc(100vh-200px)] text-sm">
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4 scrollbar-none">
            <style dangerouslySetInnerHTML={{__html: `.scrollbar-none::-webkit-scrollbar { display: none; }`}} />

            <div>
              <label htmlFor="ann-title" className="block text-xs font-semibold text-foreground mb-1">Titlu Anunț</label>
              <input id="ann-title" type="text" value={formState.title || ''} onChange={e => setFormState({...formState, title: e.target.value})} className="w-full border border-border p-2 rounded-lg bg-background" required />
            </div>

            <div>
              <label htmlFor="ann-type" className="block text-xs font-semibold text-foreground mb-1">Tipul Anunțului</label>
              <select id="ann-type" value={formState.type || 'NOUTATE'} onChange={e => setFormState({ ...formState, type: e.target.value as 'NOUTATE' | 'EVENIMENT' })} className="w-full border border-border p-2 rounded-lg bg-background text-sm cursor-pointer font-medium">
                <option value="NOUTATE">NOUTATE</option>
                <option value="EVENIMENT">EVENIMENT</option>
              </select>
            </div>

            {formState.type === 'EVENIMENT' && (
              <div className="p-4 bg-slate-50/60 border border-border rounded-xl space-y-3">
                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Detalii Logistice Eveniment</span>
                <div>
                  <label htmlFor="ann-location" className="block text-xs font-semibold text-slate-700 mb-1">Locație</label>
                  <input id="ann-location" type="text" placeholder="ex: Hol Central, Corp A" value={formState.locationName || ''} onChange={e => setFormState({...formState, locationName: e.target.value})} className="w-full border border-border p-2 rounded-lg bg-background" required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="ann-start-date" className="block text-xs font-semibold text-slate-700 mb-1">Dată & Oră Început</label>
                    <input id="ann-start-date" type="datetime-local" value={formatToDatetimeLocal(formState.startDate)} onChange={e => setFormState({...formState, startDate: e.target.value})} className="w-full border border-border p-2 rounded-lg bg-background" required />
                  </div>
                  <div>
                    <label htmlFor="ann-end-date" className="block text-xs font-semibold text-slate-700 mb-1">Dată & Oră Sfârșit</label>
                    <input id="ann-end-date" type="datetime-local" value={formatToDatetimeLocal(formState.endDate)} onChange={e => setFormState({...formState, endDate: e.target.value})} className="w-full border border-border p-2 rounded-lg bg-background" required />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="ann-faculty-select" className="block text-xs font-semibold text-foreground mb-1">Facultate asociată anunțului</label>
              <select
                id="ann-faculty-select"
                value={formState.faculties?.[0] || ""}
                onChange={e => setFormState({ ...formState, faculties: e.target.value ? [e.target.value] : [] })}
                className="w-full border border-border p-2 rounded-lg bg-background text-sm cursor-pointer font-medium"
              >
                <option value="">General / Toate facultățile</option>
                {availableFacultiesFromSystem.map(fac => (
                  <option key={fac} value={fac}>{fac}</option>
                ))}
              </select>
            </div>

            <div>
              <span className="block text-xs font-semibold text-foreground mb-1">Thumbnail imagine</span>
              <div className="flex flex-col gap-3 p-3 border border-dashed border-border rounded-lg bg-background/50">
                <input type="url" value={formState.image_url || formState.thumbnail || ''} onChange={(event) => setFormState({ ...formState, image_url: event.target.value, thumbnail: event.target.value })} placeholder="https://exemplu.ro/imagine.jpg" className="w-full border border-border p-2 rounded-lg bg-background text-sm" />
                <div className="flex flex-col sm:flex-row gap-2 items-center">
                  <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileChange} className="hidden" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 border border-border px-4 py-2 rounded-md text-xs font-semibold text-foreground bg-card hover:bg-slate-50 transition-all cursor-pointer w-full">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    {formState.thumbnail ? "Schimbă imaginea" : "Încarcă imagine din PC"}
                  </button>
                  <button type="button" onClick={handleAiGenerate} disabled={generateBannerMutation.isPending} className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-md text-xs font-bold cursor-pointer hover:opacity-90 shadow-xs w-full sm:w-auto disabled:opacity-50">
                    <svg className={`w-3.5 h-3.5 ${generateBannerMutation.isPending ? 'animate-spin' : 'animate-pulse'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    {generateBannerMutation.isPending ? 'Se generează...' : 'Generează cu AI'}
                  </button>
                </div>
                {formState.thumbnail && (
                  <div className="mt-1 relative w-32 h-20 rounded-md overflow-hidden border border-border mx-auto sm:mx-0">
                    <Image src={formState.thumbnail} alt="Preview" fill sizes="128px" className="object-cover" unoptimized={formState.thumbnail.startsWith('data:') || formState.thumbnail.startsWith('http')} />
                    <button type="button" onClick={() => setFormState(prev => ({ ...prev, thumbnail: '', image_url: '' }))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">✕</button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="ann-desc" className="block text-xs font-semibold text-foreground mb-1">Descriere detaliată</label>
              <textarea id="ann-desc" value={formState.description || ''} onChange={e => setFormState({...formState, description: e.target.value})} className="w-full border border-border p-2 rounded-lg h-24 bg-background resize-none" required />
            </div>
          </div>

          <div className="sticky bottom-0 bg-card pt-4 border-t border-border z-10 flex justify-end space-x-2">
            <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 border border-border rounded-lg text-muted text-xs cursor-pointer hover:bg-slate-50">Anulează</button>
            <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-4 py-2 bg-brand text-white rounded-lg text-xs font-bold cursor-pointer hover:opacity-90 disabled:opacity-50">
              {createMutation.isPending || updateMutation.isPending ? "Se salvează..." : "Salvează"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted">Se încarcă noutățile...</div>}>
      <AnnouncementsContent />
    </Suspense>
  );
}
