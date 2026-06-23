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
      // Аналітика відвідувань. XP та completedSlugs тепер веде /api/quiz/answer (серверно),
      // тому тут їх БІЛЬШЕ НЕ пишемо — інакше клієнтська сума затирала б серверний баланс.
      await SpotVisitModel.create({
        sessionId:    body.sessionId,
        slug:         body.slug,
        line:         body.line,
        quizAttempts: body.attempts ?? 1,
        xpEarned:     body.xpEarned ?? 0,
      });
      // Оновлюємо лише лічильник пройдених (необов'язкове, для зручності статистики).
      await SessionModel.findByIdAndUpdate(body.sessionId, {
        $set: { completedCount: body.completedCount },
      });
      return NextResponse.json({ ok: true });
    }

    if (event === 'session_finish') {
      // Атомарно завершуємо сесію ТІЛЬКИ якщо вона ще не завершена.
      // Якщо finishedAt вже стоїть — updated буде null, і ми нічого не нараховуємо.
      const updated = await SessionModel.findOneAndUpdate(
        { _id: body.sessionId, finishedAt: null },
        { $set: { finishedAt: new Date() } },
        { new: true },
      );

      // Сесія вже була завершена раніше (повторний фініш / релоуд) — виходимо без нарахувань.
      if (!updated) {
        return NextResponse.json({ ok: true, alreadyFinished: true });
      }

      // Нараховуємо XP та пишемо у completedLines лише при ПЕРШОМУ фініші.
      // Бонус за фініш визначає СЕРВЕР: чиста лінія +300, модифікація +100.
      if (body.userId && body.ageGroup) {
        const isModification = (body.transferCount ?? 0) > 0;
        const finishBonus    = isModification ? 100 : 300;
        const totalAward      = (body.finalXp ?? 0) + finishBonus;

        const completedLineEntry = isModification
          ? {
              type:         'modification',
              line:         null,
              modification: body.modification ?? '',   // нотація "cherry(3)-orange(4)"
              branches:     body.branches ?? [],         // [{ line, count }]
              ageGroup:     body.ageGroup,
              completedAt:  new Date(),
              finalXp:      totalAward,
            }
          : {
              type:         'pure',
              line:         body.line ?? null,
              modification: null,
              branches:     [],
              ageGroup:     body.ageGroup,
              completedAt:  new Date(),
              finalXp:      totalAward,
            };

        await UserModel.findByIdAndUpdate(body.userId, {
          $inc:  { totalXp: totalAward },
          $push: { completedLines: completedLineEntry },
        });
      }

      return NextResponse.json({ ok: true });
    }

    if (event === 'transfer') {
      // Пересадка коштує 50 XP. Платиться з СЕСІЙНОГО балансу (SessionModel.xpTotal),
      // який ведеться серверно через /api/quiz/answer. Лише для залогінених.
      if (!body.userId) {
        return NextResponse.json({ ok: false, reason: 'auth_required' });
      }
      if (!body.sessionId) {
        return NextResponse.json({ ok: false, reason: 'error' });
      }

      const TRANSFER_COST = 50;

      // Атомарно списуємо 50 XP з сесії ТІЛЬКИ якщо балансу вистачає (xpTotal >= 50).
      const updated = await SessionModel.findOneAndUpdate(
        { _id: body.sessionId, xpTotal: { $gte: TRANSFER_COST } },
        { $inc: { xpTotal: -TRANSFER_COST, transferCount: 1 } },
        { new: true },
      );

      if (!updated) {
        return NextResponse.json({ ok: false, reason: 'insufficient_xp' });
      }

      return NextResponse.json({ ok: true, newBalance: updated.xpTotal });
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