'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getSession } from '@/lib/session';
import { LINE_COLOR, LINE_LABEL } from '@/lib/utils';
import { Line, Location } from '@/types';
import HudzykMascot from '@/components/quest/HudzykMascot';

const MapView = dynamic(() => import('@/components/map/MapView'), { ssr: false });

export default function StartPage() {
  const params  = useParams();
  const router  = useRouter();
  const line    = params.line as Line;
  const session = getSession();

  const [spots, setSpots]     = useState<Location[]>([]);
  const [order, setOrder]     = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) { router.push('/'); return; }
    fetch(`/api/lines/${line}`)
      .then(r => r.json())
      .then(data => {
        setSpots(data.spots);
        setOrder(data.order);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [line]);

  if (!session) return null;

  const color = LINE_COLOR[line];
  const label = LINE_LABEL[line];

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 36, height: 36, border: '3px solid #eee', borderTopColor: color, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ fontSize: 14, color: '#888' }}>Завантаження маршруту...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <main style={{ minHeight: '100vh', background: '#F7F7FC', paddingBottom: 32 }}>

      <div style={{ background: '#fff', borderBottom: '1px solid #EEEEF5', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#8888A8' }}>←</button>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
        <span style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E' }}>{label}</span>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#8888A8' }}>{spots.length} точок</span>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#fff', borderRadius: 20, border: '1px solid #EEEEF5', padding: '16px 20px', marginBottom: 16 }}>
          <HudzykMascot mood="guide" message={`Привіт, ${session.nickname}!`} size={90} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A2E', marginBottom: 4 }}>Готовий до квесту?</div>
            <div style={{ fontSize: 13, color: '#8888A8', lineHeight: 1.5 }}>
              Старт від <strong style={{ color }}>{spots[0]?.name}</strong>.<br />
              Знайди QR-код і починай!
            </div>
          </div>
        </div>

        {spots.length > 0 && (
          <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid #EEEEF5', marginBottom: 16, height: 300 }}>
            <MapView line={line} locations={spots} completedSlugs={[]} activeSlug={spots[0].slug} />
          </div>
        )}

        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #EEEEF5', overflow: 'hidden', marginBottom: 20 }}>
          {spots.map((loc, i) => (
            <div key={loc.slug} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < spots.length - 1 ? '1px solid #EEEEF5' : 'none' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', background: loc.type === 'finish' ? '#7F77DD' : loc.type === 'shared' ? '#2D7A4F' : color }}>
                {i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E' }}>{loc.name}</div>
                <div style={{ fontSize: 12, color: '#8888A8' }}>{loc.address}</div>
              </div>
              {loc.type === 'finish' && <span style={{ fontSize: 11, fontWeight: 600, color: '#7F77DD', background: '#F0EFFE', padding: '3px 8px', borderRadius: 20 }}>фініш</span>}
              {loc.type === 'shared' && loc.transfers.length > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: '#2D7A4F', background: '#E8F5EE', padding: '3px 8px', borderRadius: 20 }}>пересадка</span>}
            </div>
          ))}
        </div>

        <button
          onClick={() => router.push(`/spot/${order[0]}`)}
          style={{ width: '100%', padding: '16px', borderRadius: 16, border: 'none', background: color, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
        >
          Іду до першої точки →
        </button>

      </div>
    </main>
  );
}