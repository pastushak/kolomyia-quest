'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Line } from '@/types';
import { createSession } from '@/lib/session';
import HudzykMascot from '@/components/quest/HudzykMascot';

const LINE_CONFIG = {
  blue: {
    color: '#2563EB',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    label: 'Синя лінія',
    start: 'Залізничний вокзал',
    spots: 6,
    time: '~60 хв',
    emoji: '🚂',
  },
  red: {
    color: '#DC2626',
    bg: '#FEF2F2',
    border: '#FECACA',
    label: 'Червона лінія',
    start: 'Автовокзал',
    spots: 5,
    time: '~50 хв',
    emoji: '🚌',
  },
} as const;

export default function HomePage() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [selectedLine, setSelectedLine] = useState<Line | null>(null);
  const [error, setError] = useState('');

  function handleStart() {
    if (!nickname.trim()) { setError('Введи своє ім\'я'); return; }
    if (!selectedLine)    { setError('Обери маршрут'); return; }
    createSession(nickname.trim(), selectedLine);
    router.push(`/start/${selectedLine}`);
  }

  const cfg = selectedLine ? LINE_CONFIG[selectedLine] : null;

  return (
    <main style={{ minHeight: '100vh', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Маскот */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <HudzykMascot
            mood={selectedLine ? 'guide' : 'happy'}
            message={
              selectedLine === 'blue' ? 'На вокзал — вперед!' :
              selectedLine === 'red'  ? 'До автовокзалу!' :
              'Привіт! Я Гудзик!'
            }
            size={150}
          />
        </div>

        {/* Хедер */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          {/* Лого-плашка у стилі логотипу Коломиї */}
          <div style={{ display: 'inline-flex', gap: 4, marginBottom: 16 }}>
            {['#8B1A2F','#D4621A','#E8A020','#2D7A4F'].map((c, i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
            ))}
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', margin: '0 0 6px', letterSpacing: -0.5 }}>
            Квест-карта<br />
            <span style={{ color: 'var(--cherry)' }}>Коломиї</span>
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
            Досліджуй місто — скануй QR-коди<br />отримуй нагороди
          </p>
        </div>

        {/* Картка форми */}
        <div style={{ background: 'var(--white)', borderRadius: 20, border: '1px solid var(--border)', padding: '24px 24px 28px', marginBottom: 16 }}>

          {/* Ім'я */}
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
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 12,
                border: '1.5px solid var(--border)', background: 'var(--surface)',
                fontSize: 15, color: 'var(--ink)', outline: 'none',
                transition: 'border-color .15s',
              }}
              onFocus={e => e.target.style.borderColor = '#2563EB'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Вибір лінії */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 10 }}>
              Звідки починаєш?
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(['blue', 'red'] as Line[]).map(line => {
                const c = LINE_CONFIG[line];
                const active = selectedLine === line;
                return (
                  <button
                    key={line}
                    onClick={() => { setSelectedLine(line); setError(''); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
                      border: `2px solid ${active ? c.color : c.border}`,
                      background: active ? c.bg : 'var(--white)',
                      transition: 'all .15s', textAlign: 'left',
                    }}
                  >
                    {/* Іконка */}
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: active ? c.color : c.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, flexShrink: 0, transition: 'background .15s',
                    }}>
                      {c.emoji}
                    </div>

                    {/* Текст */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: active ? c.color : 'var(--ink)', marginBottom: 3 }}>
                        {c.label}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {c.start} · {c.spots} точок · {c.time}
                      </div>
                    </div>

                    {/* Чекмарк */}
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${active ? c.color : c.border}`,
                      background: active ? c.color : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all .15s',
                    }}>
                      {active && <span style={{ color: '#fff', fontSize: 12, lineHeight: 1 }}>✓</span>}
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

        {/* Кнопка старт */}
        <button
          onClick={handleStart}
          disabled={!nickname.trim() || !selectedLine}
          style={{
            width: '100%', padding: '16px', borderRadius: 16,
            border: 'none', cursor: nickname.trim() && selectedLine ? 'pointer' : 'not-allowed',
            background: cfg ? cfg.color : 'var(--muted)',
            color: '#fff', fontSize: 16, fontWeight: 700,
            opacity: nickname.trim() && selectedLine ? 1 : 0.4,
            transition: 'all .2s', letterSpacing: 0.2,
          }}
        >
          Розпочати квест →
        </button>

        {/* Мови */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          {[
            { code: 'UA', color: '#2563EB', active: true },
            { code: 'EN', color: 'var(--muted)', active: false },
            { code: 'PL', color: 'var(--muted)', active: false },
          ].map((lang, i) => (
            <span key={lang.code} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 12, fontWeight: lang.active ? 700 : 400,
                color: lang.active ? lang.color : 'var(--muted)',
                cursor: lang.active ? 'default' : 'not-allowed',
              }}>
                {lang.code}
              </span>
              {i < 2 && <span style={{ color: 'var(--border)', fontSize: 12 }}>·</span>}
            </span>
          ))}
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>— незабаром</span>
        </div>

      </div>
    </main>
  );
}