import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'omnipos-enterprise-super-secure-jwt-secret-2026';
export const AUTH_COOKIE_NAME = 'omnipos_token';

export interface AuthTokenPayload {
  userId: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'STORE_MANAGER' | 'CASHIER' | 'KIOSK' | 'KITCHEN';
  storeId?: string | null;
  avatar?: string;
  mustChangePin?: boolean;
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
  } catch {
    return null;
  }
}

export async function getSessionFromCookies(): Promise<AuthTokenPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyAuthToken(token);
  } catch {
    return null;
  }
}

export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
};
