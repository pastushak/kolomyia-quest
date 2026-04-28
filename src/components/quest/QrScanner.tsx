'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  onScan: (url: string) => void;
  onClose: () => void;
}

export default function QrScanner({ onScan, onClose }: Props) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const rafRef      = useRef<number>(0);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    startScanner();
    return () => stopScanner();
  }, []);

  async function startScanner() {
    // Перевіряємо підтримку BarcodeDetector
    if (!('BarcodeDetector' in window)) {
      setError('Ваш браузер не підтримує сканер QR. Спробуйте Chrome на Android.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScanning(true);
        detectLoop();
      }
    } catch (err) {
      setError('Немає доступу до камери. Дозволь доступ у налаштуваннях браузера.');
    }
  }

  async function detectLoop() {
    if (!videoRef.current || !scanning) return;

    try {
      // @ts-ignore — BarcodeDetector не в TS типах але є в Chrome
      const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });

      const scan = async () => {
        if (!videoRef.current) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            stopScanner();
            onScan(barcodes[0].rawValue);
            return;
          }
        } catch {}
        rafRef.current = requestAnimationFrame(scan);
      };

      rafRef.current = requestAnimationFrame(scan);
    } catch {
      setError('Помилка ініціалізації сканера.');
    }
  }

  function stopScanner() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }

  if (error) {
    return (
      <div style={{ background: '#1a1a2e', borderRadius: 16, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📷</div>
        <div style={{ fontSize: 14, color: '#fff', marginBottom: 8 }}>{error}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
          Або введи URL вручну
        </div>
        <ManualInput onScan={onScan} />
        <button
          onClick={onClose}
          style={{ marginTop: 12, width: '100%', padding: '10px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
        >
          Закрити
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', background: '#000', borderRadius: 16, overflow: 'hidden' }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: '100%', display: 'block', maxHeight: 300, objectFit: 'cover' }}
      />

      {/* Прицільна рамка */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{
          width: 200, height: 200,
          border: '2px solid rgba(255,255,255,0.8)',
          borderRadius: 16,
          boxShadow: '0 0 0 2000px rgba(0,0,0,0.4)',
        }}>
          {/* Кутики */}
          {[
            { top: -2, left: -2, borderTop: '4px solid #E8A020', borderLeft: '4px solid #E8A020', borderRadius: '4px 0 0 0' },
            { top: -2, right: -2, borderTop: '4px solid #E8A020', borderRight: '4px solid #E8A020', borderRadius: '0 4px 0 0' },
            { bottom: -2, left: -2, borderBottom: '4px solid #E8A020', borderLeft: '4px solid #E8A020', borderRadius: '0 0 0 4px' },
            { bottom: -2, right: -2, borderBottom: '4px solid #E8A020', borderRight: '4px solid #E8A020', borderRadius: '0 0 4px 0' },
          ].map((s, i) => (
            <div key={i} style={{ position: 'absolute', width: 20, height: 20, ...s as any }} />
          ))}
        </div>
      </div>

      {/* Кнопка закрити */}
      <button
        onClick={() => { stopScanner(); onClose(); }}
        style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,.6)', border: 'none', color: '#fff', borderRadius: '50%', width: 32, height: 32, fontSize: 16, cursor: 'pointer' }}
      >
        ✕
      </button>

      <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,.7)' }}>
        Наведи камеру на QR-код
      </div>
    </div>
  );
}

// Fallback — ручне введення URL
function ManualInput({ onScan }: { onScan: (url: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Вклади URL або slug..."
        style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 13, outline: 'none' }}
      />
      <button
        onClick={() => value.trim() && onScan(value.trim())}
        style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: '#E8A020', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
      >
        →
      </button>
    </div>
  );
}