'use client';

import { useState } from 'react';
import { QuizQuestion } from '@/types';

interface Props {
  questions: QuizQuestion[];
  lineColor: string;
  xpReward: number;
  onComplete: () => void;
}

export default function QuizCard({ questions, lineColor, xpReward, onComplete }: Props) {
  const [current, setCurrent]   = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [allDone, setAllDone]   = useState(false);

  const q = questions[current];
  const isCorrect = selected === q.correctIndex;

  function handleAnswer(idx: number) {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
  }

  function handleNext() {
    if (!isCorrect) {
      setSelected(null);
      setAnswered(false);
      return;
    }
    if (current + 1 < questions.length) {
      setCurrent(c => c + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      setAllDone(true);
    }
  }

  if (allDone) {
    return (
      <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #EEEEF5', padding: 28, textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#1A1A2E', marginBottom: 6 }}>Чудово!</div>
        <div style={{ fontSize: 14, color: '#8888A8', marginBottom: 20 }}>
          Усі питання пройдено
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FEF7E6', border: '1px solid #F5D78A', borderRadius: 20, padding: '8px 18px', marginBottom: 24, fontSize: 15, fontWeight: 700, color: '#8B6914' }}>
          +{xpReward} XP
        </div>
        <button
          onClick={onComplete}
          style={{ display: 'block', width: '100%', padding: 16, borderRadius: 16, border: 'none', background: lineColor, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
        >
          До наступної точки →
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Прогрес квізу */}
      <div style={{ display: 'flex', gap: 6 }}>
        {questions.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < current ? lineColor : i === current ? lineColor + '60' : '#EEEEF5' }} />
        ))}
      </div>

      {/* Питання */}
      <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #EEEEF5', padding: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#8888A8', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 10 }}>
          Питання {current + 1} з {questions.length}
        </div>
        <p style={{ fontSize: 17, fontWeight: 700, color: '#1A1A2E', lineHeight: 1.5, margin: 0 }}>
          {q.question}
        </p>
      </div>

      {/* Варіанти */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {q.options.map((opt, i) => {
          let bg = '#fff', border = '#EEEEF5', color = '#1A1A2E';
          if (answered) {
            if (i === q.correctIndex) { bg = '#E8F5EE'; border = '#2D7A4F'; color = '#2D7A4F'; }
            else if (i === selected)  { bg = '#FEE2E2'; border = '#DC2626'; color = '#DC2626'; }
          } else if (selected === i)  { bg = '#F0F7FF'; border = lineColor; }

          return (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 14, cursor: answered ? 'default' : 'pointer',
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

      {/* Пояснення */}
      {answered && (
        <div style={{ background: isCorrect ? '#E8F5EE' : '#FEE2E2', borderRadius: 14, border: `1px solid ${isCorrect ? '#2D7A4F' : '#DC2626'}`, padding: '14px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: isCorrect ? '#2D7A4F' : '#DC2626', marginBottom: 4 }}>
            {isCorrect ? '✓ Правильно!' : '✗ Спробуй ще раз'}
          </div>
          {isCorrect && (
            <div style={{ fontSize: 13, color: '#1A4A2E', lineHeight: 1.5 }}>{q.explanation}</div>
          )}
        </div>
      )}

      {answered && (
        <button
          onClick={handleNext}
          style={{ width: '100%', padding: 16, borderRadius: 16, border: 'none', background: isCorrect ? lineColor : '#8888A8', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
        >
          {isCorrect ? (current + 1 < questions.length ? 'Наступне питання →' : 'Завершити →') : 'Спробувати знову →'}
        </button>
      )}
    </div>
  );
}