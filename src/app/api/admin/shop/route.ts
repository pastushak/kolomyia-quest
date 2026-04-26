import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ShopItemModel } from '@/lib/models/ShopItem';

// GET — всі позиції для адмінки
export async function GET() {
  try {
    await connectDB();
    const items = await ShopItemModel.find({}).sort({ sortOrder: 1, createdAt: 1 }).lean();
    return NextResponse.json(items);
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST — створити нову позицію
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const item = await ShopItemModel.create(body);
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    console.error('POST /api/admin/shop:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH — оновити позицію
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const { id, ...updates } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const item = await ShopItemModel.findByIdAndUpdate(id, { $set: updates }, { new: true });
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(item);
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE — видалити позицію
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await ShopItemModel.findByIdAndDelete(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}