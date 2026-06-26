'use client';

import { useState } from 'react';
import { QuizQuestion } from '@/types';
import { getDbSessionId } from '@/lib/session';

interface Props {
  questions:  QuizQuestion[];   // correctIndex тут НЕ використовується (його нема з API)
  slug:       string;
  line:       string;
  lineColor:  string;
  onComplete: (sessionXp: number) => void;   // повертає серверний баланс сесії
}

const MAX_ATTEMPTS = 3;

export default function QuizCard({ questions, slug, line, lineColor, onComplete }: Props) {
  const [current, setCurrent]     = useState(0);
  const [selected, setSelected]   = useState<number | null>(null);   // обраний варіант (ще не підтверджений)
  const [attempt, setAttempt]     = useState(1);
  const [checking, setChecking]   = useState(false);
  const [result, setResult]       = useState<{
    correct:      boolean;
    exhausted?:   boolean;
    correctIndex?: number;
    xpEarned?:    number;
    attemptNumber?: number;
    explanation?: string;
    remainingAttempts?: number;
  } | null>(null);
  const [sessionXp, setSessionXp] = useState<number | null>(null);
  const [allDone, setAllDone]     = useState(false);

  const q = questions[current];

  // Клік на варіант — ЛИШЕ вибір, без запиту. Можна перемикати вільно.
  function handleSelect(idx: number) {
    if (checking || result) return;   // після підтвердження вибір заблоковано
    setSelected(idx);
  }

  // Кнопка "Відповісти" — ось тут витрачається спроба й іде запит на сервер.
  async function handleSubmit() {
    if (selected === null || checking || result) return;
    setChecking(true);

    try {
      const res = await fetch('/api/quiz/answer', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, line, answerIndex: selected, sessionId: getDbSessionId() }),
      });
      const data = await res.json();
      setResult(data);
      // Лічильник спроб веде сервер — синхронізуємо відображення.
      if (typeof data.attemptNumber === 'number') setAttempt(data.attemptNumber);
      if (typeof data.sessionXp === 'number') setSessionXp(data.sessionXp);
    } catch {
      // Помилка мережі — не витрачаємо спробу, даємо повторити
      setResult(null);
    } finally {
      setChecking(false);
    }
  }

  function handleRetry() {
    // Наступна спроба того ж питання — номер спроби визначить сервер при submit.
    setSelected(null);
    setResult(null);
  }

  function handleNext() {
    if (current + 1 < questions.length) {
      setCurrent(c => c + 1);
      setSelected(null);
      setAttempt(1);
      setResult(null);
    } else {
      setAllDone(true);
    }
  }

  if (allDone) {
    return (
      <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #EEEEF5', padding: 28, textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#1A1A2E', marginBottom: 6 }}>Чудово!</div>
        <div style={{ fontSize: 14, color: '#8888A8', marginBottom: 20 }}>Усі питання пройдено</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FEF7E6', border: '1px solid #F5D78A', borderRadius: 20, padding: '8px 18px', marginBottom: 24, fontSize: 15, fontWeight: 700, color: '#8B6914' }}>
          Баланс: {sessionXp ?? '—'} XP
        </div>
        <button
          onClick={() => onComplete(sessionXp ?? 0)}
          style={{ display: 'block', width: '100%', padding: 16, borderRadius: 16, border: 'none', background: lineColor, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
        >
          До наступної точки →
        </button>
      </div>
    );
  }

  const isCorrect   = result?.correct === true;
  const isExhausted = result?.exhausted === true;
  const closed      = isCorrect || isExhausted;   // питання закрите (далі)
  const answered    = result !== null;            // відповідь підтверджено (правильно або ні)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Прогрес квізу */}
      <div style={{ display: 'flex', gap: 6 }}>
        {questions.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < current ? lineColor : i === current ? lineColor + '60' : '#EEEEF5' }} />
        ))}
      </div>

      {/* Лічильник спроб */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#8888A8' }}>
        <span>Питання {current + 1} з {questions.length}</span>
        {/* Поки висить невдалий результат (можна ще раз) — показуємо НАСТУПНИЙ номер спроби */}
        <span>Спроба {Math.min(answered && !result?.correct && !isExhausted ? attempt + 1 : attempt, MAX_ATTEMPTS)} з {MAX_ATTEMPTS}</span>
      </div>

      {/* Питання */}
      <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #EEEEF5', padding: 20 }}>
        <p style={{ fontSize: 17, fontWeight: 700, color: '#1A1A2E', lineHeight: 1.5, margin: 0 }}>
          {q.question}
        </p>
      </div>

      {/* Варіанти */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {q.options.map((opt, i) => {
          let bg = '#fff', border = '#EEEEF5', color = '#1A1A2E';

          if (closed) {
            // Закрито — розкриваємо правильну (її дав сервер)
            if (i === result?.correctIndex) { bg = '#E8F5EE'; border = '#2D7A4F'; color = '#2D7A4F'; }
            else if (i === selected && !isCorrect) { bg = '#FEE2E2'; border = '#DC2626'; color = '#DC2626'; }
          } else if (answered && !result?.correct && i === selected) {
            // Підтверджено невірно (спроби ще є) — обрана червона, правильну НЕ показуємо
            bg = '#FEE2E2'; border = '#DC2626'; color = '#DC2626';
          } else if (selected === i) {
            // Просто вибрано (ще не підтверджено)
            bg = '#F0F7FF'; border = lineColor;
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={checking || answered}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 14,
                cursor: (checking || answered) ? 'default' : 'pointer',
                border: `2px solid ${border}`, background: bg, color,
                fontSize: 15, fontWeight: 600, textAlign: 'left', transition: 'all .15s',
              }}
            >
              <span style={{ opacity: .5, marginRight: 8, fontSize: 13 }}>
                {String.fromCharCode(65 + i)}.
              </span>
              {opt}
            </button>
          );
        })}
      </div>

      {/* Зворотний зв'язок: невірно, спроби ще є */}
      {answered && !result?.correct && !isExhausted && (
        <div style={{ background: '#FEE2E2', borderRadius: 14, border: '1px solid #DC2626', padding: '14px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#DC2626' }}>
            ✗ Неправильно. Лишилось спроб: {result?.remainingAttempts}
          </div>
        </div>
      )}

      {/* Вичерпано */}
      {isExhausted && (
        <div style={{ background: '#FEF7E6', borderRadius: 14, border: '1px solid #F5D78A', padding: '14px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#8B6914', marginBottom: 4 }}>
            Спроби вичерпано. Правильну відповідь підсвічено.
          </div>
          {result?.explanation && (
            <div style={{ fontSize: 13, color: '#633806', lineHeight: 1.5 }}>{result.explanation}</div>
          )}
        </div>
      )}

      {/* Правильно */}
      {isCorrect && (
        <div style={{ background: '#E8F5EE', borderRadius: 14, border: '1px solid #2D7A4F', padding: '14px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#2D7A4F', marginBottom: 4 }}>
            ✓ Правильно! +{result?.xpEarned ?? 0} XP
          </div>
          {result?.explanation && (
            <div style={{ fontSize: 13, color: '#1A4A2E', lineHeight: 1.5 }}>{result.explanation}</div>
          )}
        </div>
      )}

      {/* Кнопка "Відповісти" — поки відповідь не підтверджена */}
      {!answered && (
        <button
          onClick={handleSubmit}
          disabled={selected === null || checking}
          style={{
            width: '100%', padding: 16, borderRadius: 16, border: 'none',
            background: (selected === null || checking) ? '#C8C8D4' : lineColor,
            color: '#fff', fontSize: 16, fontWeight: 700,
            cursor: (selected === null || checking) ? 'default' : 'pointer',
          }}
        >
          {checking ? 'Перевіряємо…' : 'Відповісти'}
        </button>
      )}

      {/* Спробувати знову — невірно, спроби ще є */}
      {answered && !result?.correct && !isExhausted && (
        <button
          onClick={handleRetry}
          style={{ width: '100%', padding: 16, borderRadius: 16, border: 'none', background: '#8888A8', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
        >
          Спробувати знову →
        </button>
      )}

      {/* Далі — питання закрите */}
      {closed && (
        <button
          onClick={handleNext}
          style={{ width: '100%', padding: 16, borderRadius: 16, border: 'none', background: lineColor, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
        >
          {current + 1 < questions.length ? 'Наступне питання →' : 'Завершити →'}
        </button>
      )}

    </div>
  );
}