import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Order } from '@/models/Order';
import { Product } from '@/models/Product';
import { Store } from '@/models/Store';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId');

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // 1. Super Admin Global Analytics (SaaS Platform & Shop Owner Oversight)
    if (!storeId || storeId === 'ALL') {
      const allStores = await Store.find({ isActive: true });
      const storeStats = [];
      let globalRevenue = 0;
      let globalOrders = 0;
      let platformMrr = 0;
      let activeSubscriptions = 0;
      let trialSubscriptions = 0;
      let pastDueSubscriptions = 0;

      for (const store of allStores) {
        const sid = store._id.toString();
        const orders = await Order.find({ storeId: sid, paymentStatus: 'PAID' });
        const revenue = orders.reduce((sum, ord) => sum + ord.total, 0);
        const orderCount = orders.length;
        const lowStockCount = await Product.countDocuments({
          storeId: sid,
          $expr: { $lte: ['$stockQuantity', '$lowStockThreshold'] },
        });

        globalRevenue += revenue;
        globalOrders += orderCount;

        const fee = store.monthlyFee || (store.planTier === 'enterprise' ? 199 : store.planTier === 'growth' ? 99 : 49);
        if (store.subscriptionStatus === 'active') {
          platformMrr += fee;
          activeSubscriptions++;
        } else if (store.subscriptionStatus === 'trial') {
          trialSubscriptions++;
        } else {
          pastDueSubscriptions++;
        }

        storeStats.push({
          storeId: sid,
          storeName: store.name,
          storeCode: store.code,
          storeType: store.type,
          ownerName: store.ownerName || 'Shop Owner',
          ownerEmail: store.ownerEmail || 'owner@business.com',
          planTier: store.planTier || 'growth',
          subscriptionStatus: store.subscriptionStatus || 'active',
          monthlyFee: fee,
          currencySymbol: store.currencySymbol,
          totalRevenue: Number(revenue.toFixed(2)),
          orderCount,
          averageTicket: orderCount > 0 ? Number((revenue / orderCount).toFixed(2)) : 0,
          lowStockCount,
          createdAt: store.createdAt,
        });
      }

      return NextResponse.json({
        view: 'GLOBAL_SUPER_ADMIN',
        totalTenants: allStores.length,
        platformMrr: Number(platformMrr.toFixed(2)),
        activeSubscriptions,
        trialSubscriptions,
        pastDueSubscriptions,
        globalRevenue: Number(globalRevenue.toFixed(2)),
        globalOrders,
        globalAverageTicket:
          globalOrders > 0 ? Number((globalRevenue / globalOrders).toFixed(2)) : 0,
        stores: storeStats,
      });
    }

    // 2. Store Manager Local Analytics (Single Store Daily Z-Report & Sales Summary)
    const store = await Store.findById(storeId);
    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const todayOrders = await Order.find({
      storeId,
      createdAt: { $gte: startOfDay },
      paymentStatus: 'PAID',
    });

    const totalSales = todayOrders.reduce((sum, ord) => sum + ord.total, 0);
    const totalSubtotal = todayOrders.reduce((sum, ord) => sum + ord.subtotal, 0);
    const totalTax = todayOrders.reduce((sum, ord) => sum + ord.tax, 0);
    const totalDiscount = todayOrders.reduce((sum, ord) => sum + (ord.discount || 0), 0);

    // Payment breakdown
    let cashTotal = 0;
    let cardTotal = 0;
    let kioskTotal = 0;

    const itemFrequency: Record<string, { name: string; qty: number; revenue: number }> = {};

    todayOrders.forEach((ord) => {
      if (ord.paymentMethod === 'CASH') cashTotal += ord.total;
      else if (ord.paymentMethod === 'CARD') cardTotal += ord.total;
      else kioskTotal += ord.total;

      ord.items.forEach((item) => {
        if (!itemFrequency[item.name]) {
          itemFrequency[item.name] = { name: item.name, qty: 0, revenue: 0 };
        }
        itemFrequency[item.name].qty += item.quantity;
        itemFrequency[item.name].revenue += item.price * item.quantity;
      });
    });

    const topItems = Object.values(itemFrequency)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    // Low stock inventory
    const lowStockProducts = await Product.find({
      storeId,
      $expr: { $lte: ['$stockQuantity', '$lowStockThreshold'] },
    }).limit(10);

    const pendingKdsCount = await Order.countDocuments({
      storeId,
      orderStatus: { $in: ['PENDING', 'PREPARING'] },
    });

    return NextResponse.json({
      view: 'STORE_MANAGER',
      store: {
        id: store._id,
        name: store.name,
        code: store.code,
        currencySymbol: store.currencySymbol,
        taxRate: store.taxRate,
      },
      summary: {
        totalSales: Number(totalSales.toFixed(2)),
        subtotal: Number(totalSubtotal.toFixed(2)),
        totalTax: Number(totalTax.toFixed(2)),
        totalDiscount: Number(totalDiscount.toFixed(2)),
        orderCount: todayOrders.length,
        averageTicket:
          todayOrders.length > 0 ? Number((totalSales / todayOrders.length).toFixed(2)) : 0,
        pendingKdsCount,
      },
      payments: {
        cash: Number(cashTotal.toFixed(2)),
        card: Number(cardTotal.toFixed(2)),
        kiosk: Number(kioskTotal.toFixed(2)),
      },
      topItems,
      lowStockCount: lowStockProducts.length,
      lowStockProducts,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error generating analytics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
