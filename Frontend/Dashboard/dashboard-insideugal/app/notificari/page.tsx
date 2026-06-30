"use client";

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Modal from '../components/ui/Modal';
import Table, { Column } from '../components/ui/Table';
import { useRequireDashboardAccess, canAccessContent } from '@/lib/dashboard-auth';
import { apiClient } from '@/lib/api-client';
import type { ApiNotification, Faculty, Profile } from '@/lib/api-types';

function NotificariContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const access = useRequireDashboardAccess(canAccessContent);
  
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newNotification, setNewNotification] = useState({ title: '', description: '', action: '' });
  const [targetFacultyId, setTargetFacultyId] = useState<string>(''); // Empty string means "Toate facultatile" (null)

  // ACEASTA ESTE LOGICA CARE DESCHIDE MODALUL AUTOMAT DATORITĂ PARAMETRULUI DIN URL
  // 1. Setează valoarea inițială direct din URL
  const [isModalOpen, setIsModalOpen] = useState(() => {
    return searchParams.get('open') === 'true';
  });

  // 2. Păstrează în useEffect DOAR curățarea URL-ului, fără setState!
  useEffect(() => {
    if (searchParams.get('open') === 'true') {
      router.replace('/notificari');
    }
  }, [searchParams, router]);

  // O funcție pură pentru preluarea datelor, fără a apela setteri de stare direct
  const fetchNotificariData = useCallback(async () => {
    const profileData = await apiClient.getCurrentProfile();
    const facultiesData = await apiClient.getFaculties();

    const isManager = profileData.role === 'HEAD_ADMIN' || profileData.role === 'HEAD_FACULTATI';
    const notificationsResponse = isManager
      ? await apiClient.getNotifications()
      : await apiClient.getMyNotifications();

    return {
      profile: profileData,
      faculties: facultiesData.items,
      notifications: notificationsResponse.items,
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (access.allowed) {
      fetchNotificariData()
        .then((data) => {
          if (isMounted) {
            setCurrentProfile(data.profile);
            setFaculties(data.faculties);
            setNotifications(data.notifications);
            setError(null);
            setLoading(false);
          }
        })
        .catch((err: unknown) => {
          if (isMounted) {
            console.error("Eroare la încărcarea datelor:", err);
            const msg = err instanceof Error ? err.message : "Nu s-au putut încărca datele de la backend.";
            setError(msg);
            setLoading(false);
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, [access.allowed, fetchNotificariData]);

  const handleReload = () => {
    setLoading(true);
    fetchNotificariData()
      .then((data) => {
        setCurrentProfile(data.profile);
        setFaculties(data.faculties);
        setNotifications(data.notifications);
        setError(null);
      })
      .catch((err: unknown) => {
        console.error("Eroare la reîncărcarea datelor:", err);
        const msg = err instanceof Error ? err.message : "A apărut o eroare la reîncărcarea datelor.";
        setError(msg);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleCreate = async () => {
    if (!newNotification.title || !newNotification.description) return;

    try {
      const isManager = currentProfile?.role === 'HEAD_ADMIN' || currentProfile?.role === 'HEAD_FACULTATI';
      if (!isManager) {
        setError("Nu ai permisiuni de administrator pentru a trimite notificări.");
        return;
      }

      // Stabilește faculty_id în funcție de rol
      const facultyId = currentProfile?.role === 'HEAD_FACULTATI'
        ? currentProfile.faculty_id
        : (targetFacultyId ? parseInt(targetFacultyId, 10) : null);

      await apiClient.sendNotification({
        title: newNotification.title,
        body: newNotification.description,
        action: newNotification.action || undefined,
        faculty_id: facultyId
      });

      // Resetează stările
      setIsModalOpen(false);
      setNewNotification({ title: '', description: '', action: '' });
      setTargetFacultyId('');
      
      // Reîncarcă notificările
      handleReload();
    } catch (err: unknown) {
      console.error("Eroare la crearea notificării:", err);
      const msg = err instanceof Error ? err.message : "A apărut o eroare la trimiterea notificării.";
      alert(msg);
    }
  };

  const getFacultyAbbreviation = (facultyId: number | null | undefined) => {
    if (!facultyId) return "Toate facultățile";
    const fac = faculties.find(f => f.id === facultyId);
    return fac ? fac.abbreviation || fac.name : `Facultatea ${facultyId}`;
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('ro-RO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const columns: Column<ApiNotification>[] = [
    { header: 'Titlu', key: 'title' },
    { header: 'Descriere', key: 'body' },
    { 
      header: 'Destinatar (Facultate)', 
      key: 'faculty_id',
      render: (item) => (
        <span className={`px-2 py-1 rounded-md text-xs font-semibold inline-block ${
          item.faculty_id ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
        }`}>
          {getFacultyAbbreviation(item.faculty_id)}
        </span>
      )
    },
    { 
      header: 'Destinatari (Pushes)', 
      key: 'recipient_count',
      render: (item) => (
        <span className="font-semibold text-foreground/80">
          {item.recipient_count}
        </span>
      )
    },
    { 
      header: 'Dată & Oră', 
      key: 'sent_at',
      render: (item) => formatDateTime(item.sent_at)
    },
  ];

  if (access.loading || !access.allowed) return null;

  const isManager = currentProfile?.role === 'HEAD_ADMIN' || currentProfile?.role === 'HEAD_FACULTATI';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Butonul de creare notificări */}
      {isManager && (
        <div className="flex justify-end items-center w-full pb-2">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="bg-brand text-white px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer hover:opacity-90 transition-all shadow-md whitespace-nowrap w-auto"
          >
            Creează notificare
          </button>
        </div>
      )}
      
      {/* Tabelul cu notificări */}
      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-muted animate-pulse">
            Se încarcă notificările...
          </div>
        ) : (
          <Table data={notifications} columns={columns} />
        )}
      </div>

      {/* Modalul */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Creează notificare">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Titlu</label>
            <input
              className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand text-sm"
              placeholder="Titlu notificare"
              value={newNotification.title}
              onChange={e => setNewNotification(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Descriere</label>
            <textarea
              className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand text-sm"
              placeholder="Descriere notificare"
              rows={4}
              value={newNotification.description}
              onChange={e => setNewNotification(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Link Acțiune (Opțional)</label>
            <input
              className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand text-sm"
              placeholder="https://example.com"
              value={newNotification.action}
              onChange={e => setNewNotification(prev => ({ ...prev, action: e.target.value }))}
            />
          </div>

          {currentProfile?.role === 'HEAD_ADMIN' && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Facultate Destinatară</label>
              <select
                className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand text-sm"
                value={targetFacultyId}
                onChange={e => setTargetFacultyId(e.target.value)}
              >
                <option value="">Toate facultățile</option>
                {faculties.map(f => (
                  <option key={f.id} value={f.id}>{f.name} ({f.abbreviation})</option>
                ))}
              </select>
            </div>
          )}

          {currentProfile?.role === 'HEAD_FACULTATI' && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Facultate Destinatară</label>
              <input
                className="w-full border border-border p-2 rounded-lg bg-background text-sm opacity-70"
                value={getFacultyAbbreviation(currentProfile.faculty_id)}
                disabled
              />
            </div>
          )}

          <button 
            type="button" 
            onClick={handleCreate} 
            className="w-full bg-brand text-white p-2 rounded-lg text-sm font-bold hover:opacity-90 transition-all cursor-pointer"
          >
            Trimite
          </button>
        </div>
      </Modal>
    </div>
  );
}

// Next.js cere ca orice pagină care folosește searchParams să fie învelită într-un Suspense component
export default function NotificariPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted animate-pulse">Se încarcă...</div>}>
      <NotificariContent />
    </Suspense>
  );
}