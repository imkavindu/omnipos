import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/db';
import { Store } from '@/models/Store';
import { User } from '@/models/User';
import { getSessionFromCookies } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { storeCode, managerPin } = body;

    if (!storeCode) {
      return NextResponse.json({ error: 'Store code is required' }, { status: 400 });
    }

    // Find store by code
    const cleanCode = storeCode.toUpperCase().trim();
    const store = await Store.findOne({
      code: { $regex: new RegExp(`^${cleanCode}$`, 'i') },
      isActive: true,
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Check 1: Is there an existing active session with STORE_MANAGER or SUPER_ADMIN?
    const session = await getSessionFromCookies();
    let isAuthorized = false;

    if (session) {
      if (session.role === 'SUPER_ADMIN') {
        isAuthorized = true;
      } else if (
        session.role === 'STORE_MANAGER' &&
        session.storeId === store._id.toString()
      ) {
        isAuthorized = true;
      }
    }

    // Check 2: If not verified via session cookie, verify submitted managerPin
    // Apply brute-force lockout BEFORE attempting bcrypt.compare to prevent exhaustive PIN guessing.
    // A 4-digit PIN has only 10,000 combinations; without lockout, an attacker with physical
    // access to an unattended terminal could exhaust them in seconds via scripted requests.
    if (!isAuthorized && managerPin) {
      // Rate-limit PIN attempts per store: 5 attempts per 60 seconds.
      // Key is scoped to the store ID so attempts on one terminal don't block another store.
      const pinAttemptKey = `unpair_pin:${store._id.toString()}`;
      const pinRateLimit = checkRateLimit(pinAttemptKey, 5, 60 * 1000);

      if (!pinRateLimit.success) {
        return NextResponse.json(
          {
            error: `Too many failed PIN attempts. Terminal unpair is locked for ${pinRateLimit.reset} second(s). Please retry later or contact your area manager.`,
          },
          { status: 429 }
        );
      }

      const cleanPin = String(managerPin).trim();
      const storeManagers = await User.find({
        storeId: store._id.toString(),
        role: 'STORE_MANAGER',
        isActive: true,
      });

      for (const mgr of storeManagers) {
        if (mgr.pinCode && (await bcrypt.compare(cleanPin, mgr.pinCode))) {
          isAuthorized = true;
          break;
        }
      }
      // Note: on a failed PIN we intentionally do NOT reset the rate limit counter —
      // each failed attempt consumes one of the 5 allowed slots for this 60s window.
    }

    if (!isAuthorized) {
      return NextResponse.json(
        {
          error: 'Manager authorization required. Please enter a valid Store Manager PIN to unpair this terminal.',
        },
        { status: 401 }
      );
    }

    // Clear the device-store pairing cookie
    const response = NextResponse.json({
      success: true,
      message: `Terminal successfully unpaired from ${store.name}.`,
    });

    response.cookies.set({
      name: 'omnipos_device_store',
      value: '',
      path: '/',
      maxAge: 0,
      sameSite: 'lax',
    });

    response.cookies.set({
      name: 'omnipos_store_session',
      value: '',
      path: '/',
      maxAge: 0,
      sameSite: 'lax',
    });

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error unpairing terminal';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
