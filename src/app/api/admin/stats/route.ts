import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { SessionModel } from '@/lib/models/Session';
import { SpotVisitModel } from '@/lib/models/SpotVisit';
import { QrScanModel } from '@/lib/models/QrScan';

export async function GET() {
  try {
    await connectDB();

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

    const [
      totalSessions,
      finishedSessions,
      totalScans,
      sessions,
      topSpots,
      scansByDay,
      lineStats,
    ] = await Promise.all([
      SessionModel.countDocuments(),
      SessionModel.countDocuments({ finishedAt: { $ne: null } }),
      QrScanModel.countDocuments(),
      SessionModel.find().sort({ startedAt: -1 }).limit(20).lean(),
      SpotVisitModel.aggregate([
        { $group: { _id: '$slug', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
      QrScanModel.aggregate([
        { $match: { scannedAt: { $gte: sevenDaysAgo } } },
        { $group: {
          _id: { $dateToString: { format: '%d.%m', date: '$scannedAt' } },
          count: { $sum: 1 },
        }},
        { $sort: { _id: 1 } },
      ]),
      SessionModel.aggregate([
        { $group: { _id: '$line', count: { $sum: 1 } } },
      ]),
    ]);

    const avgXp = sessions.length
      ? Math.round(
          sessions.reduce((s: number, r: any) => s + (r.xpTotal || 0), 0)
          / sessions.length,
        )
      : 0;

    // Статистика по трьох лініях
    const lineCount = (key: string) =>
      lineStats.find((l: any) => l._id === key)?.count ?? 0;

    return NextResponse.json({
      totalSessions,
      finishedSessions,
      totalScans,
      avgXp,
      cherryCount: lineCount('cherry'),
      orangeCount: lineCount('orange'),
      greenCount:  lineCount('green'),
      topSpots:    topSpots.map((s: any) => ({ slug: s._id, count: s.count })),
      scansByDay:  scansByDay.map((d: any) => ({ day: d._id, count: d.count })),
      recentSessions: sessions.map((s: any) => ({
        id:             s._id.toString(),
        nickname:       s.nickname,
        line:           s.line,
        xpTotal:        s.xpTotal,
        completedCount: s.completedCount,
        startedAt:      s.startedAt,
        finishedAt:     s.finishedAt,
      })),
    });
  } catch (err) {
    console.error('GET /api/admin/stats:', err);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 },
    );
  }
}