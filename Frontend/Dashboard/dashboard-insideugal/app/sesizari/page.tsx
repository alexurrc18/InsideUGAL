"use client";

import React, { useState, useMemo, useRef } from 'react';
import Table, { Column } from '../components/ui/Table';
import Modal from '../components/ui/Modal';

export type TicketStatus = 'In asteptare' | 'In lucru' | 'Respins' | 'Inchis';

export type TicketItem = {
  id: string;
  title: string;
  description: string;
  building: string;
  status: TicketStatus;
  createdBy: string;
  authorName: string;
  image?: string;
  date: string;
};

const initialTickets: TicketItem[] = [
  {
    id: "tk-1",
    title: "Problemă rețea Corpul G",
    description: "Nu funcționează switch-ul de la etajul 2, laboratoarele de calculatoare nu au internet.",
    building: "Corpul G",
    status: "In lucru",
    createdBy: "user-curent",
    authorName: "Andrei Popescu",
    date: "2026-06-08"
  },
  {
    id: "tk-2",
    title: "Infiltrații tavan sala de sport",
    description: "Plouă în interiorul sălii de sport pe partea stângă, lângă vestiare.",
    building: "Corpul A",
    status: "In asteptare",
    createdBy: "alt-user",
    authorName: "Elena Ionescu",
    date: "2026-06-07"
  },
  {
    id: "tk-3",
    title: "Scaune rupte amfiteatru",
    description: "Trei scaune din rândul 4 sunt complet desprinse din scheletul metalic.",
    building: "Corpul G",
    status: "Inchis",
    createdBy: "user-curent",
    authorName: "Andrei Popescu",
    date: "2026-06-05"
  }
];

const availableBuildings = ["Corpul G", "Corpul A"];
const statusOptions: TicketStatus[] = ['In asteptare', 'In lucru', 'Respins', 'Inchis'];

