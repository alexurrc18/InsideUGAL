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
  useFaculties,
  useGenerateAiBanner
} from '@/hooks/useDashboardApi';
import { Announcement as BackendAnnouncement } from '@/lib/api-types';

const availableFacultiesFromSystem = [
  "AC", "FIE", "ACIEE", "Mecanică", "SIA", "Litere", "Drept", "Medicină", "Economie"
];

function AnnouncementsContent() {
  const { data: backendData, isLoading: isLoadingAnnouncements, isError: isErrorAnnouncements, error: announcementsError } = useAnnouncements({ announcement_type: "NOUTATE", size: 50 });
  const { data: backendFaculties } = useFaculties();
  const createMutation = useCreateAnnouncement();
  const updateMutation = useUpdateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();
  const generateBannerMutation = useGenerateAiBanner();

  const [activeModal, setActiveModal] = useState<'add' | 'edit' | 'details' | null>(null);
  const [selectedItem, setSelectedItem] = useState<Announcement | null>(null);
  const [formState, setFormState] = useState<Partial<Announcement>>({});
  const [selectedFaculty, setSelectedFaculty] = useState<string>('Toate');
  const [newFacultyInput, setNewFacultyInput] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  
  const searchParams = useSearchParams();

  const facultyById = useMemo(() => {
    return new Map((backendFaculties || []).map((faculty) => [faculty.id, faculty.abbreviation || faculty.name]));
  }, [backendFaculties]);

  const facultyIdByLabel = useMemo(() => {
    return new Map((backendFaculties || []).map((faculty) => [faculty.abbreviation || faculty.name, faculty.id]));
  }, [backendFaculties]);

  const data = useMemo(() => {
    const list = backendData && typeof backendData === 'object' && 'items' in backendData 
      ? (backendData as { items: BackendAnnouncement[] }).items 
      : backendData;

    if (!list || !Array.isArray(list)) return [];

    return (list as BackendAnnouncement[]).map((item: BackendAnnouncement): Announcement => ({
      id: item.id.toString(),
      title: item.title,
      description: item.content || '', 
      publishDate: item.created_at ? new Date(item.created_at).toLocaleDateString('ro-RO') : 'Fără dată',
      faculties: item.faculty_id ? [facultyById.get(item.faculty_id) || `Facultate #${item.faculty_id}`] : [],
      thumbnail: item.image_url || '',
      eventLink: (item as Record<string, unknown>).eventLink as string || '', 
      pdfFiles: []  
    }));
  }, [backendData, facultyById]);

  // --- DEFINIȚIA COLOANELOR (Eroarea era aici) ---
  const columns: Column<Announcement>[] = useMemo(() => [
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
      header: 'Facultăți', 
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
            <span className="text-slate-300 text-[10px] italic">Fără facultăți</span>
          )}
        </div>
      )
    },
    { 
      header: 'Data', 
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
            onClick={() => { setSelectedItem(item); setFormState({ ...item }); setActiveModal('edit'); }}
          >
            Editare
          </button>
          <button 
            type="button" 
            className="text-red-500 hover:text-red-700 font-medium hover:underline cursor-pointer" 
            onClick={() => { if (confirm('Ștergi?')) deleteMutation.mutate(parseInt(item.id)); }}
          >
            Ștergere
          </button>
        </div>
      )
    }
  ], [deleteMutation]);

  // Restul logicii...
  const dynamicFaculties = useMemo(() => {
    const fromBackend = backendFaculties?.map(f => f.abbreviation || f.name) || [];
    return Array.from(new Set([...availableFacultiesFromSystem, ...fromBackend])).filter(f => f !== 'Toate');
  }, [backendFaculties]);

  const allFilterOptions = useMemo(() => ['Toate', ...dynamicFaculties], [dynamicFaculties]);
  const filteredData = useMemo(() => selectedFaculty === 'Toate' ? data : data.filter(item => item.faculties?.includes(selectedFaculty)), [data, selectedFaculty]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const backendPayload = {
      type: 'NOUTATE',
      title: formState.title || '',
      content: formState.description || '',
      is_pinned: false,
      image_url: formState.thumbnail || null,
      faculty_id: formState.faculties?.[0] ? facultyIdByLabel.get(formState.faculties[0]) ?? null : null,
    };

    if (activeModal === 'edit' && selectedItem) {
      updateMutation.mutate({ id: parseInt(selectedItem.id), data: backendPayload as any }, { onSuccess: () => setActiveModal(null) });
    } else {
      createMutation.mutate(backendPayload as any, { onSuccess: () => setActiveModal(null) });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Filtre și butoane... */}
      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
         {/* AICI ESTE FOLOSIT 'columns' */}
         <Table data={filteredData} columns={columns} onRowClick={(item) => { setSelectedItem(item); setActiveModal('details'); }} />
      </div>
      {/* ... restul JSX ... */}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Se încarcă...</div>}>
      <AnnouncementsContent />
    </Suspense>
  );
}