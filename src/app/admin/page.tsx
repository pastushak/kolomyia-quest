'use client';

import { useEffect, useRef, useState } from 'react';
import { lineColor, lineLabel, ensureLinesRegistered } from '@/lib/utils';
import { Line } from '@/types';
import QRCode from 'qrcode';

// ── Типи ─────────────────────────────────────────────────

interface Stats {
  totalSessions:    number;
  finishedSessions: number;
  totalScans:       number;
  avgXp:            number;
  cherryCount:      number;
  orangeCount:      number;
  greenCount:       number;
  topSpots:         { slug: string; count: number; name?: string }[];
  scansByDay:       { day: string; count: number }[];
  recentSessions:   {
    id:             string;
    nickname:       string;
    line:           string;
    xpTotal:        number;
    completedCount: number;
    startedAt:      string;
    finishedAt:     string | null;
  }[];
}

interface SpotData {
  _id:       string;
  slug:      string;
  name:      string;
  lat?:      number;
  lng?:      number;
  address:   string;
  info:      string;
  audioUrl:  string;
  fullInfo:  string;
  qrHint:    string;
  type:      string;
  lines:     string[];
  transfers: string[];
  quizzes:   any[] | null;
}

interface QuizData {
  line:         string;
  question:     string;
  options:      string[];
  correctIndex: number;
  explanation:  string;
  weight:       number;   // 0 = вимкнено, 1 = звичайна, 2+ = частіше
}

const EMPTY_QUIZ = (line: string): QuizData => ({
  line, question: '', options: ['', '', '', ''], correctIndex: 0, explanation: '', weight: 1,
});

// ── QR компонент ──────────────────────────────────────────

function QRItem({ url, label, sublabel, color }: { url: string; label: string; sublabel?: string; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: 160, margin: 2,
      color: { dark: '#1A1A2E', light: '#ffffff' },
    });
  }, [url]);
  return (
    <div style={{ border: `2px solid ${color}`, borderRadius: 16, padding: 14, textAlign: 'center', width: 200, background: '#fff', breakInside: 'avoid' }}>
      <canvas ref={canvasRef} style={{ borderRadius: 8, display: 'block', margin: '0 auto' }} />
      <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: '#1A1A2E' }}>{label}</div>
      {sublabel && <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{sublabel}</div>}
    </div>
  );
}

// ── Головний компонент ─────────────────────────────────────

