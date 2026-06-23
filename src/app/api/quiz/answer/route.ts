import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { SpotModel } from '@/lib/models/Spot';

// Драбинка XP за номером спроби (1 → 100, 2 → 50, 3 → 25, далі → 0)
const XP_LADDER = [100, 50, 25];
const MAX_ATTEMPTS = 3;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug, line, answerIndex, attempt } = body as {
      slug?: string;
      line?: string;
      answerIndex?: number;
      attempt?: number;
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

    const correct = answerIndex === quiz.correctIndex;
    const exhausted = attempt >= MAX_ATTEMPTS;

    if (correct) {
      // XP за номером спроби: 1-ша → 100, 2-га → 50, 3-тя → 25
      const xpEarned = XP_LADDER[attempt - 1] ?? 0;
      return NextResponse.json({
        correct: true,
        xpEarned,
        explanation: quiz.explanation ?? '',
      });
    }

    // Неправильно
    if (exhausted) {
      // Спроби вичерпано — розкриваємо правильну, XP = 0, точка все одно зарахується
      return NextResponse.json({
        correct: false,
        exhausted: true,
        correctIndex: quiz.correctIndex,
        xpEarned: 0,
        explanation: quiz.explanation ?? '',
      });
    }

    // Неправильно, спроби ще лишились — НЕ розкриваємо правильну
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