"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Table, { Column } from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import { apiBaseUrl } from "@/lib/api-client";

export type UserRole = 'Student' | 'Student_responsabil' | 'Profesor' | 'Head_facultati' | 'Head_cantina' | 'Admin';
export type UserStatus = 'Activ' | 'Blocat';

export type UserItem = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  faculty: string; 
  registrationDate: string;
  username?: string;
};

type FacultyDBItem = {
  id: number;
  name: string;
};

const roleOptions: UserRole[] = ['Student', 'Student_responsabil', 'Profesor', 'Head_facultati', 'Head_cantina', 'Admin'];
const statusOptions: UserStatus[] = ['Activ', 'Blocat'];

const roleLabels: Record<UserRole, string> = {
  Student: 'Student',
  Student_responsabil: 'Student Responsabil',
  Profesor: 'Profesor',
  Head_facultati: 'Secretariat', 
  Head_cantina: 'Responsabil Cantina',
  Admin: 'Admin'
};

const API_PROFILES_URL = `${apiBaseUrl}/profiles`; 
const API_FACULTIES_URL = `${apiBaseUrl}/faculties`; 

function getLoggedInUserEmail(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("access_token");
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(base64));
    return (payload.email as string) || null;
  } catch {
    return null;
  }
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function ConturiPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [onlyBlockedFilter, setOnlyBlockedFilter] = useState(false);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [dbFaculties, setDbFaculties] = useState<FacultyDBItem[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('edit');
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [editPassword, setEditPassword] = useState('');

  const [newUser, setNewUser] = useState({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    password: '',
    role: 'Student' as UserRole,
    faculty: '' 
  });

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("access_token");
    const tokenType = localStorage.getItem("token_type") || "Bearer";
    
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `${tokenType} ${token}` } : {})
    };
  }, []);

  const fetchAllFaculties = useCallback(async () => {
    let allItems: FacultyDBItem[] = [];
    let currentPage = 1;
    let hasMore = true;
    const pageSize = 50; 

    try {
      while (hasMore) {
        // Corectat: Eliminat parametrii nefolosiți din semnături sau apeluri ascunse
        const response = await fetch(`${API_FACULTIES_URL}/?size=${pageSize}&page=${currentPage}`, {
          method: 'GET',
          headers: getAuthHeaders()
        });
        
        if (!response.ok) {
          throw new Error(`Eroare la paginarea facultăților: ${response.status}`);
        }
        
        interface APIFacultiesResponse {
          items?: FacultyDBItem[];
          total?: number;
        }

        const data = (await response.json()) as APIFacultiesResponse;
        const items = data.items || [];
        allItems = [...allItems, ...items];
        
        if (items.length < pageSize || allItems.length >= (data.total || 0)) {
          hasMore = false;
        } else {
          currentPage++;
        }
      }
      return allItems;
    } catch (err) {
      console.error("Eroare la încărcarea listei de facultăți din DB:", err);
      return null;
    }
  }, [getAuthHeaders]);

  const fetchProfiles = useCallback(async () => {
    try {
      // Corectat: Eliminat parametri nefolosiți din contextul fetch-ului
      const response = await fetch(`${API_PROFILES_URL}/?size=50&page=1`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Sesiune invalidă sau drepturi insuficiente. Trebuie să fii logat ca Admin.');
        }
        throw new Error('Eroare la încărcarea profilelor de pe server.');
      }
      
      interface APIProfilesItem {
        id: string;
        role?: string;
        first_name?: string;
        last_name?: string;
        email: string;
        is_active?: boolean;
        faculty?: { name: string; abbreviation?: string } | null;
        created_at?: string;
        username?: string;
      }

      interface APIProfilesResponse {
        items?: APIProfilesItem[];
      }

      const data = (await response.json()) as APIProfilesResponse;
      const currentEmail = getLoggedInUserEmail();
      
      const mappedUsers: UserItem[] = (data.items || []).map((item: APIProfilesItem) => {
        const rawRole = item.role ? item.role.trim().toUpperCase() : 'STUDENT';
        let cleanRole: UserRole = 'Student';
        
        if (rawRole === 'ADMIN' || rawRole === 'HEAD_ADMIN') cleanRole = 'Admin';
        else if (rawRole === 'STUDENT_RESPONSABIL') cleanRole = 'Student_responsabil';
        else if (rawRole === 'PROFESOR') cleanRole = 'Profesor';
        else if (rawRole === 'HEAD_CANTINA') cleanRole = 'Head_cantina';
        else if (rawRole === 'HEAD_FACULTATI') cleanRole = 'Head_facultati';

        return {
          id: item.id,
          first_name: item.first_name || '',
          last_name: item.last_name || '',
          email: item.email,
          role: cleanRole,
          status: item.is_active ? 'Activ' : 'Blocat',
          faculty: item.faculty?.name || 'Fără facultate', 
          registrationDate: item.created_at ? item.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
          username: item.username || ''
        };
      });

      if (currentEmail) {
        mappedUsers.sort((a, b) => {
          const emailA = (a.email || '').toLowerCase();
          const emailB = (b.email || '').toLowerCase();
          if (emailA === currentEmail.toLowerCase()) return -1;
          if (emailB === currentEmail.toLowerCase()) return 1;
          return 0;
        });
      }

      return mappedUsers;
    } catch (err) {
      const errorInstance = err as Error;
      throw new Error(errorInstance.message || 'A apărut o eroare la preluarea datelor.');
    }
  }, [getAuthHeaders]);

  // FIX: Eliminat setLoading(true) apelat sincron din corpul principal al efectului
  useEffect(() => {
    let isMounted = true;

    fetchProfiles()
      .then((data) => {
        if (isMounted) {
          setUsers(data);
          setError(null);
          setLoading(false); // Mutat asincron aici
        }
      })
      .catch((err: Error) => {
        if (isMounted) {
          setError(err.message);
          setLoading(false); // Mutat asincron aici
        }
      });

    return () => {
      isMounted = false;
    };
  }, [fetchProfiles]);

  useEffect(() => {
    let isMounted = true;

    fetchAllFaculties().then((data) => {
      if (isMounted && data) {
        setDbFaculties(data);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [fetchAllFaculties]);

  const handleDeleteUser = async (id: string, name: string) => {
    if (confirm(`Sigur vrei să ștergi definitiv contul lui ${name}?`)) {
      try {
        const response = await fetch(`${API_PROFILES_URL}/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Eroare la ștergerea utilizatorului.');
        setUsers(users.filter(u => u.id !== id));
      } catch (err) {
        const errorInstance = err as Error;
        alert(errorInstance.message);
      }
    }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    if (modalMode === 'create') {
      try {
        const payload = {
          email: newUser.email,
          username: newUser.username,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          password: newUser.password,
          role: newUser.role.toUpperCase(),
          faculty: newUser.faculty
        };

        const response = await fetch(`${API_PROFILES_URL}/`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          interface ErrorDetail {
            detail?: string;
          }
          const errData = (await response.json().catch(() => ({}))) as ErrorDetail;
          throw new Error(errData.detail ? JSON.stringify(errData.detail) : 'Nu s-a putut crea profilul.');
        }

        setIsModalOpen(false);
        setNewUser({ email: '', username: '', first_name: '', last_name: '', password: '', role: 'Student', faculty: '' });
        await delay(300);
        const updatedUsers = await fetchProfiles();
        setUsers(updatedUsers);

      } catch (err) {
        const errorInstance = err as Error;
        if (errorInstance.message === "Failed to fetch") {
          console.warn("Serverul a procesat cererea, dar a întrerupt conexiunea înainte de răspuns.");
          setIsModalOpen(false);
          setNewUser({ email: '', username: '', first_name: '', last_name: '', password: '', role: 'Student', faculty: '' });
          await delay(400);
          const updatedUsers = await fetchProfiles().catch(() => []);
          if (updatedUsers.length > 0) setUsers(updatedUsers);
        } else {
          alert(errorInstance.message);
        }
      } finally {
        setIsSaving(false);
      }
    } else if (modalMode === 'edit' && selectedUser) {
      try {
        const payload: Record<string, unknown> = {
          role: selectedUser.role.toUpperCase(),
          is_active: selectedUser.status === 'Activ',
          first_name: selectedUser.first_name,
          last_name: selectedUser.last_name,
          email: selectedUser.email,
          username: selectedUser.username,
          faculty: selectedUser.faculty
        };

        if (editPassword.trim()) {
          payload.password = editPassword;
        }

        const response = await fetch(`${API_PROFILES_URL}/${selectedUser.id}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          interface ErrorDetail {
            detail?: string;
          }
          const errData = (await response.json().catch(() => ({}))) as ErrorDetail;
          throw new Error(errData.detail ? JSON.stringify(errData.detail) : 'Modificările nu s-au putut salva.');
        }

        setIsModalOpen(false);
        setEditPassword('');
        await delay(200);
        const updatedUsers = await fetchProfiles();
        setUsers(updatedUsers);

      } catch (err) {
        const errorInstance = err as Error;
        if (errorInstance.message === "Failed to fetch") {
          setIsModalOpen(false);
          setEditPassword('');
          await delay(300);
          const updatedUsers = await fetchProfiles().catch(() => []);
          if (updatedUsers.length > 0) setUsers(updatedUsers);
        } else {
          alert(errorInstance.message);
        }
      } finally {
        setIsSaving(false);
      }
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
      const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || 
                            user.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesBlocked = !onlyBlockedFilter || user.status === 'Blocat';
      
      return matchesSearch && matchesRole && matchesBlocked;
    });
  }, [users, searchQuery, roleFilter, onlyBlockedFilter]);

  const getRoleClass = (role: UserRole) => {
    switch (role) {
      case 'Admin': return 'bg-red-50 text-red-700 border-red-100';
      case 'Profesor': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Head_facultati': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'Head_cantina': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Student_responsabil': return 'bg-cyan-50 text-cyan-700 border-cyan-100';
      case 'Student': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    }
  };

  const columns: Column<UserItem>[] = [
    {
      header: 'Utilizator',
      key: 'first_name',
      render: (item) => {
        const currentEmail = getLoggedInUserEmail();
        const isMe = currentEmail && item.email.toLowerCase() === currentEmail.toLowerCase();
        
        return (
          <div className="space-y-0.5 max-w-[180px] sm:max-w-none">
            <p className="font-semibold text-foreground text-sm flex items-center flex-wrap gap-1">
              <span className="truncate">{item.first_name} {item.last_name}</span>
              {isMe && (
                <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 font-bold px-1.5 py-0.2 rounded-md inline-block">
                  Tu
                </span>
              )}
            </p>
            <p className="text-xs text-muted font-mono truncate">{item.email}</p>
          </div>
        );
      }
    },
    {
      header: 'Facultate / Departament',
      key: 'faculty',
      render: (item) => <span className="text-muted text-xs max-w-[150px] md:max-w-xs block truncate">{item.faculty}</span>
    },
    {
      header: 'Tip Cont',
      key: 'role',
      render: (item) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border inline-block whitespace-nowrap ${getRoleClass(item.role)}`}>
          {roleLabels[item.role]}
        </span>
      )
    },
    {
      header: 'Status',
      key: 'status',
      render: (item) => (
        <span className={`px-2 py-0.5 rounded-md text-xs font-medium border inline-block whitespace-nowrap ${
          item.status === 'Activ' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
        }`}>
          {item.status}
        </span>
      )
    },
    {
      header: 'Dată Înregistrare',
      key: 'registrationDate',
      render: (item) => <span className="text-slate-400 text-xs whitespace-nowrap">{item.registrationDate}</span>
    },
    {
      header: 'Acțiuni',
      key: 'actions',
      render: (item) => (
        <div className="flex space-x-3 text-xs whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="text-blue-600 hover:text-blue-800 hover:underline font-bold cursor-pointer"
            onClick={() => {
              setModalMode('edit');
              setSelectedUser({ ...item });
              setEditPassword('');
              setIsModalOpen(true);
            }}
          >
            Modifică
          </button>
          <button
            type="button"
            className="text-red-500 hover:text-red-700 font-medium cursor-pointer"
            onClick={() => handleDeleteUser(item.id, `${item.first_name} ${item.last_name}`)}
          >
            Șterge
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto space-y-4 w-full overflow-x-hidden">
      
      <div className="flex flex-col gap-4 w-full bg-background p-1">
        <div className="flex flex-row justify-between items-center w-full gap-4">
          <div className="relative w-full sm:w-64 md:w-80 min-w-[200px]">
            <input
              type="text"
              placeholder="Caută după nume sau email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-border p-2.5 rounded-xl bg-background text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setModalMode('create');
              setNewUser({
                email: '',
                username: '',
                first_name: '',
                last_name: '',
                password: '',
                role: 'Student',
                faculty: ''
              });
              setIsModalOpen(true);
            }}
            className="bg-brand text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:opacity-90 cursor-pointer shadow-xs whitespace-nowrap h-[42px] flex items-center flex-shrink-0"
          >
            + Adaugă Cont Nou
          </button>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-4">
          <div className="w-full sm:w-auto overflow-x-auto lg:overflow-visible pb-1 sm:pb-0">
            <div className="flex flex-nowrap md:flex-wrap bg-background p-1 rounded-xl border border-border/60 w-max sm:w-full max-w-full">
              {(['all', ...roleOptions] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setRoleFilter(tab)}
                  className={`px-3 md:px-4 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all whitespace-nowrap ${
                    roleFilter === tab ? 'bg-card text-foreground shadow-xs' : 'text-muted hover:text-foreground'
                  }`}
                >
                  {tab === 'all' ? 'Toate' : roleLabels[tab]}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center justify-center space-x-2 text-xs font-bold text-muted hover:text-foreground cursor-pointer select-none bg-background border border-border/60 p-2.5 rounded-xl h-[42px] whitespace-nowrap self-end sm:self-auto flex-shrink-0">
            <input
              type="checkbox"
              checked={onlyBlockedFilter}
              onChange={(e) => setOnlyBlockedFilter(e.target.checked)}
              className="rounded border-border text-brand focus:ring-brand h-4 w-4 cursor-pointer"
            />
            <span>Doar Blocate</span>
          </label>
        </div>
      </div>

      {loading && <p className="text-center text-sm py-8 text-muted">Se încarcă utilizatorii...</p>}
      {error && <p className="text-center text-sm py-8 text-red-500 font-semibold">{error}</p>}

      {!loading && !error && (
        <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden w-full">
          <div className="overflow-x-auto w-full block">
            <Table data={filteredUsers} columns={columns} />
          </div>
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => !isSaving && setIsModalOpen(false)} 
        title={modalMode === 'create' ? "Adăugare Cont Nou" : "Modificare Completă Profil (Admin)"}
        className="max-w-2xl"
      >
        {modalMode === 'create' ? (
          <form onSubmit={handleSaveChanges} className="space-y-4 text-sm" autoComplete="off">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Nume</label>
                <input required disabled={isSaving} type="text" value={newUser.first_name} onChange={(e) => setNewUser({...newUser, first_name: e.target.value})} className="w-full border border-border p-2 rounded-lg bg-background text-sm disabled:opacity-60" placeholder="Andrei" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Prenume</label>
                <input required disabled={isSaving} type="text" value={newUser.last_name} onChange={(e) => setNewUser({...newUser, last_name: e.target.value})} className="w-full border border-border p-2 rounded-lg bg-background text-sm disabled:opacity-60" placeholder="Popescu" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Username</label>
                <input required disabled={isSaving} type="text" autoComplete="one-time-code" value={newUser.username} onChange={(e) => setNewUser({...newUser, username: e.target.value})} className="w-full border border-border p-2 rounded-lg bg-background text-sm disabled:opacity-60" placeholder="apopescu" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Email Instituțional</label>
                <input required disabled={isSaving} type="email" autoComplete="one-time-code" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} className="w-full border border-border p-2 rounded-lg bg-background font-mono text-sm disabled:opacity-60" placeholder="nume@egal.ro" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Facultate asociată</label>
                <select
                  required
                  disabled={isSaving}
                  value={newUser.faculty}
                  onChange={(e) => setNewUser({ ...newUser, faculty: e.target.value })}
                  className="w-full border border-border p-2 rounded-lg bg-background text-sm cursor-pointer disabled:opacity-60 truncate max-w-full"
                >
                  <option value="" disabled hidden>Alege o facultate</option>
                  {dbFaculties.length === 0 ? (
                    <option value="" disabled>Se încarcă facultățile...</option>
                  ) : (
                    dbFaculties.map((fac) => (
                      <option key={fac.id} value={fac.name} className="truncate">{fac.name}</option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Rol / Tip de Cont</label>
                <select
                  disabled={isSaving}
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                  className="w-full border border-border p-2 rounded-lg bg-background text-sm cursor-pointer disabled:opacity-60"
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>{roleLabels[role]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Parolă inițială</label>
              <input required disabled={isSaving} type="password" autoComplete="new-password" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} className="w-full border border-border p-2 rounded-lg bg-background text-sm disabled:opacity-60" placeholder="••••••••" />
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-border">
              <button type="button" disabled={isSaving} onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-border rounded-lg text-muted text-xs disabled:opacity-50">Anulează</button>
              <button type="submit" disabled={isSaving} className="px-4 py-2 bg-brand text-white rounded-lg text-xs font-bold disabled:opacity-60 min-w-[110px] flex items-center justify-center">
                {isSaving ? "Se creează..." : "Creează Contul"}
              </button>
            </div>
          </form>
        ) : (
          selectedUser && (
            <form onSubmit={handleSaveChanges} className="space-y-4 text-sm" autoComplete="off">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Nume</label>
                  <input disabled={isSaving} type="text" value={selectedUser.first_name} onChange={(e) => setSelectedUser({...selectedUser, first_name: e.target.value})} className="w-full border border-border p-2 rounded-lg bg-background text-sm font-medium disabled:opacity-60" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Prenume</label>
                  <input disabled={isSaving} type="text" value={selectedUser.last_name} onChange={(e) => setSelectedUser({...selectedUser, last_name: e.target.value})} className="w-full border border-border p-2 rounded-lg bg-background text-sm font-medium disabled:opacity-60" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Username</label>
                  <input disabled={isSaving} type="text" value={selectedUser.username || ''} onChange={(e) => setSelectedUser({...selectedUser, username: e.target.value})} className="w-full border border-border p-2 rounded-lg bg-background text-sm font-medium disabled:opacity-60" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Email</label>
                  <input disabled={isSaving} type="email" value={selectedUser.email} onChange={(e) => setSelectedUser({...selectedUser, email: e.target.value})} className="w-full border border-border p-2 rounded-lg bg-background font-mono text-sm disabled:opacity-60" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Facultate / Departament</label>
                  <select
                    required
                    disabled={isSaving}
                    value={selectedUser.faculty}
                    onChange={(e) => setSelectedUser({ ...selectedUser, faculty: e.target.value })}
                    className="w-full border border-border p-2 rounded-lg bg-background text-sm cursor-pointer disabled:opacity-60 truncate max-w-full"
                  >
                    <option value="">Alege o facultate</option>
                    {dbFaculties.map((fac) => (
                      <option key={fac.id} value={fac.name} className="truncate">{fac.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Schimbă Rolul</label>
                  <select
                    disabled={isSaving}
                    value={selectedUser.role}
                    onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value as UserRole })}
                    className="w-full border border-border p-2 rounded-lg bg-background text-sm cursor-pointer disabled:opacity-60"
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>{roleLabels[role]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Status Acces</label>
                <select
                  disabled={isSaving}
                  value={selectedUser.status}
                  onChange={(e) => setSelectedUser({ ...selectedUser, status: e.target.value as UserStatus })}
                  className="w-full border border-border p-2 rounded-lg bg-background text-sm cursor-pointer disabled:opacity-60"
                >
                  {statusOptions.map((status: UserStatus) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Schimbă Parolă (Lasă gol dacă nu vrei modificarea ei)</label>
                <input disabled={isSaving} type="password" autoComplete="new-password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} className="w-full border border-border p-2 rounded-lg bg-background text-sm disabled:opacity-60" placeholder="Introduceți o parolă nouă doar dacă doriți resetarea ei" />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-border">
                <button type="button" disabled={isSaving} onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-border rounded-lg text-muted text-xs disabled:opacity-50">Anulează</button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 bg-brand text-white rounded-lg text-xs font-bold disabled:opacity-60 min-w-[140px] flex items-center justify-center">
                  {isSaving ? "Se salvează..." : "Salvează Toate Modificările"}
                </button>
              </div>
            </form>
          )
        )}
      </Modal>
    </div>
  );
}