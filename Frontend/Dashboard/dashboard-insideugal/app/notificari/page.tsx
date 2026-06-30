"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Modal from '../components/ui/Modal';
import Table, { Column } from '../components/ui/Table';
import { useRequireDashboardAccess, canAccessContent } from '@/lib/dashboard-auth';

type Notification = {
  id: string;
  title: string;
  description: string;
  time: string;
};

function NotificariContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const access = useRequireDashboardAccess(canAccessContent);
  
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: '1', title: 'Bun venit!', description: 'Aceasta este prima ta notificare.', time: '10:00' },
  ]);
  const [newNotification, setNewNotification] = useState({ title: '', description: '' });

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

  const handleCreate = () => {
    if (!newNotification.title || !newNotification.description) return;

    setNotifications(prev => [
      ...prev,
      { 
        id: Date.now().toString(), 
        ...newNotification, 
        time: new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }) 
      }
    ]);
    setIsModalOpen(false);
    setNewNotification({ title: '', description: '' });
  };

  const columns: Column<Notification>[] = [
    { header: 'Titlu', key: 'title' },
    { header: 'Descriere', key: 'description' },
    { header: 'Ora', key: 'time' },
  ];

  if (access.loading || !access.allowed) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Butonul clasic din pagină */}
      <div className="flex justify-end items-center w-full pb-2">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="bg-brand text-white px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer hover:opacity-90 transition-all shadow-md whitespace-nowrap w-auto"
        >
          Creează notificare
        </button>
      </div>
      
      {/* Tabelul cu notificări */}
      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
         <Table data={notifications} columns={columns} />
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