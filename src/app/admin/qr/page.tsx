'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { LINE_COLOR } from '@/lib/utils';
import { Line } from '@/types';

const BASE_URL = typeof window !== 'undefined'
  ? window.location.origin
  : 'http://localhost:3000';

interface SpotData {
  slug:    string;
  name:    string;
  address: string;
  type:    string;
  lines:   string[];
}

interface QRItemProps {
  url:       string;
  label:     string;
  sublabel?: string;
  color:     string;
}

function QRItem({ url, label, sublabel, color }: QRItemProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: 180, margin: 2,
      color: { dark: '#1A1A2E', light: '#ffffff' },
    });
  }, [url]);

  return (
    <div style={{ border: `2px solid ${color}`, borderRadius: 16, padding: 16, textAlign: 'center', width: 220, background: '#fff', breakInside: 'avoid' }}>
      <canvas ref={canvasRef} style={{ borderRadius: 8, display: 'block', margin: '0 auto' }} />
      <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: '#1A1A2E' }}>{label}</div>
      {sublabel && <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>{sublabel}</div>}
      <div style={{ fontSize: 10, color: '#bbb', marginTop: 6, wordBreak: 'break-all', lineHeight: 1.4 }}>{url}</div>
    </div>
  );
}

export default function QRAdminPage() {
  const [spots, setSpots]     = useState<SpotData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/spots')
      .then(r => r.json())
      .then(data => { setSpots(data); setLoading(false); });
  }, []);

  // Стартові QR для кожної лінії
  const startItems = [
    { url: `${BASE_URL}/start/cherry`, label: 'Залізничний вокзал', color: '#89182c' },
    { url: `${BASE_URL}/start/orange`, label: 'Автовокзал',          color: '#e28f27' },
    { url: `${BASE_URL}/start/green`,  label: 'Площа Скорботи',      color: '#8a9c39' },
  ];

  return (
    <main style={{ padding: 32, maxWidth: 1000, margin: '0 auto', fontFamily: 'sans-serif' }}>

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1A1A2E', marginBottom: 6 }}>
          QR-коди для друку
        </h1>
        <p style={{ color: '#888', fontSize: 14 }}>
          Відкрий у браузері і надрукуй — <kbd style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>Ctrl+P</kbd>
        </p>
      </div>

      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#555' }}>
        Стартові QR — розмістити на початкових точках
      </h2>
      <div style={{ display: 'flex', gap: 20, marginBottom: 48, flexWrap: 'wrap' }}>
        {startItems.map(item => (
          <QRItem key={item.url} {...item} />
        ))}
      </div>

      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#555' }}>
        Локації — розмістити на об'єктах
      </h2>

      {loading ? (
        <div style={{ color: '#888', fontSize: 14 }}>Завантаження...</div>
      ) : (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {spots.map(spot => {
            const color = spot.type === 'finish'
              ? '#7F77DD'
              : LINE_COLOR[spot.lines[0] as Line] ?? '#888';
            return (
              <QRItem
                key={spot.slug}
                url={`${BASE_URL}/spot/${spot.slug}`}
                label={spot.name}
                sublabel={spot.address}
                color={color}
              />
            );
          })}
        </div>
      )}

      <style>{`
        @media print {
          body { margin: 0; }
          main { padding: 16px !important; }
          h2 { page-break-after: avoid; }
        }
      `}</style>
    </main>
  );
}