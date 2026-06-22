'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import QRCode from 'qrcode';
import { lineColor } from '@/lib/utils';

interface Redemption {
  _id:       string;
  itemId:    { name: string; emoji: string; discountText: string; category: string };
  code:      string;
  xpSpent:   number;
  isUsed:    boolean;
  createdAt: string;
}

interface CardData {
  name:           string;
  email:          string;
  avatarUrl:      string;
  totalXp:        number;
  completedLines: { line: string; completedAt: string }[];
  stats:          { totalSessions: number; totalLocations: number };
  redemptions:    Redemption[];
}

export default function TravelerCardPage() {
  const router = useRouter();
  const { data: authSession, status } = useSession();
  const qrRef  = useRef<HTMLCanvasElement>(null);

  const [cardData, setCardData] = useState<CardData | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/'); return; }
    if (status === 'authenticated') {
      fetch('/api/profile')
        .then(r => r.json())
        .then(async data => {
          // Також завантажуємо купони
          const rRes = await fetch('/api/shop/redemptions');
          const redemptions = rRes.ok ? await rRes.json() : [];
          setCardData({ ...data, redemptions });
          setLoading(false);
        });
    }
  }, [status]);

  // Генеруємо QR-код картки
  useEffect(() => {
    if (!qrRef.current || !authSession?.user?.id) return;
    const cardUrl = `${window.location.origin}/verify/${authSession.user.id}`;
    QRCode.toCanvas(qrRef.current, cardUrl, {
      width: 120, margin: 1,
      color: { dark: '#1a1a2e', light: '#ffffff' },
    });
  }, [cardData, authSession]);

  if (status === 'loading' || loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 36, height: 36, border: '3px solid #eee', borderTopColor: '#89182c', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!authSession) {
    return (
      <main style={{ minHeight: '100vh', background: '#faf8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🪪</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1a1a2e', marginBottom: 8 }}>Картка мандрівника</div>
          <div style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>Увійдіть щоб отримати свою картку</div>
          <button onClick={() => signIn('google')} style={{ padding: '12px 24px', borderRadius: 14, border: 'none', background: '#89182c', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Увійти через Google
          </button>
        </div>
      </main>
    );
  }

  if (!cardData) return null;

  return (
    <main style={{ minHeight: '100vh', background: '#faf8f5', paddingBottom: 60 }}>

      <div style={{ background: 'linear-gradient(160deg, #89182c 0%, #5a0f1d 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 24px 24px' }}>
          <button onClick={() => router.push('/profile')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}>
            ← Назад
          </button>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#e28f27', marginBottom: 6 }}>Посвідчення</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>Картка Мандрівника</div>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 16px 0' }}>

        {/* Головна картка */}
        <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2d1f4e 100%)', borderRadius: 24, padding: 24, marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Картка мандрівника · Коломия</div>
              {cardData.avatarUrl ? (
                <img src={cardData.avatarUrl} alt="avatar" style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', marginBottom: 8 }} />
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 8 }}>👤</div>
              )}
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 2 }}>{cardData.name}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{cardData.email}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <canvas ref={qrRef} style={{ borderRadius: 10, display: 'block', background: '#fff', padding: 4 }} />
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>QR-код</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#f5c04a' }}>{cardData.totalXp}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>XP балів</div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>{cardData.stats.totalLocations}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Локацій</div>
            </div>
            <div>
              <div style={{ display: 'flex', gap: 5, marginBottom: 3 }}>
                {['cherry', 'orange', 'green'].map(line => (
                  <div key={line} style={{ width: 10, height: 10, borderRadius: '50%', background: lineColor(line), opacity: cardData.completedLines.some(l => l.line === line) ? 1 : 0.2 }} />
                ))}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Маршрути</div>
            </div>
          </div>
        </div>

        {/* Активовані купони */}
        {cardData.redemptions && cardData.redemptions.length > 0 && (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#89182c', marginBottom: 12 }}>Активовані знижки</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {cardData.redemptions.map(r => (
                <div key={r._id} style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 24, flexShrink: 0 }}>{r.itemId?.emoji ?? '🎫'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', marginBottom: 2 }}>{r.itemId?.name ?? 'Купон'}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{r.itemId?.discountText}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#89182c', fontFamily: 'monospace', marginBottom: 2 }}>{r.code}</div>
                    <div style={{ fontSize: 10, color: r.isUsed ? '#888' : '#2D7A4F', fontWeight: 600 }}>
                      {r.isUsed ? 'Використано' : '● Активний'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Кнопка магазину */}
        <button
          onClick={() => router.push('/shop')}
          style={{ width: '100%', padding: 14, borderRadius: 16, border: 'none', background: '#89182c', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
        >
          🏪 Перейти до магазину привілеїв
        </button>

      </div>
    </main>
  );
}