import { NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';

export async function GET() {
  try {
    const session = await getSessionFromCookies();

    if (!session) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    await connectToDatabase();
    const user = await User.findById(session.userId);

    if (!user || !user.isActive) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        storeId: user.storeId,
        avatar: user.avatar,
        mustChangePin: user.mustChangePin || false,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Auth verification error';
    return NextResponse.json({ authenticated: false, error: message }, { status: 500 });
  }
}
