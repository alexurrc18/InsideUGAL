// app/components/ui/Table.tsx
"use client";
import React from 'react';

export interface Column<T> {
  header: string;
  key: keyof T | 'actions';
  render?: (item: T) => React.ReactNode;
}

interface UniversalTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
}

export default function Table<T extends { id: string | number }>({ 
  data, 
  columns, 
  onRowClick 
}: UniversalTableProps<T>) {
  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          {/* Header-ul tabelului adaptat la tema ta */}
          <tr className="border-b border-border text-muted font-semibold bg-background/50">
            {columns.map((col, index) => (
              <th key={index} className="p-4 whitespace-nowrap">{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-foreground/90">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-8 text-center text-muted">
                Nu există date disponibile.
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr 
                key={item.id} 
                onClick={() => onRowClick && onRowClick(item)} 
                className={`transition-colors ${
                  onRowClick ? 'hover:bg-background/40 cursor-pointer' : ''
                }`}
              >
                {columns.map((col, index) => (
                  <td key={index} className="p-4 align-middle">
                    {col.render 
                      ? col.render(item) 
                      : (item[col.key as keyof T] as React.ReactNode)
                    }
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}