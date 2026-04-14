'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getSession } from '@/lib/session';
import { getLineLocations, LINE_COLOR, LINE_LABEL } from '@/lib/utils';
import { Line } from '@/types';
import HudzykMascot from '@/components/quest/HudzykMascot';

const MapView = dynamic(() => import('@/components/map/MapView'), { ssr: false });

export default function StartPage() {
  const params  = useParams();
  const router  = useRouter();
  const line    = params.line as Line;
  const session = getSession();
  const locs    = getLineLocations(line);

  useEffect(() => {
    if (!session) router.push('/');
  }, []);

  if (!session) return null;

  const color = LINE_COLOR[line];
  const label = LINE_LABEL[line];

  return (
    <main style={{ minHeight: '100vh', background: '#F7F7FC', paddingBottom: 32 }}>

      {/* Хедер */}
      <div style={{ background: '#fff', borderBottom: '1px solid #EEEEF5', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => router.push('/')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#8888A8', padding: '0 4px' }}>
          ←
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E' }}>{label}</span>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#8888A8' }}>
          {locs.length} точок
        </span>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px' }}>

        {/* Маскот + привітання */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#fff', borderRadius: 20, border: '1px solid #EEEEF5', padding: '16px 20px', marginBottom: 16 }}>
          <HudzykMascot mood="guide" message={`Ласкаво просимо, ${session.nickname}!`} size={90} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A2E', marginBottom: 4 }}>
              Готовий до квесту?
            </div>
            <div style={{ fontSize: 13, color: '#8888A8', lineHeight: 1.5 }}>
              Старт від <strong style={{ color }}>{locs[0].name}</strong>.<br/>
              Знайди QR-код і починай!
            </div>
          </div>
        </div>

        {/* Карта */}
        <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid #EEEEF5', marginBottom: 16, height: 300 }}>
          <MapView line={line} locations={locs} completedSlugs={[]} activeSlug={locs[0].slug} />
        </div>

        {/* Список точок */}
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #EEEEF5', overflow: 'hidden', marginBottom: 20 }}>
          {locs.map((loc, i) => (
            <div key={loc.slug} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px',
              borderBottom: i < locs.length - 1 ? '1px solid #EEEEF5' : 'none',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: '#fff',
                background: loc.type === 'finish' ? '#7F77DD'
                          : loc.type === 'shared' ? '#2D7A4F' : color,
              }}>
                {i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E' }}>{loc.name}</div>
                <div style={{ fontSize: 12, color: '#8888A8' }}>{loc.address}</div>
              </div>
              {loc.type === 'finish' && (
                <span style={{ fontSize: 11, fontWeight: 600, color: '#7F77DD', background: '#F0EFFE', padding: '3px 8px', borderRadius: 20 }}>
                  фініш
                </span>
              )}
              {loc.type === 'shared' && (
                <span style={{ fontSize: 11, fontWeight: 600, color: '#2D7A4F', background: '#E8F5EE', padding: '3px 8px', borderRadius: 20 }}>
                  спільна
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Кнопка старт */}
        <button
          onClick={() => router.push(`/spot/${locs[0].slug}`)}
          style={{
            width: '100%', padding: '16px', borderRadius: 16, border: 'none',
            background: color, color: '#fff', fontSize: 16, fontWeight: 700,
            cursor: 'pointer', letterSpacing: 0.2,
          }}
        >
          Іду до першої точки →
        </button>

      </div>
    </main>
  );
}