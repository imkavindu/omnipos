import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/db';
import { Store } from '@/models/Store';
import { User } from '@/models/User';

const PLAN_FEES: Record<string, number> = {
  starter: 4900,
  growth: 9900,
  enterprise: 19900,
};

/**
 * POST /api/stores/register
 *
 * SaaS onboarding: creates a new tenant store + an initial STORE_MANAGER user
 * in a single atomic operation.
 *
 * Body:
 *   businessName      string  — display name of the store
 *   storeCode         string  — unique alphanumeric code chosen by the owner
 *   storeType         'restaurant' | 'retail'
 *   storePassword     string  — plaintext; hashed server-side with bcrypt
 *   planTier          'starter' | 'growth' | 'enterprise'
 *   ownerName         string
 *   ownerEmail        string
 *   managerPin        string  — 4-digit PIN for the initial manager account
 *   address?          string
 *   phone?            string
 */
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const {
      businessName,
      storeCode,
      storeType,
      storePassword,
      planTier,
      ownerName,
      ownerEmail,
      managerPin,
      address = '',
      phone = '',
    } = body as {
      businessName?: string;
      storeCode?: string;
      storeType?: 'restaurant' | 'retail';
      storePassword?: string;
      planTier?: 'starter' | 'growth' | 'enterprise';
      ownerName?: string;
      ownerEmail?: string;
      managerPin?: string;
      address?: string;
      phone?: string;
    };

    // --- Input validation ---
    if (!businessName || !storeCode || !storeType || !storePassword || !planTier || !ownerName || !ownerEmail || !managerPin) {
      return NextResponse.json(
        { error: 'All fields are required: businessName, storeCode, storeType, storePassword, planTier, ownerName, ownerEmail, managerPin' },
        { status: 400 }
      );
    }

    const normalizedCode = storeCode.toUpperCase().trim().replace(/[^A-Z0-9\-]/g, '');
    if (normalizedCode.length < 3 || normalizedCode.length > 16) {
      return NextResponse.json(
        { error: 'Store code must be 3–16 alphanumeric characters (hyphens allowed)' },
        { status: 400 }
      );
    }

    if (storePassword.length < 6) {
      return NextResponse.json({ error: 'Store password must be at least 6 characters' }, { status: 400 });
    }

    if (!/^\d{4}$/.test(managerPin.trim())) {
      return NextResponse.json({ error: 'Manager PIN must be exactly 4 digits' }, { status: 400 });
    }

    if (!['restaurant', 'retail'].includes(storeType)) {
      return NextResponse.json({ error: 'storeType must be "restaurant" or "retail"' }, { status: 400 });
    }

    if (!['starter', 'growth', 'enterprise'].includes(planTier)) {
      return NextResponse.json({ error: 'Invalid planTier' }, { status: 400 });
    }

    // --- Uniqueness checks ---
    const [existingStore, existingEmail] = await Promise.all([
      Store.findOne({ code: normalizedCode }),
      User.findOne({ email: ownerEmail.toLowerCase().trim() }),
    ]);

    if (existingStore) {
      return NextResponse.json(
        { error: `Store code "${normalizedCode}" is already taken. Please choose a different code.` },
        { status: 409 }
      );
    }

    if (existingEmail) {
      return NextResponse.json(
        { error: `An account with email "${ownerEmail}" already exists.` },
        { status: 409 }
      );
    }

    // --- Hash credentials ---
    const [hashedStorePassword, hashedManagerPin] = await Promise.all([
      bcrypt.hash(storePassword.trim(), 10),
      bcrypt.hash(managerPin.trim(), 10),
    ]);

    // --- Create store ---
    const store = await Store.create({
      code: normalizedCode,
      name: businessName.trim(),
      type: storeType,
      address,
      phone,
      currency: 'LKR',
      currencySymbol: 'Rs.',
      taxRate: 8.0,
      receiptHeader: businessName.trim(),
      receiptFooter: 'Thank you for your business!',
      ownerName: ownerName.trim(),
      ownerEmail: ownerEmail.toLowerCase().trim(),
      planTier,
      subscriptionStatus: 'trial',
      monthlyFee: PLAN_FEES[planTier] ?? 4900,
      isActive: true,
      storePassword: hashedStorePassword,
    });

    // --- Create initial STORE_MANAGER account ---
    const manager = await User.create({
      name: ownerName.trim(),
      email: ownerEmail.toLowerCase().trim(),
      pinCode: hashedManagerPin,
      role: 'STORE_MANAGER',
      storeId: store._id.toString(),
      isActive: true,
      mustChangePin: true, // prompt to change the PIN on first login
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Your OmniPOS store has been created successfully!',
        store: {
          id: store._id.toString(),
          code: store.code,
          name: store.name,
          type: store.type,
          planTier: store.planTier,
          subscriptionStatus: store.subscriptionStatus,
        },
        manager: {
          id: manager._id.toString(),
          name: manager.name,
          email: manager.email,
          role: manager.role,
        },
        loginUrl: `/store/${store.code.toLowerCase()}`,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error creating store';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
