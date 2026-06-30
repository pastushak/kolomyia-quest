'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getSession } from '@/lib/session';
import { Session } from '@/types';
import { lineColor, lineLabel } from '@/lib/utils';
import { Line, Location } from '@/types';
import HudzykMascot from '@/components/quest/HudzykMascot';

const MapView = dynamic(() => import('@/components/map/MapView'), { ssr: false });

export default function StartPage() {
  const params = useParams();
  const router = useRouter();
  const line   = params.line as Line;

  const [session, setSession]   = useState<Session | null>(null);
  const [spots, setSpots]       = useState<Location[]>([]);
  const [order, setOrder]       = useState<string[]>([]);
  const [loading, setLoading]   = useState(true);
  const [mounted, setMounted]   = useState(false);

  useEffect(() => {
    setMounted(true);
    const s = getSession();
    if (!s) { router.push('/'); return; }

    // Захист від застарілих сесій на неіснуючій лінії (доміграційні red/blue)
    const VALID_LINES = ['cherry', 'orange', 'green'];
    if (!VALID_LINES.includes(s.line) || s.line !== line) {
      // Лінія сесії не збігається з URL або взагалі недійсна — скидаємо
      localStorage.removeItem('kq_session');
      localStorage.removeItem('kq_sid');
      router.push('/');
      return;
    }
    setSession(s);

    fetch(`/api/lines/${line}`)
      .then(r => r.json())
      .then(data => {
        setSpots(data.spots);
        setOrder(data.order);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [line]);

  if (!mounted) return null;
  if (!session) return null;

  const color          = lineColor(line);
  const label          = lineLabel(line);
  const completedSlugs = session.completedSlugs ?? [];
  const completedCount = completedSlugs.length;
  const hasProgress    = completedCount > 0;

  const visibleCount = Math.min(completedCount + 2, spots.length);
  const visibleSpots = spots.slice(0, visibleCount);
  const hiddenCount  = spots.length - visibleCount;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 36, height: 36, border: '3px solid #eee', borderTopColor: color, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ fontSize: 14, color: '#888' }}>Завантаження маршруту...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const nextSlug = order.find(slug => !completedSlugs.includes(slug)) ?? order[0];

  return (
    <main style={{ minHeight: '100vh', background: '#F7F7FC', paddingBottom: 32 }}>

      <div style={{ background: '#fff', borderBottom: '1px solid #EEEEF5', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#8888A8' }}>←</button>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
        <span style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E' }}>{label}</span>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#8888A8' }}>{spots.length} точок</span>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px' }}>

        {/* Ґудзик */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#fff', borderRadius: 20, border: '1px solid #EEEEF5', padding: '16px 20px', marginBottom: 16 }}>
          <HudzykMascot
            mood={hasProgress ? 'guide' : 'happy'}
            message={hasProgress ? `Продовжуємо! Ще ${spots.length - completedCount} точок!` : `Привіт, ${session.nickname}!`}
            size={90}
          />
          <div>
            {hasProgress ? (
              <>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A2E', marginBottom: 4 }}>
                  Продовжуєш мандрівку!
                </div>
                <div style={{ fontSize: 13, color: '#8888A8', lineHeight: 1.5 }}>
                  Пройдено <strong style={{ color }}>{completedCount}</strong> з <strong>{spots.length}</strong> точок.<br />
                  Наступна: <strong style={{ color }}>{spots.find(s => s.slug === nextSlug)?.name}</strong>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A2E', marginBottom: 4 }}>Готовий до квесту?</div>
                <div style={{ fontSize: 13, color: '#8888A8', lineHeight: 1.5 }}>
                  Старт від <strong style={{ color }}>{spots[0]?.name}</strong>.<br />
                  Знайди QR-код і починай!
                </div>
              </>
            )}
          </div>
        </div>

        {/* Прогрес-бар */}
        {hasProgress && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #EEEEF5', padding: '12px 16px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8888A8', marginBottom: 8 }}>
              <span>Прогрес маршруту</span>
              <span style={{ fontWeight: 700, color }}>{Math.round(completedCount / spots.length * 100)}%</span>
            </div>
            <div style={{ height: 8, background: '#F0F0F5', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${completedCount / spots.length * 100}%`, background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
            </div>
          </div>
        )}

        {/* Карта */}
        {spots.length > 0 && (
          <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid #EEEEF5', marginBottom: 16, height: 300 }}>
            <MapView
              line={line}
              locations={visibleSpots}
              completedSlugs={completedSlugs}
              activeSlug={nextSlug}
            />
          </div>
        )}

        {/* Список локацій */}
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #EEEEF5', overflow: 'hidden', marginBottom: hasProgress ? 0 : 20 }}>
          {visibleSpots.map((loc, i) => {
            const isDone = completedSlugs.includes(loc.slug);
            const isNext = loc.slug === nextSlug;
            return (
              <div key={loc.slug} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < visibleSpots.length - 1 ? '1px solid #EEEEF5' : 'none', background: isNext ? color + '08' : 'transparent' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', background: isDone ? '#9CA3AF' : loc.type === 'finish' ? '#7F77DD' : loc.type === 'shared' ? '#2D7A4F' : color }}>
                  {isDone ? '✓' : i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: isNext ? 700 : 600, color: isDone ? '#9CA3AF' : '#1A1A2E', textDecoration: isDone ? 'line-through' : 'none' }}>
                    {loc.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#8888A8' }}>{loc.address}</div>
                </div>
                {isNext && <span style={{ fontSize: 11, fontWeight: 700, color, background: color + '20', padding: '3px 8px', borderRadius: 20 }}>зараз</span>}
                {!isNext && loc.type === 'finish' && <span style={{ fontSize: 11, fontWeight: 600, color: '#7F77DD', background: '#F0EFFE', padding: '3px 8px', borderRadius: 20 }}>фініш</span>}
                {!isNext && loc.type === 'shared' && loc.transfers.length > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: '#2D7A4F', background: '#E8F5EE', padding: '3px 8px', borderRadius: 20 }}>пересадка</span>}
              </div>
            );
          })}
        </div>

        {/* Заблоковані локації */}
        {hiddenCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#faf8f5', borderRadius: '0 0 20px 20px', border: '1px solid #EEEEF5', borderTop: 'none', marginBottom: 20 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, background: '#EEEEF5', color: '#8888A8' }}>
              🔒
            </div>
            <div style={{ fontSize: 13, color: '#8888A8', fontStyle: 'italic' }}>
              Ще {hiddenCount} локацій — відкриються по ходу маршруту
            </div>
          </div>
        )}

        {/* Кнопка */}
        <button
          onClick={() => router.push(`/spot/${nextSlug}`)}
          style={{ width: '100%', padding: '16px', borderRadius: 16, border: 'none', background: color, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
        >
          {hasProgress ? `Продовжити мандрівку →` : `Іду до першої точки →`}
        </button>

      </div>
    </main>
  );
}