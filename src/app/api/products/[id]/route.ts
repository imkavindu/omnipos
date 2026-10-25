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
    const { searchParams } = new URL(req.url);

    const storeId = body.storeId || searchParams.get('storeId');
    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId is required to update a product (tenant isolation)' },
        { status: 400 }
      );
    }

    // Verify product exists and belongs to this store
    const existingProduct = await Product.findOne({ _id: id, storeId, isActive: true });
    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found or unauthorized for this store' },
        { status: 404 }
      );
    }

    // If barcode is changing, verify new barcode does not collide with another product in this store
    if (body.barcode && body.barcode !== existingProduct.barcode) {
      const barcodeExists = await Product.findOne({
        _id: { $ne: id },
        storeId,
        barcode: body.barcode.trim(),
        isActive: true,
      });

      if (barcodeExists) {
        return NextResponse.json(
          { error: `Barcode ${body.barcode} is already in use by another item in this store.` },
          { status: 400 }
        );
      }
    }

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.category !== undefined) updates.category = body.category.trim();
    if (body.price !== undefined) updates.price = Number(body.price);
    if (body.costPrice !== undefined) updates.costPrice = Number(body.costPrice);
    if (body.sku !== undefined) updates.sku = body.sku.trim();
    if (body.barcode !== undefined) updates.barcode = body.barcode.trim();
    if (body.image !== undefined) updates.image = body.image.trim();
    if (body.description !== undefined) updates.description = body.description.trim();
    if (body.stockQuantity !== undefined) updates.stockQuantity = Number(body.stockQuantity);
    if (body.lowStockThreshold !== undefined) updates.lowStockThreshold = Number(body.lowStockThreshold);
    if (body.isTaxable !== undefined) updates.isTaxable = Boolean(body.isTaxable);
    if (body.kitchenCategory !== undefined) updates.kitchenCategory = body.kitchenCategory;

    const product = await Product.findOneAndUpdate(
      { _id: id, storeId },
      updates,
      { new: true, runValidators: true }
    );

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
    const body = await req.json();
    const { searchParams } = new URL(req.url);
    const storeId = body.storeId || searchParams.get('storeId');

    const filter: Record<string, unknown> = { _id: id };
    if (storeId) {
      filter.storeId = storeId;
    }

    let update: Record<string, unknown> = {};
    if (typeof body.deltaStock === 'number') {
      update = { $inc: { stockQuantity: body.deltaStock } };
    } else if (typeof body.stockQuantity === 'number') {
      update = { $set: { stockQuantity: body.stockQuantity } };
    } else {
      update = { $set: body };
    }

    const product = await Product.findOneAndUpdate(filter, update, { returnDocument: 'after' });
    if (!product) {
      return NextResponse.json({ error: 'Product not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error adjusting product stock';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId');

    const filter: Record<string, unknown> = { _id: id };
    if (storeId) {
      filter.storeId = storeId;
    }

    // Soft delete / archive to preserve historical sales & order integrity
    const product = await Product.findOneAndUpdate(
      filter,
      { isActive: false },
      { returnDocument: 'after' }
    );

    if (!product) {
      return NextResponse.json({ error: 'Product not found or unauthorized for this store' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Product archived successfully', id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error archiving product';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
