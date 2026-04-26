import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { SpotModel } from '@/lib/models/Spot';

// GET — всі споти для адмін-панелі
export async function GET() {
  try {
    await connectDB();
    const spots = await SpotModel
      .find({})
      .sort({ name: 1 })
      .lean();
    return NextResponse.json(spots);
  } catch (err) {
    console.error('GET /api/admin/spots:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH — оновити один спот (info, qrHint, quizzes)
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { slug, ...updates } = body;

    if (!slug) {
      return NextResponse.json(
        { error: 'slug обовʼязковий' },
        { status: 400 },
      );
    }

    // Дозволяємо оновлювати тільки безпечні поля
    const allowed = ['info', 'qrHint', 'quizzes', 'address'];
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([k]) => allowed.includes(k)),
    );

    const spot = await SpotModel.findOneAndUpdate(
      { slug },
      { $set: filtered },
      { new: true },
    );

    if (!spot) {
      return NextResponse.json(
        { error: `Спот не знайдено: ${slug}` },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, spot });
  } catch (err) {
    console.error('PATCH /api/admin/spots:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}