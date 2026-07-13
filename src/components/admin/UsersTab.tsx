'use client';

import { useEffect, useState, useCallback } from 'react';

type UserRow = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  role: 'user' | 'admin';
  lockedAdmin: boolean;   // admin через ADMIN_EMAILS — роль не знімається з UI
  totalXp: number;
  completedCount: number;
  createdAt: string | null;
  lastLoginAt: string | null;
};

type SortKey = 'xp' | 'recent' | 'created' | 'name';

type Analytics = {
  totalUsers: number;
  activeWeek: number;
  newWeek: number;
  finishedUsers: number;
  totalXp: number;
  avgXp: number;
  maxXp: number;
  lines:  { cherry: number; orange: number; green: number; combined: number };
  ages:   { kids: number; teens: number; adults: number };
};

const CHERRY = '#89182c';
const LINE_COLORS: Record<string, string> = {
  cherry: '#89182c', orange: '#D4621A', green: '#2D7A4F', combined: '#8888A8',
};
const LINE_LABELS: Record<string, string> = {
  cherry: 'Вишнева', orange: 'Оранжева', green: 'Зелена', combined: 'Комбіновані',
};

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function UsersTab() {
  const [users, setUsers]     = useState<UserRow[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');
  const [sort, setSort]       = useState<SortKey>('xp');

  // Аналітика (зведення зверху)
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  // Картка вибраного користувача + стан дій
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [busy, setBusy]         = useState(false);
  const [actionError, setActionError] = useState('');
  const [confirmReset, setConfirmReset]   = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const closeCard = useCallback(() => {
    setSelected(null);
    setConfirmReset(false);
    setConfirmDelete(false);
    setActionError('');
    setBusy(false);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      params.set('sort', sort);
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      console.error(e);
      setError('Не вдалося завантажити користувачів');
    } finally {
      setLoading(false);
    }
  }, [search, sort]);

  // Дебаунс пошуку + реакція на зміну сортування
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  // Аналітика — вантажимо раз при відкритті таба
  const loadAnalytics = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users/stats');
      if (!res.ok) return;
      setAnalytics(await res.json());
    } catch { /* тихо: аналітика не критична */ }
  }, []);

  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);

  // ── Дії над вибраним користувачем ──────────────────────
  async function changeRole(newRole: 'user' | 'admin') {
    if (!selected) return;
    setBusy(true); setActionError('');
    try {
      const res = await fetch(`/api/admin/users/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) { setActionError(data.error || 'Не вдалося змінити роль'); setBusy(false); return; }
      setSelected({ ...selected, role: newRole });
      await load();
    } catch {
      setActionError('Помилка мережі');
    } finally {
      setBusy(false);
    }
  }

  async function resetStats() {
    if (!selected) return;
    setBusy(true); setActionError('');
    try {
      const res = await fetch(`/api/admin/users/${selected.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      const data = await res.json();
      if (!res.ok) { setActionError(data.error || 'Не вдалося обнулити'); setBusy(false); return; }
      setSelected({ ...selected, totalXp: 0, completedCount: 0 });
      setConfirmReset(false);
      await load();
      loadAnalytics();
    } catch {
      setActionError('Помилка мережі');
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser() {
    if (!selected) return;
    setBusy(true); setActionError('');
    try {
      const res = await fetch(`/api/admin/users/${selected.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { setActionError(data.error || 'Не вдалося видалити'); setBusy(false); return; }
      closeCard();
      await load();
      loadAnalytics();
    } catch {
      setActionError('Помилка мережі');
      setBusy(false);
    }
  }

  const SORTS: { key: SortKey; label: string }[] = [
    { key: 'xp',      label: 'За XP' },
    { key: 'recent',  label: 'Активні' },
    { key: 'created',  label: 'Нові' },
    { key: 'name',    label: 'Імʼя' },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1A1A2E', margin: 0 }}>Користувачі</h1>
          <p style={{ fontSize: 13, color: '#888', margin: '4px 0 0' }}>
            {loading ? 'Завантаження…' : `Усього: ${total}`}
          </p>
        </div>
        <button
          onClick={() => { load(); loadAnalytics(); }}
          style={{ padding: '8px 18px', borderRadius: 12, border: '1.5px solid #EEEEF5', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          ↻ Оновити
        </button>
      </div>

      {/* Аналітика */}
      {analytics && (
        <div style={{ marginBottom: 20 }}>
          {/* Верхні метрики */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 12 }}>
            {[
              { label: 'Усього юзерів', value: analytics.totalUsers, color: '#1A1A2E' },
              { label: 'Активні (7 дн)', value: analytics.activeWeek, color: '#2D7A4F' },
              { label: 'Нові (7 дн)', value: analytics.newWeek, color: '#D4621A' },
              { label: 'Завершили квест', value: analytics.finishedUsers, color: CHERRY },
            ].map(m => (
              <div key={m.label} style={{ background: '#fff', border: '1px solid #EEEEF5', borderRadius: 14, padding: '14px 16px' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: m.color }}>{m.value}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{m.label}</div>
              </div>
            ))}
          </div>

          {/* XP + розподіл по лініях */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
            {/* XP */}
            <div style={{ background: '#fff', border: '1px solid #EEEEF5', borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 10 }}>XP</div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div><div style={{ fontSize: 18, fontWeight: 800, color: CHERRY }}>{analytics.totalXp}</div><div style={{ fontSize: 10, color: '#aaa' }}>сумарно</div></div>
                <div><div style={{ fontSize: 18, fontWeight: 800, color: '#1A1A2E' }}>{analytics.avgXp}</div><div style={{ fontSize: 10, color: '#aaa' }}>у середньому</div></div>
                <div><div style={{ fontSize: 18, fontWeight: 800, color: '#1A1A2E' }}>{analytics.maxXp}</div><div style={{ fontSize: 10, color: '#aaa' }}>максимум</div></div>
              </div>
            </div>

            {/* Розподіл по лініях */}
            <div style={{ background: '#fff', border: '1px solid #EEEEF5', borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 10 }}>ЗАВЕРШЕНІ МАРШРУТИ</div>
              {(() => {
                const entries = ['cherry', 'orange', 'green', 'combined'] as const;
                const max = Math.max(1, ...entries.map(k => analytics.lines[k]));
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {entries.map(k => (
                      <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: '#888', width: 84, flexShrink: 0 }}>{LINE_LABELS[k]}</span>
                        <div style={{ flex: 1, height: 8, background: '#f0f0f4', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${(analytics.lines[k] / max) * 100}%`, height: '100%', background: LINE_COLORS[k] }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#1A1A2E', width: 28, textAlign: 'right' }}>{analytics.lines[k]}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Пошук + сортування */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Пошук за email або імʼям…"
          style={{ flex: 1, minWidth: 240, padding: '10px 14px', borderRadius: 12, border: '1.5px solid #EEEEF5', fontSize: 14, outline: 'none' }}
        />
        <div style={{ display: 'flex', gap: 4, background: '#fff', padding: 4, borderRadius: 12, border: '1.5px solid #EEEEF5' }}>
          {SORTS.map(s => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: sort === s.key ? CHERRY : 'transparent', color: sort === s.key ? '#fff' : '#888' }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ padding: 16, borderRadius: 12, background: '#fdecef', color: CHERRY, fontSize: 14, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Список */}
      {!loading && users.length === 0 && !error && (
        <div style={{ padding: 40, textAlign: 'center', color: '#888', fontSize: 14 }}>
          {search ? 'Нікого не знайдено за цим запитом.' : 'Поки що немає зареєстрованих користувачів.'}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {users.map(u => (
          <div
            key={u.id}
            onClick={() => { setSelected(u); setActionError(''); setConfirmReset(false); setConfirmDelete(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: '#fff', borderRadius: 14, border: '1px solid #EEEEF5', cursor: 'pointer' }}
          >
            {/* Аватар */}
            {u.avatarUrl
              ? <img src={u.avatarUrl} alt="" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }} />
              : <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: '#f0e6e9', color: CHERRY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>
                  {(u.name || u.email || '?').charAt(0).toUpperCase()}
                </div>
            }

            {/* Імʼя + email */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {u.name || '(без імені)'}
                </span>
                {u.role === 'admin' && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: CHERRY, color: '#fff', flexShrink: 0 }}>
                    {u.lockedAdmin ? 'ADMIN 🔒' : 'ADMIN'}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {u.email}
              </div>
            </div>

            {/* Статистика */}
            <div style={{ display: 'flex', gap: 20, flexShrink: 0, textAlign: 'right' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: CHERRY }}>{u.totalXp}</div>
                <div style={{ fontSize: 10, color: '#aaa' }}>XP</div>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#1A1A2E' }}>{u.completedCount}</div>
                <div style={{ fontSize: 10, color: '#aaa' }}>маршрутів</div>
              </div>
              <div style={{ minWidth: 70 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1A2E' }}>{fmtDate(u.lastLoginAt)}</div>
                <div style={{ fontSize: 10, color: '#aaa' }}>вхід</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Картка користувача (модалка) ── */}
      {selected && (
        <div
          onClick={closeCard}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 1000 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 20, padding: 28, maxWidth: 460, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
          >
            {/* Шапка картки */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              {selected.avatarUrl
                ? <img src={selected.avatarUrl} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
                : <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f0e6e9', color: CHERRY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 22 }}>
                    {(selected.name || selected.email || '?').charAt(0).toUpperCase()}
                  </div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#1A1A2E' }}>{selected.name || '(без імені)'}</div>
                <div style={{ fontSize: 13, color: '#888', wordBreak: 'break-all' }}>{selected.email}</div>
              </div>
              <button onClick={closeCard} style={{ border: 'none', background: 'transparent', fontSize: 22, cursor: 'pointer', color: '#aaa', lineHeight: 1 }}>×</button>
            </div>

            {/* Статистика */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, background: '#faf8f5', borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: CHERRY }}>{selected.totalXp}</div>
                <div style={{ fontSize: 11, color: '#aaa' }}>XP</div>
              </div>
              <div style={{ flex: 1, background: '#faf8f5', borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#1A1A2E' }}>{selected.completedCount}</div>
                <div style={{ fontSize: 11, color: '#aaa' }}>маршрутів</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 20, lineHeight: 1.6 }}>
              Реєстрація: {fmtDate(selected.createdAt)}<br />
              Останній вхід: {fmtDate(selected.lastLoginAt)}
            </div>

            {actionError && (
              <div style={{ padding: 12, borderRadius: 10, background: '#fdecef', color: CHERRY, fontSize: 13, marginBottom: 16 }}>
                {actionError}
              </div>
            )}

            {/* Роль */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 8 }}>РОЛЬ</div>
              {selected.lockedAdmin ? (
                <div style={{ fontSize: 13, color: '#888', padding: '10px 14px', background: '#faf8f5', borderRadius: 10 }}>
                  🔒 Admin через <code>ADMIN_EMAILS</code>. Роль керується змінною оточення, з панелі не змінюється.
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    disabled={busy || selected.role === 'user'}
                    onClick={() => changeRole('user')}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid #EEEEF5', background: selected.role === 'user' ? CHERRY : '#fff', color: selected.role === 'user' ? '#fff' : '#1A1A2E', fontSize: 13, fontWeight: 600, cursor: busy || selected.role === 'user' ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}
                  >
                    Користувач
                  </button>
                  <button
                    disabled={busy || selected.role === 'admin'}
                    onClick={() => changeRole('admin')}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid #EEEEF5', background: selected.role === 'admin' ? CHERRY : '#fff', color: selected.role === 'admin' ? '#fff' : '#1A1A2E', fontSize: 13, fontWeight: 600, cursor: busy || selected.role === 'admin' ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}
                  >
                    Admin
                  </button>
                </div>
              )}
            </div>

            {/* Небезпечні дії */}
            <div style={{ borderTop: '1px solid #EEEEF5', paddingTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 8 }}>НЕБЕЗПЕЧНІ ДІЇ</div>

              {/* Обнулення */}
              {!confirmReset ? (
                <button
                  disabled={busy}
                  onClick={() => { setConfirmReset(true); setConfirmDelete(false); }}
                  style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1.5px solid #e8a020', background: '#fff', color: '#c47a00', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 8 }}
                >
                  Обнулити статистику (XP + маршрути)
                </button>
              ) : (
                <div style={{ padding: 12, borderRadius: 10, background: '#fff8ec', marginBottom: 8 }}>
                  <div style={{ fontSize: 13, color: '#c47a00', marginBottom: 10 }}>Обнулити XP і всю історію маршрутів? Це незворотно.</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button disabled={busy} onClick={resetStats} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: '#e8a020', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Так, обнулити</button>
                    <button disabled={busy} onClick={() => setConfirmReset(false)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1.5px solid #EEEEF5', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Скасувати</button>
                  </div>
                </div>
              )}

              {/* Видалення */}
              {!confirmDelete ? (
                <button
                  disabled={busy}
                  onClick={() => { setConfirmDelete(true); setConfirmReset(false); }}
                  style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1.5px solid #89182c', background: '#fff', color: CHERRY, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Видалити користувача
                </button>
              ) : (
                <div style={{ padding: 12, borderRadius: 10, background: '#fdecef' }}>
                  <div style={{ fontSize: 13, color: CHERRY, marginBottom: 10 }}>
                    Видалити акаунт <b>{selected.email}</b>? Це незворотно. Якщо він залогіниться через Google знову — створиться новий чистий акаунт.
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button disabled={busy} onClick={deleteUser} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: CHERRY, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Так, видалити</button>
                    <button disabled={busy} onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1.5px solid #EEEEF5', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Скасувати</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}