import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { SessionModel } from '@/lib/models/Session';
import { SpotVisitModel } from '@/lib/models/SpotVisit';
import { QrScanModel } from '@/lib/models/QrScan';
import { UserModel } from '@/lib/models/User';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { event } = body;

    if (event === 'session_start') {
      const doc = await SessionModel.create({
        nickname:   body.nickname,
        line:       body.line,
        ageGroup:   body.ageGroup ?? 'adults',
        userId:     body.userId ?? null,
        deviceLang: body.deviceLang ?? '',
      });
      return NextResponse.json({ sessionId: doc._id.toString() });
    }

    if (event === 'spot_complete') {
      await SpotVisitModel.create({
        sessionId:    body.sessionId,
        slug:         body.slug,
        line:         body.line,
        quizAttempts: body.attempts ?? 1,
        xpEarned:     body.xpEarned ?? 0,
      });
      await SessionModel.findByIdAndUpdate(body.sessionId, {
        $set: {
          xpTotal:        body.xpTotal,
          bonusXp:        body.bonusXp ?? 0,
          completedCount: body.completedCount,
        },
        $push: { completedSlugs: body.slug },
      });
      return NextResponse.json({ ok: true });
    }

    if (event === 'session_finish') {
      await SessionModel.findByIdAndUpdate(body.sessionId, {
        $set: { finishedAt: new Date() },
      });
      if (body.userId && body.line && body.ageGroup) {
        await UserModel.findByIdAndUpdate(body.userId, {
          $inc: { totalXp: body.finalXp ?? 0 },
          $push: {
            completedLines: {
              line:        body.line,
              ageGroup:    body.ageGroup,
              completedAt: new Date(),
              finalXp:     body.finalXp ?? 0,
            },
          },
        });
      }
      return NextResponse.json({ ok: true });
    }

    if (event === 'qr_scan') {
      await QrScanModel.create({
        slug:      body.slug,
        userAgent: body.userAgent ?? '',
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { error: 'Unknown event' },
      { status: 400 },
    );
  } catch (err) {
    console.error('POST /api/track:', err);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 },
    );
  }
}