export default function SesizariPage() {
  const currentUser = { id: "user-curent", role: "admin" };

  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'active' | 'closed'>('all');
  const [tickets, setTickets] = useState<TicketItem[]>(initialTickets);
  
  const [activeModal, setActiveModal] = useState<'add' | 'edit' | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ticketForm, setTicketForm] = useState<Partial<TicketItem>>({ building: availableBuildings[0] });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredTickets = useMemo(() => {
    switch (activeTab) {
      case 'my':
        return tickets.filter(t => t.createdBy === currentUser.id);
      case 'active':
        return tickets.filter(t => t.status === 'In asteptare' || t.status === 'In lucru');
      case 'closed':
        return tickets.filter(t => t.status === 'Inchis' || t.status === 'Respins');
      case 'all':
      default:
        return tickets;
    }
  }, [tickets, activeTab, currentUser.id]);

  const getStatusClass = (status: TicketStatus) => {
    switch (status) {
      case 'In asteptare': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'In lucru': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Respins': return 'bg-red-50 text-red-700 border-red-100';
      case 'Inchis': return 'bg-background text-muted border-border';
    }
  };

  const columns: Column<TicketItem>[] = [
    {
      header: 'Titlu',
      key: 'title',
      render: (item) => {
        const isClosed = item.status === 'Inchis' || item.status === 'Respins';
        return (
          <div className={`space-y-1 ${isClosed ? 'opacity-50 text-slate-400' : ''}`}>
            <p className="font-semibold text-foregroundd">{item.title}</p>
            <p className="text-xs text-muted line-clamp-1">{item.description}</p>
          </div>
        );
      }
    },
    {
      header: 'Locație Clădire',
      key: 'building',
      render: (item) => {
        const isClosed = item.status === 'Inchis' || item.status === 'Respins';
        return (
          <span className={isClosed ? 'opacity-50 text-slate-400' : 'text-foreground font-medium'}>
            {item.building}
          </span>
        );
      }
    },
    {
      header: 'Depus de',
      key: 'authorName',
      render: (item) => {
        const isClosed = item.status === 'Inchis' || item.status === 'Respins';
        return (
          <span className={`text-muted ${isClosed ? 'opacity-50' : ''}`}>
            {currentUser.role === 'admin' ? item.authorName : '---'}
          </span>
        );
      }
    },
    {
      header: 'Dată',
      key: 'date',
      render: (item) => {
        const isClosed = item.status === 'Inchis' || item.status === 'Respins';
        return (
          <span className={`text-muted text-xs whitespace-nowrap ${isClosed ? 'opacity-50' : ''}`}>
            {item.date}
          </span>
        );
      }
    },
    {
      header: 'Status',
      key: 'status',
      render: (item) => (
        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${getStatusClass(item.status)}`}>
          {item.status}
        </span>
      )
    },
    {
      header: 'Acțiuni',
      key: 'actions',
      render: (item) => {
        if (activeTab !== 'my' && currentUser.role !== 'admin') return <span className="text-slate-400 text-xs">---</span>;
        
        return (
          <div className="flex space-x-3 text-xs" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="text-blue-600 hover:text-blue-800 font-medium hover:underline cursor-pointer"
              onClick={() => {
                setSelectedId(item.id);
                setTicketForm({ ...item });
                setActiveModal('edit');
              }}
            >
              Editare
            </button>
            <button
              type="button"
              className="text-red-500 hover:text-red-700 font-medium hover:underline cursor-pointer"
              onClick={() => setTickets(tickets.filter(t => t.id !== item.id))}
            >
              Ștergere
            </button>
          </div>
        );
      }
    }
  ];

  const handleOpenAddModal = () => {
    setSelectedId(null);
    setTicketForm({ building: availableBuildings[0], status: 'In asteptare' });
    setActiveModal('add');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (activeModal === 'edit' && selectedId) {
      setTickets(tickets.map(t => t.id === selectedId ? { ...t, ...ticketForm } as TicketItem : t));
    } else {
      const newTicket: TicketItem = {
        id: `tk-${Date.now()}`,
        title: ticketForm.title || '',
        description: ticketForm.description || '',
        building: ticketForm.building || availableBuildings[0],
        status: ticketForm.status || 'In asteptare',
        createdBy: currentUser.id,
        authorName: currentUser.role === 'admin' ? 'Administrator' : 'Student / Profesor',
        date: new Date().toISOString().split('T')[0]
      };
      setTickets([...tickets, newTicket]);
    }
    setActiveModal(null);
  };

  const isEditingOthersTicket = useMemo(() => {
    return activeModal === 'edit' && activeTab !== 'my';
  }, [activeModal, activeTab]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="flex bg-background p-1 rounded-xl border border-border/60 w-fit">
          {(([ 'all', 'my', 'active', 'closed' ] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all uppercase ${
                activeTab === tab 
                  ? 'bg-card text-foreground shadow-xs' 
                  : 'text-muted hover:text-foreground'
              }`}
            >
              {tab === 'all' && 'Toate'}
              {tab === 'my' && 'Sesizările Mele'}
              {tab === 'active' && 'Active'}
              {tab === 'closed' && 'Închise'}
            </button>
          )))}
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="bg-brand text-white px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer hover:opacity-90 transition-all shadow-md self-end md:self-auto"
        >
          Adaugă Sesizare
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
        <Table 
          data={filteredTickets} 
          columns={columns} 
        />
      </div>

      <Modal 
        isOpen={activeModal !== null} 
        onClose={() => setActiveModal(null)} 
        title={activeModal === 'edit' ? (isEditingOthersTicket ? "Modificare Status" : "Editare Sesizarea Mea") : "Ce problemă ai?"}
      >
        <form onSubmit={handleSave} className="space-y-4 text-sm max-h-[80vh] flex flex-col justify-between">
          
          {/* Containerul intern pentru câmpuri cu scrollbar ascuns */}
          <div 
            className="space-y-4 overflow-y-auto pr-1 pb-4"
            style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
          >
            <style dangerouslySetInnerHTML={{__html: `
              div::-webkit-scrollbar {
                display: none;
              }
            `}} />

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Titlu</label>
              <input 
                type="text" 
                value={ticketForm.title || ''} 
                onChange={e => setTicketForm({...ticketForm, title: e.target.value})} 
                placeholder="Ex: Lipsă curent curent, Proiector defect..." 
                className={`w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand ${isEditingOthersTicket ? 'bg-slate-50 text-muted font-medium cursor-not-allowed' : ''}`}
                disabled={isEditingOthersTicket}
                required 
              />
            </div>

            {currentUser.role === 'admin' && (
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Nume Autor (Doar Adminii Văd)</label>
                <input 
                  type="text" 
                  value={ticketForm.authorName || 'Sistem Admin'} 
                  disabled
                  className="w-full border border-border p-2 rounded-lg bg-slate-50 text-muted font-medium cursor-not-allowed focus:outline-none" 
                />
              </div>
            )}

            {currentUser.role === 'admin' && activeModal === 'edit' && isEditingOthersTicket && (
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Modifică Status</label>
                <select
                  value={ticketForm.status}
                  onChange={(e) => setTicketForm({ ...ticketForm, status: e.target.value as TicketStatus })}
                  className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand text-sm font-semibold text-foreground cursor-pointer"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Selectează Clădirea / Corpul</label>
              <select
                value={ticketForm.building || availableBuildings[0]}
                onChange={(e) => setTicketForm({ ...ticketForm, building: e.target.value })}
                className={`w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand text-sm font-medium ${isEditingOthersTicket ? 'bg-slate-50 text-muted cursor-not-allowed' : 'text-foreground'}`}
                disabled={isEditingOthersTicket}
              >
                {availableBuildings.map((bld) => (
                  <option key={bld} value={bld}>{bld}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Descriere detaliată</label>
              <textarea 
                value={ticketForm.description || ''} 
                onChange={e => setTicketForm({...ticketForm, description: e.target.value})} 
                placeholder="Descrie pe scurt problema identificată..." 
                rows={4}
                className={`w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand resize-none ${isEditingOthersTicket ? 'bg-slate-50 text-muted font-medium cursor-not-allowed' : ''}`}
                disabled={isEditingOthersTicket}
                required 
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Atașează o poză (Opțional)</label>
              <input 
                type="file" 
                ref={fileInputRef}
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setTicketForm({ ...ticketForm, image: file.name });
                  }
                }}
                className="hidden" 
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!ticketForm.image && !isEditingOthersTicket) {
                      fileInputRef.current?.click();
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    ticketForm.image 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 cursor-default' 
                      : isEditingOthersTicket
                        ? 'bg-slate-50 border-border text-slate-400 cursor-not-allowed'
                        : 'bg-card border-border text-foreground hover:bg-slate-50 cursor-pointer'
                  }`}
                  disabled={isEditingOthersTicket}
                >
                  {ticketForm.image ? "✓ Imagine selectată" : "Alege fișier"}
                </button>
                <span className={`text-xs ${ticketForm.image ? 'text-foreground font-medium' : 'text-slate-400'}`}>
                  {ticketForm.image ? ticketForm.image : "Niciun fișier selectat"}
                </span>
                {ticketForm.image && !isEditingOthersTicket && (
                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) fileInputRef.current.value = "";
                      setTicketForm({ ...ticketForm, image: undefined });
                    }}
                    className="text-red-500 hover:text-red-700 text-xs font-bold px-1 cursor-pointer"
                  >
                    Șterge
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Zona Fixă/Statică de Butoane (Sticky Bottom) */}
          <div className="sticky bottom-0 bg-background pt-4 border-t border-border z-10 flex justify-end space-x-2">
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