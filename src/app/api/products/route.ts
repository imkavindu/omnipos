import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Product } from '@/models/Product';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const lowStock = searchParams.get('lowStock') === 'true';

    if (!storeId) {
      return NextResponse.json({ error: 'storeId parameter is required' }, { status: 400 });
    }

    const filter: Record<string, unknown> = {
      storeId,
      isActive: true,
    };

    if (category && category !== 'ALL') {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
      ];
    }

    if (lowStock) {
      filter.$expr = { $lte: ['$stockQuantity', '$lowStockThreshold'] };
    }

    const products = await Product.find(filter).sort({ category: 1, name: 1 });
    return NextResponse.json(products);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error fetching products';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();

    if (!body.storeId || !body.name || !body.price || !body.sku || !body.barcode) {
      return NextResponse.json(
        { error: 'Missing required fields: storeId, name, price, sku, and barcode' },
        { status: 400 }
      );
    }

    // Verify barcode uniqueness within this specific store (tenant isolation)
    const existing = await Product.findOne({
      storeId: body.storeId,
      barcode: body.barcode,
    });

    if (existing) {
      return NextResponse.json(
        { error: `Barcode ${body.barcode} already exists in this store` },
        { status: 400 }
      );
    }

    const product = await Product.create(body);
    return NextResponse.json(product, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error creating product';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
