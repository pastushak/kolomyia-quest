import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { ShopItemModel } from '@/lib/models/ShopItem';
import { RedemptionModel } from '@/lib/models/Redemption';
import { UserModel } from '@/lib/models/User';
import { randomBytes } from 'crypto';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { itemId } = await req.json();
    if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 });

    await connectDB();

    // Перевіряємо чи позиція існує і активна
    const item = await ShopItemModel.findById(itemId).lean<{
      _id: any; name: string; type: string; xpCost: number; discountText: string;
    }>();
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

    // Перевіряємо чи вже активовано
    const existing = await RedemptionModel.findOne({ userId: session.user.id, itemId });
    if (existing) {
      return NextResponse.json({ error: 'Already redeemed', code: existing.code }, { status: 409 });
    }

    // Перевіряємо баланс XP
    const user = await UserModel.findById(session.user.id).lean<{ totalXp: number }>();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (user.totalXp < item.xpCost) {
      return NextResponse.json({ error: 'Not enough XP', required: item.xpCost, current: user.totalXp }, { status: 402 });
    }

    // Генеруємо унікальний код купону
    const code = `KQ-${randomBytes(3).toString('hex').toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;

    // Списуємо XP і створюємо купон
    await UserModel.findByIdAndUpdate(session.user.id, { $inc: { totalXp: -item.xpCost } });
    const redemption = await RedemptionModel.create({
      userId:   session.user.id,
      itemId,
      code,
      xpSpent:  item.xpCost,
    });

    return NextResponse.json({ ok: true, code: redemption.code, itemName: item.name });
  } catch (err) {
    console.error('POST /api/shop/redeem:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}