'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Session } from '@/types';
import { fetchLine, LINE_COLOR, LINE_LABEL } from '@/lib/utils';
import HudzykMascot from '@/components/quest/HudzykMascot';
import { getSession, clearSession, finishSession } from '@/lib/session';

export default function FinishPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const s = getSession();
    if (!s) { router.push('/'); return; }
    setSession(s);
    finishSession();
    setTimeout(() => setVisible(true), 100);
  }, []);

  if (!mounted || !session) return null;

  const line      = session.line;
  const color     = LINE_COLOR[line];
  const label     = LINE_LABEL[line];
  const allLocs   = getLineLocations(line);
  const completed = session.completedSlugs.length;
  const total     = allLocs.length;
  const xp        = session.xp;

  const startedAt  = new Date(session.startedAt);
  const finishedAt = new Date();
  const minutes    = Math.round((finishedAt.getTime() - startedAt.getTime()) / 60000);

  function handleRestart() {
    clearSession();
    router.push('/');
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F7F7FC', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 16px' }}>
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
            {label} — пройдено!
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
              { value: `${completed}/${total}`, label: 'Точок пройдено' },
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
            <div style={{ fontSize: 12, color: '#8888A8', lineHeight: 1.4 }}>Цифровий бейдж · {label}</div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 22, color }}>✓</div>
        </div>

        {/* Пройдені локації */}
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #EEEEF5', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #EEEEF5', fontSize: 13, fontWeight: 700, color: '#8888A8' }}>
            Маршрут пройдено
          </div>
          {allLocs.map((loc, i) => {
            const done = session.completedSlugs.includes(loc.slug);
            return (
              <div key={loc.slug} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', borderBottom: i < allLocs.length - 1 ? '1px solid #EEEEF5' : 'none' }}>
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

        {/* Кнопки */}
        <button onClick={handleRestart} style={{ width: '100%', padding: 16, borderRadius: 16, border: 'none', background: color, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
          Пройти ще раз →
        </button>

        <button onClick={() => { clearSession(); router.push('/'); }} style={{ width: '100%', padding: 14, borderRadius: 16, border: '1.5px solid #EEEEF5', background: '#fff', color: '#8888A8', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Спробувати іншу лінію
        </button>
        <a href="/about/hudzyk"
          style={{
            display: 'block', width: '100%', padding: 14,
            borderRadius: 16, border: '1.5px solid #f5e0e3',
            background: '#fff', color: '#89182c', fontSize: 14,
            fontWeight: 600, cursor: 'pointer', textAlign: 'center',
            textDecoration: 'none', marginTop: 8,
          }}
        >
          🐾 Дізнатись про кота Ґудзика
        </a>
      
        <p style={{ textAlign: 'center', fontSize: 12, color: '#8888A8', margin: 0 }}>
          Коломия єднає · kolomyia-quest
        </p>

      </div>
    </main>
  );
}