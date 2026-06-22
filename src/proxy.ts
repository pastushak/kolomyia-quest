import { NextRequest, NextResponse } from 'next/server';

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const adminPassword = process.env.ADMIN_PASSWORD;
  const token = req.cookies.get('admin_token')?.value;

  // Авторизований ТІЛЬКИ якщо пароль налаштований І збігається.
  // Якщо ADMIN_PASSWORD не заданий — нікого не пускаємо (fail-closed).
  const isAuthed = !!adminPassword && token === adminPassword;

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