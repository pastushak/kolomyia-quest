'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { lineColor, lineLabel, ensureLinesRegistered, fetchAllLines } from '@/lib/utils';

interface BranchStat {
  line:  string;
  count: number;
}

interface CompletedLine {
  type?:        'pure' | 'modification';
  line:         string | null;
  modification: string | null;
  name?:        string;
  branches?:    BranchStat[];
  ageGroup:     string;
  completedAt:  string;
  finalXp:      number;
}

interface LineInfo {
  key:    string;
  label?: string;
  color?: string;
  status?: string;
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
  badgeData?: {
    visitedSlugs: string[];
    finishHours:  number[];
    finishMonths: number[];
    maxTransfers: number;
  };
}

// Тематичні групи спотів (для бейджів «усі храми», «усі музеї» тощо)
const THEME_SLUGS = {
  temples:    ['cathedral_ugkc', 'cathedral_pcu', 'church_josafat', 'blahovisn_church', 'mykhailivsky_cathedral', 'kostel_loyola'],
  museums:    ['museum_history', 'pysanka_museum', 'museum_hutsulshchyna'],
  monuments:  ['hudzyk', 'franko_monument', 'hrushevsky_monument'],
  culture:    ['theatre_ozarkevych', 'narodnyi_dim', 'filarmoniya'],
  nature:     ['park_trylovskoho', 'ozero_rufa', 'ploshcha_skorboty'],
};

// Скільки XP заробив на пройдених лініях (для дистинкцій, не критично)
function visited(p: ProfileData): Set<string> {
  return new Set(p.badgeData?.visitedSlugs ?? []);
}
function hasAllSlugs(p: ProfileData, slugs: string[]): boolean {
  const v = visited(p);
  return slugs.every(s => v.has(s));
}

// Чи пройдено лінію: або як чисту (pure), або у складі комбінованого маршруту
// (лінія фігурує в branches). Так пересадки теж зараховуються.
function hasLine(p: ProfileData, line: string): boolean {
  return p.completedLines.some(l =>
    (l.type !== 'modification' && l.line === line) ||
    (l.branches?.some(b => b.line === line) ?? false)
  );
}

// Чи є хоч один комбінований маршрут (пройдений з пересадками)
function hasCombined(p: ProfileData): boolean {
  return p.completedLines.some(l => l.type === 'modification');
}

type Badge = { id: string; icon: string; name: string; unlocked: boolean };
type BadgeGroup = { title: string; badges: Badge[] };

