"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Modal from '../components/ui/Modal';
import Table, { Column } from '../components/ui/Table';
import {
  useRequireDashboardAccess,
  canAccessContent,
  canSendNotifications,
} from '@/lib/dashboard-auth';
import { apiBaseUrl, getAuthHeaders, apiClient } from '@/lib/api-client';

type NotificationItem = {
  id: number;
  title: string;
  body: string;
  action: string | null;
  faculty_id: number | null;
  sent_by: string;
  sent_at: string;
  recipient_count: number;
  created_at: string;
  updated_at: string;
};

type PaginatedNotifications = {
  items: NotificationItem[];
  total: number;
  page: number;
  size: number;
  total_pages: number;
};

type FacultyOption = {
  id: number;
  name: string;
};

type NotificationRow = {
  id: string;
  title: string;
  description: string;
  time: string;
  faculty: string;
  action: string | null;
  sentBy: string;
};

function NotificariContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const access = useRequireDashboardAccess(canAccessContent);

  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [faculties, setFaculties] = useState<FacultyOption[]>([]);
  const [profileNames, setProfileNames] = useState<Record<string, string>>({});

  const [newNotification, setNewNotification] = useState({
    title: '',
    body: '',
    action: '',
    faculty_id: '' as string | number,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(() => {
    return searchParams.get('open') === 'true';
  });

  useEffect(() => {
    if (searchParams.get('open') === 'true') {
      router.replace('/notificari');
    }
  }, [searchParams, router]);

  useEffect(() => {
  let cancelled = false;
  apiClient
    .getFaculties()
    .then((data) => {
      if (cancelled) return;
      const list = Array.isArray(data) ? data : [];
      setFaculties(
        list.map((f: { id: number; name: string }) => ({
          id: f.id,
          name: f.name,
        }))
      );
    })
    .catch(() => {
      if (!cancelled) setFaculties([]);
    });
  return () => {
    cancelled = true;
  };
}, []);

  const facultyNameById = useCallback(
    (id: number | null) => {
      if (id === null) return 'Toate facultățile';
      const found = faculties.find((f) => f.id === id);
      return found ? found.name : `Facultate #${id}`;
    },
    [faculties]
  );
  const resolveProfileNames = useCallback(
  async (ids: string[]) => {
    const uniqueIds = Array.from(new Set(ids)).filter((id) => !(id in profileNames));
    if (uniqueIds.length === 0) return;

    const results = await Promise.all(
      uniqueIds.map(async (id) => {
        try {
          const res = await fetch(`${apiBaseUrl}/profiles/${id}`, {
            cache: 'no-store',
            credentials: 'include',
            headers: getAuthHeaders(),
          });
          if (!res.ok) return [id, id] as const;
          const profile = await res.json();
          const name =
            profile.username ||
            `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim();
          return [id, name || id] as const;
        } catch {
          return [id, id] as const;
        }
      })
    );

    setProfileNames((prev) => {
      const next = { ...prev };
      for (const [id, name] of results) next[id] = name;
      return next;
    });
  },
  [profileNames]
);

  const loadNotifications = useCallback(
    async (pageToLoad: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${apiBaseUrl}/notifications/me?page=${pageToLoad}&size=20`,
          {
            cache: 'no-store',
            credentials: 'include',
            headers: getAuthHeaders(),
          }
        );

        if (!res.ok) {
          throw new Error(`Eroare ${res.status} la încărcarea notificărilor.`);
        }

        const data: PaginatedNotifications = await res.json();

        setRows(
          data.items.map((n) => ({
            id: String(n.id),
            title: n.title,
            description: n.body,
            time: new Date(n.created_at).toLocaleTimeString('ro-RO', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            faculty: facultyNameById(n.faculty_id),
            action: n.action,
            sentBy: n.sent_by,
          }))
        );
        setTotalPages(data.total_pages || 1);
        resolveProfileNames(data.items.map((n) => n.sent_by));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Eroare necunoscută.');
      } finally {
        setLoading(false);
      }
    },
    [facultyNameById, resolveProfileNames]
  );

  useEffect(() => {
    if (access.loading || !access.allowed) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadNotifications(page);
  }, [access.loading, access.allowed, page, loadNotifications]);

  const handleCreate = async () => {
    if (!newNotification.title || !newNotification.body) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/notifications/send`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          title: newNotification.title,
          body: newNotification.body,
          action: newNotification.action || null,
          faculty_id: newNotification.faculty_id
            ? Number(newNotification.faculty_id)
            : null,
        }),
      });

      if (!res.ok) {
        throw new Error(`Eroare ${res.status} la trimiterea notificării.`);
      }

      setIsModalOpen(false);
      setNewNotification({ title: '', body: '', action: '', faculty_id: '' });
      setPage(1);
      await loadNotifications(1);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Eroare necunoscută.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<NotificationRow>[] = [
    { header: 'Titlu', key: 'title' },
    { header: 'Descriere', key: 'description' },
    { header: 'Facultate', key: 'faculty' },
    {
      header: 'Acțiune',
      key: 'action',
      render: (row: NotificationRow) =>
        row.action ? (
          <a
            href={row.action}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand underline break-all"
          >
            {row.action}
          </a>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
  header: 'Trimis de',
  key: 'sentBy',
  render: (row: NotificationRow) => profileNames[row.sentBy] ?? row.sentBy,
},
    { header: 'Ora', key: 'time' },
  ];

  if (access.loading || !access.allowed) return null;

  const canCreate = canSendNotifications(access.role);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {canCreate && (
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

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-sm rounded-xl p-3">
          {error}
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-muted animate-pulse">Se încarcă notificările...</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-muted">Nu există notificări.</div>
        ) : (
          <Table data={rows} columns={columns} />
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <span className="text-muted">
            Pagina {page} din {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            Următor
          </button>
        </div>
      )}

      {canCreate && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Creează notificare">
          <div className="space-y-4">
            {submitError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-sm rounded-xl p-2">
                {submitError}
              </div>
            )}
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
                value={newNotification.body}
                onChange={e => setNewNotification(prev => ({ ...prev, body: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Facultate</label>
              <select
                className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand text-sm"
                value={newNotification.faculty_id}
                onChange={e => setNewNotification(prev => ({ ...prev, faculty_id: e.target.value }))}
              >
                <option value="">Toate facultățile</option>
                {faculties.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Acțiune (link, opțional)
              </label>
              <input
                className="w-full border border-border p-2 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand text-sm"
                placeholder="https://exemplu.ro/pagina"
                value={newNotification.action}
                onChange={e => setNewNotification(prev => ({ ...prev, action: e.target.value }))}
              />
            </div>
            <button
              type="button"
              onClick={handleCreate}
              disabled={submitting}
              className="w-full bg-brand text-white p-2 rounded-lg text-sm font-bold hover:opacity-90 transition-all cursor-pointer disabled:opacity-60"
            >
              {submitting ? 'Se trimite...' : 'Trimite'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function NotificariPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted animate-pulse">Se încarcă...</div>}>
      <NotificariContent />
    </Suspense>
  );
}