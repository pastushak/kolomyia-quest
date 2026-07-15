import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { SpotModel } from '@/lib/models/Spot';

/**
 * GET /api/spots/by-code?code=RATUS7
 *
 * Запасний вхід: турист вводить 6-значний код з таблички, коли камера не спрацювала.
 * Повертаємо ЛИШЕ slug і назву — нічого зайвого (жодних квізів чи correctIndex).
 */
export async function GET(req: NextRequest) {
  try {
    const raw = (new URL(req.url).searchParams.get('code') ?? '').trim().toUpperCase();

    if (!raw) {
      return NextResponse.json({ error: 'Введи код з таблички' }, { status: 400 });
    }
    // Код рівно 6 символів з безпечного алфавіту (без O/0, I/1, S/5).
    if (!/^[A-Z2-9]{6}$/.test(raw)) {
      return NextResponse.json({ error: 'Код складається з 6 символів' }, { status: 400 });
    }

    await connectDB();

    const spot = await SpotModel.findOne({ shortCode: raw })
      .select('slug name')
      .lean<{ slug: string; name: string }>();

    if (!spot) {
      return NextResponse.json({ error: 'Такого коду немає. Перевір символи на табличці.' }, { status: 404 });
    }

    return NextResponse.json({ slug: spot.slug, name: spot.name });
  } catch (err) {
    console.error('GET /api/spots/by-code:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}