import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { RedemptionModel } from '@/lib/models/Redemption';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const redemptions = await RedemptionModel
      .find({ userId: session.user.id })
      .populate('itemId', 'name emoji discountText category')
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json(redemptions);
  } catch (err) {
    console.error('GET /api/shop/redemptions:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}