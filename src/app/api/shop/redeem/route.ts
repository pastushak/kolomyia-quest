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

    // Перевіряємо чи є ЩЕ НЕ ЗГОРІЛА активація (повторна активація дозволена після згоряння)
    const existing = await RedemptionModel.findOne({
      userId: session.user.id,
      itemId,
      expiresAt: { $gt: new Date() },
    });
    if (existing) {
      return NextResponse.json({
        error: 'Already redeemed',
        code: existing.code,
        expiresAt: existing.expiresAt,
      }, { status: 409 });
    }

    // Атомарно списуємо XP ТІЛЬКИ якщо балансу вистачає (totalXp >= xpCost).
    // Один запит замість «прочитати → перевірити → списати» — усуває гонку:
    // два паралельні redeem (подвійний тап / два таби) більше не можуть
    // обидва пройти перевірку до списання й загнати баланс у мінус.
    const debited = await UserModel.findOneAndUpdate(
      { _id: session.user.id, totalXp: { $gte: item.xpCost } },
      { $inc: { totalXp: -item.xpCost } },
      { new: true },
    ).lean<{ totalXp: number }>();

    if (!debited) {
      // Балансу не вистачило (або юзера немає) — нічого не списано.
      const current = await UserModel.findById(session.user.id).select('totalXp').lean<{ totalXp: number }>();
      return NextResponse.json(
        { error: 'Not enough XP', required: item.xpCost, current: current?.totalXp ?? 0 },
        { status: 402 },
      );
    }

    // Генеруємо унікальний код купону
    const code = `KQ-${randomBytes(3).toString('hex').toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;

    // Вікно дії активації: інфокартки — 48 год, знижки/безкоштовне — 24 год
    const ACTIVE_HOURS = item.type === 'info' ? 48 : 24;
    const expiresAt = new Date(Date.now() + ACTIVE_HOURS * 60 * 60 * 1000);

    // XP уже списано атомарно вище. Створюємо купон; якщо create впаде —
    // повертаємо списані XP назад (компенсація), щоб турист не втратив бали.
    let redemption;
    try {
      redemption = await RedemptionModel.create({
        userId:   session.user.id,
        itemId,
        code,
        xpSpent:  item.xpCost,
        expiresAt,
      });
    } catch (createErr) {
      await UserModel.findByIdAndUpdate(session.user.id, { $inc: { totalXp: item.xpCost } });
      throw createErr;
    }

    return NextResponse.json({
      ok: true,
      code: redemption.code,
      itemName: item.name,
      expiresAt: redemption.expiresAt,
    });
  } catch (err) {
    console.error('POST /api/shop/redeem:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}