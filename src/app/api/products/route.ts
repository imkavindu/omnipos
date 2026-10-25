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

    const {
      storeId,
      name,
      category = 'General',
      price,
      costPrice = 0,
      image = '',
      description = '',
      stockQuantity = 50,
      lowStockThreshold = 5,
      isTaxable = true,
      kitchenCategory = 'RETAIL',
    } = body;

    if (!storeId || !name || price === undefined || price === null) {
      return NextResponse.json(
        { error: 'Missing required fields: storeId, name, and price are required' },
        { status: 400 }
      );
    }

    // Auto-generate barcode if not provided or empty
    let cleanBarcode = (body.barcode || '').trim();
    if (!cleanBarcode) {
      cleanBarcode = `89${Math.floor(100000 + Math.random() * 900000)}`;
    }

    // Auto-generate SKU if not provided or empty
    let cleanSku = (body.sku || '').trim().toUpperCase();
    if (!cleanSku) {
      const prefix = kitchenCategory && kitchenCategory !== 'RETAIL' ? 'FOD' : 'ITM';
      cleanSku = `${prefix}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    }

    // Verify barcode uniqueness strictly within this store tenant
    const existing = await Product.findOne({
      storeId,
      barcode: cleanBarcode,
      isActive: true,
    });

    if (existing) {
      return NextResponse.json(
        { error: `Barcode ${cleanBarcode} already exists in this store. Please use a unique barcode.` },
        { status: 400 }
      );
    }

    const validKitchenCategories = ['GRILL', 'BAR', 'BAKERY', 'DELI', 'RETAIL'];
    const finalKitchenCategory = validKitchenCategories.includes(kitchenCategory)
      ? kitchenCategory
      : 'RETAIL';

    const product = await Product.create({
      storeId,
      name: name.trim(),
      category: category.trim(),
      price: Number(price),
      costPrice: Number(costPrice) || 0,
      sku: cleanSku,
      barcode: cleanBarcode,
      image: image.trim(),
      stockQuantity: Number(stockQuantity) || 0,
      lowStockThreshold: Number(lowStockThreshold) || 5,
      isTaxable: Boolean(isTaxable),
      kitchenCategory: finalKitchenCategory,
      description: description.trim(),
      isActive: true,
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error creating product';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