// Формуємо всі 30 бейджів, згрупованих за категоріями.
function buildBadges(p: ProfileData, lines: LineInfo[]): BadgeGroup[] {
  const xp     = p.totalXp;
  const routes = p.stats.totalSessions;
  const locs   = p.stats.totalLocations;
  const bd      = p.badgeData;
  const hours   = bd?.finishHours ?? [];
  const months  = bd?.finishMonths ?? [];
  const maxTr   = bd?.maxTransfers ?? 0;

  return [
    {
      title: 'Старт',
      badges: [
        { id: 'explorer',  icon: '🏅', name: 'Дослідник Коломиї', unlocked: routes >= 1 },
        { id: 'first_loc', icon: '🎫', name: 'Перші кроки',        unlocked: locs >= 1 },
        { id: 'welcome',   icon: '👋', name: 'Вітаємо в грі',      unlocked: true },
      ],
    },
    {
      title: 'Досвід',
      badges: [
        { id: 'xp100',  icon: '⭐', name: 'Новачок',          unlocked: xp >= 100 },
        { id: 'xp500',  icon: '🌟', name: 'Бувалий',          unlocked: xp >= 500 },
        { id: 'xp1000', icon: '🐾', name: 'Друг Ґудзика',     unlocked: xp >= 1000 },
        { id: 'xp2500', icon: '💎', name: 'Знавець міста',    unlocked: xp >= 2500 },
        { id: 'xp5000', icon: '👑', name: 'Легенда Коломиї',  unlocked: xp >= 5000 },
      ],
    },
    {
      title: 'Лінії',
      badges: [
        { id: 'line_cherry', icon: '🚂', name: 'Вишнева лінія',  unlocked: hasLine(p, 'cherry') },
        { id: 'line_orange', icon: '🚌', name: 'Оранжева лінія', unlocked: hasLine(p, 'orange') },
        { id: 'line_green',  icon: '🌿', name: 'Зелена лінія',   unlocked: hasLine(p, 'green') },
        { id: 'all_lines',   icon: '🏆', name: 'Всі лінії',      unlocked: lines.length > 0 && lines.every(l => hasLine(p, l.key)) },
        { id: 'combined',    icon: '🔀', name: 'Свій маршрут',   unlocked: hasCombined(p) },
      ],
    },
    {
      title: 'Наполегливість',
      badges: [
        { id: 'routes3',  icon: '🥉', name: '3 маршрути',   unlocked: routes >= 3 },
        { id: 'routes5',  icon: '🥈', name: '5 маршрутів',  unlocked: routes >= 5 },
        { id: 'routes10', icon: '🥇', name: '10 маршрутів', unlocked: routes >= 10 },
        { id: 'locs10',   icon: '🗺️', name: '10 локацій',   unlocked: locs >= 10 },
        { id: 'locs20',   icon: '🧭', name: '20 локацій',   unlocked: locs >= 20 },
        { id: 'locs_all', icon: '🏙️', name: 'Уся Коломия',  unlocked: locs >= 24 },
      ],
    },
    {
      title: 'Знавець',
      badges: [
        { id: 'theme_temples',   icon: '⛪', name: 'Прочанин',            unlocked: hasAllSlugs(p, THEME_SLUGS.temples) },
        { id: 'theme_museums',   icon: '🖼️', name: 'Музейник',            unlocked: hasAllSlugs(p, THEME_SLUGS.museums) },
        { id: 'theme_monuments', icon: '🗿', name: 'Знавець пам’ятників', unlocked: hasAllSlugs(p, THEME_SLUGS.monuments) },
        { id: 'theme_culture',   icon: '🎭', name: 'Меценат культури',    unlocked: hasAllSlugs(p, THEME_SLUGS.culture) },
        { id: 'theme_nature',    icon: '🌳', name: 'Природолюб',          unlocked: hasAllSlugs(p, THEME_SLUGS.nature) },
        { id: 'hudzyk_spot',     icon: '🐱', name: 'Обійняв Ґудзика',     unlocked: visited(p).has('hudzyk') },
      ],
    },
    {
      title: 'Особливі',
      badges: [
        { id: 'early',    icon: '🌅', name: 'Ранній птах',       unlocked: hours.some(h => h < 9) },
        { id: 'night',    icon: '🌙', name: 'Нічний мандрівник', unlocked: hours.some(h => h >= 21) },
        { id: 'winter',   icon: '❄️', name: 'Зимовий гість',     unlocked: months.some(m => m === 11 || m <= 1) },
        { id: 'summer',   icon: '☀️', name: 'Літній турист',     unlocked: months.some(m => m >= 5 && m <= 7) },
        { id: 'transfers', icon: '🔁', name: 'Майстер пересадок', unlocked: maxTr >= 3 },
      ],
    },
  ];
}

