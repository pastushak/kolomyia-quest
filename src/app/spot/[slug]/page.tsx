'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSession, completeSpot, trackQrScan, switchLine } from '@/lib/session';
import { LINE_COLOR, LINE_LABEL, getNextSlug, getQuizForLine } from '@/lib/utils';
import { Location } from '@/types';
import HudzykMascot from '@/components/quest/HudzykMascot';
import LocationCard from '@/components/quest/LocationCard';
import QuizCard from '@/components/quest/QuizCard';
import dynamic from 'next/dynamic';

const QrScanner = dynamic(() => import('@/components/quest/QrScanner'), { ssr: false });

type Stage = 'info' | 'quiz';

export default function SpotPage() {
  const params = useParams();
  const router = useRouter();
  const slug   = params.slug as string;

  const [session, setSession]     = useState(getSession());
  const [spot, setSpot]           = useState<Location | null>(null);
  const [order, setOrder]         = useState<string[]>([]);
  const [stage, setStage]         = useState<Stage>('info');
  const [loading, setLoading]     = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [mounted, setMounted]     = useState(false);

  useEffect(() => {
    setMounted(true);
    const s = getSession();
    if (!s) { router.push('/'); return; }
    setSession(s);

    // Завантажуємо спот і порядок лінії паралельно
    Promise.all([
      fetch(`/api/spots/${slug}`).then(r => r.json()),
      fetch(`/api/lines/${s.line}`).then(r => r.json()),
    ]).then(([spotData, lineData]) => {
      setSpot(spotData);
      setOrder(lineData.order);
      setLoading(false);

      // Якщо вже пройдено — переходимо далі
      if (s.completedSlugs.includes(slug)) {
        const next = getNextSlug(lineData.order, slug);
        if (next) router.push(`/spot/${next}`);
        else router.push('/finish');
      }
    }).catch(() => setLoading(false));
  }, [slug]);

  if (!mounted || !session) return null;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 36, height: 36, border: '3px solid #eee', borderTopColor: LINE_COLOR[session.line], borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ fontSize: 14, color: '#888' }}>Завантаження...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!spot) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 32 }}>⚠️</div>
      <div style={{ fontSize: 15, color: '#1A1A2E' }}>Локацію не знайдено</div>
      <button onClick={() => router.push('/')} style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: '#89182c', color: '#fff', cursor: 'pointer' }}>На головну</button>
    </div>
  );

  const line        = session.line;
  const color       = LINE_COLOR[line];
  const spotIndex   = order.indexOf(slug);
  const spotNumber  = spotIndex + 1;
  const quiz        = getQuizForLine(spot, line);
  const xpReward    = 100;
  const hudzykMood  = stage === 'quiz' ? 'curious' : 'guide';
  const hudzykMsg   = stage === 'quiz' ? 'Відповідай!' : `Точка ${spotNumber}!`;

  function handleQrScan(text: string) {
    setShowScanner(false);
    try {
      // Спробуємо розпарсити як URL
      let scannedSlug = text.trim();
      if (text.startsWith('http')) {
        const parts = new URL(text).pathname.split('/').filter(Boolean);
        scannedSlug = parts[parts.length - 1];
      }
      // Якщо slug містить /spot/ або /info/ — беремо останню частину
      if (scannedSlug.includes('/')) {
        scannedSlug = scannedSlug.split('/').filter(Boolean).pop() ?? scannedSlug;
      }
      if (scannedSlug === slug) {
        trackQrScan(slug);   // реальний скан саме цієї точки
        setStage('quiz');
      } else {
        router.push(`/spot/${scannedSlug}`);
      }
    } catch { alert('Невірний QR-код'); }
  }

  async function handleQuizComplete() {
    await completeSpot(slug, xpReward);
    const s = getSession();
    if (s) setSession(s);
    const next = getNextSlug(order, slug);
    if (next) router.push(`/spot/${next}`);
    else router.push('/finish');
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F7F7FC', paddingBottom: 40 }}>

      <div style={{ background: '#fff', borderBottom: '1px solid #EEEEF5', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => router.push(`/start/${line}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#8888A8' }}>←</button>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E' }}>{LINE_LABEL[line]}</span>
        <div style={{ marginLeft: 'auto', background: '#FEF7E6', border: '1px solid #F5D78A', borderRadius: 20, padding: '4px 12px', fontSize: 13, fontWeight: 700, color: '#8B6914' }}>
          {session.xp} XP
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px' }}>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <HudzykMascot mood={hudzykMood} message={hudzykMsg} size={100} />
        </div>

        <div style={{ display: 'flex', background: '#EEEEF5', borderRadius: 14, padding: 4, marginBottom: 16 }}>
          {(['info', 'quiz'] as Stage[]).map(s => (
            <button key={s} onClick={() => setStage(s)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, background: stage === s ? '#fff' : 'transparent', color: stage === s ? '#1A1A2E' : '#8888A8' }}>
              {s === 'info' ? 'Про місце' : 'Квіз'}
            </button>
          ))}
        </div>

        {showScanner && (
          <div style={{ marginBottom: 16 }}>
            <QrScanner onScan={handleQrScan} onClose={() => setShowScanner(false)} />
          </div>
        )}

        {stage === 'info' ? (
          <LocationCard
            name={spot.name}
            address={spot.address}
            info={spot.info}
            audioUrl={spot.audioUrl}
            qrHint={spot.qrHint}
            spotNumber={spotNumber}
            totalSpots={order.length}
            lineColor={color}
            onReady={() => setStage('quiz')}
            onScan={() => setShowScanner(true)}
          />
        ) : (
          quiz ? (
            <QuizCard
              questions={[{
                question:     quiz.question,
                options:      quiz.options,
                correctIndex: quiz.correctIndex,
                explanation:  quiz.explanation,
              }]}
              lineColor={color}
              xpReward={xpReward}
              onComplete={handleQuizComplete}
            />
          ) : (
            // Квіз ще не готовий — показуємо placeholder
            <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #EEEEF5', padding: 28, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔧</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1A1A2E', marginBottom: 8 }}>Квіз скоро буде!</div>
              <div style={{ fontSize: 14, color: '#8888A8', marginBottom: 24, lineHeight: 1.6 }}>
                Команда вже готує цікаві питання<br />про це місце. Заходь пізніше!
              </div>
              <button
                onClick={handleQuizComplete}
                style={{ width: '100%', padding: 16, borderRadius: 16, border: 'none', background: color, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
              >
                Продовжити без квізу →
              </button>
            </div>
          )
        )}

        {/* Пересадки */}
        {spot.transfers.length > 0 && (
          <div style={{ marginTop: 16, background: '#fff', border: '1px solid #EEEEF5', borderRadius: 20, padding: '18px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#8B6914', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              🚇 Пересадка доступна з цієї точки
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {spot.transfers
                .filter(t => t !== line)
                .map(t => (
                  <button
                    key={t}
                    onClick={() => {
                      if (confirm(`Пересісти на ${LINE_LABEL[t]}? Твій поточний прогрес збережеться.`)) {
                        fetch(`/api/lines/${t}`)
                          .then(r => r.json())
                          .then(data => {
                            switchLine(t as any, slug, data.order);
                            router.push(`/start/${t}`);
                          });
                      }
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', borderRadius: 14, border: `2px solid ${LINE_COLOR[t]}20`,
                      background: LINE_COLOR[t] + '10', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: LINE_COLOR[t], flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: LINE_COLOR[t] }}>
                        {LINE_LABEL[t]}
                      </div>
                      <div style={{ fontSize: 11, color: '#8888A8' }}>
                        Натисни щоб пересісти на цю лінію
                      </div>
                    </div>
                    <span style={{ fontSize: 18 }}>→</span>
                  </button>
                ))}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}