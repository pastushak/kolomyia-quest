'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { getSession } from '@/lib/session';

interface ShopItem {
  _id:          string;
  name:         string;
  category:     string;
  description:  string;
  address:      string;
  phone:        string;
  hours:        string;
  website:      string;
  emoji:        string;
  type:         'info' | 'discount' | 'freebie';
  discountText: string;
  xpCost:       number;
  isActive:     boolean;
}

interface ShopData {
  items:             ShopItem[];
  userXp:            number;
  activeRedemptions: { itemId: string; expiresAt: string }[];
  isLoggedIn:        boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  cafe:       '☕ Кафе',
  restaurant: '🍽️ Ресторани',
  hotel:      '🏨 Готелі',
  hostel:     '🛏️ Хостели',
  shop:       '🛍️ Магазини',
  mall:       '🏬 ТРЦ',
};

const TYPE_LABELS: Record<string, string> = {
  info:     'Інформаційна картка',
  discount: 'Знижка',
  freebie:  'Безкоштовно',
};

function getActiveRedemption(
  itemId: string,
  active: { itemId: string; expiresAt: string }[] | undefined,
): { expiresAt: string } | null {
  return active?.find(r => r.itemId === itemId) ?? null;
}

function formatRemaining(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Термін вийшов';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours >= 1) return `ще ${hours} год`;
  const mins = Math.max(1, Math.floor(ms / (1000 * 60)));
  return `ще ${mins} хв`;
}

