import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { QuestLineModel } from '@/lib/models/QuestLine';
import { SpotModel } from '@/lib/models/Spot';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    await connectDB();
    const { key } = await params;

    const line = await QuestLineModel.findOne({ key }).lean();
    if (!line) {
      return NextResponse.json(
        { error: `Лінію не знайдено: ${key}` },
        { status: 404 },
      );
    }

    // Підтягуємо всі споти лінії одним запитом
    // і розставляємо їх у правильному порядку з order[]
    const spots = await SpotModel
      .find({ slug: { $in: line.order } })
      .lean();

    const spotMap = Object.fromEntries(
      spots.map((s: any) => [s.slug, s]),
    );

    const orderedSpots = line.order
      .map((slug: string) => spotMap[slug])
      .filter(Boolean);

    return NextResponse.json({
      key:       line.key,
      label:     line.label,
      color:     line.color,
      startSlug: line.startSlug,
      order:     line.order,
      spots:     orderedSpots,
    });
  } catch (err) {
    console.error('GET /api/lines/[key]:', err);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 },
    );
  }
}