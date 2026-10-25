import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/db';
import { Store } from '@/models/Store';
import { User } from '@/models/User';
import { getSessionFromCookies } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    // 1. Super Admin Authentication Gate
    const sessionUser = await getSessionFromCookies();
    if (!sessionUser || sessionUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Platform administrator privileges required.' },
        { status: 403 }
      );
    }

    // 2. Rate Limiting: max 5 requests per 60 seconds per Super Admin
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || sessionUser.userId;
    const rateLimit = checkRateLimit(`admin_store_${sessionUser.userId}_${clientIp}`, 5, 60 * 1000);

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: `Rate limit exceeded. Please wait ${rateLimit.reset}s before onboarding another business.`,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.reset) },
        }
      );
    }

    await connectToDatabase();
    const body = await req.json();

    const {
      name,
      code,
      type = 'retail',
      address = '',
      phone = '',
      currency = 'LKR',
      currencySymbol = 'Rs.',
      taxRate = 8.0,
      receiptHeader = '',
      receiptFooter = '',
      ownerName,
      ownerEmail,
      ownerPin = '1111',
      planTier = 'growth',
      subscriptionStatus = 'trial',
      monthlyFee = 99.0,
    } = body;

    // Required fields validation
    if (!name || !code || !ownerName || !ownerEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: name, code, ownerName, ownerEmail' },
        { status: 400 }
      );
    }

    const cleanCode = code.toUpperCase().trim();
    const cleanEmail = ownerEmail.toLowerCase().trim();
    const cleanPin = String(ownerPin).trim();

    if (cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
      return NextResponse.json(
        { error: 'Initial manager PIN must be exactly 4 numeric digits' },
        { status: 400 }
      );
    }

    // 3. Atomic Multi-Document Transaction
    const dbSession = await mongoose.startSession();
    let createdStore: unknown = null;
    let createdManager: unknown = null;

    try {
      await dbSession.withTransaction(async () => {
        // A. Store Code Uniqueness Check inside Transaction
        const escapedCode = cleanCode.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        const existingStore = await Store.findOne({
          code: { $regex: new RegExp(`^${escapedCode}$`, 'i') },
        }).session(dbSession);

        if (existingStore) {
          throw new Error(`Store code "${cleanCode}" is already registered`);
        }

        // B. Owner Email Uniqueness Check inside Transaction
        const existingUser = await User.findOne({ email: cleanEmail }).session(dbSession);
        if (existingUser) {
          throw new Error(`A user with email "${cleanEmail}" already exists`);
        }

        // C. Create Store Document
        const [newStore] = await Store.create(
          [
            {
              name: name.trim(),
              code: cleanCode,
              type,
              address: address.trim(),
              phone: phone.trim(),
              currency,
              currencySymbol,
              taxRate: Number(taxRate) || 8.0,
              receiptHeader: receiptHeader || `${name}\nThank you for your business!`,
              receiptFooter: receiptFooter || 'Please come again soon.',
              ownerName: ownerName.trim(),
              ownerEmail: cleanEmail,
              planTier,
              subscriptionStatus,
              monthlyFee: Number(monthlyFee) || (planTier === 'starter' ? 49 : planTier === 'growth' ? 99 : 199),
              isActive: true,
            },
          ],
          { session: dbSession }
        );

        // D. Hash Initial Manager PIN with bcrypt (cost factor: 10)
        const hashedPin = await bcrypt.hash(cleanPin, 10);

        // E. Create Initial STORE_MANAGER with mustChangePin: true
        const [newManager] = await User.create(
          [
            {
              name: ownerName.trim(),
              email: cleanEmail,
              pinCode: hashedPin,
              role: 'STORE_MANAGER',
              storeId: newStore._id.toString(),
              mustChangePin: true, // Requires mandatory PIN change on first login
              isActive: true,
            },
          ],
          { session: dbSession }
        );

        createdStore = newStore;
        createdManager = {
          id: newManager._id,
          name: newManager.name,
          email: newManager.email,
          role: newManager.role,
          storeId: newManager.storeId,
          mustChangePin: newManager.mustChangePin,
        };
      });
    } finally {
      await dbSession.endSession();
    }

    return NextResponse.json(
      {
        success: true,
        message: `Business "${name}" onboarded successfully! Initial Store Manager account created.`,
        store: createdStore,
        manager: createdManager,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error onboarding business';
    const status = message.includes('already') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
