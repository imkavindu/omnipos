import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { signAuthToken, AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const adminUser = await User.findOne({
      email: email.toLowerCase().trim(),
      role: 'SUPER_ADMIN',
      isActive: true,
    });

    if (!adminUser || !adminUser.passwordHash) {
      return NextResponse.json(
        { error: 'Invalid platform administrator credentials' },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(password, adminUser.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Invalid platform administrator credentials' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = signAuthToken({
      userId: adminUser._id.toString(),
      email: adminUser.email,
      name: adminUser.name,
      role: 'SUPER_ADMIN',
      storeId: null,
      avatar: adminUser.avatar,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: adminUser._id.toString(),
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
        avatar: adminUser.avatar,
        storeId: null,
      },
    });

    // Set secure httpOnly cookie
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      ...AUTH_COOKIE_OPTIONS,
    });

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Login failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
