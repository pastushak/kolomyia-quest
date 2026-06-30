import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { QuestLineModel } from '@/lib/models/QuestLine';

// Поля, які можна задати/оновити з адмінки
const ALLOWED = ['label', 'color', 'startSlug', 'status', 'theme', 'description', 'order'];

// GET — усі лінії (базові спершу, нові за ними)
export async function GET() {
  try {
    await connectDB();
    const lines = await QuestLineModel.find({}).lean();
    const BASE = ['cherry', 'orange', 'green'];
    const base = BASE.map(k => lines.find((l: any) => l.key === k)).filter(Boolean);
    const custom = lines
      .filter((l: any) => !BASE.includes(l.key))
      .sort((a: any, b: any) => (a.label || '').localeCompare(b.label || ''));
    return NextResponse.json([...base, ...custom]);
  } catch (err) {
    console.error('GET /api/admin/lines:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST — створити нову лінію
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { key, label, color, startSlug } = body;

    if (!key || !label || !color) {
      return NextResponse.json({ error: 'key, label, color обовʼязкові' }, { status: 400 });
    }

    // key — лише латиниця/цифри/підкреслення (узгоджено зі slug-логікою)
    const cleanKey = String(key).trim().toLowerCase().replace(/\s+/g, '_');
    if (!/^[a-z0-9_]+$/.test(cleanKey)) {
      return NextResponse.json({ error: 'key може містити лише латинські літери, цифри та _' }, { status: 400 });
    }

    const existing = await QuestLineModel.findOne({ key: cleanKey }).lean();
    if (existing) {
      return NextResponse.json({ error: `Лінія "${cleanKey}" вже існує` }, { status: 409 });
    }

    const data: any = { key: cleanKey };
    for (const f of ALLOWED) if (body[f] !== undefined) data[f] = body[f];
    // нова лінія за замовчуванням — чернетка (поки нема спотів)
    if (data.status === undefined) data.status = 'draft';
    if (!data.startSlug) data.startSlug = '';   // дозволяємо порожній старт на старті
    if (!Array.isArray(data.order)) data.order = [];

    const line = await QuestLineModel.create(data);
    return NextResponse.json({ ok: true, line }, { status: 201 });
  } catch (err) {
    console.error('POST /api/admin/lines:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH — оновити лінію (key незмінний)
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { key } = body;
    if (!key) {
      return NextResponse.json({ error: 'key обовʼязковий' }, { status: 400 });
    }

    const update: any = {};
    for (const f of ALLOWED) if (body[f] !== undefined) update[f] = body[f];

    const line = await QuestLineModel.findOneAndUpdate(
      { key },
      { $set: update },
      { new: true },
    ).lean();

    if (!line) {
      return NextResponse.json({ error: `Лінію не знайдено: ${key}` }, { status: 404 });
    }
    return NextResponse.json({ ok: true, line });
  } catch (err) {
    console.error('PATCH /api/admin/lines:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE — видалити лінію (?key=...). Захист: не видаляємо базові лінії.
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    if (!key) {
      return NextResponse.json({ error: 'key обовʼязковий' }, { status: 400 });
    }

    // ЗАХИСТ: базові лінії не видаляються через адмінку
    if (['cherry', 'orange', 'green'].includes(key)) {
      return NextResponse.json({ error: 'Базові лінії (cherry/orange/green) видаляти не можна' }, { status: 403 });
    }

    const res = await QuestLineModel.deleteOne({ key });
    if (res.deletedCount === 0) {
      return NextResponse.json({ error: `Лінію не знайдено: ${key}` }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/admin/lines:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}