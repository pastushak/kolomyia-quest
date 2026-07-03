'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Session } from '@/types';
import { fetchLine, lineColor, lineLabel } from '@/lib/utils';
import HudzykMascot from '@/components/quest/HudzykMascot';
import { getSession, clearSession, finishSession } from '@/lib/session';

const FINISH_VIDEO_URL = 'https://www.dropbox.com/scl/fi/c8sf988efo3af425c7ota/video_finish.mp4?rlkey=i56zp7qtcjdnce7nslg3ttslz&st=4130feym&raw=1';

type Phase = 'video' | 'results';

export default function FinishPage() {
  const router = useRouter();
  const [session, setSession]   = useState<Session | null>(null);
  const [visible, setVisible]   = useState(false);
  const [mounted, setMounted]   = useState(false);
  const [lineSpots, setLineSpots] = useState<{ slug: string; name: string }[]>([]);
  const [phase, setPhase]       = useState<Phase>('video');
  const [routeName, setRouteName] = useState('');   // введена туристом назва комбінованого маршруту
  const [savedName, setSavedName] = useState('');   // фінальна назва (після збереження)
  const [needsNaming, setNeedsNaming] = useState(false);   // показувати модалку іменування
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    setMounted(true);
    const s = getSession();
    if (!s) { router.push('/'); return; }
    setSession(s);

    const isCombinedRun = (s.transferCount ?? 0) > 0 && (s.branches?.length ?? 0) > 1;
    const isLoggedIn    = !!s.userId;

    const sid = localStorage.getItem('kq_sid');
    const finishedKey = sid ? `kq_finished_${sid}` : null;
    const alreadyFinished = finishedKey ? !!localStorage.getItem(finishedKey) : false;

    if (!alreadyFinished) {
      if (isCombinedRun && isLoggedIn) {
        // Комбінований + залогінений → відкладаємо фініш до вводу назви (модалка).
        setNeedsNaming(true);
      } else {
        // Чистий прохід або анонім → фінішимо одразу.
        finishSession();
        if (finishedKey) localStorage.setItem(finishedKey, '1');
      }
    } else {
      // Вже фінішовано раніше — показуємо збережену назву, якщо була.
      setSavedName('');
    }

    fetchLine(s.line).then(data => setLineSpots(data.spots));
  }, []);

  // Збереження назви маршруту → фініш із назвою.
  async function handleSaveName() {
    setSaving(true);
    await finishSession(routeName);
    const sid = localStorage.getItem('kq_sid');
    if (sid) localStorage.setItem(`kq_finished_${sid}`, '1');
    setSavedName(routeName.trim());
    setNeedsNaming(false);
    setSaving(false);
  }

  function goToResults() {
    setPhase('results');
    setTimeout(() => setVisible(true), 100);
  }

  if (!mounted || !session) return null;

  const line      = session.line;
  const color     = lineColor(line);
  const label     = lineLabel(line);
  const xp        = session.xp;

  // ── Чесний підрахунок точок (Концепція А) ──
  const branches      = session.branches ?? [];
  const isCombined    = (session.transferCount ?? 0) > 0 && branches.length > 1;

  // Унікальні пройдені точки (для комбінованого — по всіх гілках, без подвійного рахунку спільних точок).
  const uniqueDone = new Set<string>();
  if (isCombined) {
    branches.forEach(b => b.completedSlugs.forEach(s => uniqueDone.add(s)));
  } else {
    // Чистий прохід: рахуємо точки саме цієї лінії
    session.completedSlugs
      .filter(s => lineSpots.some(ls => ls.slug === s))
      .forEach(s => uniqueDone.add(s));
  }
  const completed = uniqueDone.size;
  const total     = lineSpots.length;   // знаменник лише для чистого проходу

  const startedAt  = new Date(session.startedAt);
  const finishedAt = new Date();
  const minutes    = Math.round((finishedAt.getTime() - startedAt.getTime()) / 60000);

  function handleRestart() {
    clearSession();
    router.push('/');
  }

  // ── ФАЗА 1: Відео з Ниточкою ─────────────────────────────
  if (phase === 'video') {
    return (
      <main style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #89182c 0%, #3d0a12 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          {/* Ґудзик з повідомленням */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <HudzykMascot mood="celebrate" message="Ниточка знайдена! 🐱" size={120} />
          </div>

          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
              Місія виконана
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: 8 }}>
              Ниточка врятована! 🐱
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
              Дякуємо, <strong style={{ color: '#f5c04a' }}>{session.nickname}</strong>!<br />
              Завдяки тобі Ґудзик знову разом зі своєю подругою.
            </div>
          </div>

          {/* Відео */}
          <div style={{ borderRadius: 24, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.15)', background: '#000', marginBottom: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            <video
              src={FINISH_VIDEO_URL}
              autoPlay
              playsInline
              controls
              onEnded={goToResults}
              style={{ width: '100%', display: 'block', maxHeight: '45vh', objectFit: 'cover' }}
            />
          </div>

          <button
            onClick={goToResults}
            style={{ width: '100%', padding: '14px', borderRadius: 16, border: '1.5px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Переглянути результати →
          </button>

        </div>
      </main>
    );
  }

  // ── ФАЗА 2: Результати ────────────────────────────────────
  return (
    <main style={{ minHeight: '100vh', background: '#F7F7FC', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 16px' }}>

      {/* Модалка іменування комбінованого маршруту */}
      {needsNaming && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,26,46,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 28, width: '100%', maxWidth: 400, textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>🗺️</div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1A1A2E', margin: '0 0 8px' }}>Назви свій маршрут!</h2>
            <p style={{ fontSize: 14, color: '#8888A8', margin: '0 0 20px', lineHeight: 1.5 }}>
              Ти пройшов унікальний комбінований маршрут через {session.branches?.length ?? 0} лінії. Дай йому назву — або лишень порожнім для автоназви.
            </p>
            <input
              value={routeName}
              onChange={e => setRouteName(e.target.value.slice(0, 40))}
              placeholder="напр. Стежками старого міста"
              autoFocus
              style={{ width: '100%', padding: '13px 16px', borderRadius: 14, border: '1.5px solid #EEEEF5', fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 8, textAlign: 'center' }}
            />
            <div style={{ fontSize: 11, color: '#AAAAB8', marginBottom: 20 }}>{routeName.length}/40 · пропустиш — буде «Маршрут #00N»</div>
            <button
              onClick={handleSaveName}
              disabled={saving}
              style={{ width: '100%', padding: 15, borderRadius: 14, border: 'none', background: color, color: '#fff', fontSize: 16, fontWeight: 700, cursor: saving ? 'wait' : 'pointer' }}
            >
              {saving ? 'Зберігаємо…' : 'Зберегти маршрут →'}
            </button>
          </div>
        </div>
      )}

      <div style={{
        width: '100%', maxWidth: 420,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.5s ease',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>

        {/* Маскот */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <HudzykMascot mood="celebrate" message="Вітаю! Ти зробив це!" size={160} />
        </div>

        {/* Головна картка */}
        <div style={{ background: '#fff', borderRadius: 24, border: '1px solid #EEEEF5', padding: '28px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            {isCombined ? (savedName ? `«${savedName}» — пройдено!` : 'Комбінований маршрут — пройдено!') : `${label} — пройдено!`}
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1A1A2E', margin: '0 0 6px', lineHeight: 1.2 }}>
            Ти дослідив<br />Коломию!
          </h1>
          <p style={{ fontSize: 14, color: '#8888A8', margin: '0 0 24px' }}>
            {session.nickname}, ти справжній мандрівник
          </p>

          {/* Статистика */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              { value: `${xp}`, label: 'XP зароблено' },
              { value: isCombined ? `${completed}` : `${completed}/${total}`, label: 'Точок пройдено' },
              { value: minutes > 0 ? `${minutes}хв` : '<1хв', label: 'Час маршруту' },
            ].map(stat => (
              <div key={stat.label} style={{ background: '#F7F7FC', borderRadius: 14, padding: '14px 8px' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#1A1A2E', marginBottom: 3 }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: '#8888A8', lineHeight: 1.3 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Бейдж */}
        <div style={{ background: '#fff', borderRadius: 20, border: `2px solid ${color}`, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
            🏅
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#1A1A2E', marginBottom: 3 }}>Дослідник Коломиї</div>
            <div style={{ fontSize: 12, color: '#8888A8', lineHeight: 1.4 }}>Цифровий бейдж · {isCombined ? 'Комбінований маршрут' : label}</div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 22, color }}>✓</div>
        </div>

        {/* Комбінований маршрут — підсумок по гілках */}
        {isCombined ? (
          <>
            {!session.userId && (
              <div style={{ background: 'linear-gradient(135deg, #89182c, #5a0f1d)', borderRadius: 20, padding: '18px 20px', color: '#fff' }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>🔒 Збережи свій маршрут</div>
                <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.5, marginBottom: 12 }}>
                  Увійди, щоб дати назву цьому унікальному маршруту, зберегти його в профілі та отримати цифровий бейдж.
                </div>
                <button onClick={() => router.push('/')} style={{ padding: '9px 18px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Увійти →
                </button>
              </div>
            )}
            <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #EEEEF5', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #EEEEF5', fontSize: 13, fontWeight: 700, color: '#8888A8' }}>
              Комбінований маршрут · {branches.length} {branches.length === 2 ? 'лінії' : 'ліній'}
            </div>
            {branches.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', borderBottom: i < branches.length - 1 ? '1px solid #EEEEF5' : 'none' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', flexShrink: 0, background: lineColor(b.line) }} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#1A1A2E' }}>{lineLabel(b.line)}</span>
                <span style={{ fontSize: 13, color: '#8888A8' }}>{b.completedSlugs.length} точок</span>
              </div>
            ))}
            </div>
          </>
        ) : (
          /* Чистий прохід — детальний список локацій */
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #EEEEF5', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #EEEEF5', fontSize: 13, fontWeight: 700, color: '#8888A8' }}>
              Маршрут пройдено
            </div>
            {lineSpots.map((loc, i) => {
              const done = session.completedSlugs.includes(loc.slug);
              return (
                <div key={loc.slug} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', borderBottom: i < lineSpots.length - 1 ? '1px solid #EEEEF5' : 'none' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: done ? '#fff' : '#8888A8', background: done ? color : '#EEEEF5' }}>
                    {done ? '✓' : i + 1}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: done ? 600 : 400, color: done ? '#1A1A2E' : '#8888A8' }}>
                    {loc.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Магазин привілеїв */}
        <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #2d1f4e)', borderRadius: 20, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }} onClick={() => router.push('/shop')}>
          <div style={{ fontSize: 32 }}>🏪</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 3 }}>Привілеї мандрівника</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Витрать {xp} XP на знижки в закладах міста</div>
          </div>
          <div style={{ fontSize: 18, color: '#f5c04a' }}>→</div>
        </div>

        {/* Кнопки */}
        <button onClick={handleRestart} style={{ width: '100%', padding: 16, borderRadius: 16, border: 'none', background: color, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
          Пройти ще раз →
        </button>

        <button onClick={() => { clearSession(); router.push('/'); }} style={{ width: '100%', padding: 14, borderRadius: 16, border: '1.5px solid #EEEEF5', background: '#fff', color: '#8888A8', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Спробувати іншу лінію
        </button>

        <a href="/about/hudzyk" style={{ display: 'block', width: '100%', padding: 14, borderRadius: 16, border: '1.5px solid #f5e0e3', background: '#fff', color: '#89182c', fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'center', textDecoration: 'none' }}>
          🐾 Дізнатись про кота Ґудзика
        </a>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#8888A8', margin: 0 }}>
          Коломия єднає · kolomyia-quest
        </p>

      </div>
    </main>
  );
}