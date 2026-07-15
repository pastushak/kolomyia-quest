'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSession, completeSpot, trackQrScan, switchLine, isUnlocked } from '@/lib/session';
import { lineColor, lineLabel, ensureLinesRegistered, getNextSlug, getQuizForLine } from '@/lib/utils';
import { Location, Line } from '@/types';
import HudzykMascot from '@/components/quest/HudzykMascot';
import LocationCard from '@/components/quest/LocationCard';
import QuizCard from '@/components/quest/QuizCard';
import dynamic from 'next/dynamic';

const MapView   = dynamic(() => import('@/components/map/MapView'), { ssr: false });



export default function SpotPage() {
  const params = useParams();
  const router = useRouter();
  const slug   = params.slug as string;

  const [session, setSession]     = useState(getSession());
  const [spot, setSpot]           = useState<Location | null>(null);
  const [order, setOrder]         = useState<string[]>([]);
  const [showQuiz, setShowQuiz]   = useState(false);   // турист перейшов до квіза (після воріт)
  const [unlocked, setUnlocked]   = useState(false);   // ворота пройдено (скан + «Ого»)
  const [showMap, setShowMap]     = useState(true);    // карта розгорнута/згорнута
  const [loading, setLoading]     = useState(true);
  // Запасний вхід: код з таблички, якщо камера не спрацювала (актуально для iPhone)
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeValue, setCodeValue]         = useState('');
  const [codeError, setCodeError]         = useState('');
  const [codeBusy, setCodeBusy]           = useState(false);
  const [mounted, setMounted]     = useState(false);
  const [quizDone, setQuizDone]   = useState(false);   // квіз пройдено — показуємо вибір далі/пересадка
  const [switching, setSwitching] = useState(false);   // йде процес пересадки
  const [nextSpot, setNextSpot]   = useState<Location | null>(null);   // наступна точка (для карти)
  const [userPos, setUserPos]     = useState<[number, number] | null>(null);   // GPS «ви тут»

  useEffect(() => {
    setMounted(true);
    const s = getSession();
    if (!s) { router.push('/'); return; }
    setSession(s);
    ensureLinesRegistered();   // кольори/назви всіх ліній (для пересадок на чужі лінії)
    setUnlocked(isUnlocked(slug));   // турист міг повернутись з info-сторінки вже розблокованим

    // Завантажуємо спот і порядок лінії паралельно
    Promise.all([
      fetch(`/api/spots/${slug}`).then(r => r.json()),
      fetch(`/api/lines/${s.line}`).then(r => r.json()),
    ]).then(([spotData, lineData]) => {
      setSpot(spotData);
      setOrder(lineData.order);
      setLoading(false);

      // Довантажуємо наступну точку (для карти «куди йти»)
      const nx = getNextSlug(lineData.order, slug);
      if (nx) fetch(`/api/spots/${nx}`).then(r => r.json()).then(setNextSpot).catch(() => {});

      // Якщо вже пройдено — переходимо далі
      if (s.completedSlugs.includes(slug)) {
        const next = getNextSlug(lineData.order, slug);
        if (next) router.push(`/spot/${next}`);
        else router.push('/finish');
      }
    }).catch(() => setLoading(false));
  }, [slug]);

  // ── GPS «ви тут» — спостерігаємо за позицією туриста ──
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      pos => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      ()  => setUserPos(null),   // відмова/помилка — просто без крапки, карта працює
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // Питання обираємо ОДИН раз на спот+лінію. Без useMemo зважений рандом
  // прокручувався на кожному ререндері (напр. при невірній відповіді) —
  // питання «стрибали» й ламали драбину спроб 100/50/25.
  // Хук стоїть ДО early-return'ів нижче: порядок хуків має бути незмінним.
  const quiz = useMemo(
    () => (spot && session ? getQuizForLine(spot, session.line) : null),
    [spot?.slug, spot?.quizzes, session?.line],
  );

  if (!mounted || !session) return null;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 36, height: 36, border: '3px solid #eee', borderTopColor: lineColor(session.line), borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
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
  const color       = lineColor(line);
  const spotIndex   = order.indexOf(slug);
  const spotNumber  = spotIndex + 1;
  const hudzykMood  = showQuiz ? 'curious' : 'guide';
  const hudzykMsg   = showQuiz ? 'Відповідай!' : `Точка ${spotNumber}!`;

  // Код з таблички → знаходимо спот → далі рівно та сама логіка, що й після скану QR.
  async function handleCodeSubmit() {
    const code = codeValue.trim().toUpperCase();
    if (code.length !== 6) { setCodeError('Код складається з 6 символів'); return; }

    setCodeBusy(true); setCodeError('');
    try {
      const res  = await fetch(`/api/spots/by-code?code=${encodeURIComponent(code)}`);
      const data = await res.json();

      if (!res.ok) { setCodeError(data.error || 'Не вдалося перевірити код'); setCodeBusy(false); return; }

      const foundSlug: string = data.slug;
      if (foundSlug === slug) {
        trackQrScan(slug);              // присутність підтверджено — так само, як сканом
        router.push(`/info/${slug}`);   // ті самі ворота: інфо → «Ого, цікаво» → квіз
      } else {
        router.push(`/spot/${foundSlug}`);   // код іншої локації — ведемо туди
      }
    } catch {
      setCodeError('Помилка мережі. Спробуй ще раз.');
      setCodeBusy(false);
    }
  }

  async function handleQuizComplete(serverXp: number) {
    await completeSpot(slug, serverXp);
    const s = getSession();
    if (s) setSession(s);

    // Чи є куди пересідати з цієї точки (окрім поточної лінії)?
    const canTransfer = (spot?.transfers ?? []).some(t => t !== line);

    if (canTransfer) {
      // Спільна точка — НЕ йдемо одразу далі. Показуємо екран вибору: далі цією лінією чи пересадка.
      setQuizDone(true);
    } else {
      // Звичайна точка — одразу далі.
      goNextSameLine();
    }
  }

  // Продовжити поточною лінією (звичайний перехід до наступної точки).
  function goNextSameLine() {
    const next = getNextSlug(order, slug);
    if (next) router.push(`/spot/${next}`);
    else router.push('/finish');
  }

  // Пересадка на іншу лінію зі спільної точки.
  async function handleTransfer(toLine: Line) {
    if (!session?.userId) {
      alert('Щоб пересідати між лініями, потрібно увійти через Google.');
      return;
    }
    if (!confirm(`Пересісти на ${lineLabel(toLine)}? Перехід коштує 50 XP. Точки до місця пересадки на старій лінії лишаться непройденими.`)) {
      return;
    }

    setSwitching(true);
    // switchLine: списує -50 серверно, оновлює гілки, зараховує спільну точку обом гілкам.
    const result = await switchLine(toLine as any, slug);
    setSwitching(false);

    if (!result.ok) {
      if (result.reason === 'insufficient_xp') alert('Недостатньо XP для пересадки (потрібно 50).');
      else if (result.reason === 'auth_required') alert('Щоб пересідати, потрібно увійти через Google.');
      else alert('Не вдалося виконати пересадку. Спробуй ще раз.');
      return;
    }

    // Успіх — визначаємо наступну точку НОВОЇ лінії (після спільної точки в її order).
    try {
      const lineData = await fetch(`/api/lines/${toLine}`).then(r => r.json());
      const next = getNextSlug(lineData.order, slug);
      if (next) router.push(`/spot/${next}`);
      else router.push('/finish');
    } catch {
      alert('Пересадка виконана, але не вдалося завантажити нову лінію. Повтори з мапи.');
      router.push(`/start/${toLine}`);
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F7F7FC', paddingBottom: 40 }}>

      <div style={{ background: '#fff', borderBottom: '1px solid #EEEEF5', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => router.push(`/start/${line}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#8888A8' }}>←</button>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E' }}>{lineLabel(line)}</span>
        <div style={{ marginLeft: 'auto', background: '#FEF7E6', border: '1px solid #F5D78A', borderRadius: 20, padding: '4px 12px', fontSize: 13, fontWeight: 700, color: '#8B6914' }}>
          {session.xp} XP
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px' }}>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <HudzykMascot mood={hudzykMood} message={hudzykMsg} size={100} />
        </div>

        {/* ── Карта (перший блок, згортається) ── */}
        {spot.lat && spot.lng && (
          <div style={{ marginBottom: 16 }}>
            <button
              onClick={() => setShowMap(m => !m)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, border: '1.5px solid #EEEEF5', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#1A1A2E' }}
            >
              <span>🗺️</span>
              <span style={{ flex: 1, textAlign: 'left' }}>Карта · точка {spotNumber} з {order.length}</span>
              <span style={{ fontSize: 11, color: '#888' }}>{showMap ? 'сховати ▲' : 'показати ▼'}</span>
            </button>
            {showMap && (
              <div style={{ marginTop: 8, borderRadius: 16, overflow: 'hidden', border: '1px solid #EEEEF5', height: 260 }}>
                <MapView line={line} locations={nextSpot ? [spot, nextSpot] : [spot]} completedSlugs={session.completedSlugs} activeSlug={slug} userPos={userPos} />
              </div>
            )}
          </div>
        )}

        {quizDone ? null : !showQuiz ? (
          <>
            {/* Інформація про локацію */}
            <LocationCard
              name={spot.name}
              address={spot.address}
              info={spot.info}
              audioUrl={spot.audioUrl}
              qrHint={spot.qrHint}
              spotNumber={spotNumber}
              totalSpots={order.length}
              lineColor={color}
            />

            {/* ── Ворота: підтвердження присутності + перехід до квіза ── */}
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Головний шлях — нативна камера телефону. Вона працює на всіх
                  пристроях (iPhone теж), на відміну від вбудованого сканера. */}
              {!unlocked && (
                <div style={{ padding: 16, borderRadius: 16, background: color + '12', border: `1.5px solid ${color}33` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 22 }}>📷</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E' }}>Наведи камеру телефону на QR-код</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#6a6a80', lineHeight: 1.5 }}>
                    Відкрий звичайний застосунок «Камера», наведи на табличку — і перейди за посиланням, що зʼявиться.
                  </div>
                </div>
              )}

              {/* Запасний вхід: код з таблички. Рятує там, де камера недоступна
                  (відхилений дозвіл, старий телефон, погане освітлення). */}
              {!showCodeInput ? (
                <button
                  onClick={() => { setShowCodeInput(true); setCodeError(''); }}
                  style={{ width: '100%', padding: 12, borderRadius: 14, border: '1.5px solid #E8E8EF', background: 'transparent', color: '#8888A8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  ⌨️ Камера не працює? Введи код з таблички
                </button>
              ) : (
                <div style={{ padding: 14, borderRadius: 14, border: '1.5px solid #E8E8EF', background: '#FAFAFC' }}>
                  <div style={{ fontSize: 12, color: '#8888A8', marginBottom: 8, textAlign: 'center' }}>
                    Код написаний під QR-кодом на табличці
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={codeValue}
                      onChange={e => { setCodeValue(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6)); setCodeError(''); }}
                      onKeyDown={e => { if (e.key === 'Enter') handleCodeSubmit(); }}
                      placeholder="RATNXR"
                      autoFocus
                      inputMode="text"
                      autoCapitalize="characters"
                      style={{ flex: 1, padding: '12px 14px', borderRadius: 12, border: '1.5px solid #E8E8EF', fontSize: 20, fontWeight: 800, letterSpacing: 4, textAlign: 'center', fontFamily: 'ui-monospace, monospace', outline: 'none', boxSizing: 'border-box' }}
                    />
                    <button
                      onClick={handleCodeSubmit}
                      disabled={codeBusy || codeValue.length !== 6}
                      style={{ padding: '12px 20px', borderRadius: 12, border: 'none', background: codeValue.length === 6 ? color : '#E8E8EF', color: codeValue.length === 6 ? '#fff' : '#AAAAB8', fontSize: 15, fontWeight: 700, cursor: codeValue.length === 6 ? 'pointer' : 'not-allowed' }}
                    >
                      {codeBusy ? '…' : '→'}
                    </button>
                  </div>
                  {codeError && (
                    <div style={{ fontSize: 12, color: '#89182c', marginTop: 8, textAlign: 'center' }}>{codeError}</div>
                  )}
                  <button
                    onClick={() => { setShowCodeInput(false); setCodeValue(''); setCodeError(''); }}
                    style={{ width: '100%', marginTop: 8, padding: 8, border: 'none', background: 'transparent', color: '#AAAAB8', fontSize: 12, cursor: 'pointer' }}
                  >
                    Сховати
                  </button>
                </div>
              )}

              <button
                onClick={() => setShowQuiz(true)}
                disabled={!unlocked}
                style={{ width: '100%', padding: 16, borderRadius: 16, border: 'none', background: unlocked ? '#2D7A4F' : '#E8E8EF', color: unlocked ? '#fff' : '#AAAAB8', fontSize: 16, fontWeight: 700, cursor: unlocked ? 'pointer' : 'not-allowed' }}
              >
                А тепер до квізу! →
              </button>

              {!unlocked && (
                <p style={{ fontSize: 12, color: '#8888A8', textAlign: 'center', margin: '2px 0 0', lineHeight: 1.5 }}>
                  Спершу підтверди, що ти на місці — через QR-код або код з таблички — та ознайомся з інформацією про локацію.
                </p>
              )}
            </div>
          </>
        ) : (
          quiz ? (
            <QuizCard
              questions={[{
                question:     quiz.question,
                options:      quiz.options,
                correctIndex: -1,        // не використовується (перевірка на сервері)
                explanation:  quiz.explanation ?? '',
              }]}
              qid={quiz.qid}
              slug={slug}
              line={line}
              lineColor={color}
              isSharedSpot={(spot.transfers ?? []).some(t => t !== line)}
              isLastSpot={getNextSlug(order, slug) === null}
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
                onClick={() => handleQuizComplete(0)}
                style={{ width: '100%', padding: 16, borderRadius: 16, border: 'none', background: color, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
              >
                Продовжити без квізу →
              </button>
            </div>
          )
        )}

        {/* Екран вибору після квіза на спільній точці: далі цією лінією або пересадка */}
        {quizDone && (
          <div style={{ marginTop: 16, background: '#fff', border: '1px solid #EEEEF5', borderRadius: 20, padding: '18px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E', marginBottom: 4 }}>
              Квіз пройдено! 🎉
            </div>
            <div style={{ fontSize: 13, color: '#8888A8', marginBottom: 16, lineHeight: 1.5 }}>
              Ти на перехресті ліній. Можеш продовжити цією лінією або пересісти на іншу.
            </div>

            {/* Шоп-підказка (XP можна обміняти) */}
            {session.xp > 0 && (
              <button
                onClick={async () => { await completeSpot(slug, session.xp); router.push('/shop'); }}
                style={{ width: '100%', padding: '10px 12px', marginBottom: 12, borderRadius: 12, border: '1.5px solid #C9BFF0', background: '#F6F4FF', color: '#5A4B9E', fontSize: 12, fontWeight: 700, cursor: 'pointer', textAlign: 'center' }}
              >
                🏪 {session.xp} XP — заглянути в шоп
              </button>
            )}

            {/* Продовжити поточною лінією */}
            <button
              onClick={goNextSameLine}
              disabled={switching}
              style={{
                width: '100%', padding: 14, borderRadius: 14, border: 'none',
                background: color, color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: switching ? 'default' : 'pointer', marginBottom: 12, opacity: switching ? 0.6 : 1,
              }}
            >
              Продовжити {lineLabel(line)} →
            </button>

            {/* Пересадки на інші лінії */}
            <div style={{ fontSize: 11, fontWeight: 700, color: '#8B6914', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              🚇 Пересадка (−50 XP)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {spot.transfers
                .filter(t => t !== line)
                .map(t => (
                  <button
                    key={t}
                    onClick={() => handleTransfer(t)}
                    disabled={switching}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', borderRadius: 14, border: `2px solid ${lineColor(t)}20`,
                      background: lineColor(t) + '10', cursor: switching ? 'default' : 'pointer',
                      textAlign: 'left', opacity: switching ? 0.6 : 1,
                    }}
                  >
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: lineColor(t), flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: lineColor(t) }}>
                        {lineLabel(t)}
                      </div>
                      <div style={{ fontSize: 11, color: '#8888A8' }}>
                        Звернути на цю лінію
                      </div>
                    </div>
                    <span style={{ fontSize: 18 }}>{switching ? '…' : '→'}</span>
                  </button>
                ))}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}