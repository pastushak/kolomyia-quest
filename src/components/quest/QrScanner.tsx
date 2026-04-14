'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface Props {
  onScan: (url: string) => void;
  onClose: () => void;
}

export default function QrScanner({ onScan, onClose }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 220, height: 220 } },
      (decodedText) => {
        scanner.stop();
        onScan(decodedText);
      },
      undefined
    ).catch(() => {
      setError('Немає доступу до камери. Дозволь доступ у браузері.');
    });

    return () => {
      scanner.stop().catch(() => {});
    };
  }, []);

  return (
    <div style={{ position: 'relative', background: '#000', borderRadius: 16, overflow: 'hidden' }}>
      <div id="qr-reader" style={{ width: '100%' }} />

      {error && (
        <div style={{ padding: 16, textAlign: 'center', color: '#fff', fontSize: 13 }}>
          {error}
          <br />
          <button
            onClick={onClose}
            style={{ marginTop: 10, padding: '8px 20px', borderRadius: 10, border: 'none', background: '#E8A020', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
          >
            Закрити
          </button>
        </div>
      )}

      <button
        onClick={onClose}
        style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,.5)', border: 'none', color: '#fff', borderRadius: '50%', width: 32, height: 32, fontSize: 16, cursor: 'pointer' }}
      >
        ✕
      </button>

      <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,.6)' }}>
        Наведи камеру на QR-код
      </div>
    </div>
  );
}