export default function ShopPage() {
  const router = useRouter();
  const { data: authSession, status } = useSession();

  const [data, setData]         = useState<ShopData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');
  const [activating, setActivating] = useState<string | null>(null);
  const [modal, setModal]       = useState<{ code: string; itemName: string } | null>(null);
  const [questLine, setQuestLine] = useState<string | null>(null);   // активна лінія квеста (localStorage)

  useEffect(() => { const s = getSession(); setQuestLine(s?.line ?? null); }, []);

  useEffect(() => { loadShop(); }, [status]);

  async function loadShop() {
    setLoading(true);
    const res  = await fetch('/api/shop');
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  async function handleRedeem(item: ShopItem) {
    if (!data?.isLoggedIn) { signIn('google'); return; }
    if (data.userXp < item.xpCost) return;

    setActivating(item._id);
    const res = await fetch('/api/shop/redeem', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ itemId: item._id }),
    });
    const json = await res.json();
    setActivating(null);

    if (res.ok) {
      // Нова активація — показуємо купон
      setModal({ code: json.code, itemName: item.name });
      await loadShop();
    } else if (res.status === 409) {
      // Картка вже активна — просто оновлюємо стан (картка покаже відлік)
      await loadShop();
    }
  }

  const categories = data ? ['all', ...Array.from(new Set(data.items.map(i => i.category)))] : ['all'];
  const filtered   = data?.items.filter(i => filter === 'all' || i.category === filter) ?? [];
  const infoItems = filtered.filter(i => i.type === 'info');
  const xpItems   = filtered.filter(i => i.type !== 'info');

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 36, height: 36, border: '3px solid #eee', borderTopColor: '#89182c', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <main style={{ minHeight: '100vh', background: '#faf8f5', paddingBottom: 60 }}>

      {/* Хедер */}
      <div style={{ background: 'linear-gradient(160deg, #89182c 0%, #5a0f1d 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 24px 28px' }}>
          <button onClick={() => router.push(questLine ? `/start/${questLine}` : '/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}>
            ← {questLine ? 'Повернутися до квесту' : 'Назад'}
          </button>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 4 }}>🏪 Привілеї мандрівника</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Знижки та переваги для туристів Коломиї</div>
          {data?.isLoggedIn ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '6px 14px', marginTop: 12, fontSize: 14, fontWeight: 700, color: '#f5c04a' }}>
              ⭐ {data.userXp} XP · доступно
            </div>
          ) : (
            <button onClick={() => signIn('google')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 20, padding: '8px 16px', marginTop: 12, fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
              Увійти для активації знижок
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 16px 0' }}>

        {/* Картка мандрівника — тільки для авторизованих */}
        {data?.isLoggedIn && (
          <div
            onClick={() => router.push('/card')}
            style={{ background: 'linear-gradient(135deg, #1a1a2e, #2d1f4e)', borderRadius: 20, padding: 20, marginBottom: 16, cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Картка мандрівника</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{authSession?.user?.name?.split(' ')[0]}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#f5c04a' }}>{data.userXp}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>XP балів</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Натисни щоб відкрити картку →</div>
              <div style={{ fontSize: 20 }}>📱</div>
            </div>
          </div>
        )}

        {/* Фільтри */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)} style={{ padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${filter === cat ? '#89182c' : '#f0ece6'}`, background: filter === cat ? '#89182c' : '#fff', color: filter === cat ? '#fff' : '#666', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {cat === 'all' ? 'Всі' : CATEGORY_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>

        {/* Немає позицій */}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#888' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🏪</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 6 }}>Скоро тут з'являться партнери</div>
            <div style={{ fontSize: 13 }}>Команда наповнює магазин локальними закладами Коломиї</div>
          </div>
        )}

        {/* Інформаційні картки */}
        {infoItems.length > 0 && (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#89182c', marginBottom: 12 }}>Корисні місця</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {infoItems.map(item => <ShopCard key={item._id} item={item} userXp={data?.userXp ?? 0} redemption={getActiveRedemption(item._id, data?.activeRedemptions)} isLoggedIn={data?.isLoggedIn ?? false} activating={activating === item._id} onRedeem={() => handleRedeem(item)} />)}
            </div>
          </>
        )}

        {/* XP знижки */}
        {xpItems.length > 0 && (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#89182c', marginBottom: 12 }}>Знижки за XP</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {xpItems.map(item => <ShopCard key={item._id} item={item} userXp={data?.userXp ?? 0} redemption={getActiveRedemption(item._id, data?.activeRedemptions)} isLoggedIn={data?.isLoggedIn ?? false} activating={activating === item._id} onRedeem={() => handleRedeem(item)} />)}
            </div>
          </>
        )}

      </div>

      {/* Модал з купоном */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 28, width: '100%', maxWidth: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1a1a2e', marginBottom: 8 }}>Купон активовано!</div>
            <div style={{ fontSize: 14, color: '#888', marginBottom: 20 }}>{modal.itemName}</div>
            <div style={{ background: '#faf8f5', borderRadius: 16, padding: '20px', marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 8, fontWeight: 600 }}>ВАШ КОД</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#89182c', letterSpacing: 3, fontFamily: 'monospace' }}>{modal.code}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>Покажіть цей код касиру</div>
            </div>
            <button onClick={() => setModal(null)} style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', background: '#89182c', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              Зрозуміло
            </button>
          </div>
        </div>
      )}

    </main>
  );
}

function ShopCard({ item, userXp, redemption, isLoggedIn, activating, onRedeem }: {
  item: ShopItem; userXp: number; redemption: { expiresAt: string } | null; isLoggedIn: boolean; activating: boolean; onRedeem: () => void;
}) {
  const canAfford = userXp >= item.xpCost;
  const isActive  = !!redemption;

  return (
    <div style={{ background: '#fff', borderRadius: 18, padding: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', opacity: isActive ? 0.75 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: '#faf8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
          {item.emoji}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 2 }}>{item.name}</div>
          <div style={{ fontSize: 11, color: '#888' }}>{CATEGORY_LABELS[item.category] ?? item.category} · {item.address}</div>
        </div>
      </div>

      <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5, marginBottom: 10 }}>{item.description}</div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {item.phone && <span style={{ fontSize: 11, color: '#666', background: '#faf8f5', borderRadius: 8, padding: '4px 8px' }}>📞 {item.phone}</span>}
        {item.hours && <span style={{ fontSize: 11, color: '#666', background: '#faf8f5', borderRadius: 8, padding: '4px 8px' }}>🕐 {item.hours}</span>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 10, background: item.type === 'info' ? '#e8f0ff' : '#f5e0e3', color: item.type === 'info' ? '#2563EB' : '#89182c' }}>
          {item.type === 'info' ? `Інфо · ${item.xpCost} XP` : `${item.discountText} · ${item.xpCost} XP`}
        </span>

        {isActive ? (
          <span style={{ fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 12, background: '#E8F5EE', color: '#2D7A4F' }}>
            ✓ Активовано · {formatRemaining(redemption!.expiresAt)}
          </span>
        ) : !isLoggedIn ? (
          <button onClick={onRedeem} style={{ padding: '7px 14px', borderRadius: 12, border: 'none', background: '#89182c', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Увійти
          </button>
        ) : !canAfford ? (
          <span style={{ fontSize: 12, color: '#888' }}>Потрібно {item.xpCost} XP</span>
        ) : (
          <button onClick={onRedeem} disabled={activating} style={{ padding: '7px 14px', borderRadius: 12, border: 'none', background: '#89182c', color: '#fff', fontSize: 13, fontWeight: 700, cursor: activating ? 'wait' : 'pointer' }}>
            {activating ? '...' : 'Активувати'}
          </button>
        )}
      </div>
    </div>
  );
}