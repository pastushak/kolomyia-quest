import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { UserModel } from '@/lib/models/User';
import { SessionModel } from '@/lib/models/Session';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();

    const user = await UserModel
      .findById(session.user.id)
      .lean<{
        _id: any;
        name: string;
        email: string;
        avatarUrl: string;
        totalXp: number;
        completedLines: Array<{
          line: string;
          ageGroup: string;
          completedAt: Date;
          finalXp: number;
        }>;
        createdAt: Date;
      }>();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Статистика з сесій
    const sessions = await SessionModel.find({
      userId: session.user.id,
      finishedAt: { $ne: null },
    }).lean<Array<{
      line: string;
      completedSlugs: string[];
      xpTotal: number;
      startedAt: Date;
      finishedAt: Date;
      transferCount: number;
    }>>();

    // Унікальні відвідані локації (а не сума з повторами й shared-спотами).
    // completedSlugs може повторюватися між сесіями — рахуємо кожен слаг раз.
    const uniqueSlugs = new Set<string>();
    for (const s of sessions) {
      for (const slug of s.completedSlugs ?? []) uniqueSlugs.add(slug);
    }
    const totalLocations = uniqueSlugs.size;

    // Час у місті з розумним лімітом на сесію. Реальний прохід — години, не дні.
    // Якщо сесію забули закрити (різниця величезна), зараховуємо максимум MAX_SESSION_MIN,
    // щоб один «завислий» сеанс не роздував статистику.
    const MAX_SESSION_MIN = 480;   // 8 год — щедра стеля на один маршрут
    const totalMinutes = sessions.reduce((sum, s) => {
      if (!s.startedAt || !s.finishedAt) return sum;
      const diff = Math.round(
        (new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime()) / 60000
      );
      if (diff <= 0) return sum;                       // некоректні/від'ємні — ігноруємо
      return sum + Math.min(diff, MAX_SESSION_MIN);    // обрізаємо аномально довгі
    }, 0);

    // ── Дані для бейджів ────────────────────────────────────
    const finishHours = sessions
      .filter(s => s.finishedAt)
      .map(s => new Date(s.finishedAt).getHours());

    const finishMonths = (user.completedLines ?? [])
      .filter((l: any) => l.completedAt)
      .map((l: any) => new Date(l.completedAt).getMonth());   // 0=січ..11=груд

    const maxTransfers = sessions.reduce(
      (max, s) => Math.max(max, s.transferCount ?? 0), 0
    );

    return NextResponse.json({
      name:           user.name,
      email:          user.email,
      avatarUrl:      user.avatarUrl,
      totalXp:        user.totalXp,
      completedLines: user.completedLines,
      createdAt:      user.createdAt,
      stats: {
        totalSessions:  sessions.length,
        totalLocations,
        totalMinutes,
      },
      badgeData: {
        visitedSlugs: Array.from(uniqueSlugs),
        finishHours,
        finishMonths,
        maxTransfers,
      },
    });
  } catch (err) {
    console.error('GET /api/profile:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}