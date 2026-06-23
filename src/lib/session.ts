import { Session, Line, AgeGroup } from '@/types';

const KEY     = 'kq_session';
const SID_KEY = 'kq_sid';

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

// ── Завершення споту ──────────────────────────────────────
// XP веде СЕРВЕР (/api/quiz/answer). Сюди приходить актуальний серверний
// баланс сесії (sessionXp) — ми лише синхронізуємо локальний стан для відображення.
export async function completeSpot(
  slug:        string,
  serverXp:    number,   // повний серверний баланс сесії (не приріст!)
  attempts  =  1,
): Promise<Session | null> {
  const session = getSession();
  if (!session) return null;

  // Синхронізуємо локальні поля з сервером (для UI). Точку позначаємо пройденою.
  if (!session.completedSlugs.includes(slug)) {
    session.completedSlugs.push(slug);
  }
  session.xp      = serverXp;   // ← серверний баланс, не додавання
  session.bonusXp = 0;          // бонус-логіка прибрана (рудимент)
  localStorage.setItem(KEY, JSON.stringify(session));

  // Аналітика відвідування (XP сервер уже нарахував у квіз-ендпоінті).
  const sid = getDbSessionId();
  if (sid) {
    await track({
      event:          'spot_complete',
      sessionId:      sid,
      slug,
      line:           session.line,
      attempts,
      xpEarned:       0,                      // не використовується для нарахування
      completedCount: session.completedSlugs.length,
    });
  }
  return session;
}

// ── Фініш сесії ───────────────────────────────────────────
export async function finishSession(): Promise<void> {
  const sid     = getDbSessionId();
  const session = getSession();
  if (!sid || !session) return;

  const transferCount = session.transferCount ?? 0;
  const isModification = transferCount > 0;

  // Нотація модифікації "cherry(3)-green(4)" + структура гілок для статистики.
  let modification = '';
  let branchStats: Array<{ line: Line; count: number }> = [];
  if (isModification && session.branches?.length) {
    branchStats = session.branches.map(b => ({
      line:  b.line,
      count: b.completedSlugs.length,
    }));
    modification = branchStats.map(b => `${b.line}(${b.count})`).join('-');
  }

  await track({
    event:         'session_finish',
    sessionId:     sid,
    userId:        session.userId ?? null,
    line:          session.line,
    ageGroup:      session.ageGroup,
    finalXp:       session.xp ?? 0,        // серверний баланс сесії
    transferCount,
    modification,                           // "" якщо чиста лінія
    branches:      branchStats,             // [] якщо чиста лінія
  });
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
// Перехід коштує 50 XP (серверно, лише для залогінених). Ведемо історію гілок.
//
// Повертає результат, щоб UI міг показати причину відмови:
//   { ok: true }                          — перехід відбувся
//   { ok: false, reason: 'auth_required' }  — потрібен вхід
//   { ok: false, reason: 'insufficient_xp' } — мало XP
//   { ok: false, reason: 'error' }          — мережа/сервер
export type SwitchResult =
  | { ok: true; newBalance?: number }
  | { ok: false; reason: 'auth_required' | 'insufficient_xp' | 'error' };

export async function switchLine(newLine: Line): Promise<SwitchResult> {
  const session = getSession();
  if (!session) return { ok: false, reason: 'error' };

  const sid = getDbSessionId();

  // 1. Спершу серверно списуємо 50 XP за перехід (перевірка балансу на сервері).
  try {
    const res = await fetch('/api/track', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event:     'transfer',
        sessionId: sid,
        userId:    session.userId ?? null,
      }),
    });
    const data = await res.json();

    if (!data.ok) {
      // Перехід НЕ відбувся — повертаємо причину, нічого локально не міняємо.
      return { ok: false, reason: data.reason ?? 'error' };
    }

    // Перехід успішний — синхронізуємо локальний баланс із серверним (після списання -50).
    if (typeof data.newBalance === 'number') {
      session.xp = data.newBalance;
    }
  } catch {
    return { ok: false, reason: 'error' };
  }

  // 2. Сервер підтвердив і списав XP — застосовуємо гілки локально.
  if (!session.branches || session.branches.length === 0) {
    session.branches = [
      {
        line:           session.line,
        completedSlugs: [...session.completedSlugs],
        enteredAt:      session.startedAt ?? new Date().toISOString(),
      },
    ];
  } else {
    const lastBranch = session.branches[session.branches.length - 1];
    lastBranch.completedSlugs = session.completedSlugs.filter(
      slug => !session.branches!
        .slice(0, -1)
        .some(b => b.completedSlugs.includes(slug)),
    );
  }

  session.branches.push({
    line:           newLine,
    completedSlugs: [],
    enteredAt:      new Date().toISOString(),
  });

  session.line          = newLine;
  session.transferCount = (session.transferCount ?? 0) + 1;

  localStorage.setItem(KEY, JSON.stringify(session));

  return { ok: true };
}