// app/components/ui/Modal.tsx
"use client";
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      /* MODIFICAT: bg-black/40 pentru fundal negru cu opacitate scăzută */
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        /* MODIFICAT: folosește colțurile rotunjite și culorile din tema ta globală */
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-card border border-border shadow-xl overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header-ul modalului */}
        <div className="p-4 border-b border-border flex justify-between items-center bg-background/50">
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          <button 
            onClick={onClose} 
            className="text-muted hover:text-foreground text-sm cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>
        
        {/* Corpul modalului (injectat din exterior) */}
        <div className="p-6 overflow-y-auto flex-1 text-sm text-foreground custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}