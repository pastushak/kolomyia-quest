'use client';

import { useEffect, useState } from 'react';

interface Stats {
  totalSessions: number;
  finishedSessions: number;
  totalScans: number;
  avgXp: number;
  cherryCount: number;
  orangeCount: number;
  greenCount:  number;
  topSpots: { slug: string; count: number; name?: string }[];
  scansByDay: { day: string; count: number }[];
  recentSessions: {
    id: string;
    nickname: string;
    line: string;
    xpTotal: number;
    completedCount: number;
    startedAt: string;
    finishedAt: string | null;
  }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/admin/stats');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStats(data);
      // Завантажуємо назви спотів для топ локацій
      if (data.topSpots?.length) {
        const names = await Promise.all(
          data.topSpots.map((s: any) =>
            fetch(`/api/spots/${s.slug}`)
              .then(r => r.json())
              .then(spot => ({ slug: s.slug, name: spot.name || s.slug }))
              .catch(() => ({ slug: s.slug, name: s.slug }))
          )
        );
        const nameMap = Object.fromEntries(names.map(n => [n.slug, n.name]));
        setStats(prev => prev ? {
          ...prev,
          topSpots: prev.topSpots.map(s => ({ ...s, name: nameMap[s.slug] || s.slug }))
        } : prev);
      }
    } catch (e: any) {
      setError(e.message ?? 'Помилка завантаження');
    }
    setLoading(false);
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 36, height: 36, border: '3px solid #EEEEF5', borderTopColor: '#8B1A2F', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ fontSize: 14, color: '#888' }}>Завантаження статистики...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 32 }}>⚠️</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E' }}>Помилка підключення</div>
      <div style={{ fontSize: 13, color: '#888', fontFamily: 'monospace', background: '#F7F7FC', padding: '8px 16px', borderRadius: 8 }}>{error}</div>
      <button onClick={loadStats} style={{ marginTop: 8, padding: '10px 24px', borderRadius: 12, border: 'none', background: '#8B1A2F', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
        Спробувати знову
      </button>
    </div>
  );

  if (!stats) return null;

  const finishRate  = stats.totalSessions > 0 ? Math.round((stats.finishedSessions / stats.totalSessions) * 100) : 0;
  const maxBar      = Math.max(...stats.scansByDay.map(d => d.count), 1);
  const maxSpot     = Math.max(...stats.topSpots.map(s => s.count), 1);
  const totalLines = (stats.cherryCount + stats.orangeCount + stats.greenCount) || 1;

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>

      {/* Заголовок */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1A1A2E', margin: 0 }}>Дашборд</h1>
          <p style={{ fontSize: 13, color: '#888', margin: '4px 0 0' }}>
            Статистика використання квест-карти Коломиї
          </p>
        </div>
        <button
          onClick={loadStats}
          style={{ padding: '9px 20px', borderRadius: 12, border: '1.5px solid #EEEEF5', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#1A1A2E' }}
        >
          ↻ Оновити
        </button>
      </div>

      {/* Головні метрики */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Всього туристів',   value: stats.totalSessions,    color: '#2563EB', icon: '👥', sub: 'запустили додаток' },
          { label: 'Завершили квест',   value: stats.finishedSessions, color: '#2D7A4F', icon: '🏁', sub: `${finishRate}% конверсія` },
          { label: 'QR-сканувань',      value: stats.totalScans,       color: '#8B1A2F', icon: '📱', sub: 'всього по місту' },
          { label: 'Середній XP',       value: stats.avgXp,            color: '#E8A020', icon: '⭐', sub: 'на туриста' },
        ].map(m => (
          <div key={m.label} style={{ background: '#fff', borderRadius: 18, border: '1px solid #EEEEF5', padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: '#888', fontWeight: 500 }}>{m.label}</span>
              <span style={{ fontSize: 20 }}>{m.icon}</span>
            </div>
            <div style={{ fontSize: 36, fontWeight: 900, color: m.color, lineHeight: 1, marginBottom: 5 }}>
              {m.value.toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: '#aaa' }}>{m.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Вибір лінії */}
        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #EEEEF5', padding: '22px 24px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E', marginBottom: 18 }}>
            Популярність маршрутів
          </div>
          {[
            { line: 'cherry', label: 'Вишнева лінія', sub: 'від залізн. вокзалу', count: stats.cherryCount, color: '#89182c', bg: '#f5e0e3' },
            { line: 'orange', label: 'Оранжева лінія', sub: 'від автовокзалу',     count: stats.orangeCount, color: '#e28f27', bg: '#fdf0d9' },
            { line: 'green',  label: 'Зелена лінія',  sub: 'від пл. Скорботи',    count: stats.greenCount,  color: '#8a9c39', bg: '#eef1d8' },
          ].map(l => {
            const pct = Math.round((l.count / totalLines) * 100);
            return (
              <div key={l.line} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: l.color }}>{l.label}</div>
                    <div style={{ fontSize: 11, color: '#aaa' }}>{l.sub}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: l.color }}>{l.count}</div>
                    <div style={{ fontSize: 11, color: '#aaa' }}>{pct}%</div>
                  </div>
                </div>
                <div style={{ height: 10, background: '#F3F4F6', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: l.color, borderRadius: 5, transition: 'width .6s ease' }} />
                </div>
              </div>
            );
          })}

          {/* Конверсія */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #EEEEF5' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: '#888' }}>Конверсія до фінішу</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#2D7A4F' }}>{finishRate}%</span>
            </div>
            <div style={{ height: 8, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${finishRate}%`, background: '#2D7A4F', borderRadius: 4, transition: 'width .6s ease' }} />
            </div>
          </div>
        </div>

        {/* Графік по днях */}
        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #EEEEF5', padding: '22px 24px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E', marginBottom: 18 }}>
            QR-сканування за 7 днів
          </div>
          {stats.scansByDay.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100, color: '#ccc', fontSize: 13 }}>
              Немає даних за цей період
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 110, paddingBottom: 20, position: 'relative' }}>
              {stats.scansByDay.map(d => {
                const h = Math.round((d.count / maxBar) * 80) + 4;
                return (
                  <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#8B1A2F' }}>{d.count}</div>
                    <div style={{ width: '100%', background: '#8B1A2F', borderRadius: '4px 4px 0 0', height: `${h}px`, transition: 'height .4s ease', opacity: .85 }} />
                    <div style={{ fontSize: 9, color: '#aaa', textAlign: 'center', lineHeight: 1.2, whiteSpace: 'nowrap' }}>{d.day}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Топ локацій */}
      <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #EEEEF5', padding: '22px 24px', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E', marginBottom: 18 }}>
          Топ локацій за відвідуваністю
        </div>
        {stats.topSpots.length === 0 ? (
          <div style={{ color: '#ccc', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
            Ще немає даних — пройди квест щоб побачити статистику
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {stats.topSpots.map((s, i) => {
              const pct = Math.round((s.count / maxSpot) * 100);
              const medal = ['🥇','🥈','🥉'][i] ?? '';
              return (
                <div key={s.slug} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: i < 3 ? '#FEF7E6' : '#F7F7FC', border: `1px solid ${i < 3 ? '#E8A020' : '#EEEEF5'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                    {medal || (i + 1)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E' }}>{s.name ?? s.slug}</span>
                      <span style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>{s.count} відвідань</span>
                    </div>
                    <div style={{ height: 7, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: i === 0 ? '#E8A020' : i === 1 ? '#8888A8' : i === 2 ? '#c8880a' : '#8B1A2F', borderRadius: 4, opacity: .8 }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Таблиця сесій */}
      <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #EEEEF5', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #EEEEF5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E' }}>Останні сесії туристів</div>
          <div style={{ fontSize: 12, color: '#aaa' }}>Останні 20 записів</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#FAFAFA' }}>
                {['Турист', 'Маршрут', 'XP', 'Точок', 'Час старту', 'Статус'].map(h => (
                  <th key={h} style={{ padding: '11px 18px', textAlign: 'left', fontWeight: 600, color: '#888', borderBottom: '1px solid #EEEEF5', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.recentSessions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px 0', textAlign: 'center', color: '#ccc', fontSize: 14 }}>
                    Ще немає сесій — пройди квест щоб побачити дані тут
                  </td>
                </tr>
              ) : stats.recentSessions.map((s, i) => (
                <tr key={s.id} style={{ borderBottom: i < stats.recentSessions.length - 1 ? '1px solid #EEEEF5' : 'none', transition: 'background .1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#FAFAFA')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '13px 18px', fontWeight: 700, color: '#1A1A2E' }}>
                    {s.nickname}
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: s.line === 'blue' ? '#EFF6FF' : '#FEF2F2', color: s.line === 'blue' ? '#2563EB' : '#DC2626' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                      {s.line === 'blue' ? 'Синя' : 'Червона'}
                    </span>
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    <span style={{ fontWeight: 800, color: '#E8A020', fontSize: 14 }}>{s.xpTotal}</span>
                    <span style={{ fontSize: 11, color: '#aaa', marginLeft: 2 }}>xp</span>
                  </td>
                  <td style={{ padding: '13px 18px', color: '#555' }}>
                    {s.completedCount} / {s.line === 'blue' ? 6 : 5}
                  </td>
                  <td style={{ padding: '13px 18px', color: '#888', whiteSpace: 'nowrap' }}>
                    {new Date(s.startedAt).toLocaleString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20, background: s.finishedAt ? '#E8F5EE' : '#FEF7E6', color: s.finishedAt ? '#2D7A4F' : '#8B6914' }}>
                      {s.finishedAt ? '✓ Завершено' : '⏳ В процесі'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}