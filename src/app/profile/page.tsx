'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { LINE_COLOR, LINE_LABEL } from '@/lib/utils';
import { Line } from '@/types';

interface CompletedLine {
  line:        string;
  ageGroup:    string;
  completedAt: string;
  finalXp:     number;
}

interface ProfileData {
  name:           string;
  email:          string;
  avatarUrl:      string;
  totalXp:        number;
  completedLines: CompletedLine[];
  createdAt:      string;
  stats: {
    totalSessions:  number;
    totalLocations: number;
    totalMinutes:   number;
  };
}

const ALL_LINES: Line[] = ['cherry', 'orange', 'green'];

const BADGES = [
  { id: 'explorer',    icon: '🏅', name: 'Дослідник Коломиї', condition: (p: ProfileData) => p.stats.totalSessions >= 1 },
  { id: 'cherry',      icon: '🚂', name: 'Вишневий маршрут',  condition: (p: ProfileData) => p.completedLines.some(l => l.line === 'cherry') },
  { id: 'orange',      icon: '🚌', name: 'Оранжевий маршрут', condition: (p: ProfileData) => p.completedLines.some(l => l.line === 'orange') },
  { id: 'green',       icon: '🌿', name: 'Зелений маршрут',   condition: (p: ProfileData) => p.completedLines.some(l => l.line === 'green') },
  { id: 'all_lines',   icon: '🏆', name: 'Всі три лінії',     condition: (p: ProfileData) => ALL_LINES.every(l => p.completedLines.some(c => c.line === l)) },
  { id: 'hudzyk',      icon: '🐾', name: 'Друг Ґудзика',      condition: (p: ProfileData) => p.totalXp >= 1000 },
];

function getLevel(xp: number) {
  const thresholds = [0, 300, 700, 1500, 3000, 5000];
  let level = 1;
  for (let i = 0; i < thresholds.length; i++) {
    if (xp >= thresholds[i]) level = i + 1;
  }
  const current = thresholds[Math.min(level - 1, thresholds.length - 1)];
  const next    = thresholds[Math.min(level, thresholds.length - 1)];
  const progress = next > current ? ((xp - current) / (next - current)) * 100 : 100;
  return { level, current, next, progress: Math.min(progress, 100) };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatMinutes(min: number) {
  if (min < 60) return `${min}хв`;
  return `${Math.floor(min / 60)}год ${min % 60}хв`;
}

export default function ProfilePage() {
  const router = useRouter();
  const { data: authSession, status } = useSession();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }
    if (status === 'authenticated') {
      fetch('/api/profile')
        .then(r => r.json())
        .then(data => { setProfile(data); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [status]);

  if (status === 'loading' || loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
        <div style={{ width: 36, height: 36, border: '3px solid #eee', borderTopColor: '#89182c', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!profile) return null;

  const { level, next, progress } = getLevel(profile.totalXp);

  return (
    <main style={{ minHeight: '100vh', background: '#faf8f5', paddingBottom: 60 }}>

      {/* Хедер */}
      <div style={{ background: 'linear-gradient(160deg, #89182c 0%, #5a0f1d 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 24px 24px' }}>
          <button
            onClick={() => router.push('/')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}
          >← Назад</button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="avatar" style={{ width: 72, height: 72, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.3)', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 72, height: 72, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>👤</div>
            )}
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{profile.name}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 6 }}>{profile.email}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                Мандрівник з {formatDate(profile.createdAt)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px', marginTop: 15 }}>

        {/* XP */}
        <div style={card}>
          <div style={label}>Досвід мандрівника</div>
          <div style={{ fontSize: 48, fontWeight: 900, color: '#1a1a2e', lineHeight: 1 }}>{profile.totalXp.toLocaleString('uk-UA')}</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>XP зароблено · Рівень {level}</div>
          <div style={{ height: 8, background: '#f0ece6', borderRadius: 4, marginTop: 16, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, #89182c, #e28f27)', borderRadius: 4, width: `${progress}%`, transition: 'width 1s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888', marginTop: 6 }}>
            <span>Рівень {level}</span>
            <span>{profile.totalXp} / {next} XP до рівня {level + 1}</span>
          </div>
        </div>

        {/* Статистика */}
        <div style={card}>
          <div style={label}>Статистика</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { val: profile.stats.totalSessions,                  lbl: 'Маршрути пройдено' },
              { val: profile.stats.totalLocations,                 lbl: 'Локацій відвідано' },
              { val: formatMinutes(profile.stats.totalMinutes),    lbl: 'Час у місті' },
            ].map(s => (
              <div key={s.lbl} style={{ background: '#faf8f5', borderRadius: 14, padding: '14px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#1a1a2e' }}>{s.val}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 3, lineHeight: 1.3 }}>{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Маршрути */}
        <div style={card}>
          <div style={label}>Маршрути</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ALL_LINES.map(line => {
              const done = profile.completedLines.find(l => l.line === line);
              const color = LINE_COLOR[line];
              return (
                <div key={line} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 14, background: done ? color + '18' : '#faf8f5', opacity: done ? 1 : 0.5 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', marginBottom: 2 }}>{LINE_LABEL[line]}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>
                      {done ? formatDate(done.completedAt) : 'Ще не пройдено'}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: done ? color : '#ccc' }}>
                    {done ? `+${done.finalXp} XP` : '—'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Бейджі */}
        <div style={card}>
          <div style={label}>Бейджі</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {BADGES.map(badge => {
              const unlocked = badge.condition(profile);
              return (
                <div key={badge.id} style={{ background: '#faf8f5', borderRadius: 14, padding: '14px 8px', textAlign: 'center', border: '1.5px solid #f0ece6', opacity: unlocked ? 1 : 0.35, filter: unlocked ? 'none' : 'grayscale(1)' }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{badge.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.3 }}>{badge.name}</div>
                </div>
              );
            })}
          </div>
        </div>
        
        <button
          onClick={() => router.push('/shop')}
          style={{ width: '100%', padding: 14, borderRadius: 16, border: 'none', background: '#89182c', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}
        >
          🏪 Привілеї мандрівника
        </button>
        <button
          onClick={() => router.push('/card')}
          style={{ width: '100%', padding: 14, borderRadius: 16, border: '1.5px solid #f5e0e3', background: '#fff', color: '#89182c', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}
        >
          🪪 Моя картка мандрівника
        </button>

        {/* Вихід */}
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          style={{ width: '100%', padding: 14, borderRadius: 16, border: '1.5px solid #f5e0e3', background: '#fff', color: '#89182c', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          Вийти з акаунту
        </button>

      </div>
    </main>
  );
}

const card: React.CSSProperties = {
  background: '#fff', borderRadius: 20, padding: '20px',
  marginBottom: 14, boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
};
const label: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: 2,
  textTransform: 'uppercase', color: '#89182c', marginBottom: 14,
};