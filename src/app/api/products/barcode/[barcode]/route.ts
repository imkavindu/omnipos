import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Product } from '@/models/Product';

interface Params {
  params: Promise<{ barcode: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await connectToDatabase();
    const { barcode } = await params;
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json({ error: 'storeId is required for barcode lookup' }, { status: 400 });
    }

    const cleanBarcode = decodeURIComponent(barcode).trim();

    // Query product by exact barcode within the store
    const product = await Product.findOne({
      storeId,
      barcode: cleanBarcode,
      isActive: true,
    });

    if (!product) {
      // Fallback: check if barcode matches SKU
      const productBySku = await Product.findOne({
        storeId,
        sku: cleanBarcode,
        isActive: true,
      });

      if (!productBySku) {
        return NextResponse.json(
          { error: `No active product found with barcode/SKU: ${cleanBarcode}` },
          { status: 404 }
        );
      }
      return NextResponse.json(productBySku);
    }

    return NextResponse.json(product);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error during barcode lookup';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
