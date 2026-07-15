import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { SpotModel } from '@/lib/models/Spot';
import { QuestLineModel } from '@/lib/models/QuestLine';

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
    const allowed = ['info', 'fullInfo', 'audioUrl', 'qrHint', 'quizzes', 'address', 'shortCode'];
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

// POST — створити новий спот
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { slug, name, lat, lng } = body;

    // Мінімальна валідація обов'язкових полів
    if (!slug || !name || typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json(
        { error: 'slug, name, lat, lng обовʼязкові (lat/lng — числа)' },
        { status: 400 },
      );
    }

    // Перевірка унікальності slug
    const existing = await SpotModel.findOne({ slug }).lean();
    if (existing) {
      return NextResponse.json(
        { error: `Спот зі slug "${slug}" вже існує` },
        { status: 409 },
      );
    }

    // Дозволені поля при створенні
    const allowed = ['slug', 'name', 'lat', 'lng', 'address', 'qrHint', 'info',
                     'audioUrl', 'fullInfo', 'type', 'lines', 'transfers', 'shortCode'];
    const data = Object.fromEntries(
      Object.entries(body).filter(([k]) => allowed.includes(k)),
    );

    const spot = await SpotModel.create(data);
    return NextResponse.json({ ok: true, spot }, { status: 201 });
  } catch (err) {
    console.error('POST /api/admin/spots:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE — видалити спот (з перевіркою: чи не входить у маршрут якоїсь лінії)
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ error: 'slug обовʼязковий' }, { status: 400 });
    }

    // ЗАХИСТ: не видаляємо спот, який є в order якоїсь лінії — це зламало б маршрут.
    const linesWithSpot = await QuestLineModel
      .find({ order: slug })
      .select('key label')
      .lean<{ key: string; label: string }[]>();

    if (linesWithSpot.length > 0) {
      const labels = linesWithSpot.map(l => l.label || l.key).join(', ');
      return NextResponse.json(
        {
          error: `Спот у маршруті ліній: ${labels}. Спершу прибери його з порядку цих ліній, потім видаляй.`,
          blockedBy: linesWithSpot.map(l => l.key),
        },
        { status: 409 },
      );
    }

    const res = await SpotModel.deleteOne({ slug });
    if (res.deletedCount === 0) {
      return NextResponse.json({ error: `Спот не знайдено: ${slug}` }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/admin/spots:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}