import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { SessionModel } from '@/lib/models/Session';
import { SpotVisitModel } from '@/lib/models/SpotVisit';
import { QrScanModel } from '@/lib/models/QrScan';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { event } = body;

    if (event === 'session_start') {
      const doc = await SessionModel.create({
        nickname:   body.nickname,
        line:       body.line,
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
        $set:  { xpTotal: body.xpTotal, completedCount: body.completedCount },
        $push: { completedSlugs: body.slug },
      });
      return NextResponse.json({ ok: true });
    }

    if (event === 'session_finish') {
      await SessionModel.findByIdAndUpdate(body.sessionId, {
        $set: { finishedAt: new Date() },
      });
      return NextResponse.json({ ok: true });
    }

    if (event === 'qr_scan') {
      await QrScanModel.create({
        slug:      body.slug,
        userAgent: body.userAgent ?? '',
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown event' }, { status: 400 });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}