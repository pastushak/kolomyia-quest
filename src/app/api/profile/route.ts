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
      finishedAt: { $exists: true },
    }).lean<Array<{
      line: string;
      completedSlugs: string[];
      xpTotal: number;
      startedAt: Date;
      finishedAt: Date;
    }>>();

    const totalLocations = sessions.reduce(
      (sum, s) => sum + (s.completedSlugs?.length ?? 0), 0
    );

    const totalMinutes = sessions.reduce((sum, s) => {
      if (!s.startedAt || !s.finishedAt) return sum;
      return sum + Math.round(
        (new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime()) / 60000
      );
    }, 0);

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
    });
  } catch (err) {
    console.error('GET /api/profile:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}