function getLevel(xp: number) {
  const thresholds = [0, 300, 700, 1500, 3000, 5000];
  const maxLevel = thresholds.length;   // 6
  let level = 1;
  for (let i = 0; i < thresholds.length; i++) {
    if (xp >= thresholds[i]) level = i + 1;
  }
  const isMax = level >= maxLevel;
  const current = thresholds[level - 1];
  const next    = isMax ? thresholds[maxLevel - 1] : thresholds[level];
  const progress = isMax ? 100 : ((xp - current) / (next - current)) * 100;
  return { level, current, next, progress: Math.min(progress, 100), isMax };
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
  const [lines, setLines]     = useState<LineInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [tappedBadge, setTappedBadge] = useState<Badge | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }
    if (status === 'authenticated') {
      ensureLinesRegistered();   // підтягнути кольори/назви ліній (зокрема нових)
      Promise.all([
        fetch('/api/profile').then(r => {
          if (!r.ok) throw new Error('profile');
          return r.json();
        }),
        fetchAllLines().catch(() => [] as LineInfo[]),   // лінії — не критично, фолбек порожній
      ])
        .then(([profileData, linesData]) => {
          setProfile(profileData);
          // Показуємо лише «живі» лінії (не чернетки), у порядку з API
          setLines(
            (linesData as LineInfo[]).filter(l => (l.status ?? 'live') === 'live')
          );
          setLoading(false);
        })
        .catch(() => { setLoadError(true); setLoading(false); });
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

  if (loadError || !profile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 40 }}>😿</div>
        <div style={{ fontSize: 15, color: '#666', maxWidth: 280 }}>
          Не вдалося завантажити профіль. Перевір зʼєднання й спробуй ще раз.
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{ padding: '10px 24px', borderRadius: 14, border: 'none', background: '#89182c', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
        >
          Оновити
        </button>
        <button
          onClick={() => router.push('/')}
          style={{ padding: '8px 24px', borderRadius: 14, border: 'none', background: 'transparent', color: '#888', fontSize: 13, cursor: 'pointer' }}
        >
          На головну
        </button>
      </div>
    );
  }

  const { level, next, progress, isMax } = getLevel(profile.totalXp);

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
            <span>{isMax ? 'Максимальний рівень 🏆' : `${profile.totalXp} / ${next} XP до рівня ${level + 1}`}</span>
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
            {lines.map(l => {
              const key   = l.key;
              const done  = profile.completedLines.find(c => c.type !== 'modification' && c.line === key);
              const viaCombo = !done && hasLine(profile, key);   // пройдено у складі комбінованого
              const color = lineColor(key);
              const active = !!done || viaCombo;
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 14, background: active ? color + '18' : '#faf8f5', opacity: active ? 1 : 0.5 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', marginBottom: 2 }}>{lineLabel(key)}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>
                      {done ? formatDate(done.completedAt) : viaCombo ? 'Пройдено у комбінованому маршруті' : 'Ще не пройдено'}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: active ? color : '#ccc' }}>
                    {done ? `+${done.finalXp} XP` : viaCombo ? '✓' : '—'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Комбіновані маршрути (пройдені з пересадками) */}
          {profile.completedLines.filter(l => l.type === 'modification').length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 8 }}>КОМБІНОВАНІ МАРШРУТИ</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {profile.completedLines.filter(l => l.type === 'modification').map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 14, background: '#f4f2fb' }}>
                    <div style={{ fontSize: 18, flexShrink: 0 }}>🔀</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.name || c.modification || 'Комбінований маршрут'}
                      </div>
                      <div style={{ fontSize: 11, color: '#888' }}>
                        {formatDate(c.completedAt)}{c.modification ? ` · ${c.modification}` : ''}
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#6a5acd', flexShrink: 0 }}>+{c.finalXp} XP</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Бейджі — компактна сітка іконок, назва при тапі */}
        {(() => {
          const groups = buildBadges(profile, lines);
          const all      = groups.flatMap(g => g.badges);
          const earned   = all.filter(b => b.unlocked).length;
          return (
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ ...label, marginBottom: 0 }}>Бейджі</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#89182c' }}>{earned} / {all.length}</div>
              </div>
              {groups.map(group => (
                <div key={group.title} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', marginBottom: 8, letterSpacing: 1 }}>{group.title.toUpperCase()}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                    {group.badges.map(badge => (
                      <button
                        key={badge.id}
                        onClick={() => setTappedBadge(badge)}
                        title={badge.name}
                        style={{
                          aspectRatio: '1', border: 'none', borderRadius: 12, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 24, lineHeight: 1,
                          background: badge.unlocked ? '#faf8f5' : '#f4f2ef',
                          opacity: badge.unlocked ? 1 : 0.4,
                          filter: badge.unlocked ? 'none' : 'grayscale(1)',
                        }}
                      >
                        {badge.icon}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Попап назви бейджа при тапі */}
        {tappedBadge && (
          <div
            onClick={() => setTappedBadge(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 1000 }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: 20, padding: '28px 24px', maxWidth: 300, width: '100%', textAlign: 'center' }}
            >
              <div style={{ fontSize: 56, marginBottom: 12, opacity: tappedBadge.unlocked ? 1 : 0.4, filter: tappedBadge.unlocked ? 'none' : 'grayscale(1)' }}>
                {tappedBadge.icon}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#1a1a2e', marginBottom: 6 }}>{tappedBadge.name}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: tappedBadge.unlocked ? '#2D7A4F' : '#aaa', marginBottom: 20 }}>
                {tappedBadge.unlocked ? '✓ Отримано' : '🔒 Ще не відкрито'}
              </div>
              <button
                onClick={() => setTappedBadge(null)}
                style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', background: '#89182c', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
              >
                Закрити
              </button>
            </div>
          </div>
        )}
        
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