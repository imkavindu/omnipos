import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });

  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    ...AUTH_COOKIE_OPTIONS,
    maxAge: 0,
  });

  return response;
}
