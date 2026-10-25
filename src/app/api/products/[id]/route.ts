import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Product } from '@/models/Product';

interface Params {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();

    const product = await Product.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error updating product';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json(); // e.g. { deltaStock: +10 } or { stockQuantity: 50 }

    let update: Record<string, unknown> = {};
    if (typeof body.deltaStock === 'number') {
      update = { $inc: { stockQuantity: body.deltaStock } };
    } else if (typeof body.stockQuantity === 'number') {
      update = { $set: { stockQuantity: body.stockQuantity } };
    } else {
      update = { $set: body };
    }

    const product = await Product.findByIdAndUpdate(id, update, { new: true });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error adjusting product stock';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const product = await Product.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Product archived successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error archiving product';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
