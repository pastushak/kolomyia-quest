import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { SpotModel } from '@/lib/models/Spot';
import { SessionModel } from '@/lib/models/Session';

// Драбинка XP за номером спроби (1 → 100, 2 → 50, 3 → 25, далі → 0)
const XP_LADDER = [100, 50, 25];
const MAX_ATTEMPTS = 3;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug, line, answerIndex, attempt, sessionId } = body as {
      slug?: string;
      line?: string;
      answerIndex?: number;
      attempt?: number;
      sessionId?: string;
    };

    if (!slug || typeof answerIndex !== 'number' || typeof attempt !== 'number') {
      return NextResponse.json({ error: 'slug, answerIndex, attempt required' }, { status: 400 });
    }

    await connectDB();
    const spot = await SpotModel.findOne({ slug }).lean<any>();
    if (!spot) {
      return NextResponse.json({ error: 'Spot not found' }, { status: 404 });
    }

    // Знаходимо квіз потрібної лінії (quizzes — масив per-line)
    const quizzes = Array.isArray(spot.quizzes) ? spot.quizzes : [];
    const quiz = quizzes.find((q: any) => q.line === line) ?? quizzes[0];
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not available' }, { status: 404 });
    }

    const correct   = answerIndex === quiz.correctIndex;
    const exhausted = attempt >= MAX_ATTEMPTS;

    // Зчитати свіжий серверний баланс сесії.
    async function readSessionXp(): Promise<number> {
      if (!sessionId) return 0;
      const fresh = await SessionModel
        .findById(sessionId).select('xpTotal').lean<{ xpTotal: number }>();
      return fresh?.xpTotal ?? 0;
    }

    // Нарахувати XP у сесію ІДЕМПОТЕНТНО: тільки якщо точку ще не зараховано.
    // Боронить від подвійного нарахування за повторні/ретрайні відповіді.
    async function awardAndReadXp(xp: number): Promise<number> {
      if (!sessionId) return 0;
      await SessionModel.findOneAndUpdate(
        { _id: sessionId, completedSlugs: { $ne: slug } },
        {
          ...(xp > 0 ? { $inc: { xpTotal: xp } } : {}),
          $push: { completedSlugs: slug },
        },
      );
      return readSessionXp();
    }

    if (correct) {
      const xpEarned  = XP_LADDER[attempt - 1] ?? 0;
      const sessionXp = await awardAndReadXp(xpEarned);
      return NextResponse.json({
        correct: true,
        xpEarned,
        sessionXp,                          // актуальний серверний баланс сесії
        explanation: quiz.explanation ?? '',
      });
    }

    if (exhausted) {
      // Спроби вичерпано — точку зараховуємо з 0 XP (ідемпотентно), правильну розкриваємо.
      const sessionXp = await awardAndReadXp(0);
      return NextResponse.json({
        correct: false,
        exhausted: true,
        correctIndex: quiz.correctIndex,
        xpEarned: 0,
        sessionXp,
        explanation: quiz.explanation ?? '',
      });
    }

    // Неправильно, спроби ще лишились — НЕ розкриваємо правильну, нічого не нараховуємо.
    return NextResponse.json({
      correct: false,
      exhausted: false,
      remainingAttempts: MAX_ATTEMPTS - attempt,
    });
  } catch (err) {
    console.error('POST /api/quiz/answer:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}