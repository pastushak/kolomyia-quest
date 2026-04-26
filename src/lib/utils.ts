import { Line, Location, QuestLine } from '@/types';

// ── Кольори ліній (з логотипу Коломиї) ───────────────────
export const LINE_COLOR: Record<Line, string> = {
  cherry: '#89182c',
  orange: '#e28f27',
  green:  '#8a9c39',
};

export const LINE_LABEL: Record<Line, string> = {
  cherry: 'Вишнева лінія',
  orange: 'Оранжева лінія',
  green:  'Зелена лінія',
};

export const LINE_START: Record<Line, string> = {
  cherry: 'Залізничний вокзал',
  orange: 'Автовокзал',
  green:  'Площа Скорботи',
};

export const LINE_EMOJI: Record<Line, string> = {
  cherry: '🚂',
  orange: '🚌',
  green:  '🌿',
};

// ── Fetch лінії з API ─────────────────────────────────────
export async function fetchLine(key: Line): Promise<QuestLine & { spots: Location[] }> {
  const res = await fetch(`/api/lines/${key}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`fetchLine failed: ${key}`);
  return res.json();
}

// ── Fetch всіх ліній (для стартової сторінки) ────────────
export async function fetchAllLines(): Promise<QuestLine[]> {
  const res = await fetch('/api/lines', { cache: 'no-store' });
  if (!res.ok) throw new Error('fetchAllLines failed');
  return res.json();
}

// ── Fetch одного споту ────────────────────────────────────
export async function fetchSpot(slug: string): Promise<Location> {
  const res = await fetch(`/api/spots/${slug}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`fetchSpot failed: ${slug}`);
  return res.json();
}

// ── Наступний slug у лінії ────────────────────────────────
export function getNextSlug(
  order: string[],
  currentSlug: string,
): string | null {
  const idx = order.indexOf(currentSlug);
  if (idx === -1 || idx === order.length - 1) return null;
  return order[idx + 1];
}

// ── Квіз для конкретної лінії на споті ───────────────────
export function getQuizForLine(
  spot: Location,
  line: Line,
) {
  if (!spot.quizzes || spot.quizzes.length === 0) return null;
  return spot.quizzes.find(q => q.line === line) ?? null;
}