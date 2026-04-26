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
    const spot = await SpotModel.findOne({ slug }).lean();

    if (!spot) {
      return NextResponse.json(
        { error: `Спот не знайдено: ${slug}` },
        { status: 404 },
      );
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