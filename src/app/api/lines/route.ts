import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { QuestLineModel } from '@/lib/models/QuestLine';

export async function GET() {
  try {
    await connectDB();

    const lines = await QuestLineModel
      .find({})
      .select('key label color startSlug order')
      .lean();

    // Повертаємо у фіксованому порядку: вишнева, оранжева, зелена
    const ORDER = ['cherry', 'orange', 'green'];
    const sorted = ORDER
      .map(key => lines.find((l: any) => l.key === key))
      .filter(Boolean);

    return NextResponse.json(sorted);
  } catch (err) {
    console.error('GET /api/lines:', err);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 },
    );
  }
}