type Tab = 'stats' | 'spots' | 'qr' | 'shop';

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('stats');

  // Stats стан
  const [stats, setStats]         = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError]     = useState('');

  // Spots стан
  const [spots, setSpots]         = useState<SpotData[]>([]);
  const [spotsLoading, setSpotsLoading] = useState(true);
  const [editing, setEditing]     = useState<SpotData | null>(null);
  const [isNewSpot, setIsNewSpot] = useState(false);   // true = режим створення (modal та сама)
  const [deleting, setDeleting]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [filter, setFilter]       = useState<string>('all');
  const [search, setSearch]       = useState('');
  const [expandedQuiz, setExpandedQuiz] = useState<number | null>(null);   // індекс розгорнутого питання
  // Shop стан
  const [shopItems, setShopItems]   = useState<any[]>([]);
  const [shopLoading, setShopLoading] = useState(false);
  const [shopEditing, setShopEditing] = useState<any | null>(null);
  const [shopSaving, setShopSaving]   = useState(false);
  const [shopNew, setShopNew]         = useState(false);

  const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => { ensureLinesRegistered(); loadStats(); loadSpots(); loadShop(); }, []);

  // ── Stats ────────────────────────────────────────────────

  async function loadStats() {
    setStatsLoading(true); setStatsError('');
    try {
      const res  = await fetch('/api/admin/stats');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStats(data);
      if (data.topSpots?.length) {
        const names = await Promise.all(
          data.topSpots.map((s: any) =>
            fetch(`/api/spots/${s.slug}`).then(r => r.json())
              .then(spot => ({ slug: s.slug, name: spot.name || s.slug }))
              .catch(() => ({ slug: s.slug, name: s.slug }))
          )
        );
        const nameMap = Object.fromEntries(names.map(n => [n.slug, n.name]));
        setStats(prev => prev ? { ...prev, topSpots: prev.topSpots.map(s => ({ ...s, name: nameMap[s.slug] || s.slug })) } : prev);
      }
    } catch (e: any) { setStatsError(e.message ?? 'Помилка'); }
    setStatsLoading(false);
  }

  // ── Spots ────────────────────────────────────────────────

  async function loadSpots() {
    setSpotsLoading(true);
    const res  = await fetch('/api/admin/spots');
    const data = await res.json();
    setSpots(Array.isArray(data) ? data : []);
    setSpotsLoading(false);
  }

  function openEdit(spot: SpotData) {
    // ЗБЕРІГАЄМО ВСІ питання як є (раніше зрізалося до 1 на лінію — втрата даних).
    // weight нормалізуємо: якщо в старих питань його немає → 1.
    const quizzes: QuizData[] = (spot.quizzes || []).map((q: any) => ({
      line:         q.line,
      question:     q.question ?? '',
      options:      Array.isArray(q.options) && q.options.length ? q.options : ['', '', '', ''],
      correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
      explanation:  q.explanation ?? '',
      weight:       typeof q.weight === 'number' ? q.weight : 1,
    }));
    setEditing({ ...spot, quizzes });
    setIsNewSpot(false);
    setExpandedQuiz(null);
  }

  // ── Хелпери працюють по ІНДЕКСУ питання в масиві (не по лінії) ──
  function updateQuizAt(idx: number, field: keyof QuizData, value: any) {
    if (!editing) return;
    const quizzes = [...(editing.quizzes || [])];
    quizzes[idx] = { ...quizzes[idx], [field]: value };
    setEditing({ ...editing, quizzes });
  }

  function updateOptionAt(idx: number, optIdx: number, value: string) {
    if (!editing) return;
    const quizzes = [...(editing.quizzes || [])];
    const options = [...quizzes[idx].options];
    options[optIdx] = value;
    quizzes[idx] = { ...quizzes[idx], options };
    setEditing({ ...editing, quizzes });
  }

  function addQuizForLine(line: string) {
    if (!editing) return;
    const quizzes = [...(editing.quizzes || []), EMPTY_QUIZ(line)];
    setEditing({ ...editing, quizzes });
    setExpandedQuiz(quizzes.length - 1);   // одразу розгорнути нове
  }

  function deleteQuizAt(idx: number) {
    if (!editing) return;
    const quizzes = (editing.quizzes || []).filter((_, i) => i !== idx);
    setEditing({ ...editing, quizzes });
    setExpandedQuiz(null);
  }

  function isQuizFilled(q: QuizData) { return q.question.trim() && q.options.every(o => o.trim()); }

  async function loadShop() {
    setShopLoading(true);
    const res  = await fetch('/api/admin/shop');
    const data = await res.json();
    setShopItems(Array.isArray(data) ? data : []);
    setShopLoading(false);
  }

  // Порожній спот для форми створення
  function openCreate() {
    setEditing({
      _id: '', slug: '', name: '', address: '', info: '', audioUrl: '',
      fullInfo: '', qrHint: '', type: 'regular', lines: [], transfers: [], quizzes: [],
    });
    setIsNewSpot(true);
    setExpandedQuiz(null);
  }

  async function handleDelete() {
    if (!editing || isNewSpot) return;
    if (!confirm(`Видалити спот "${editing.name}" (${editing.slug})? Дію не можна відмінити.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/spots?slug=${encodeURIComponent(editing.slug)}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    setDeleting(false);
    if (!res.ok) {
      alert(data.error || 'Не вдалося видалити спот');
      return;
    }
    await loadSpots();
    setEditing(null);
    setIsNewSpot(false);
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    // Зберігаємо ВСІ заповнені питання (не по одному на лінію).
    const filledQuizzes = (editing.quizzes || []).filter(isQuizFilled);
    const payload = {
      slug: editing.slug, name: editing.name, lat: editing.lat, lng: editing.lng,
      type: editing.type, lines: editing.lines, transfers: editing.transfers,
      info: editing.info, fullInfo: editing.fullInfo, audioUrl: editing.audioUrl,
      qrHint: editing.qrHint, address: editing.address,
      quizzes: filledQuizzes.length > 0 ? filledQuizzes : null,
    };

    const res = await fetch('/api/admin/spots', {
      method:  isNewSpot ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      alert(data.error || 'Не вдалося зберегти спот');
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    await loadSpots();
    setEditing(null);
    setIsNewSpot(false);
  }

  async function handleLogout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    window.location.href = '/admin/login';
  }

  const filteredSpots = spots.filter(s => {
    const matchLine   = filter === 'all' || s.lines.includes(filter);
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    return matchLine && matchSearch;
  });

  // ── Render ────────────────────────────────────────────────

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'stats', label: 'Статистика', icon: '📊' },
    { key: 'spots', label: 'Локації',    icon: '📍' },
    { key: 'qr',    label: 'QR-коди',    icon: '📱' },
    { key: 'shop',  label: 'Магазин',    icon: '🏪' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5' }}>

      {/* Хедер */}
      <div style={{ background: '#fff', borderBottom: '1px solid #EEEEF5', padding: '0 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#89182c' }}>🏙️ Адмін-панель</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {TABS.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: tab === t.key ? '#89182c' : 'transparent', color: tab === t.key ? '#fff' : '#888', transition: 'all .15s' }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleLogout} style={{ padding: '6px 16px', borderRadius: 20, border: '1.5px solid #EEEEF5', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#888' }}>
            Вийти
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 32px' }}>

        {/* ── ТАБ: СТАТИСТИКА ── */}
        {tab === 'stats' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1A1A2E', margin: 0 }}>Статистика</h1>
                <p style={{ fontSize: 13, color: '#888', margin: '4px 0 0' }}>Використання квест-карти Коломиї</p>
              </div>
              <button onClick={loadStats} style={{ padding: '8px 18px', borderRadius: 12, border: '1.5px solid #EEEEF5', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>↻ Оновити</button>
            </div>

            {statsLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', flexDirection: 'column', gap: 12 }}>
                <div style={{ width: 32, height: 32, border: '3px solid #EEEEF5', borderTopColor: '#89182c', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : statsError ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 13, color: '#DC2626', marginBottom: 12 }}>{statsError}</div>
                <button onClick={loadStats} style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: '#89182c', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Спробувати знову</button>
              </div>
            ) : stats && (
              <>
                {/* Метрики */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
                  {[
                    { label: 'Туристів',        value: stats.totalSessions,    icon: '👥', color: '#2563EB', sub: 'запустили додаток' },
                    { label: 'Завершили квест',  value: stats.finishedSessions, icon: '🏁', color: '#2D7A4F', sub: `${stats.totalSessions > 0 ? Math.round(stats.finishedSessions / stats.totalSessions * 100) : 0}% конверсія` },
                    { label: 'QR-сканувань',     value: stats.totalScans,       icon: '📱', color: '#89182c', sub: 'всього по місту' },
                    { label: 'Середній XP',      value: stats.avgXp,            icon: '⭐', color: '#E8A020', sub: 'на туриста' },
                  ].map(m => (
                    <div key={m.label} style={{ background: '#fff', borderRadius: 16, border: '1px solid #EEEEF5', padding: '18px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: 12, color: '#888' }}>{m.label}</span>
                        <span style={{ fontSize: 18 }}>{m.icon}</span>
                      </div>
                      <div style={{ fontSize: 32, fontWeight: 900, color: m.color, lineHeight: 1, marginBottom: 4 }}>{m.value.toLocaleString()}</div>
                      <div style={{ fontSize: 11, color: '#aaa' }}>{m.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Лінії + графік */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #EEEEF5', padding: '20px 22px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E', marginBottom: 16 }}>Популярність маршрутів</div>
                    {[
                      { line: 'cherry', count: stats.cherryCount },
                      { line: 'orange', count: stats.orangeCount },
                      { line: 'green',  count: stats.greenCount  },
                    ].map(l => {
                      const total = (stats.cherryCount + stats.orangeCount + stats.greenCount) || 1;
                      const pct   = Math.round(l.count / total * 100);
                      const color = lineColor(l.line as Line);
                      return (
                        <div key={l.line} style={{ marginBottom: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color }}>{lineLabel(l.line as Line)}</span>
                            <span style={{ fontSize: 13, fontWeight: 800, color }}>{l.count} <span style={{ fontSize: 11, color: '#aaa', fontWeight: 400 }}>({pct}%)</span></span>
                          </div>
                          <div style={{ height: 8, background: '#f0f0f5', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #EEEEF5', padding: '20px 22px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E', marginBottom: 16 }}>QR-сканування за 7 днів</div>
                    {stats.scansByDay.length === 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 80, color: '#ccc', fontSize: 13 }}>Немає даних</div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
                        {stats.scansByDay.map(d => {
                          const maxBar = Math.max(...stats.scansByDay.map(x => x.count), 1);
                          const h = Math.round(d.count / maxBar * 70) + 4;
                          return (
                            <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#89182c' }}>{d.count}</div>
                              <div style={{ width: '100%', background: '#89182c', borderRadius: '4px 4px 0 0', height: h, opacity: .8 }} />
                              <div style={{ fontSize: 9, color: '#aaa', textAlign: 'center' }}>{d.day}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Топ локацій */}
                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #EEEEF5', padding: '20px 22px', marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E', marginBottom: 16 }}>Топ локацій</div>
                  {stats.topSpots.length === 0 ? (
                    <div style={{ color: '#ccc', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>Ще немає даних</div>
                  ) : stats.topSpots.map((s, i) => {
                    const maxSpot = Math.max(...stats.topSpots.map(x => x.count), 1);
                    const pct     = Math.round(s.count / maxSpot * 100);
                    return (
                      <div key={s.slug} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#FEF7E6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
                          {['🥇','🥈','🥉'][i] ?? i + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>{s.name ?? s.slug}</span>
                            <span style={{ fontSize: 12, color: '#888' }}>{s.count} відвідань</span>
                          </div>
                          <div style={{ height: 6, background: '#f0f0f5', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: '#89182c', borderRadius: 3, opacity: .7 }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Таблиця сесій */}
                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #EEEEF5', overflow: 'hidden' }}>
                  <div style={{ padding: '16px 22px', borderBottom: '1px solid #EEEEF5', fontSize: 13, fontWeight: 700, color: '#1A1A2E' }}>Останні сесії</div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#FAFAFA' }}>
                          {['Турист', 'Маршрут', 'XP', 'Точок', 'Час старту', 'Статус'].map(h => (
                            <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#888', borderBottom: '1px solid #EEEEF5', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentSessions.length === 0 ? (
                          <tr><td colSpan={6} style={{ padding: '24px 0', textAlign: 'center', color: '#ccc' }}>Ще немає сесій</td></tr>
                        ) : stats.recentSessions.map((s, i) => {
                          const color = lineColor(s.line as Line);
                          return (
                            <tr key={s.id} style={{ borderBottom: i < stats.recentSessions.length - 1 ? '1px solid #EEEEF5' : 'none' }}>
                              <td style={{ padding: '11px 16px', fontWeight: 700, color: '#1A1A2E' }}>{s.nickname}</td>
                              <td style={{ padding: '11px 16px' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: color + '20', color }}>
                                  {lineLabel(s.line as Line)}
                                </span>
                              </td>
                              <td style={{ padding: '11px 16px', fontWeight: 800, color: '#E8A020' }}>{s.xpTotal}</td>
                              <td style={{ padding: '11px 16px', color: '#555' }}>{s.completedCount}</td>
                              <td style={{ padding: '11px 16px', color: '#888', whiteSpace: 'nowrap' }}>{new Date(s.startedAt).toLocaleString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                              <td style={{ padding: '11px 16px' }}>
                                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: s.finishedAt ? '#E8F5EE' : '#FEF7E6', color: s.finishedAt ? '#2D7A4F' : '#8B6914' }}>
                                  {s.finishedAt ? '✓ Завершено' : '⏳ В процесі'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ── ТАБ: ЛОКАЦІЇ ── */}
        {tab === 'spots' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1A1A2E', margin: 0 }}>Локації</h1>
                <p style={{ fontSize: 13, color: '#888', margin: '4px 0 0' }}>{spots.length} спотів у базі даних</p>
              </div>
              <button onClick={openCreate} style={{ padding: '10px 18px', borderRadius: 12, border: 'none', background: '#89182c', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                + Новий спот
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <input
                placeholder="Пошук за назвою..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, minWidth: 200, padding: '8px 14px', borderRadius: 10, border: '1.5px solid #EEEEF5', fontSize: 13, outline: 'none' }}
              />
              {(['all', 'cherry', 'orange', 'green'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{ padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: filter === f ? (f === 'all' ? '#1A1A2E' : lineColor(f as Line)) : '#F0F0F5', color: filter === f ? '#fff' : '#555' }}>
                  {f === 'all' ? 'Всі' : lineLabel(f as Line)}
                </button>
              ))}
            </div>

            {spotsLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>Завантаження...</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                {filteredSpots.map(spot => (
                  <div key={spot._id} style={{ background: '#fff', borderRadius: 16, border: '1px solid #EEEEF5', padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E' }}>{spot.name}</div>
                        <div style={{ fontSize: 11, color: '#888', marginTop: 2, fontFamily: 'monospace' }}>{spot.slug}</div>
                      </div>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600, background: spot.quizzes && spot.quizzes.length > 0 ? '#E8F5EE' : '#FEF7E6', color: spot.quizzes && spot.quizzes.length > 0 ? '#2D7A4F' : '#8B6914' }}>
                        {spot.quizzes && spot.quizzes.length > 0 ? '✓ Квіз є' : '⏳ Скоро'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                      {spot.lines.map(l => (
                        <span key={l} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600, background: lineColor(l as Line) + '20', color: lineColor(l as Line) }}>
                          {lineLabel(l as Line)}
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {spot.info || <span style={{ color: '#ccc' }}>Текст не заповнено</span>}
                    </div>
                    <button onClick={() => openEdit(spot)} style={{ width: '100%', padding: 8, borderRadius: 10, border: '1.5px solid #EEEEF5', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#1A1A2E' }}>
                      ✏️ Редагувати
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Модал редагування */}
            {editing && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
                <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1A1A2E', margin: 0 }}>{isNewSpot ? 'Новий спот' : (editing.name || 'Редагування')}</h2>
                    <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>✕</button>
                  </div>

                  {/* ── Базові поля спота ── */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>Slug (ID) {isNewSpot && <span style={{ color: '#DC2626' }}>*</span>}</label>
                      <input value={editing.slug} disabled={!isNewSpot}
                        onChange={e => setEditing({ ...editing, slug: e.target.value.trim().toLowerCase().replace(/\s+/g, '_') })}
                        placeholder="напр. ozero_rufa"
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #EEEEF5', fontSize: 13, outline: 'none', fontFamily: 'monospace', background: isNewSpot ? '#fff' : '#F5F5F8', color: isNewSpot ? '#1A1A2E' : '#999', boxSizing: 'border-box' }} />
                      {!isNewSpot && <span style={{ fontSize: 10, color: '#aaa' }}>slug не можна змінити після створення</span>}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>Назва {isNewSpot && <span style={{ color: '#DC2626' }}>*</span>}</label>
                      <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })}
                        placeholder="Озеро Руфа"
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #EEEEF5', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>Широта (lat) {isNewSpot && <span style={{ color: '#DC2626' }}>*</span>}</label>
                      <input type="number" step="any" value={editing.lat ?? ''} onChange={e => setEditing({ ...editing, lat: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                        placeholder="48.5295"
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #EEEEF5', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>Довгота (lng) {isNewSpot && <span style={{ color: '#DC2626' }}>*</span>}</label>
                      <input type="number" step="any" value={editing.lng ?? ''} onChange={e => setEditing({ ...editing, lng: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                        placeholder="25.0387"
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #EEEEF5', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                  </div>

                  {/* Тип спота */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>Тип</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {(['start', 'regular', 'shared', 'finish'] as const).map(t => (
                        <button key={t} onClick={() => setEditing({ ...editing, type: t })}
                          style={{ padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: editing.type === t ? '#1A1A2E' : '#F0F0F5', color: editing.type === t ? '#fff' : '#555' }}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Лінії та пересадки */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>Лінії (належність)</label>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {(['cherry', 'orange', 'green'] as const).map(l => {
                          const on = editing.lines.includes(l);
                          return (
                            <button key={l} onClick={() => setEditing({ ...editing, lines: on ? editing.lines.filter(x => x !== l) : [...editing.lines, l] })}
                              style={{ padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: on ? lineColor(l) : lineColor(l) + '20', color: on ? '#fff' : lineColor(l) }}>
                              {lineLabel(l)} {on ? '✓' : ''}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>Пересадки на лінії</label>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {(['cherry', 'orange', 'green'] as const).map(l => {
                          const on = editing.transfers.includes(l);
                          return (
                            <button key={l} onClick={() => setEditing({ ...editing, transfers: on ? editing.transfers.filter(x => x !== l) : [...editing.transfers, l] })}
                              style={{ padding: '6px 12px', borderRadius: 20, border: `1.5px ${on ? 'solid' : 'dashed'} ${lineColor(l)}`, cursor: 'pointer', fontSize: 12, fontWeight: 600, background: on ? lineColor(l) + '15' : '#fff', color: lineColor(l) }}>
                              {lineLabel(l)} {on ? '✓' : ''}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {[
                    { label: 'Коротке прев\'ю (7-8 речень)', key: 'info',     rows: 4 },
                    { label: 'Розширена інформація (для /info/[slug])', key: 'fullInfo', rows: 10 },
                    { label: 'Аудіо URL (Dropbox ?raw=1)', key: 'audioUrl', rows: 1 },
                    { label: 'Підказка QR', key: 'qrHint',  rows: 2 },
                  ].map(({ label, key, rows }) => (
                    <div key={key} style={{ marginBottom: 16 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>{label}</label>
                      <textarea rows={rows} value={(editing as any)[key] || ''} onChange={e => setEditing({ ...editing, [key]: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #EEEEF5', fontSize: 13, lineHeight: 1.6, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                    </div>
                  ))}

                  {editing.lines.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E', marginBottom: 12, paddingTop: 16, borderTop: '1px solid #EEEEF5' }}>
                        🎯 Квізи <span style={{ fontWeight: 400, color: '#888' }}>({(editing.quizzes || []).length} питань)</span>
                      </div>

                      {editing.lines.map(line => {
                        // Питання цієї лінії + їхні реальні індекси в загальному масиві
                        const lineQuizzes = (editing.quizzes || [])
                          .map((q, idx) => ({ q, idx }))
                          .filter(({ q }) => q.line === line);

                        return (
                          <div key={line} style={{ marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: lineColor(line as Line), background: lineColor(line as Line) + '18', padding: '3px 10px', borderRadius: 20 }}>
                                {lineLabel(line as Line)} ({lineQuizzes.length})
                              </span>
                            </div>

                            {lineQuizzes.map(({ q, idx }) => {
                              const filled   = isQuizFilled(q);
                              const expanded = expandedQuiz === idx;
                              const disabled = q.weight === 0;
                              return (
                                <div key={idx} style={{ border: '1.5px solid #EEEEF5', borderRadius: 12, marginBottom: 8, overflow: 'hidden', opacity: disabled ? 0.55 : 1 }}>
                                  {/* Згорнутий рядок */}
                                  <div onClick={() => setExpandedQuiz(expanded ? null : idx)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', cursor: 'pointer', background: expanded ? '#faf8f5' : '#fff' }}>
                                    <span style={{ fontSize: 11, color: '#aaa' }}>{expanded ? '▾' : '▸'}</span>
                                    <span style={{ flex: 1, fontSize: 13, color: q.question.trim() ? '#1A1A2E' : '#bbb' }}>
                                      {q.question.trim() || 'Порожнє питання...'}
                                    </span>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: disabled ? '#DC2626' : '#888', background: disabled ? '#FEE2E2' : '#F1F1F6', padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap' }}>
                                      {disabled ? 'вимкн.' : `вага ${q.weight}`}
                                    </span>
                                    <span style={{ fontSize: 12 }}>{filled ? '✓' : '⚠️'}</span>
                                  </div>

                                  {/* Розгорнута форма */}
                                  {expanded && (
                                    <div style={{ padding: 16, borderTop: '1px solid #EEEEF5', background: '#faf8f5' }}>
                                      <div style={{ marginBottom: 12 }}>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>Питання</label>
                                        <textarea rows={2} value={q.question} onChange={e => updateQuizAt(idx, 'question', e.target.value)} placeholder="Введіть питання квізу..."
                                          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #EEEEF5', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', background: '#fff', boxSizing: 'border-box' }} />
                                      </div>
                                      <div style={{ marginBottom: 12 }}>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>Варіанти <span style={{ fontWeight: 400, color: '#888' }}>(клікни кружечок = правильна)</span></label>
                                        {q.options.map((opt: string, i: number) => (
                                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                            <button onClick={() => updateQuizAt(idx, 'correctIndex', i)} style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, cursor: 'pointer', border: 'none', background: q.correctIndex === i ? '#2D7A4F' : '#EEEEF5', color: q.correctIndex === i ? '#fff' : '#888', fontSize: 11, fontWeight: 700 }}>{i + 1}</button>
                                            <input type="text" value={opt} onChange={e => updateOptionAt(idx, i, e.target.value)} placeholder={`Варіант ${i + 1}`}
                                              style={{ flex: 1, padding: '8px 12px', borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit', border: q.correctIndex === i ? '1.5px solid #2D7A4F' : '1.5px solid #EEEEF5', background: q.correctIndex === i ? '#E8F5EE' : '#fff' }} />
                                          </div>
                                        ))}
                                      </div>
                                      <div style={{ marginBottom: 12 }}>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>Пояснення</label>
                                        <textarea rows={2} value={q.explanation} onChange={e => updateQuizAt(idx, 'explanation', e.target.value)} placeholder="Чому ця відповідь правильна?"
                                          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #EEEEF5', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', background: '#fff', boxSizing: 'border-box' }} />
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
                                        <div>
                                          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>Вага показу</label>
                                          <input type="number" min={0} value={q.weight} onChange={e => updateQuizAt(idx, 'weight', Math.max(0, parseInt(e.target.value) || 0))}
                                            style={{ width: 90, padding: '8px 12px', borderRadius: 10, border: '1.5px solid #EEEEF5', fontSize: 13, outline: 'none', background: '#fff' }} />
                                        </div>
                                        <span style={{ fontSize: 11, color: '#888', flex: 1, lineHeight: 1.4 }}>0 — не показувати, 1 — звичайна, 2+ — частіше</span>
                                        <button onClick={() => deleteQuizAt(idx)} style={{ padding: '8px 14px', borderRadius: 10, border: '1.5px solid #FECACA', background: '#fff', color: '#DC2626', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🗑 Видалити</button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            <button onClick={() => addQuizForLine(line)} style={{ padding: '8px 14px', borderRadius: 10, border: `1.5px dashed ${lineColor(line as Line)}`, background: '#fff', color: lineColor(line as Line), fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 4 }}>
                              + Додати питання ({lineLabel(line as Line)})
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                    <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: saved ? '#2D7A4F' : '#89182c', color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'wait' : 'pointer' }}>
                      {saving ? 'Зберігаємо...' : saved ? '✓ Збережено!' : (isNewSpot ? 'Створити спот' : 'Зберегти')}
                    </button>
                    <button onClick={() => { setEditing(null); setIsNewSpot(false); }} style={{ padding: '12px 20px', borderRadius: 12, border: '1.5px solid #EEEEF5', background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#555' }}>Скасувати</button>
                  </div>

                  {!isNewSpot && (
                    <button onClick={handleDelete} disabled={deleting} style={{ width: '100%', marginTop: 10, padding: 11, borderRadius: 12, border: '1.5px solid #FECACA', background: '#fff', color: '#DC2626', fontSize: 13, fontWeight: 600, cursor: deleting ? 'wait' : 'pointer' }}>
                      {deleting ? 'Видаляємо...' : '🗑 Видалити спот'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── ТАБ: QR ── */}
        {tab === 'qr' && (
          <>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1A1A2E', margin: '0 0 4px' }}>QR-коди для друку</h1>
              <p style={{ fontSize: 13, color: '#888', margin: 0 }}>
                Відкрий у браузері і надрукуй — <kbd style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>Ctrl+P</kbd>
              </p>
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, color: '#555', marginBottom: 14 }}>Стартові QR — розмістити на початкових точках</div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 36, flexWrap: 'wrap' }}>
              {[
                { url: `${BASE_URL}/start/cherry`, label: 'Залізничний вокзал', color: '#89182c' },
                { url: `${BASE_URL}/start/orange`, label: 'Автовокзал',          color: '#e28f27' },
                { url: `${BASE_URL}/start/green`,  label: 'Площа Скорботи',      color: '#8a9c39' },
              ].map(item => <QRItem key={item.url} {...item} />)}
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, color: '#555', marginBottom: 14 }}>Локації — розмістити на об'єктах (детальна інформація)</div>
            {spotsLoading ? (
              <div style={{ color: '#888', fontSize: 14 }}>Завантаження...</div>
            ) : (
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {spots.map(spot => {
                  const color = spot.type === 'finish' ? '#7F77DD' : lineColor(spot.lines[0] as Line);
                  return <QRItem key={spot.slug} url={`${BASE_URL}/info/${spot.slug}`} label={spot.name} sublabel={spot.address} color={color} />;
                })}
              </div>
            )}

            <style>{`@media print { body { margin: 0; } }`}</style>
          </>
        )}

        {/* ── ТАБ: МАГАЗИН ── */}
        {tab === 'shop' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1A1A2E', margin: 0 }}>Магазин привілеїв</h1>
                <p style={{ fontSize: 13, color: '#888', margin: '4px 0 0' }}>{shopItems.length} позицій</p>
              </div>
              <button onClick={() => { setShopNew(true); setShopEditing({ name: '', category: 'cafe', description: '', address: '', phone: '', hours: '', website: '', emoji: '🏪', type: 'info', discountText: '', xpCost: 0, isActive: true }); }} style={{ padding: '9px 20px', borderRadius: 12, border: 'none', background: '#89182c', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                + Додати партнера
              </button>
            </div>

            {shopLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>Завантаження...</div>
            ) : shopItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🏪</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 6 }}>Магазин порожній</div>
                <div style={{ fontSize: 13, color: '#888' }}>Додайте першого партнера</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                {shopItems.map(item => (
                  <div key={item._id} style={{ background: '#fff', borderRadius: 16, border: '1px solid #EEEEF5', padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                      <div style={{ fontSize: 28, flexShrink: 0 }}>{item.emoji}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E' }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{item.address}</div>
                      </div>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600, background: item.isActive ? '#E8F5EE' : '#FEF7E6', color: item.isActive ? '#2D7A4F' : '#8B6914' }}>
                        {item.isActive ? '● Активний' : '○ Вимкнено'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600, background: '#f0f0f5', color: '#555' }}>{item.category}</span>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600, background: item.type === 'info' ? '#e8f0ff' : '#f5e0e3', color: item.type === 'info' ? '#2563EB' : '#89182c' }}>
                        {item.type === 'info' ? 'Інфо' : item.type === 'discount' ? `Знижка · ${item.xpCost} XP` : `Безкоштовно · ${item.xpCost} XP`}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {item.description}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => { setShopNew(false); setShopEditing({ ...item }); }} style={{ flex: 1, padding: 8, borderRadius: 10, border: '1.5px solid #EEEEF5', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        ✏️ Редагувати
                      </button>
                      <button onClick={async () => { if (!confirm('Видалити?')) return; await fetch('/api/admin/shop', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item._id }) }); loadShop(); }} style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid #fee', background: '#fff', fontSize: 13, cursor: 'pointer', color: '#DC2626' }}>
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Модал редагування/створення */}
            {shopEditing && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
                <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1A1A2E', margin: 0 }}>{shopNew ? 'Новий партнер' : 'Редагувати'}</h2>
                    <button onClick={() => setShopEditing(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>✕</button>
                  </div>

                  {[
                    { label: 'Назва закладу', key: 'name',        type: 'text' },
                    { label: 'Адреса',         key: 'address',     type: 'text' },
                    { label: 'Телефон',        key: 'phone',       type: 'text' },
                    { label: 'Години роботи',  key: 'hours',       type: 'text' },
                    { label: 'Вебсайт',        key: 'website',     type: 'text' },
                    { label: 'Emoji',           key: 'emoji',       type: 'text' },
                  ].map(({ label, key, type }) => (
                    <div key={key} style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>{label}</label>
                      <input type={type} value={shopEditing[key] || ''} onChange={e => setShopEditing({ ...shopEditing, [key]: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #EEEEF5', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                  ))}

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>Опис</label>
                    <textarea rows={3} value={shopEditing.description || ''} onChange={e => setShopEditing({ ...shopEditing, description: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #EEEEF5', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>Категорія</label>
                      <select value={shopEditing.category} onChange={e => setShopEditing({ ...shopEditing, category: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #EEEEF5', fontSize: 13, outline: 'none', background: '#fff' }}>
                        <option value="cafe">☕ Кафе</option>
                        <option value="restaurant">🍽️ Ресторан</option>
                        <option value="hotel">🏨 Готель</option>
                        <option value="hostel">🛏️ Хостел</option>
                        <option value="shop">🛍️ Магазин</option>
                        <option value="mall">🏬 ТРЦ</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>Тип картки</label>
                      <select value={shopEditing.type} onChange={e => setShopEditing({ ...shopEditing, type: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #EEEEF5', fontSize: 13, outline: 'none', background: '#fff' }}>
                        <option value="info">Інфо (безкоштовно)</option>
                        <option value="discount">Знижка (за XP)</option>
                        <option value="freebie">Безкоштовний item (за XP)</option>
                      </select>
                    </div>
                  </div>

                  {shopEditing.type !== 'info' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>Текст знижки</label>
                        <input type="text" value={shopEditing.discountText || ''} onChange={e => setShopEditing({ ...shopEditing, discountText: e.target.value })} placeholder="-15% на каву"
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #EEEEF5', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>Вартість XP</label>
                        <input type="number" value={shopEditing.xpCost || 0} onChange={e => setShopEditing({ ...shopEditing, xpCost: parseInt(e.target.value) || 0 })}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #EEEEF5', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                    </div>
                  )}

                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#555' }}>
                      <input type="checkbox" checked={shopEditing.isActive} onChange={e => setShopEditing({ ...shopEditing, isActive: e.target.checked })} />
                      Активна позиція (показувати в магазині)
                    </label>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      disabled={shopSaving}
                      onClick={async () => {
                        setShopSaving(true);
                        if (shopNew) {
                          await fetch('/api/admin/shop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(shopEditing) });
                        } else {
                          await fetch('/api/admin/shop', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: shopEditing._id, ...shopEditing }) });
                        }
                        setShopSaving(false);
                        setShopEditing(null);
                        loadShop();
                      }}
                      style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: '#89182c', color: '#fff', fontSize: 14, fontWeight: 700, cursor: shopSaving ? 'wait' : 'pointer' }}
                    >
                      {shopSaving ? 'Зберігаємо...' : shopNew ? 'Додати партнера' : 'Зберегти зміни'}
                    </button>
                    <button onClick={() => setShopEditing(null)} style={{ padding: '12px 20px', borderRadius: 12, border: '1.5px solid #EEEEF5', background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#555' }}>
                      Скасувати
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}