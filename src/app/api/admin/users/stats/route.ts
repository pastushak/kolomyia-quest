import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { UserModel } from '@/lib/models/User';

// GET /api/admin/users/stats — зведена аналітика по користувачах (read-only).
export async function GET() {
  try {
    await connectDB();

    const now      = Date.now();
    const weekAgo  = new Date(now - 7 * 86400000);

    const [
      totalUsers,
      activeWeek,
      newWeek,
      xpAgg,
      finishedUsers,
      lineDist,
      ageDist,
    ] = await Promise.all([
      // Усього користувачів
      UserModel.countDocuments(),
      // Активні за 7 днів (за останнім входом)
      UserModel.countDocuments({ lastLoginAt: { $gte: weekAgo } }),
      // Нові за 7 днів
      UserModel.countDocuments({ createdAt: { $gte: weekAgo } }),
      // XP: сума, середнє, максимум
      UserModel.aggregate([
        { $group: {
          _id: null,
          totalXp: { $sum: '$totalXp' },
          avgXp:   { $avg: '$totalXp' },
          maxXp:   { $max: '$totalXp' },
        }},
      ]),
      // Скільки юзерів завершили хоча б один маршрут
      UserModel.countDocuments({ 'completedLines.0': { $exists: true } }),
      // Розподіл завершених маршрутів по лініях (pure) + комбіновані (modification)
      UserModel.aggregate([
        { $unwind: '$completedLines' },
        { $group: {
          _id: {
            $cond: [
              { $eq: ['$completedLines.type', 'modification'] },
              'combined',
              '$completedLines.line',
            ],
          },
          count: { $sum: 1 },
        }},
      ]),
      // Розподіл завершень по вікових групах
      UserModel.aggregate([
        { $unwind: '$completedLines' },
        { $group: { _id: '$completedLines.ageGroup', count: { $sum: 1 } } },
      ]),
    ]);

    const xp = xpAgg[0] ?? { totalXp: 0, avgXp: 0, maxXp: 0 };

    const lineCount = (key: string) =>
      (lineDist as Array<{ _id: string; count: number }>).find(l => l._id === key)?.count ?? 0;

    const ageCount = (key: string) =>
      (ageDist as Array<{ _id: string; count: number }>).find(a => a._id === key)?.count ?? 0;

    return NextResponse.json({
      totalUsers,
      activeWeek,
      newWeek,
      finishedUsers,
      totalXp: xp.totalXp ?? 0,
      avgXp:   Math.round(xp.avgXp ?? 0),
      maxXp:   xp.maxXp ?? 0,
      lines: {
        cherry:   lineCount('cherry'),
        orange:   lineCount('orange'),
        green:    lineCount('green'),
        combined: lineCount('combined'),
      },
      ages: {
        kids:   ageCount('kids'),
        teens:  ageCount('teens'),
        adults: ageCount('adults'),
      },
    });
  } catch (err) {
    console.error('GET /api/admin/users/stats:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}