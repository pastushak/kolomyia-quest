import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { ShopItemModel } from '@/lib/models/ShopItem';
import { RedemptionModel } from '@/lib/models/Redemption';
import { UserModel } from '@/lib/models/User';

export async function GET() {
  const session = await auth();

  try {
    await connectDB();

    const items = await ShopItemModel
      .find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    // Якщо авторизований — додаємо інфо про активовані купони і баланс XP
    let userXp = 0;
    let redeemedItemIds: string[] = [];

    if (session?.user?.id) {
      const user = await UserModel.findById(session.user.id).select('totalXp').lean<{ totalXp: number }>();
      userXp = user?.totalXp ?? 0;

      const redemptions = await RedemptionModel
        .find({ userId: session.user.id })
        .select('itemId')
        .lean<{ itemId: any }[]>();
      redeemedItemIds = redemptions.map(r => r.itemId.toString());
    }

    return NextResponse.json({
      items,
      userXp,
      redeemedItemIds,
      isLoggedIn: !!session?.user?.id,
    });
  } catch (err) {
    console.error('GET /api/shop:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}