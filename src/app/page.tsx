'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Line, QuestLine } from '@/types';
import { createSession } from '@/lib/session';
import { LINE_EMOJI } from '@/lib/utils';
import HudzykMascot from '@/components/quest/HudzykMascot';

const VIDEO_URL = 'https://www.dropbox.com/scl/fi/df7n93rhvm1wm8q7plw8m/cat_kolomyia.mp4?rlkey=tjk0b4b4suj5ohnd62tksa363&st=jym6vnqe&raw=1';

type Phase = 'splash' | 'greeting' | 'video' | 'form';

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [phase, setPhase]           = useState<Phase>('splash');
  const [splashOut, setSplashOut]   = useState(false);
  const [selectedLine, setSelectedLine] = useState<Line | null>(null);
  const [lines, setLines]           = useState<QuestLine[]>([]);
  const [linesLoading, setLinesLoading] = useState(true);
  const [nickname, setNickname]     = useState('');
  const [error, setError]           = useState('');

  // Заставка — 1.5с потім fade out
  useEffect(() => {
    const t1 = setTimeout(() => setSplashOut(true), 1500);
    const t2 = setTimeout(() => setPhase('greeting'), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Завантажуємо лінії одразу
  useEffect(() => {
    fetch('/api/lines')
      .then(r => r.json())
      .then(data => { setLines(data); setLinesLoading(false); })
      .catch(() => setLinesLoading(false));
  }, []);

  // Ім'я з Google
  useEffect(() => {
    if (session?.user?.name && !nickname) {
      setNickname(session.user.name.split(' ')[0]);
    }
  }, [session]);

  async function handleStart() {
    if (!nickname.trim()) { setError('Введи своє ім\'я'); return; }
    if (!selectedLine)    { setError('Обери маршрут'); return; }
    await createSession(nickname.trim(), selectedLine, 'adults', session?.user?.id);
    router.push(`/start/${selectedLine}`);
  }

  const cfg = lines.find(l => l.key === selectedLine);
  const isLoggedIn = status === 'authenticated';

  // ── ФАЗА 1: Заставка ─────────────────────────────────────
  if (phase === 'splash') {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: 'linear-gradient(160deg, #89182c 0%, #3d0a12 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        opacity: splashOut ? 0 : 1,
        transition: 'opacity 0.5s ease',
        zIndex: 1000,
      }}>
        {/* Анімовані кола */}
        <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 32 }}>
          {['#89182c', '#e28f27', '#8a9c39'].map((c, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: 20, height: 20, borderRadius: '50%', background: c,
              animation: `orbit${i} 1.2s ease-in-out infinite`,
              top: '50%', left: '50%',
              transform: `translate(-50%, -50%) rotate(${i * 120}deg) translateX(40px)`,
            }} />
          ))}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 40,
            animation: 'pulse 1.2s ease-in-out infinite',
          }}>🐾</div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: 1, marginBottom: 6 }}>
          Коломия-Квест
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', letterSpacing: 3, textTransform: 'uppercase' }}>
          Завантаження
        </div>
        <style>{`
          @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
          @keyframes orbit0 { 0%,100%{transform:translate(-50%,-50%) rotate(0deg) translateX(40px)} 50%{transform:translate(-50%,-50%) rotate(180deg) translateX(40px)} }
          @keyframes orbit1 { 0%,100%{transform:translate(-50%,-50%) rotate(120deg) translateX(40px)} 50%{transform:translate(-50%,-50%) rotate(300deg) translateX(40px)} }
          @keyframes orbit2 { 0%,100%{transform:translate(-50%,-50%) rotate(240deg) translateX(40px)} 50%{transform:translate(-50%,-50%) rotate(420deg) translateX(40px)} }
        `}</style>
      </div>
    );
  }

  // ── ФАЗА 2: Привітання Ґудзика ────────────────────────────
  if (phase === 'greeting') {
    return (
      <main style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #89182c 0%, #3d0a12 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
        animation: 'fadeIn 0.5s ease',
      }}>
        <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }`}</style>

        <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
          <HudzykMascot
            mood="happy"
            message="Вітаю в Коломиї!"
            size={160}
            showMessage={true}
          />

          <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 24, padding: '24px 20px', marginTop: 16, marginBottom: 28, backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 12, lineHeight: 1.3 }}>
              Є справа! Потрібна<br />твоя допомога 🐱
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.7 }}>
              Моя подруга <strong style={{ color: '#f5c04a' }}>Ниточка</strong> загубилась десь у місті. Щоб знайти її — потрібно пройти маршрут Коломиєю і відповісти на всі запитання.
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 10 }}>
              Але спочатку — подивись відео ↓
            </div>
          </div>

          <button
            onClick={() => setPhase('video')}
            style={{
              width: '100%', padding: '16px', borderRadius: 16, border: 'none',
              background: '#fff', color: '#89182c', fontSize: 16, fontWeight: 800,
              cursor: 'pointer', marginBottom: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}
          >
            ▶ Дивитись відео
          </button>

          <button
            onClick={() => setPhase('form')}
            style={{
              width: '100%', padding: '12px', borderRadius: 16,
              border: '1.5px solid rgba(255,255,255,0.3)', background: 'transparent',
              color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Пропустити →
          </button>
        </div>
      </main>
    );
  }

  // ── ФАЗА 3: Відео ─────────────────────────────────────────
  if (phase === 'video') {
    return (
      <main style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #89182c 0%, #3d0a12 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
        animation: 'fadeIn 0.3s ease',
      }}>
        <style>{`@keyframes fadeIn { from{opacity:0} to{opacity:1} }`}</style>

        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Заголовок */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
              Історія Ґудзика
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>
              Знайди Ниточку! 🐱
            </div>
          </div>

          {/* Відео в красивій рамці */}
          <div style={{
            borderRadius: 24,
            overflow: 'hidden',
            border: '2px solid rgba(255,255,255,0.15)',
            background: '#000',
            marginBottom: 16,
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }}>
            <video
              ref={videoRef}
              src={VIDEO_URL}
              autoPlay
              playsInline
              controls
              onEnded={() => setPhase('form')}
              style={{ width: '100%', display: 'block', maxHeight: '55vh', objectFit: 'cover' }}
            />
          </div>

          {/* Кнопки */}
          <button
            onClick={() => setPhase('form')}
            style={{
              width: '100%', padding: '14px', borderRadius: 16,
              border: '1.5px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.08)',
              color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Пропустити і почати квест →
          </button>

        </div>
      </main>
    );
  }

  // ── ФАЗА 4: Форма ─────────────────────────────────────────
  return (
    <main style={{
      minHeight: '100vh', background: 'var(--surface)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px 48px',
      animation: 'fadeIn 0.4s ease',
    }}>
      <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }`}</style>

      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Маскот */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <HudzykMascot
            mood={selectedLine ? 'guide' : 'happy'}
            message={
              selectedLine === 'cherry' ? 'На вокзал — вперед!' :
              selectedLine === 'orange' ? 'До автовокзалу!' :
              selectedLine === 'green'  ? 'На площу Скорботи!' :
              isLoggedIn ? `Привіт, ${nickname}!` :
              'Обери маршрут!'
            }
            size={100}
          />
        </div>

        {/* Заголовок */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ display: 'inline-flex', gap: 4, marginBottom: 12 }}>
            {['#89182c', '#e28f27', '#8a9c39'].map((c, i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
            ))}
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', margin: '0 0 6px' }}>
            Квест-карта<br />
            <span style={{ color: '#89182c' }}>Коломиї</span>
          </h1>
        </div>

        {/* Google авторизація */}
        {status !== 'loading' && (
          <div style={{ marginBottom: 16 }}>
            {isLoggedIn ? (
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--border)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                {session.user?.image && (
                  <img src={session.user.image} alt="avatar" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{session.user?.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Прогрес зберігається ✓</div>
                </div>
                <button onClick={() => signOut()} style={{ background: 'none', border: 'none', fontSize: 11, color: '#888', cursor: 'pointer', padding: '4px 8px' }}>
                  Вийти
                </button>
              </div>
            ) : (
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--border)', padding: '14px 16px' }}>
                <button
                  onClick={() => signIn('google')}
                  style={{
                    width: '100%', padding: '11px 16px', borderRadius: 12,
                    border: '1.5px solid var(--border)', background: 'var(--surface)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    fontSize: 14, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer', marginBottom: 8,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                    <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                    <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
                    <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
                  </svg>
                  Увійти через Google
                </button>
                <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.5 }}>
                  💾 Авторизуйся щоб зберегти прогрес,<br />отримати картку мандрівника і знижки
                </div>
              </div>
            )}
          </div>
        )}

        {/* Форма */}
        <div style={{ background: 'var(--white)', borderRadius: 20, border: '1px solid var(--border)', padding: '24px 24px 28px', marginBottom: 16 }}>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 8 }}>
              Твоє ім'я або нікнейм
            </label>
            <input
              type="text"
              value={nickname}
              onChange={e => { setNickname(e.target.value); setError(''); }}
              placeholder="Наприклад: Олексій"
              maxLength={30}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid var(--border)', background: isLoggedIn ? '#f9f9f9' : 'var(--surface)', fontSize: 15, color: 'var(--ink)', outline: 'none' }}
              onFocus={e => e.target.style.borderColor = '#89182c'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            {isLoggedIn && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Підставлено з Google · можна змінити</div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 10 }}>
              Звідки починаєш?
            </label>

            {linesLoading && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: 13 }}>
                Завантаження маршрутів...
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {lines.map(line => {
                const active = selectedLine === line.key;
                const emoji  = LINE_EMOJI[line.key as Line];
                return (
                  <button
                    key={line.key}
                    onClick={() => { setSelectedLine(line.key as Line); setError(''); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
                      border: `2px solid ${active ? line.color : line.color + '40'}`,
                      background: active ? line.color + '18' : 'var(--white)',
                      transition: 'all .15s', textAlign: 'left',
                    }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: active ? line.color : line.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                      {emoji}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: active ? line.color : 'var(--ink)', marginBottom: 3 }}>
                        {line.label}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {line.order.length} точок · {line.startSlug === 'train_station' ? 'Залізничний вокзал' : line.startSlug === 'bus_station' ? 'Автовокзал' : 'Площа Скорботи'}
                      </div>
                    </div>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, border: `2px solid ${active ? line.color : 'var(--border)'}`, background: active ? line.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {active && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p style={{ fontSize: 13, color: '#DC2626', textAlign: 'center', marginTop: 12, marginBottom: 0 }}>
              {error}
            </p>
          )}
        </div>

        {/* Кнопка старту */}
        <button
          onClick={handleStart}
          disabled={!nickname.trim() || !selectedLine}
          style={{
            width: '100%', padding: '16px', borderRadius: 16, border: 'none',
            cursor: nickname.trim() && selectedLine ? 'pointer' : 'not-allowed',
            background: cfg ? cfg.color : 'var(--muted)',
            color: '#fff', fontSize: 16, fontWeight: 700,
            opacity: nickname.trim() && selectedLine ? 1 : 0.4,
            transition: 'all .2s',
          }}
        >
          Розпочати квест →
        </button>

        {isLoggedIn && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
            <a href="/profile" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#1a1a2e', fontWeight: 600, textDecoration: 'none', padding: '8px 16px', borderRadius: 20, border: '1.5px solid #EEEEF5', background: '#fff' }}>
              👤 Мій профіль
            </a>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
          <a href="/about/hudzyk" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#89182c', fontWeight: 600, textDecoration: 'none', padding: '8px 16px', borderRadius: 20, border: '1.5px solid #f5e0e3', background: '#fff' }}>
            🐾 Про кота Ґудзика
          </a>
        </div>

      </div>
    </main>
  );
}