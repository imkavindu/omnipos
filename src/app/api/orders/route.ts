import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Order, IOrderItem } from '@/models/Order';
import { Product } from '@/models/Product';
import { Store } from '@/models/Store';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId');
    const status = searchParams.get('status');
    const orderType = searchParams.get('orderType');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!storeId) {
      return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
    }

    const filter: Record<string, unknown> = { storeId };

    if (status && status !== 'ALL') {
      if (status.includes(',')) {
        filter.orderStatus = { $in: status.split(',') };
      } else {
        filter.orderStatus = status;
      }
    }

    if (orderType && orderType !== 'ALL') {
      filter.orderType = orderType;
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit);

    return NextResponse.json(orders);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error fetching orders';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const {
      storeId,
      orderType,
      items,
      subtotal,
      tax,
      discount = 0,
      discountType = 'FIXED',
      total,
      paymentMethod,
      paymentStatus = 'PAID',
      cashTendered = 0,
      changeDue = 0,
      customerName = 'Walk-in Customer',
      tableNumber = '',
      cashierName = 'Terminal',
      notes = '',
    } = body;

    if (!storeId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required order fields: storeId and valid items array' },
        { status: 400 }
      );
    }

    const store = await Store.findById(storeId);
    const storeCode = store ? store.code : 'POS';

    // Generate readable orderNumber: prefix-sequential/random
    const countToday = await Order.countDocuments({
      storeId,
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    });

    const isKiosk = orderType === 'KIOSK_SELF';
    const prefix = isKiosk ? 'K' : storeCode.substring(0, 3).toUpperCase();
    const orderNumber = `${prefix}-${String(countToday + 1).padStart(3, '0')}`;

    // Determine initial order status:
    // If restaurant order containing kitchen items (GRILL, BAR, DELI, BAKERY), start as PENDING for KDS.
    // If pure retail, and paid, mark COMPLETED.
    const hasKitchenItems = items.some(
      (it: IOrderItem) => it.kitchenCategory && it.kitchenCategory !== 'RETAIL'
    );
    const initialStatus = hasKitchenItems ? 'PENDING' : 'COMPLETED';

    const order = await Order.create({
      storeId,
      orderNumber,
      orderType: orderType || 'RETAIL_SALE',
      items: items.map((it: IOrderItem) => ({
        ...it,
        status: it.status || (hasKitchenItems ? 'PENDING' : 'COMPLETED'),
      })),
      subtotal,
      tax,
      discount,
      discountType,
      total,
      paymentMethod: paymentMethod || 'CASH',
      paymentStatus,
      cashTendered,
      changeDue,
      orderStatus: initialStatus,
      customerName,
      tableNumber,
      cashierName,
      notes,
    });

    // Auto-decrement inventory stock for purchased products
    for (const item of items) {
      if (item.productId && !item.productId.startsWith('dummy')) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stockQuantity: -item.quantity },
        }).catch((err) => console.error('Failed to decrement stock for item:', item.productId, err));
      }
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error creating order';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
