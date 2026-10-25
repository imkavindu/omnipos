import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Order } from '@/models/Order';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const order = await Order.findById(id);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error fetching order';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();

    const allowedUpdates: Record<string, unknown> = {};

    if (body.orderStatus) {
      allowedUpdates.orderStatus = body.orderStatus;
    }
    if (body.paymentStatus) {
      allowedUpdates.paymentStatus = body.paymentStatus;
    }
    if (body.items) {
      allowedUpdates.items = body.items;
    }

    const order = await Order.findByIdAndUpdate(id, allowedUpdates, { new: true });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error updating order status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
