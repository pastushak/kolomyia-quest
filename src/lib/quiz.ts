import { createHash } from 'crypto';

/**
 * Стабільний ідентифікатор питання (qid) — хеш від його тексту.
 * Однакове питання завжди дає однаковий qid; обчислюється на льоту,
 * у БД не зберігається. Використовується і при показі (spots/[slug]),
 * і при перевірці відповіді (quiz/answer), і в адмінці — одне джерело істини.
 */
export function quizQid(question: string): string {
  return createHash('sha1').update(question.trim()).digest('hex').slice(0, 12);
}

type QuizLike = {
  line: string;
  question: string;
  weight?: number;
};

/**
 * Зважений випадковий вибір питання для лінії.
 * - беремо лише питання потрібної лінії з weight > 0 (weight undefined → 1);
 * - шанс випасти ∝ weight;
 * - якщо валідних немає → null ("скоро").
 */
export function pickWeightedQuiz<T extends QuizLike>(
  quizzes: T[] | null | undefined,
  line: string,
): T | null {
  if (!Array.isArray(quizzes)) return null;

  const pool = quizzes.filter(q => q.line === line && (q.weight ?? 1) > 0);
  if (pool.length === 0) return null;

  const total = pool.reduce((s, q) => s + (q.weight ?? 1), 0);
  let r = Math.random() * total;
  for (const q of pool) {
    r -= (q.weight ?? 1);
    if (r < 0) return q;
  }
  return pool[pool.length - 1]; // страховка від похибки float
}

/** Знайти питання за qid (для перевірки відповіді на сервері). */
export function findQuizByQid<T extends QuizLike>(
  quizzes: T[] | null | undefined,
  qid: string,
): T | null {
  if (!Array.isArray(quizzes)) return null;
  return quizzes.find(q => quizQid(q.question) === qid) ?? null;
}