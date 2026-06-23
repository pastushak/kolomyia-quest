import { Session, Line, AgeGroup } from '@/types';

const KEY     = 'kq_session';
const SID_KEY = 'kq_sid';

const LOGIN_BONUS_MULTIPLIER = 1.2;

// ── Читання / запис ───────────────────────────────────────
export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function getDbSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SID_KEY);
}

export function clearSession(): void {
  localStorage.removeItem(KEY);
  localStorage.removeItem(SID_KEY);
}

// ── Трекінг ───────────────────────────────────────────────
async function track(body: object) {
  try {
    await fetch('/api/track', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
  } catch (e) {
    console.warn('Track error:', e);
  }
}

// ── Створення сесії ───────────────────────────────────────
export async function createSession(
  nickname: string,
  line:     Line,
  ageGroup: AgeGroup = 'adults',
  userId?:  string,
): Promise<Session> {
  const session: Session = {
    nickname,
    line,
    ageGroup,
    completedSlugs: [],
    xp:      0,
    bonusXp: 0,
    startedAt: new Date().toISOString(),
    ...(userId && { userId }),
  };
  localStorage.setItem(KEY, JSON.stringify(session));

  const res = await fetch('/api/track', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event:      'session_start',
      nickname,
      line,
      ageGroup,
      userId:     userId ?? null,
      deviceLang: navigator.language,
    }),
  });
  const data = await res.json();
  if (data.sessionId) localStorage.setItem(SID_KEY, data.sessionId);

  return session;
}

// ── XP з бонусом ─────────────────────────────────────────
export function calculateXp(
  baseXp:    number,
  isLoggedIn: boolean,
): { xpEarned: number; bonusEarned: number } {
  if (!isLoggedIn) return { xpEarned: baseXp, bonusEarned: 0 };
  const total = Math.round(baseXp * LOGIN_BONUS_MULTIPLIER);
  return { xpEarned: baseXp, bonusEarned: total - baseXp };
}

// ── Завершення споту ──────────────────────────────────────
export async function completeSpot(
  slug:     string,
  xpEarned: number,
  attempts  = 1,
): Promise<Session | null> {
  const session = getSession();
  if (!session) return null;

  if (!session.completedSlugs.includes(slug)) {
    session.completedSlugs.push(slug);
    const isLoggedIn = !!session.userId;
    const { xpEarned: baseXp, bonusEarned } = calculateXp(xpEarned, isLoggedIn);
    session.xp      += baseXp;
    session.bonusXp += bonusEarned;
  }
  localStorage.setItem(KEY, JSON.stringify(session));

  const sid = getDbSessionId();
  if (sid) {
    await track({
      event:          'spot_complete',
      sessionId:      sid,
      slug,
      line:           session.line,
      attempts,
      xpEarned,
      xpTotal:        session.xp + session.bonusXp,
      bonusXp:        session.bonusXp,
      completedCount: session.completedSlugs.length,
    });
  }
  return session;
}

// ── Фініш сесії ───────────────────────────────────────────
export async function finishSession(): Promise<void> {
  const sid     = getDbSessionId();
  const session = getSession();
  if (sid) {
    await track({
      event:     'session_finish',
      sessionId: sid,
      userId:    session?.userId ?? null,
      line:      session?.line,
      ageGroup:  session?.ageGroup,
      finalXp:   (session?.xp ?? 0) + (session?.bonusXp ?? 0),
    });
  }
}

// ── QR скан ───────────────────────────────────────────────
export async function trackQrScan(slug: string): Promise<void> {
  await track({
    event:     'qr_scan',
    slug,
    userAgent: navigator.userAgent,
  });
}

// ── Пересадка на іншу лінію ───────────────────────────────
// За специфікацією: точки нової лінії до стику НЕ даруються — вони пропущені.
// Ведемо історію гілок (branches). XP за перехід (-50) списується окремо, серверно (Крок 4).
export function switchLine(newLine: Line): void {
  const session = getSession();
  if (!session) return;

  // Ініціалізуємо гілки, якщо їх ще нема (стара сесія або перший перехід).
  // Перша гілка = поточна лінія з уже реально пройденими точками цієї лінії.
  if (!session.branches || session.branches.length === 0) {
    session.branches = [
      {
        line:           session.line,
        completedSlugs: [...session.completedSlugs],
        enteredAt:      session.startedAt ?? new Date().toISOString(),
      },
    ];
  } else {
    // Закриваємо поточну (останню) гілку — синхронізуємо її пройдені точки
    // з тими, що накопичились у session.completedSlugs на цій лінії.
    const lastBranch = session.branches[session.branches.length - 1];
    lastBranch.completedSlugs = session.completedSlugs.filter(
      slug => !session.branches!
        .slice(0, -1)
        .some(b => b.completedSlugs.includes(slug)),
    );
  }

  // Відкриваємо нову гілку — НІЧОГО не даруємо.
  session.branches.push({
    line:           newLine,
    completedSlugs: [],
    enteredAt:      new Date().toISOString(),
  });

  // Оновлюємо активну лінію й лічильник переходів.
  session.line          = newLine;
  session.transferCount = (session.transferCount ?? 0) + 1;

  localStorage.setItem(KEY, JSON.stringify(session));
}