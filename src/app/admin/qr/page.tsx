'use client';

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { LOCATIONS, LINE_BLUE_ORDER, LINE_RED_ORDER } from '@/data/locations';

const BASE_URL = 'http://localhost:3000';

interface QRItemProps {
  url: string;
  label: string;
  sublabel?: string;
  color: string;
}

function QRItem({ url, label, sublabel, color }: QRItemProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: 180,
      margin: 2,
      color: { dark: '#1A1A2E', light: '#ffffff' },
    });
  }, [url]);

  return (
    <div style={{
      border: `2px solid ${color}`, borderRadius: 16, padding: 16,
      textAlign: 'center', width: 220, background: '#fff',
      breakInside: 'avoid', pageBreakInside: 'avoid',
    }}>
      <canvas ref={canvasRef} style={{ borderRadius: 8, display: 'block', margin: '0 auto' }} />
      <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: '#1A1A2E' }}>{label}</div>
      {sublabel && <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>{sublabel}</div>}
      <div style={{ fontSize: 10, color: '#bbb', marginTop: 6, wordBreak: 'break-all', lineHeight: 1.4 }}>{url}</div>
    </div>
  );
}

export default function QRAdminPage() {
  const startItems = [
    { url: `${BASE_URL}/start/blue`, label: 'Залізничний вокзал', color: '#2563EB' },
    { url: `${BASE_URL}/start/red`,  label: 'Автовокзал',         color: '#DC2626' },
  ];

  return (
    <main style={{ padding: 32, maxWidth: 1000, margin: '0 auto', fontFamily: 'sans-serif' }}>

      {/* Хедер */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1A1A2E', marginBottom: 6 }}>
          QR-коди для друку
        </h1>
        <p style={{ color: '#888', fontSize: 14 }}>
          Відкрий у браузері і надрукуй — <kbd style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>Ctrl+P</kbd>
        </p>
      </div>

      {/* Стартові */}
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#555', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#2563EB' }}/>
        Стартові QR — розмістити на вокзалах
      </h2>
      <div style={{ display: 'flex', gap: 20, marginBottom: 48, flexWrap: 'wrap' }}>
        {startItems.map(item => (
          <QRItem key={item.url} {...item} />
        ))}
      </div>

      {/* Локації */}
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#555' }}>
        Локації — розмістити на об'єктах
      </h2>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {LOCATIONS.map(loc => {
          const inBlue = LINE_BLUE_ORDER.includes(loc.slug);
          const inRed  = LINE_RED_ORDER.includes(loc.slug);
          const color  = loc.type === 'finish' ? '#7F77DD'
                       : loc.type === 'shared' ? '#2D7A4F'
                       : inBlue ? '#2563EB' : '#DC2626';
          return (
            <QRItem
              key={loc.slug}
              url={`${BASE_URL}/spot/${loc.slug}`}
              label={loc.name}
              sublabel={loc.address}
              color={color}
            />
          );
        })}
      </div>

      {/* Друк стилі */}
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