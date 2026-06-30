import { Line, Location, QuestLine } from '@/types';
import { pickWeightedQuiz, quizQid } from '@/lib/quiz';

// ── Кольори ліній (статика — базові лінії, миттєвий фолбек) ───────
export const LINE_COLOR: Record<string, string> = {
  cherry: '#89182c',
  orange: '#e28f27',
  green:  '#8a9c39',
};

export const LINE_LABEL: Record<string, string> = {
  cherry: 'Вишнева лінія',
  orange: 'Оранжева лінія',
  green:  'Зелена лінія',
};

export const LINE_START: Record<string, string> = {
  cherry: 'Залізничний вокзал',
  orange: 'Автовокзал',
  green:  'Площа Скорботи',
};

export const LINE_EMOJI: Record<string, string> = {
  cherry: '🚂',
  orange: '🚌',
  green:  '🌿',
};

// ── Динамічний реєстр ліній (наповнюється з БД при завантаженні /api/lines) ──
// Дозволяє новим тематичним лініям мати колір/назву без хардкоду.
type LineMeta = { color?: string; label?: string; emoji?: string; startSlug?: string };
const lineRegistry: Record<string, LineMeta> = {};

/** Зареєструвати лінії з БД. Викликається сторінками, що вантажать /api/lines. */
export function registerLines(lines: Array<{ key: string; color?: string; label?: string; startSlug?: string }>) {
  for (const l of lines) {
    if (!l?.key) continue;
    lineRegistry[l.key] = {
      color:     l.color,
      label:     l.label,
      startSlug: l.startSlug,
    };
  }
}

// ── Безпечні гетери: реєстр (БД) → статика → фолбек ──
export function lineColor(line: string, fallback = '#888'): string {
  return lineRegistry[line]?.color ?? LINE_COLOR[line] ?? fallback;
}

export function lineLabel(line: string): string {
  return lineRegistry[line]?.label ?? LINE_LABEL[line] ?? line;
}

export function lineEmoji(line: string, fallback = '🧭'): string {
  return LINE_EMOJI[line] ?? fallback;
}

export function lineStart(line: string): string {
  return lineRegistry[line]?.startSlug
    ? (LINE_START[line] ?? '')   // для базових — людська назва; для нових поки порожньо
    : (LINE_START[line] ?? '');
}

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
  const lines = await res.json();
  if (Array.isArray(lines)) registerLines(lines);   // одразу наповнюємо реєстр
  return lines;
}

// Гарантує, що реєстр ліній наповнений (для сторінок, які показують кольори
// чужих ліній — напр. пересадки, профіль). Викликати раз при монтуванні.
let _linesRegistered = false;
export async function ensureLinesRegistered(): Promise<void> {
  if (_linesRegistered) return;
  try {
    const res = await fetch('/api/lines', { cache: 'no-store' });
    if (res.ok) {
      const lines = await res.json();
      if (Array.isArray(lines)) { registerLines(lines); _linesRegistered = true; }
    }
  } catch { /* фолбек на статику — не критично */ }
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
// Зважений рандом серед питань лінії (weight>0). Додаємо qid — стабільний
// ідентифікатор показаного питання, щоб сервер перевірив саме його.
export function getQuizForLine(
  spot: Location,
  line: Line,
) {
  const picked = pickWeightedQuiz(spot.quizzes, line);
  if (!picked) return null;
  return { ...picked, qid: quizQid(picked.question) };
}