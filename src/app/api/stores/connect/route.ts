import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/db';
import { Store } from '@/models/Store';

/**
 * POST /api/stores/connect
 *
 * Validates a store code + plaintext store password combination.
 * Returns the store object (without the password hash) on success.
 * This is the first gate before the per-user PIN authentication.
 *
 * Body: { storeCode: string; storePassword: string }
 * Response 200: { success: true; store: IStore }
 * Response 401: { error: 'Invalid store code or password' }
 */
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { storeCode, storePassword } = body as { storeCode?: string; storePassword?: string };

    if (!storeCode || !storePassword) {
      return NextResponse.json(
        { error: 'Store code and store password are required' },
        { status: 400 }
      );
    }

    // Always explicitly select storePassword — it is select:false in the schema
    const escapedCode = storeCode.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const store = await Store.findOne({
      code: { $regex: new RegExp(`^${escapedCode}$`, 'i') },
      isActive: true,
    }).select('+storePassword');

    if (!store || !store.storePassword) {
      return NextResponse.json(
        { error: 'Invalid store code or password' },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(storePassword.trim(), store.storePassword);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid store code or password' },
        { status: 401 }
      );
    }

    // Return a clean store object without the password hash
    const storeObj = store.toObject() as unknown as Record<string, unknown>;
    delete storeObj.storePassword;

    return NextResponse.json({ success: true, store: storeObj });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error connecting to store';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
