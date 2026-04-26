'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Line, QuestLine } from '@/types';
import { createSession } from '@/lib/session';
import { LINE_EMOJI } from '@/lib/utils';
import HudzykMascot from '@/components/quest/HudzykMascot';

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [selectedLine, setSelectedLine] = useState<Line | null>(null);
  const [lines, setLines]               = useState<QuestLine[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');

  // Нікнейм береться з Google або вводиться вручну
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    fetch('/api/lines')
      .then(r => r.json())
      .then(data => { setLines(data); setLoading(false); })
      .catch(() => { setError('Помилка завантаження ліній'); setLoading(false); });
  }, []);

  // Коли юзер залогінився — підставляємо його ім'я
  useEffect(() => {
    if (session?.user?.name && !nickname) {
      setNickname(session.user.name.split(' ')[0]); // тільки перше ім'я
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

  return (
    <main style={{ minHeight: '100vh', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px 48px' }}>
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
              'Привіт! Я Ґудзик!'
            }
            size={100}
          />
        </div>

        {/* Заголовок */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', gap: 4, marginBottom: 16 }}>
            {['#89182c', '#e28f27', '#8a9c39'].map((c, i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
            ))}
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', margin: '0 0 6px' }}>
            Квест-карта<br />
            <span style={{ color: '#89182c' }}>Коломиї</span>
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
            Досліджуй місто — скануй QR-коди<br />отримуй нагороди
          </p>
        </div>

        {/* Google авторизація */}
        {status !== 'loading' && (
          <div style={{ marginBottom: 16 }}>
            {isLoggedIn ? (
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--border)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                {session.user?.image && (
                  <img
                    src={session.user.image}
                    alt="avatar"
                    style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{session.user?.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{session.user?.email}</div>
                </div>
                <button
                  onClick={() => signOut()}
                  style={{ background: 'none', border: 'none', fontSize: 11, color: '#888', cursor: 'pointer', padding: '4px 8px' }}
                >
                  Вийти
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn('google')}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 16,
                  border: '1.5px solid var(--border)', background: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  fontSize: 14, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer',
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
            )}
          </div>
        )}

        {/* Форма */}
        <div style={{ background: 'var(--white)', borderRadius: 20, border: '1px solid var(--border)', padding: '24px 24px 28px', marginBottom: 16 }}>

          {/* Нікнейм */}
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
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                Підставлено з Google · можна змінити
              </div>
            )}
          </div>

          {/* Вибір лінії */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 10 }}>
              Звідки починаєш?
            </label>

            {loading && (
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

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <a
            href="/about/hudzyk"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 13, color: '#89182c', fontWeight: 600,
              textDecoration: 'none', padding: '8px 16px',
              borderRadius: 20, border: '1.5px solid #f5e0e3',
              background: '#fff',
            }}
          >
            🐾 Про кота Ґудзика
          </a>
        </div>

      </div>
    </main>
  );
}