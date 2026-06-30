import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { QuestLineModel } from '@/lib/models/QuestLine';

export async function GET() {
  try {
    await connectDB();

    const lines = await QuestLineModel
      .find({})
      .select('key label color startSlug order status theme description')
      .lean();

    // Базові лінії — у фіксованому порядку спершу, нові тематичні — за ними (за label).
    const BASE = ['cherry', 'orange', 'green'];
    const baseLines = BASE
      .map(key => lines.find((l: any) => l.key === key))
      .filter(Boolean);
    const customLines = lines
      .filter((l: any) => !BASE.includes(l.key))
      .sort((a: any, b: any) => (a.label || '').localeCompare(b.label || ''));
    const sorted = [...baseLines, ...customLines];

    return NextResponse.json(sorted);
  } catch (err) {
    console.error('GET /api/lines:', err);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 },
    );
  }
}