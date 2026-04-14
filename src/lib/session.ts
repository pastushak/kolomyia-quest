import { Session, Line } from '@/types';

const KEY    = 'kq_session';
const SID_KEY = 'kq_sid';

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

async function track(body: object) {
  try {
    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.warn('Track error:', e);
  }
}

export async function createSession(nickname: string, line: Line): Promise<Session> {
  const session: Session = {
    nickname, line,
    completedSlugs: [],
    xp: 0,
    startedAt: new Date().toISOString(),
  };
  localStorage.setItem(KEY, JSON.stringify(session));

  const res = await fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'session_start',
      nickname, line,
      deviceLang: navigator.language,
    }),
  });
  const data = await res.json();
  if (data.sessionId) localStorage.setItem(SID_KEY, data.sessionId);

  return session;
}

export async function completeSpot(slug: string, xpEarned: number, attempts = 1): Promise<Session | null> {
  const session = getSession();
  if (!session) return null;

  if (!session.completedSlugs.includes(slug)) {
    session.completedSlugs.push(slug);
    session.xp += xpEarned;
  }
  localStorage.setItem(KEY, JSON.stringify(session));

  const sid = getDbSessionId();
  if (sid) {
    await track({
      event: 'spot_complete',
      sessionId:      sid,
      slug,
      line:           session.line,
      attempts,
      xpEarned,
      xpTotal:        session.xp,
      completedCount: session.completedSlugs.length,
    });
  }
  return session;
}

export async function finishSession(): Promise<void> {
  const sid = getDbSessionId();
  if (sid) await track({ event: 'session_finish', sessionId: sid });
}

export async function trackQrScan(slug: string): Promise<void> {
  await track({ event: 'qr_scan', slug, userAgent: navigator.userAgent });
}

export function clearSession(): void {
  localStorage.removeItem(KEY);
  localStorage.removeItem(SID_KEY);
}