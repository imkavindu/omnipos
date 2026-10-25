import { NextRequest, NextResponse } from 'next/server';
import { seedDatabase } from '@/lib/seed';

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const force = url.searchParams.get('force') === 'true';
    const result = await seedDatabase(force);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Seed error:', error);
    const message = error instanceof Error ? error.message : 'Failed to seed database';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const result = await seedDatabase(false);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Seed status error:', error);
    const message = error instanceof Error ? error.message : 'Failed to check seed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
