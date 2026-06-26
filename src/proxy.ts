import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Назва cookie сесії NextAuth v5: на HTTPS — з префіксом __Secure-.
function sessionCookieName(secure: boolean): string {
  return secure ? '__Secure-authjs.session-token' : 'authjs.session-token';
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const secure = process.env.NODE_ENV === 'production';

  // ── Шлях 1: аварійний вхід по паролю (запасний, поки Google-ролі не підтверджені) ──
  const adminPassword = process.env.ADMIN_PASSWORD;
  const token = req.cookies.get('admin_token')?.value;
  const passwordOk = !!adminPassword && token === adminPassword;

  // ── Шлях 2: Google-роль admin із JWT-сесії (Edge-safe, без mongoose) ──
  // У v5 salt ДОРІВНЮЄ cookieName — інакше getToken поверне null.
  const cookieName = sessionCookieName(secure);
  let roleOk = false;
  try {
    const jwt = await getToken({
      req,
      secret: process.env.AUTH_SECRET,
      salt: cookieName,
      cookieName,
      secureCookie: secure,
    });
    roleOk = jwt?.role === 'admin';
  } catch {
    roleOk = false;
  }

  const isAuthed = passwordOk || roleOk;

  // ── Захист API /api/admin/* (окрім логіну) ──────────────
  if (pathname.startsWith('/api/admin') && pathname !== '/api/admin/login') {
    if (!isAuthed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // ── Захист сторінок /admin/* (окрім /admin/login) ───────
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!isAuthed) {
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};