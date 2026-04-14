import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';

export async function GET() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    return NextResponse.json({ error: 'MONGODB_URI не знайдено' }, { status: 500 });
  }

  try {
    await connectDB();
    return NextResponse.json({
      ok: true,
      message: 'MongoDB підключено успішно!',
      uri: uri.substring(0, 50) + '...',
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err.message,
      uri: uri.substring(0, 50) + '...',
    }, { status: 500 });
  }
}