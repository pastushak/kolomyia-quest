'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSession, completeSpot, trackQrScan } from '@/lib/session';
import { getLocationBySlug, getNextSlug, LINE_COLOR, LINE_LABEL, getLineLocations } from '@/lib/utils';
import HudzykMascot from '@/components/quest/HudzykMascot';
import LocationCard from '@/components/quest/LocationCard';
import QuizCard from '@/components/quest/QuizCard';

type Stage = 'info' | 'quiz';

export default function SpotPage() {
  const params  = useParams();
  const router  = useRouter();
  const slug    = params.slug as string;
  const [session, setSession] = useState(getSession());
  const [stage, setStage]     = useState<Stage>('info');
  const [mounted, setMounted] = useState(false);

  const loc = getLocationBySlug(slug);

  useEffect(() => {
    setMounted(true);
    const s = getSession();
    if (!s || !loc) { router.push('/'); return; }
    setSession(s);

    trackQrScan(slug);

    if (s.completedSlugs.includes(slug)) {
      const next = getNextSlug(s.line, slug);
      if (next) router.push(`/spot/${next}`);
      else router.push('/finish');
    }
  }, [slug]);

  if (!mounted || !session || !loc) return null;

  const line       = session.line;
  const color      = LINE_COLOR[line];
  const allLocs    = getLineLocations(line);
  const spotIndex  = allLocs.findIndex(l => l.slug === slug);
  const spotNumber = spotIndex + 1;
  const xpReward   = 100 + loc.quiz.length * 50;

  async function handleQuizComplete() {
    await completeSpot(slug, xpReward);
    const s = getSession();
    if (s) setSession(s);
    const next = getNextSlug(session.line, slug);
    if (next) router.push(`/spot/${next}`);
    else router.push('/finish');
  }

  const hudzykMood = stage === 'quiz' ? 'curious' : 'guide';
  const hudzykMsg  = stage === 'quiz' ? 'Відповідай!' : `Точка ${spotNumber}!`;

  return (
    <main style={{ minHeight: '100vh', background: '#F7F7FC', paddingBottom: 40 }}>

      <div style={{ background: '#fff', borderBottom: '1px solid #EEEEF5', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => router.push(`/start/${line}`)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#8888A8' }}>
          ←
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E' }}>{LINE_LABEL[line]}</span>
        </div>
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
            <button
              key={s}
              onClick={() => setStage(s)}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 700, transition: 'all .15s',
                background: stage === s ? '#fff' : 'transparent',
                color: stage === s ? '#1A1A2E' : '#8888A8',
              }}
            >
              {s === 'info' ? 'Про місце' : 'Квіз'}
            </button>
          ))}
        </div>

        {stage === 'info' ? (
          <LocationCard
            name={loc.name}
            address={loc.address}
            info={loc.info}
            qrHint={loc.qrHint}
            spotNumber={spotNumber}
            totalSpots={allLocs.length}
            lineColor={color}
            onReady={() => setStage('quiz')}
          />
        ) : (
          <QuizCard
            questions={loc.quiz}
            lineColor={color}
            xpReward={xpReward}
            onComplete={handleQuizComplete}
          />
        )}
      </div>
    </main>
  );
}