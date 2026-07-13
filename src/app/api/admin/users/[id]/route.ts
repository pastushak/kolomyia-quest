import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { UserModel } from '@/lib/models/User';

// Email-и з ADMIN_EMAILS — «незнімні» адміни: роль повертається при логіні,
// тож не даємо знімати її з UI (це лише вводило б в оману).
function adminEmailSet(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

// Хто виконує дію. Google-адмін має session.user.id; пароль-адмін — анонімний
// (заходить через admin_token), тоді currentUserId === null.
async function currentAdminId(): Promise<string | null> {
  try {
    const session = await auth();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

// ── PATCH — змінити роль (user ↔ admin) ─────────────────────
// body: { role: 'user' | 'admin' }
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { role } = await req.json();

    if (role !== 'user' && role !== 'admin') {
      return NextResponse.json({ error: 'role має бути user або admin' }, { status: 400 });
    }

    await connectDB();

    const target = await UserModel.findById(id).select('email role').lean<{ email: string; role?: string }>();
    if (!target) return NextResponse.json({ error: 'Користувача не знайдено' }, { status: 404 });

    const meId = await currentAdminId();

    // Захист 1: не можна розжалувати самого себе (щоб не втратити доступ).
    if (meId && meId === id && role === 'user') {
      return NextResponse.json({ error: 'Не можна зняти роль admin із себе' }, { status: 409 });
    }

    // Захист 2: якщо email у ADMIN_EMAILS — роль керується змінною оточення,
    // а не БД. Знімати її з UI безглуздо (повернеться при логіні).
    if (role === 'user' && adminEmailSet().has(target.email.toLowerCase())) {
      return NextResponse.json(
        { error: 'Цей admin заданий через ADMIN_EMAILS. Щоб зняти роль — прибери email зі змінної оточення.' },
        { status: 409 },
      );
    }

    const updated = await UserModel.findByIdAndUpdate(id, { $set: { role } }, { new: true })
      .select('role').lean<{ role: string }>();

    return NextResponse.json({ ok: true, role: updated?.role });
  } catch (err) {
    console.error('PATCH /api/admin/users/[id]:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ── POST — дії над користувачем ─────────────────────────────
// body: { action: 'reset' }  — обнулити статистику (XP + історія маршрутів)
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { action } = await req.json();

    if (action !== 'reset') {
      return NextResponse.json({ error: 'Невідома дія' }, { status: 400 });
    }

    await connectDB();

    const updated = await UserModel.findByIdAndUpdate(
      id,
      { $set: { totalXp: 0, completedLines: [] } },
      { new: true },
    ).select('_id').lean();

    if (!updated) return NextResponse.json({ error: 'Користувача не знайдено' }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/admin/users/[id]:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ── DELETE — видалити користувача ───────────────────────────
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await connectDB();

    const meId = await currentAdminId();
    // Захист: не можна видалити самого себе.
    if (meId && meId === id) {
      return NextResponse.json({ error: 'Не можна видалити власний акаунт' }, { status: 409 });
    }

    const target = await UserModel.findById(id).select('email').lean<{ email: string }>();
    if (!target) return NextResponse.json({ error: 'Користувача не знайдено' }, { status: 404 });

    // Застереження: незнімного адміна (ADMIN_EMAILS) видаляти дозволяємо,
    // але він відновиться при наступному логіні через Google — тож це не «бан».
    await UserModel.deleteOne({ _id: id });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/admin/users/[id]:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}