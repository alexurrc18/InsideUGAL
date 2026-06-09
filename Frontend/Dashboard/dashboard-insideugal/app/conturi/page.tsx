"use client";

import React, { useState, useMemo } from 'react';
import Table, { Column } from '../components/ui/Table';
import Modal from '../components/ui/Modal';

export type UserRole = 'Student' | 'Profesor' | 'Secretariat' | 'Admin';
export type UserStatus = 'Activ' | 'Blocat';

export type UserItem = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  faculty: string;
  registrationDate: string;
};

const initialUsers: UserItem[] = [
  {
    id: "usr-2",
    name: "Andrei Popescu",
    email: "ap412@student.ugal.ro",
    role: "Student",
    status: "Activ",
    faculty: "Facultatea de Inginerie",
    registrationDate: "2025-02-15"
  },
  {
    id: "usr-3",
    name: "Elena Ionescu",
    email: "elena.ionescu@ugal.ro",
    role: "Profesor",
    status: "Activ",
    faculty: "Facultatea de Litere",
    registrationDate: "2023-09-01"
  },
  {
    id: "usr-4",
    name: "Marius Bogdan",
    email: "marius.bogdan@ugal.ro",
    role: "Secretariat",
    status: "Activ",
    faculty: "Secretariat ACEE",
    registrationDate: "2022-11-12"
  },
  {
    id: "usr-5",
    name: "Dumitru George",
    email: "dg981@student.ugal.ro",
    role: "Student",
    status: "Blocat",
    faculty: "Facultatea de Științe și Mediu",
    registrationDate: "2025-03-10"
  }
];

const roleOptions: UserRole[] = ['Student', 'Profesor', 'Secretariat', 'Admin'];
const statusOptions: UserStatus[] = ['Activ', 'Blocat'];

export default function ConturiPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            user.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  const getRoleClass = (role: UserRole) => {
    switch (role) {
      case 'Admin': return 'bg-red-50 text-red-700 border-red-100';
      case 'Profesor': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Secretariat': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'Student': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    }
  };

  const columns: Column<UserItem>[] = [
    {
      header: 'Utilizator',
      key: 'name',
      render: (item) => (
        <div className="space-y-0.5">
          <p className="font-semibold text-slate-900 text-sm">{item.name}</p>
          <p className="text-xs text-slate-500 font-mono">{item.email}</p>
        </div>
      )
    },
    {
      header: 'Facultate / Departament',
      key: 'faculty',
      render: (item) => <span className="text-slate-600 text-xs max-w-xs block truncate">{item.faculty}</span>
    },
    {
      header: 'Tip Cont',
      key: 'role',
      render: (item) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getRoleClass(item.role)}`}>
          {item.role}
        </span>
      )
    },
    {
      header: 'Status',
      key: 'status',
      render: (item) => (
        <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${
          item.status === 'Activ' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'
        }`}>
          {item.status}
        </span>
      )
    },
    {
      header: 'Dată Înregistrare',
      key: 'registrationDate',
      render: (item) => <span className="text-slate-400 text-xs">{item.registrationDate}</span>
    },
    {
      header: 'Acțiuni',
      key: 'actions',
      render: (item) => (
        <div className="flex space-x-3 text-xs" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="text-brand hover:underline font-semibold cursor-pointer"
            onClick={() => {
              setSelectedUser({ ...item });
              setIsModalOpen(true);
            }}
          >
            Modifică
          </button>
          <button
            type="button"
            className="text-red-500 hover:text-red-700 font-medium cursor-pointer"
            onClick={() => {
              if(confirm(`Sigur vrei să ștergi contul lui ${item.name}?`)) {
                setUsers(users.filter(u => u.id !== item.id));
              }
            }}
          >
            Șterge
          </button>
        </div>
      )
    }
  ];

  const handleSaveChanges = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) {
      setUsers(users.map(u => u.id === selectedUser.id ? selectedUser : u));
      setIsModalOpen(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Caută după nume sau email (ex: ap412...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-border p-2.5 rounded-xl bg-background text-sm focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 w-fit overflow-x-auto max-w-full">
          {(['all', 'Student', 'Profesor', 'Secretariat', 'Admin'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setRoleFilter(tab)}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all whitespace-nowrap ${
                roleFilter === tab 
                  ? 'bg-white text-slate-800 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab === 'all' ? 'Toate' : tab}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
        <Table data={filteredUsers} columns={columns} />
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Modificare Permisiuni Cont"
      >
        {selectedUser && (
          <form onSubmit={handleSaveChanges} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Nume Complet</label>
              <input type="text" value={selectedUser.name} disabled className="w-full border border-border p-2 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed focus:outline-none font-medium" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Email Instituțional</label>
              <input type="text" value={selectedUser.email} disabled className="w-full border border-border p-2 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed focus:outline-none font-mono" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Schimbă Rolul / Tipul de Cont</label>
              <select
                value={selectedUser.role}
                onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value as UserRole })}
                className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand text-sm font-medium text-slate-800 cursor-pointer"
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Status Acces</label>
              <select
                value={selectedUser.status}
                onChange={(e) => setSelectedUser({ ...selectedUser, status: e.target.value as UserStatus })}
                className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand text-sm font-medium text-slate-800 cursor-pointer"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-border">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className="px-4 py-2 border border-border rounded-lg text-muted text-xs cursor-pointer hover:bg-background"
              >
                Anulează
              </button>
              <button 
                type="submit" 
                className="px-4 py-2 bg-brand text-white rounded-lg text-xs font-bold cursor-pointer hover:opacity-90"
              >
                Salvează Modificările
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
