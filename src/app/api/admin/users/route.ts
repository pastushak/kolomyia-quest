import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { UserModel } from '@/lib/models/User';

// Email-и з ADMIN_EMAILS — «незнімні» адміни (роль повертається при логіні).
// Позначаємо їх у списку, щоб адмін розумів, чому роль не знімається з UI.
function adminEmailSet(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

// GET /api/admin/users?q=<пошук>&sort=<xp|recent|created|name>
// Список користувачів для адмін-панелі. Ідентифікація — по email.
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const q    = (searchParams.get('q') ?? '').trim();
    const sort = searchParams.get('sort') ?? 'xp';

    // Фільтр пошуку — по email або імені (нечутливий до регістру).
    const filter: Record<string, unknown> = {};
    if (q) {
      // Екрануємо спецсимволи regex, щоб пошук був безпечним.
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { email: { $regex: safe, $options: 'i' } },
        { name:  { $regex: safe, $options: 'i' } },
      ];
    }

    const sortMap: Record<string, Record<string, 1 | -1>> = {
      xp:      { totalXp: -1 },
      recent:  { lastLoginAt: -1 },
      created: { createdAt: -1 },
      name:    { name: 1 },
    };
    const sortSpec = sortMap[sort] ?? sortMap.xp;

    const users = await UserModel
      .find(filter)
      .sort(sortSpec)
      .limit(500)   // розумний стелаж; для запуску користувачів небагато
      .lean<Array<{
        _id: any;
        email: string;
        name: string;
        avatarUrl?: string;
        role?: string;
        totalXp?: number;
        completedLines?: unknown[];
        createdAt?: Date;
        lastLoginAt?: Date;
      }>>();

    const adminEmails = adminEmailSet();

    const rows = users.map(u => ({
      id:              u._id.toString(),
      email:           u.email,
      name:            u.name,
      avatarUrl:       u.avatarUrl ?? '',
      role:            (u.role as 'user' | 'admin') ?? 'user',
      // true → роль admin походить з ADMIN_EMAILS і НЕ знімається з UI
      lockedAdmin:     adminEmails.has(u.email.toLowerCase()),
      totalXp:         u.totalXp ?? 0,
      completedCount:  Array.isArray(u.completedLines) ? u.completedLines.length : 0,
      createdAt:       u.createdAt ?? null,
      lastLoginAt:     u.lastLoginAt ?? null,
    }));

    return NextResponse.json({ total: rows.length, users: rows });
  } catch (err) {
    console.error('GET /api/admin/users:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}