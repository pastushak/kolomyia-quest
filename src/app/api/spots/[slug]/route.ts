import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { SpotModel } from '@/lib/models/Spot';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    await connectDB();
    const { slug } = await params;
    const spot = await SpotModel.findOne({ slug }).lean<any>();

    if (!spot) {
      return NextResponse.json(
        { error: `Спот не знайдено: ${slug}` },
        { status: 404 },
      );
    }

    // Прибираємо correctIndex із квізів — клієнт не повинен знати правильну відповідь.
    // Перевірка відповіді відбувається на сервері (/api/quiz/answer).
    if (Array.isArray(spot.quizzes)) {
      spot.quizzes = spot.quizzes.map((q: any) => {
        const { correctIndex, ...rest } = q;
        return rest;
      });
    }

    return NextResponse.json(spot);
  } catch (err) {
    console.error('GET /api/spots/[slug]:', err);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 },
    );
  }
}