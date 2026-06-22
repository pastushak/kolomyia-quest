'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { trackQrScan } from '@/lib/session';
import { lineColor, lineLabel } from '@/lib/utils';

interface SpotInfo {
  slug:     string;
  name:     string;
  address:  string;
  info:     string;
  fullInfo: string;
  lat:      number;
  lng:      number;
  type:     string;
  lines:    string[];
}

export default function InfoPage() {
  const { slug } = useParams() as { slug: string };
  const [spot, setSpot]       = useState<SpotInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/spots/${slug}`)
      .then(r => {
        if (!r.ok) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then(data => {
        if (data) {
          setSpot(data);
          setLoading(false);
          trackQrScan(slug);   // реальний фізичний скан QR → /info
        }
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [slug]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 36, height: 36, border: '3px solid #eee', borderTopColor: '#89182c', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (notFound || !spot) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12, padding: 24 }}>
      <div style={{ fontSize: 48 }}>🔍</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e' }}>Локацію не знайдено</div>
      <div style={{ fontSize: 14, color: '#888', textAlign: 'center' }}>Перевірте QR-код або зверніться до організаторів квесту</div>
    </div>
  );

  // Розбиваємо fullInfo на параграфи
  const paragraphs = (spot.fullInfo || spot.info || '')
    .split('\n')
    .filter(p => p.trim().length > 0);

  const mainColor = spot.lines[0] ? lineColor(spot.lines[0], '#89182c') : '#89182c';

  return (
    <main style={{ minHeight: '100vh', background: '#faf8f5', paddingBottom: 60 }}>

      {/* Хедер */}
      <div style={{ background: `linear-gradient(160deg, ${mainColor} 0%, #1a0508 100%)`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', bottom: -20, left: -20, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 24px 36px' }}>

          {/* Лінії-теги */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {spot.lines.map(line => (
              <span key={line} style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.15)', color: '#fff', letterSpacing: 0.5 }}>
                {lineLabel(line)}
              </span>
            ))}
            <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
              📍 {spot.address}
            </span>
          </div>

          <h1 style={{ fontSize: 30, fontWeight: 900, color: '#fff', lineHeight: 1.2, margin: '0 0 8px' }}>
            {spot.name}
          </h1>

          {/* Логотип Коломиї-квест */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
            <Image src="/hudzyk.png" alt="Ґудзик" width={32} height={32} style={{ objectFit: 'contain' }} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Коломия-Квест · Детальна інформація</span>
          </div>
        </div>
      </div>

      {/* Контент */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px' }}>

        {paragraphs.length > 0 ? (
          <div style={{ background: '#fff', borderRadius: 20, padding: '28px 24px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', marginBottom: 20 }}>
            {paragraphs.map((para, i) => (
              <p key={i} style={{ fontSize: 16, lineHeight: 1.8, color: '#2a2a3e', margin: i < paragraphs.length - 1 ? '0 0 18px' : 0 }}>
                {para}
              </p>
            ))}
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 20, padding: '40px 24px', textAlign: 'center', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', marginBottom: 20 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📝</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 6 }}>Контент готується</div>
            <div style={{ fontSize: 13, color: '#888' }}>Детальна інформація про цю локацію з'явиться незабаром</div>
          </div>
        )}

        {/* Карта локації */}
        <div style={{ background: '#fff', borderRadius: 20, padding: '16px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#89182c', marginBottom: 12 }}>
            На карті
          </div>
          <a
            href={`https://www.openstreetmap.org/?mlat=${spot.lat}&mlon=${spot.lng}&zoom=17`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, background: '#faf8f5', border: '1px solid #f0ece6', textDecoration: 'none', color: '#1a1a2e' }}
          >
            <span style={{ fontSize: 20 }}>🗺️</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{spot.name}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{spot.address} · Відкрити на карті →</div>
            </div>
          </a>
        </div>

        {/* Атрибуція */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: '#fff', borderRadius: 16, border: '1px solid #f0ece6' }}>
          <Image src="/hudzyk.png" alt="Ґудзик" width={40} height={40} style={{ objectFit: 'contain', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>Коломия-Квест</div>
            <div style={{ fontSize: 11, color: '#888' }}>Інтерактивна квест-карта міста Коломиї</div>
          </div>
          <a
            href={`/spot/${slug}`}
            style={{ marginLeft: 'auto', padding: '7px 14px', borderRadius: 20, border: '1.5px solid #f5e0e3', background: '#fff', color: '#89182c', fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}
          >
            До квесту →
          </a>
        </div>

      </div>
    </main>
  );
}