// app/noutati/page.tsx
"use client";

import React, { useState } from 'react';
import { mockAnnouncements, Announcement } from '../data/announcements';
import Table, { Column } from '../components/ui/Table';
import Modal from '../components/ui/Modal';

export default function Page() {
  const [data, setData] = useState<Announcement[]>(mockAnnouncements);
  const [activeModal, setActiveModal] = useState<'details' | 'edit' | null>(null);
  const [selectedItem, setSelectedItem] = useState<Announcement | null>(null);
  const [formState, setFormState] = useState<Partial<Announcement>>({});

  // Configurația coloanelor pentru tabel
  const columns: Column<Announcement>[] = [
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
          {item.faculties?.map((f, i) => (
            <span key={i} className="bg-blue-50 text-brand text-xs px-2.5 py-0.5 rounded-md font-medium border border-blue-100/50">
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
            className="text-blue-600 hover:text-blue-800 font-medium hover:underline cursor-pointer" 
            onClick={() => { 
              setSelectedItem(item); 
              setFormState({ ...item }); 
              setActiveModal('edit'); 
            }}
          >
            Editare
          </button>
          <button className="text-green-600 hover:text-green-800 font-medium hover:underline cursor-pointer" onClick={() => alert(`Shared: ${item.title}`)}>Share</button>
          <button className="text-red-500 hover:text-red-700 font-medium hover:underline cursor-pointer" onClick={() => setData(data.filter(a => a.id !== item.id))}>Ștergere</button>
        </div>
      )
    }
  ];

  // Funcție pentru procesarea imaginii încărcate din calculator
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Rezultatul este un string Base64 ce poate fi pus direct în tag-ul <img src="..." />
        setFormState(prev => ({ ...prev, thumbnail: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Salvarea modificărilor din formularul de editare
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setData(data.map(item => item.id === selectedItem?.id ? { ...item, ...formState } as Announcement : item));
    setActiveModal(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      
      {/* Containerul Tabelului (Card) */}
      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
        <Table 
          data={data} 
          columns={columns} 
          onRowClick={(item) => { 
            setSelectedItem(item); 
            setActiveModal('details'); 
          }} 
        />
      </div>

      {/* 1. Modal Vizualizare Detalii */}
      <Modal isOpen={activeModal === 'details'} onClose={() => setActiveModal(null)} title="Vizualizare Anunț">
        {selectedItem && (
          <div className="space-y-4 text-sm text-foreground">
            {selectedItem.thumbnail && (
              <img src={selectedItem.thumbnail} alt={selectedItem.title} className="w-full h-48 object-cover rounded-xl border border-border" />
            )}
            <div>
              <h4 className="text-lg font-bold">{selectedItem.title}</h4>
              <p className="text-xs text-muted mt-0.5">Publicat: {selectedItem.publishDate}</p>
            </div>

            <div className="flex flex-wrap gap-1">
              {selectedItem.faculties?.map((f, i) => (
                <span key={i} className="bg-background text-muted border border-border text-xs px-2 py-0.5 rounded-md font-medium">
                  {f}
                </span>
              ))}
            </div>

            <p className="text-muted leading-relaxed whitespace-pre-wrap">{selectedItem.description}</p>

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

      {/* 2. Modal Editare cu Încărcare Imagine din Calculator */}
      <Modal isOpen={activeModal === 'edit'} onClose={() => setActiveModal(null)} title="Editare Anunț">
        <form onSubmit={handleSave} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Titlu</label>
            <input type="text" value={formState.title || ''} onChange={e => setFormState({...formState, title: e.target.value})} className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand" required />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Facultăți relevante (separate prin virgulă)</label>
            <input 
              type="text" 
              value={formState.faculties?.join(', ') || ''} 
              onChange={e => setFormState({...formState, faculties: e.target.value.split(',').map(f => f.trim())})} 
              className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand" 
            />
          </div>

          {/* Secțiunea de încărcare fișier local */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Thumbnail (Încarcă din calculator)</label>
            <div className="flex flex-col gap-2 p-3 border border-dashed border-border rounded-lg bg-background/50">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                className="w-full text-xs text-muted file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-brand hover:file:bg-blue-100/80 file:cursor-pointer cursor-pointer" 
              />
              {formState.thumbnail && (
                <div className="mt-1 relative w-32 h-20 rounded-md overflow-hidden border border-border">
                  <img src={formState.thumbnail} alt="Preview" className="w-full h-full object-cover" />
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
            <label className="block text-xs font-semibold text-foreground mb-1">Descriere</label>
            <textarea value={formState.description || ''} onChange={e => setFormState({...formState, description: e.target.value})} className="w-full border border-border p-2 rounded-lg h-24 bg-background resize-none focus:outline-none focus:ring-1 focus:ring-brand" required />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Link către eveniment (opțional)</label>
            <input type="url" value={formState.eventLink || ''} onChange={e => setFormState({...formState, eventLink: e.target.value})} className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand" placeholder="https://..." />
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-border">
            <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 border border-border rounded-lg text-muted text-xs cursor-pointer hover:bg-background">Anulează</button>
            <button type="submit" className="px-4 py-2 bg-brand text-white rounded-lg text-xs cursor-pointer hover:opacity-90">Salvează</button>
          </div>
        </form>
      </Modal>

    </div>
  );
}