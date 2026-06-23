'use client';

import { useState } from 'react';
import { QuizQuestion } from '@/types';

interface Props {
  questions:  QuizQuestion[];   // correctIndex тут більше НЕ використовується (його нема з API)
  slug:       string;
  line:       string;
  lineColor:  string;
  onComplete: (xpEarned: number) => void;   // тепер повертає зароблений XP
}

const MAX_ATTEMPTS = 3;

export default function QuizCard({ questions, slug, line, lineColor, onComplete }: Props) {
  // Поточне питання (наразі завжди одне на точку, але лишаємо масив для сумісності)
  const [current, setCurrent]     = useState(0);
  const [selected, setSelected]   = useState<number | null>(null);
  const [attempt, setAttempt]     = useState(1);            // номер поточної спроби (1..3)
  const [checking, setChecking]   = useState(false);
  const [result, setResult]       = useState<{
    correct:      boolean;
    exhausted?:   boolean;
    correctIndex?: number;
    xpEarned?:    number;
    explanation?: string;
    remainingAttempts?: number;
  } | null>(null);
  const [earnedXp, setEarnedXp]   = useState(0);
  const [allDone, setAllDone]     = useState(false);

  const q = questions[current];

  async function handleAnswer(idx: number) {
    if (checking || result?.correct || result?.exhausted) return;
    setSelected(idx);
    setChecking(true);

    try {
      const res = await fetch('/api/quiz/answer', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, line, answerIndex: idx, attempt }),
      });
      const data = await res.json();
      setResult(data);

      if (data.correct) {
        setEarnedXp(prev => prev + (data.xpEarned ?? 0));
      } else if (data.exhausted) {
        // Спроби вичерпано — XP 0 за цю точку, але рухаємось далі
      } else {
        // Неправильно, є ще спроби — готуємось до наступної
      }
    } catch {
      // Помилка мережі — даємо спробувати ще раз без витрати спроби
      setResult({ correct: false, remainingAttempts: MAX_ATTEMPTS - attempt + 1 });
    } finally {
      setChecking(false);
    }
  }

  function handleRetry() {
    // Наступна спроба того ж питання
    setAttempt(a => a + 1);
    setSelected(null);
    setResult(null);
  }

  function handleNext() {
    // Питання закрите (правильно або вичерпано) — далі
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
          +{earnedXp} XP
        </div>
        <button
          onClick={() => onComplete(earnedXp)}
          style={{ display: 'block', width: '100%', padding: 16, borderRadius: 16, border: 'none', background: lineColor, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
        >
          До наступної точки →
        </button>
      </div>
    );
  }

  // Стан кнопки/підсвітки
  const isCorrect   = result?.correct === true;
  const isExhausted = result?.exhausted === true;
  const closed      = isCorrect || isExhausted;   // питання закрите

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
        <span>Спроба {Math.min(attempt, MAX_ATTEMPTS)} з {MAX_ATTEMPTS}</span>
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
            // Питання закрите — підсвічуємо правильну (сервер її розкрив)
            if (i === result?.correctIndex) { bg = '#E8F5EE'; border = '#2D7A4F'; color = '#2D7A4F'; }
            else if (i === selected && !isCorrect) { bg = '#FEE2E2'; border = '#DC2626'; color = '#DC2626'; }
            // якщо правильно вгадав з першого — selected і correctIndex збігаються, підсвітиться зелена
            if (isCorrect && i === selected) { bg = '#E8F5EE'; border = '#2D7A4F'; color = '#2D7A4F'; }
          } else if (result && !result.correct && i === selected) {
            // Неправильно, спроби ще є — підсвічуємо ТІЛЬКИ обрану червоним, правильну НЕ показуємо
            bg = '#FEE2E2'; border = '#DC2626'; color = '#DC2626';
          } else if (selected === i) {
            bg = '#F0F7FF'; border = lineColor;
          }

          return (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={checking || closed}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 14,
                cursor: (checking || closed) ? 'default' : 'pointer',
                border: `2px solid ${border}`, background: bg, color,
                fontSize: 15, fontWeight: 600, textAlign: 'left', transition: 'all .15s',
                opacity: checking ? 0.7 : 1,
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

      {/* Зворотний зв'язок */}
      {result && !result.correct && !isExhausted && (
        <div style={{ background: '#FEE2E2', borderRadius: 14, border: '1px solid #DC2626', padding: '14px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#DC2626', marginBottom: 4 }}>
            ✗ Неправильно. Спробуй ще — лишилось спроб: {result.remainingAttempts}
          </div>
        </div>
      )}

      {result && isExhausted && (
        <div style={{ background: '#FEF7E6', borderRadius: 14, border: '1px solid #F5D78A', padding: '14px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#8B6914', marginBottom: 4 }}>
            Спроби вичерпано. Правильну відповідь підсвічено.
          </div>
          {result.explanation && (
            <div style={{ fontSize: 13, color: '#633806', lineHeight: 1.5 }}>{result.explanation}</div>
          )}
        </div>
      )}

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

      {/* Кнопка дії */}
      {result && !result.correct && !isExhausted && (
        <button
          onClick={handleRetry}
          style={{ width: '100%', padding: 16, borderRadius: 16, border: 'none', background: '#8888A8', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
        >
          Спробувати знову →
        </button>
      )}

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