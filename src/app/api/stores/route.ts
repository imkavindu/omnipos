import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Store } from '@/models/Store';

export async function GET() {
  try {
    await connectToDatabase();
    const stores = await Store.find({ isActive: true }).sort({ name: 1 });
    return NextResponse.json(stores);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error fetching stores';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();

    if (!body.code || !body.name) {
      return NextResponse.json({ error: 'Store code and name are required' }, { status: 400 });
    }

    const existing = await Store.findOne({ code: body.code.toUpperCase().trim() });
    if (existing) {
      return NextResponse.json({ error: 'Store code already exists' }, { status: 400 });
    }

    const store = await Store.create({
      ...body,
      code: body.code.toUpperCase().trim(),
    });

    return NextResponse.json(store, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error creating store';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { id, subscriptionStatus, planTier, monthlyFee, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Store id is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (subscriptionStatus) updates.subscriptionStatus = subscriptionStatus;
    if (planTier) updates.planTier = planTier;
    if (typeof monthlyFee === 'number') updates.monthlyFee = monthlyFee;
    if (typeof isActive === 'boolean') updates.isActive = isActive;

    const store = await Store.findByIdAndUpdate(id, updates, { new: true });
    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, store });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error updating store';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
