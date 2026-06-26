import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { SpotModel } from '@/lib/models/Spot';
import { SessionModel } from '@/lib/models/Session';
import { findQuizByQid } from '@/lib/quiz';

// Драбинка XP за номером спроби (1 → 100, 2 → 50, 3 → 25, далі → 0)
const XP_LADDER = [100, 50, 25];
const MAX_ATTEMPTS = 3;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug, line, qid, answerIndex, sessionId } = body as {
      slug?: string;
      line?: string;
      qid?: string;
      answerIndex?: number;
      sessionId?: string;
    };

    // attempt більше НЕ приймаємо з клієнта — сервер рахує сам (анти-чит).
    if (!slug || typeof answerIndex !== 'number') {
      return NextResponse.json({ error: 'slug, answerIndex required' }, { status: 400 });
    }
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    await connectDB();
    const spot = await SpotModel.findOne({ slug }).lean<any>();
    if (!spot) {
      return NextResponse.json({ error: 'Spot not found' }, { status: 404 });
    }

    // Шукаємо САМЕ показане питання за його qid (бо вибірка рандомна).
    // Це гарантує, що звіряємо ту відповідь, яку турист реально бачив.
    type DbQuiz = {
      line: string;
      question: string;
      options: string[];
      correctIndex: number;
      explanation?: string;
      weight?: number;
    };
    const quizzes: DbQuiz[] = Array.isArray(spot.quizzes) ? spot.quizzes : [];
    if (!qid) {
      return NextResponse.json({ error: 'qid required' }, { status: 400 });
    }
    const quiz = findQuizByQid(quizzes, qid);
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found for qid' }, { status: 404 });
    }

    // Якщо точку вже зараховано — питання закрите, спробу не витрачаємо.
    const existing = await SessionModel
      .findById(sessionId)
      .select('completedSlugs quizAttempts')
      .lean<{ completedSlugs: string[]; quizAttempts?: Record<string, number> }>();
    if (existing?.completedSlugs?.includes(slug)) {
      return NextResponse.json({ error: 'Quiz already completed for this spot' }, { status: 409 });
    }

    // СЕРВЕРНИЙ номер спроби: атомарно інкрементуємо лічильник per-slug.
    // Клієнтський attempt ігнорується повністю — анти-чит.
    const incKey = `quizAttempts.${slug}`;
    const updated = await SessionModel.findByIdAndUpdate(
      sessionId,
      { $inc: { [incKey]: 1 } },
      { new: true },
    ).select('quizAttempts').lean<{ quizAttempts?: Record<string, number> | Map<string, number> }>();

    if (!updated) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Map (Mongoose) чи plain object (lean) — дістаємо однаково.
    const attemptsField: any = updated.quizAttempts;
    const attempt: number =
      (attemptsField instanceof Map ? attemptsField.get(slug) : attemptsField?.[slug]) ?? 1;

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
        attemptNumber: attempt,
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
        attemptNumber: attempt,
        sessionXp,
        explanation: quiz.explanation ?? '',
      });
    }

    // Неправильно, спроби ще лишились — НЕ розкриваємо правильну, нічого не нараховуємо.
    return NextResponse.json({
      correct: false,
      exhausted: false,
      attemptNumber: attempt,
      remainingAttempts: MAX_ATTEMPTS - attempt,
    });
  } catch (err) {
    console.error('POST /api/quiz/answer:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}