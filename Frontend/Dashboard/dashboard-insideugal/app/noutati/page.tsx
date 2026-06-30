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
  const { data: backendData, isLoading: isLoadingAnnouncements, isError: isErrorAnnouncements, error: announcementsError } = useAnnouncements();
  const createMutation = useCreateAnnouncement();
  const updateMutation = useUpdateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();
  const generateBannerMutation = useGenerateAiBanner();

  const [activeModal, setActiveModal] = useState<'add' | 'edit' | 'details' | null>(null);
  const [selectedItem, setSelectedItem] = useState<ExtendedAnnouncement | null>(null);
  const [formState, setFormState] = useState<Partial<ExtendedAnnouncement>>({});
  const [selectedFaculty, setSelectedFaculty] = useState<string>('Toate');
  const [selectedType, setSelectedType] = useState<string>('TOATE'); 
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [isFacultyDropdownOpen, setIsFacultyDropdownOpen] = useState<boolean>(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState<boolean>(false);
  
  const facultyDropdownRef = useRef<HTMLDivElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  
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

      const backendFacultyId = itemRaw.faculty_id;
      let announcementFaculties: string[] = [];

      if (backendFacultyId) {
        const index = Number(backendFacultyId) - 1;
        if (index >= 0 && index < availableFacultiesFromSystem.length) {
          announcementFaculties = [availableFacultiesFromSystem[index]];
        }
      }

      const eventLink = (itemRaw.event_link as string) || (itemRaw.eventLink as string) || '';
      const rawFiles = itemRaw.files || itemRaw.pdfFiles || [];

      return {
        id: item.id.toString(),
        title: item.title,
        description: item.content || '', 
        publishDate: item.created_at ? new Date(item.created_at).toLocaleDateString('ro-RO') : 'Fără dată',
        faculties: announcementFaculties, 
        thumbnail: item.image_url || '',
        image_url: item.image_url,
        eventLink: eventLink, 
        pdfFiles: Array.isArray(rawFiles) ? (rawFiles as PdfFile[]) : [],
        type: validType,
        locationName: (itemRaw.location_name as string) || '',
        startDate: (itemRaw.start_date as string) || '',
        endDate: (itemRaw.end_date as string) || ''
      };
    });
  }, [backendData]);

  useEffect(() => {
  let timerId: NodeJS.Timeout;

  if (searchParams.get("open") === "true") {
    const urlType = searchParams.get("type"); // Citim tipul din URL
    const defaultType = (urlType === 'EVENIMENT' || urlType === 'NOUTATE') ? urlType : 'NOUTATE';

    timerId = setTimeout(() => {
      setFormState({ 
        faculties: [], 
        pdfFiles: [], 
        type: defaultType, // Îl setăm ca preselectat în formular
        locationName: '', 
        startDate: '', 
        endDate: '' 
      });
      setActiveModal('add');
    }, 0);
  }

  return () => {
    if (timerId) clearTimeout(timerId);
  };
}, [searchParams]);
  const filteredData = useMemo(() => {
    let result = data;
    
    if (selectedFaculty !== 'Toate') {
      result = result.filter(item => item.faculties?.includes(selectedFaculty));
    }
    
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
  }, [data, selectedFaculty, selectedType, searchQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (facultyDropdownRef.current && !facultyDropdownRef.current.contains(event.target as Node)) {
        setIsFacultyDropdownOpen(false);
      }
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setIsTypeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleShare = async (item: ExtendedAnnouncement) => {
    const shareData = {
      title: item.title,
      text: item.description,
      url: window.location.origin + `/noutati/${item.id}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      const encodedUrl = encodeURIComponent(shareData.url);
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank');
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
      header: 'Detalii Logistice', 
      key: 'locationName',
      render: (item) => {
        if (item.type !== 'EVENIMENT') return <span className="text-slate-300 italic text-xs">-</span>;
        return (
          <div className="text-xs space-y-0.5 text-foreground max-w-[180px]">
            {item.locationName && <div className="truncate">📍 {item.locationName}</div>}
            {item.startDate && (
              <div className="text-[11px] text-amber-600 font-medium">
                📅 {new Date(item.startDate).toLocaleDateString('ro-RO')}
              </div>
            )}
          </div>
        );
      }
    },
    { 
      header: 'Link Extern', 
      key: 'eventLink',
      render: (item) => {
        if (!item.eventLink) return <span className="text-slate-300 italic text-xs">-</span>;
        return (
          <a 
            href={item.eventLink.startsWith('http') ? item.eventLink : `https://${item.eventLink}`}
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline font-medium text-xs flex items-center gap-1"
            onClick={(e) => e.stopPropagation()} // Important: Oprește deschiderea modalului de detalii
          >
            Sursă externă
          </a>
        );
      }
    },
    { 
      header: 'Fișiere', 
      key: 'pdfFiles',
      render: (item) => {
        if (!item.pdfFiles || item.pdfFiles.length === 0) return <span className="text-slate-300 italic text-xs">-</span>;
        return (
          <div className="flex flex-col gap-1 max-w-[150px]" onClick={(e) => e.stopPropagation()}>
            {item.pdfFiles.map((file, index) => (
              <a 
                key={index}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-emerald-600 hover:underline truncate font-medium flex items-center gap-0.5"
                title={file.name}
              >
                📄 {file.name}
              </a>
            ))}
          </div>
        );
      }
    },
    { 
      header: 'Descriere', 
      key: 'description', 
      render: (item) => <span className="block max-w-xs truncate text-muted">{item.description}</span> 
    },
    { 
      header: 'Facultate relevantă', 
      key: 'faculties',
      render: (item) => (
        <div className="flex flex-wrap gap-1">
          {item.faculties && item.faculties.length > 0 ? (
            item.faculties.map((f) => (
              <span key={f} className="bg-blue-50 text-brand text-xs px-2.5 py-0.5 rounded-md font-medium border border-blue-100/50">
                {f}
              </span>
            ))
          ) : (
            <span className="text-slate-300 text-[10px] italic">General / Toate</span>
          )}
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
          <button type="button" className="text-green-600 hover:text-green-800 font-medium hover:underline cursor-pointer" onClick={() => handleShare(item)}>Share</button>
          <button 
        type="button" 
        className="text-red-500 hover:text-red-700 font-medium hover:underline cursor-pointer" 
        onClick={(e) => {
          // 1. Oprim propagarea instant ca să NU se mai deschidă modalul de detalii
          e.stopPropagation(); 
          
          if (confirm('Ești sigur că vrei să ștergi acest anunț?')) {
            // 2. Convertim ID-ul din string în număr, deoarece backend-ul FastAPI așteaptă un int
            const numericId = parseInt(item.id, 10);
            deleteMutation.mutate(numericId);
          }
        }}
      >
        Ștergere
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

  const handleAnyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleRemoveFile = (indexToRemove: number) => {
    setFormState(prev => ({
      ...prev,
      pdfFiles: prev.pdfFiles?.filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleAiGenerate = () => {
    if (!formState.title?.trim() || !formState.description?.trim()) {
      alert('Completează titlul și descrierea înainte de a genera o imagine cu AI.');
      return;
    }

    generateBannerMutation.mutate(
      {
        title: formState.title,
        description: formState.description,
        faculty: formState.faculties?.[0],
      },
      {
        onSuccess: (result) => {
          const image = result.image_url || result.image_base64;
          if (image) {
            setFormState(prev => ({ ...prev, thumbnail: image, image_url: image }));
          } else {
            alert(result.error_message || 'Generarea imaginii a eșuat.');
          }
        },
        onError: (error) => {
          alert(error.message || 'Generarea imaginii a eșuat. Încearcă din nou.');
        },
      }
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedFacultyName = formState.faculties?.[0];
    let calculatedFacultyId: number | null = null;

    if (selectedFacultyName) {
      const index = availableFacultiesFromSystem.indexOf(selectedFacultyName);
      if (index !== -1) {
        calculatedFacultyId = index + 1;
      }
    }

    const isEveniment = formState.type === 'EVENIMENT';
    
    const backendPayload: Record<string, unknown> = {
      type: formState.type || 'NOUTATE', 
      title: formState.title || '',
      content: formState.description || '', 
      image_url: formState.thumbnail || formState.image_url || null,
      faculty_id: calculatedFacultyId,
      event_link: formState.eventLink || null, 
      files: formState.pdfFiles || [], 
      location_name: isEveniment ? (formState.locationName || null) : null,
      start_date: isEveniment && formState.startDate ? new Date(formState.startDate).toISOString() : null,
      end_date: isEveniment && formState.endDate ? new Date(formState.endDate).toISOString() : null
    };

    if (activeModal === 'edit' && selectedItem) {
      updateMutation.mutate({ 
        id: parseInt(selectedItem.id), 
        data: backendPayload
      }, {
        onSuccess: () => setActiveModal(null)
      });
    } else {
      createMutation.mutate(backendPayload, {
        onSuccess: () => setActiveModal(null)
      });
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
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')} 
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 relative" ref={facultyDropdownRef}>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Facultate:</span>
            <button
              type="button"
              onClick={() => setIsFacultyDropdownOpen(!isFacultyDropdownOpen)}
              className="flex items-center justify-between min-w-[130px] border border-border px-3 py-2 rounded-xl bg-card text-sm font-semibold shadow-xs hover:border-slate-300 transition-all outline-none cursor-pointer text-foreground"
            >
              <span>{selectedFaculty}</span>
              <svg className={`w-4 h-4 ml-1 text-slate-400 transition-transform duration-200 ${isFacultyDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isFacultyDropdownOpen && (
              <div className="absolute left-14 top-full mt-1.5 w-48 bg-card border border-border rounded-xl shadow-lg py-1 z-50">
                {['Toate', ...availableFacultiesFromSystem].map(faculty => (
                  <div
                    key={faculty}
                    onClick={() => { setSelectedFaculty(faculty); setIsFacultyDropdownOpen(false); }}
                    className={`flex items-center justify-between px-4 py-2 text-sm cursor-pointer transition-colors ${selectedFaculty === faculty ? 'bg-blue-50 text-blue-600 font-bold' : 'text-muted hover:bg-slate-50'}`}
                  >
                    <span>{faculty}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 relative sm:border-l sm:border-border sm:pl-4" ref={typeDropdownRef}>
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
          <div className="p-12 text-center text-sm text-muted animate-pulse">
            Se încarcă noutățile...
          </div>
        ) : isErrorAnnouncements ? (
          <div className="p-12 text-center text-sm text-red-500">
            Eroare la încărcarea noutăților: {announcementsError?.message || 'Eroare de rețea.'}
          </div>
        ) : (
          <Table 
            data={filteredData} 
            columns={columns} 
            onRowClick={(item) => { 
              setSelectedItem(item); 
              setActiveModal('details'); 
            }} 
          />
        )}
      </div>

      {/* MODAL VIZUALIZARE DETALII */}
      <Modal isOpen={activeModal === 'details'} onClose={() => setActiveModal(null)} title="Vizualizare Anunț">
        {selectedItem && (() => {
          const linkExtern = selectedItem.eventLink || '';
          const fisiereAtasate = selectedItem.pdfFiles || [];
          const isEveniment = selectedItem.type === 'EVENIMENT';

          return (
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
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-bold">{selectedItem.title}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${isEveniment ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'}`}>
                    {selectedItem.type}
                  </span>
                </div>
                <p className="text-xs text-muted mt-0.5">Publicat: {selectedItem.publishDate}</p>
              </div>

              <div className="flex flex-wrap gap-1">
                {selectedItem.faculties && selectedItem.faculties.length > 0 ? (
                  selectedItem.faculties.map((f) => (
                    <span key={f} className="bg-blue-50 text-brand border border-blue-100 text-xs px-2 py-0.5 rounded-md font-semibold">
                      {f}
                    </span>
                  ))
                ) : (
                  <span className="bg-slate-50 text-slate-500 border border-slate-200 text-xs px-2 py-0.5 rounded-md font-medium">General / Toate</span>
                )}
              </div>

              {isEveniment && (selectedItem.locationName || selectedItem.startDate) && (
                <div className="p-3.5 bg-amber-50/60 border border-amber-100/70 rounded-xl space-y-1.5 text-xs text-slate-700">
                  {selectedItem.locationName && (
                    <div className="flex items-center gap-1">
                      <span>📍 <b>Locație:</b> {selectedItem.locationName}</span>
                    </div>
                  )}
                  {selectedItem.startDate && (
                    <div className="flex items-center gap-1">
                      <span>📅 <b>Perioadă:</b> {new Date(selectedItem.startDate).toLocaleString('ro-RO')} {selectedItem.endDate ? ` - ${new Date(selectedItem.endDate).toLocaleString('ro-RO')}` : ''}</span>
                    </div>
                  )}
                </div>
              )}

              <p className="text-muted leading-relaxed whitespace-pre-wrap">{selectedItem.description}</p>

              {Array.isArray(fisiereAtasate) && fisiereAtasate.length > 0 ? (
                <div className="space-y-2 pt-3 border-t border-border">
                  <span className="block text-xs font-bold text-foreground">Fișiere atașate:</span>
                  <div className="flex flex-col gap-2">
                    {fisiereAtasate.map((file: PdfFile, idx: number) => {
                      const fileName = file?.name || `Fisier_${idx + 1}`;
                      const fileUrl = file?.url || '';
                      
                      return (
                        <div key={idx}>
                          <a 
                            href={fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold transition-all max-w-full truncate"
                          >
                            <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="truncate">{fileName}</span>
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {linkExtern ? (
                <div className="pt-3 border-t border-border">
                  <span className="block text-xs font-bold text-foreground mb-1">Link asociat:</span>
                  <a 
                    href={linkExtern.startsWith('http') ? linkExtern : `https://${linkExtern}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-600 hover:underline inline-flex items-center gap-1 font-semibold text-xs bg-blue-50/50 border border-blue-100 px-3 py-2 rounded-xl transition-colors"
                  >
                    <span>Accesează link-ul atașat</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              ) : null}
            </div>
          );
        })()}
      </Modal>

      {/* Modal Adăugare / Editare */}
      <Modal isOpen={activeModal === 'add' || activeModal === 'edit'} onClose={() => setActiveModal(null)} title={activeModal === 'edit' ? "Editare Anunț" : "Adăugare Anunț Nou"}>
        <form onSubmit={handleSave} className="flex flex-col max-h-[calc(100vh-200px)] text-sm">
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4 scrollbar-none">
            <style dangerouslySetInnerHTML={{__html: `
              .scrollbar-none::-webkit-scrollbar { display: none; }
            `}} />

            <div>
              <label htmlFor="ann-title" className="block text-xs font-semibold text-foreground mb-1">Titlu Anunț</label>
              <input id="ann-title" type="text" value={formState.title || ''} onChange={e => setFormState({...formState, title: e.target.value})} className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand" required />
            </div>

            <div>
              <label htmlFor="ann-type" className="block text-xs font-semibold text-foreground mb-1">Tipul Anunțului</label>
              <select
                id="ann-type"
                value={formState.type || 'NOUTATE'}
                onChange={e => setFormState({ ...formState, type: e.target.value as 'NOUTATE' | 'EVENIMENT' })}
                className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand text-sm cursor-pointer font-medium"
              >
                <option value="NOUTATE">NOUTATE</option>
                <option value="EVENIMENT">EVENIMENT</option>
              </select>
            </div>

            {formState.type === 'EVENIMENT' && (
              <div className="p-4 bg-slate-50/60 border border-border rounded-xl space-y-3 transition-all duration-300">
                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Detalii Logistice Eveniment</span>
                
                <div>
                  <label htmlFor="ann-location" className="block text-xs font-semibold text-slate-700 mb-1">Locație</label>
                  <input 
                    id="ann-location" 
                    type="text" 
                    placeholder="ex: Hol Central, Corp A" 
                    value={formState.locationName || ''} 
                    onChange={e => setFormState({...formState, locationName: e.target.value})} 
                    className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand" 
                    required 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="ann-start-date" className="block text-xs font-semibold text-slate-700 mb-1">Dată & Oră Început</label>
                    <input 
                      id="ann-start-date" 
                      type="datetime-local" 
                      value={formatToDatetimeLocal(formState.startDate)} 
                      onChange={e => setFormState({...formState, startDate: e.target.value})} 
                      className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand" 
                      required 
                    />
                  </div>
                  <div>
                    <label htmlFor="ann-end-date" className="block text-xs font-semibold text-slate-700 mb-1">Dată & Oră Sfârșit</label>
                    <input 
                      id="ann-end-date" 
                      type="datetime-local" 
                      value={formatToDatetimeLocal(formState.endDate)} 
                      onChange={e => setFormState({...formState, endDate: e.target.value})} 
                      className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand" 
                      required 
                    />
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
                className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand text-sm cursor-pointer font-medium"
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
                <input
                  type="url"
                  value={formState.image_url || formState.thumbnail || ''}
                  onChange={(event) => setFormState({ ...formState, image_url: event.target.value, thumbnail: event.target.value })}
                  placeholder="https://exemplu.ro/imagine.jpg"
                  className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand text-sm"
                />
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
                    disabled={generateBannerMutation.isPending}
                    className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-md text-xs font-bold cursor-pointer hover:opacity-90 transition-all shadow-xs w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className={`w-3.5 h-3.5 ${generateBannerMutation.isPending ? 'animate-spin' : 'animate-pulse'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {generateBannerMutation.isPending ? 'Se generează...' : 'Generează cu AI'}
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
                      onClick={() => setFormState(prev => ({ ...prev, thumbnail: '', image_url: '' }))} 
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] hover:bg-red-600"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-foreground mb-1">Documente și fișiere atașate (Orice format)</span>
              <div className="p-3 border border-dashed border-border rounded-lg bg-background/50 flex flex-col gap-2">
                <input 
                  type="file" 
                  ref={pdfInputRef}
                  onChange={handleAnyFileChange}
                  multiple
                  className="hidden" 
                />
                <button
                  type="button"
                  onClick={() => pdfInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 border border-border px-4 py-2 rounded-md text-xs font-semibold text-foreground bg-card hover:bg-slate-50 transition-all cursor-pointer w-full"
                >
                  <svg className="w-4 h-4 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Încarcă fișiere (PDF, Word, Excel, etc.)
                </button>

                {formState.pdfFiles && formState.pdfFiles.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-1">
                    {formState.pdfFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-50 border border-border rounded-lg p-2 text-xs text-muted">
                        <span className="truncate max-w-[250px] font-medium text-slate-600">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
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
              <label htmlFor="ann-desc" className="block text-xs font-semibold text-foreground mb-1">Descriere detaliată</label>
              <textarea id="ann-desc" value={formState.description || ''} onChange={e => setFormState({...formState, description: e.target.value})} className="w-full border border-border p-2 rounded-lg h-24 bg-background resize-none focus:outline-none focus:ring-1 focus:ring-brand" required />
            </div>

            <div>
              <label htmlFor="ann-link" className="block text-xs font-semibold text-foreground mb-1">Link către noutate / sursă externă (opțional)</label>
              <input id="ann-link" type="text" value={formState.eventLink || ''} onChange={e => setFormState({...formState, eventLink: e.target.value})} className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand" placeholder="https://..." />
            </div>
          </div>

          <div className="sticky bottom-0 bg-card pt-4 border-t border-border z-10 flex justify-end space-x-2">
            <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 border border-border rounded-lg text-muted text-xs cursor-pointer hover:bg-slate-50 transition-colors">Anulează</button>
            <button 
              type="submit" 
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 bg-brand text-white rounded-lg text-xs font-bold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
            >
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