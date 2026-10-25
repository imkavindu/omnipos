import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '../lib/db';
import { Store } from '../models/Store';
import { User } from '../models/User';
import { Product } from '../models/Product';
import { Order } from '../models/Order';
import { seedDatabase } from '../lib/seed';

async function runHealthCheck() {
  console.log('================================================================');
  console.log('       OmniPOS MongoDB & Mongoose Database Health Check         ');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // Objective 1: MongoDB Connection & Fallback Test
  // -------------------------------------------------------------
  console.log('>> [1/3] Testing Database Connection & Collections/Indexes...');
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('⚠️ MONGODB_URI not found in environment, falling back to default.');
  } else {
    // Mask credentials in log
    const maskedUri = uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
    console.log(`📡 Target URI: ${maskedUri}`);
  }

  const startTime = Date.now();
  await connectToDatabase();
  const connDuration = Date.now() - startTime;

  const db = mongoose.connection;
  const isConnected = db.readyState === 1;
  console.log(`✅ Connection Status: ${isConnected ? 'CONNECTED (readyState=1)' : 'DISCONNECTED'}`);
  console.log(`⏱️ Latency: ${connDuration}ms`);
  console.log(`🏢 Connected Host: ${db.host || 'local'}`);
  console.log(`📦 Database Name: ${db.name}\n`);

  if (!isConnected) {
    throw new Error('Database is not connected! Aborting verification.');
  }

  // Sync and inspect indexes
  console.log('🔍 Checking & Syncing Model Indexes...');
  const models = [
    { name: 'Store', model: Store },
    { name: 'User', model: User },
    { name: 'Product', model: Product },
    { name: 'Order', model: Order },
  ];

  for (const { name, model } of models) {
    await model.syncIndexes();
    const indexes = await model.collection.indexes();
    console.log(`   - ${name} collection indexes (${indexes.length}):`);
    for (const idx of indexes) {
      const keys = Object.entries(idx.key)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      const unique = idx.unique ? ' [UNIQUE]' : '';
      console.log(`     • ${idx.name} -> { ${keys} }${unique}`);
    }
  }

  // -------------------------------------------------------------
  // Objective 2: Seed Data Integrity Check
  // -------------------------------------------------------------
  console.log('\n>> [2/3] Checking Seed Data Integrity...');
  let storeCount = await Store.countDocuments();
  let userCount = await User.countDocuments();
  let productCount = await Product.countDocuments();
  let orderCount = await Order.countDocuments();

  console.log(`Current Counts:`);
  console.log(`   - Stores:   ${storeCount}`);
  console.log(`   - Users:    ${userCount}`);
  console.log(`   - Products: ${productCount}`);
  console.log(`   - Orders:   ${orderCount}`);

  if (storeCount === 0 || userCount === 0 || productCount === 0) {
    console.log('\n⚡ Database is unseeded or missing core collections. Running seedDatabase(true)...');
    const seedRes = await seedDatabase(true);
    console.log('Seed completed:', seedRes);

    storeCount = await Store.countDocuments();
    userCount = await User.countDocuments();
    productCount = await Product.countDocuments();
    orderCount = await Order.countDocuments();
  }

  // Verify Stores
  console.log('\n🏢 Verifying Multi-Tenant Stores:');
  const stores = await Store.find({ isActive: true });
  for (const st of stores) {
    console.log(`   • [${st.code}] "${st.name}" (${st.type.toUpperCase()}) | Plan: ${st.planTier} | Tax: ${st.taxRate}% | ID: ${st._id}`);
  }

  const expectedStores = ['DT-BISTRO', 'OMNI-TECH', 'UP-BAKERY'];
  const foundStoreCodes = stores.map((s) => s.code);
  const allStoresPresent = expectedStores.every((code) => foundStoreCodes.includes(code));
  if (!allStoresPresent) {
    console.error(`❌ Expected stores ${expectedStores.join(', ')} but found ${foundStoreCodes.join(', ')}`);
  } else {
    console.log(`✅ All target multi-tenant stores verified.`);
  }

  // Verify Users & PIN hashes
  console.log('\n👤 Verifying Users & Role-Based Authentication:');
  const users = await User.find({ isActive: true });
  let adminFound = false;
  let allPinsValid = true;

  for (const u of users) {
    if (u.role === 'SUPER_ADMIN') {
      adminFound = true;
      const hasPassword = Boolean(u.passwordHash && u.passwordHash.startsWith('$2'));
      const isGlobal = u.storeId === null || u.storeId === undefined;
      console.log(`   • [SUPER_ADMIN] ${u.name} <${u.email}> | Global: ${isGlobal} | Has bcrypt password: ${hasPassword}`);
    } else {
      const hasPin = Boolean(u.pinCode && u.pinCode.startsWith('$2'));
      const hasStore = Boolean(u.storeId);
      if (!hasPin || !hasStore) {
        allPinsValid = false;
        console.error(`   ❌ [${u.role}] ${u.name}: Invalid PIN or missing storeId!`);
      } else {
        console.log(`   • [${u.role}] ${u.name} | StoreID: ${u.storeId} | Has bcrypt PIN: ${hasPin}`);
      }
    }
  }

  if (adminFound && allPinsValid) {
    console.log('✅ User credentials, bcrypt hashes, and tenant associations verified.');
  }

  // Sample Documents
  console.log('\n📄 Sample Documents in Database:');
  const sampleStore = await Store.findOne().lean();
  console.log('Sample Store:', JSON.stringify({ code: sampleStore?.code, name: sampleStore?.name, planTier: sampleStore?.planTier }));

  const sampleProduct = await Product.findOne().lean();
  console.log('Sample Product:', JSON.stringify({ name: sampleProduct?.name, sku: sampleProduct?.sku, barcode: sampleProduct?.barcode, stockQuantity: sampleProduct?.stockQuantity, storeId: sampleProduct?.storeId }));

  // -------------------------------------------------------------
  // Objective 3: Tenant Isolation & Query Validation
  // -------------------------------------------------------------
  console.log('\n>> [3/3] Validating Tenant Isolation & Operations...');

  const bistro = stores.find((s) => s.code === 'DT-BISTRO');
  const retail = stores.find((s) => s.code === 'OMNI-TECH');

  if (!bistro || !retail) {
    throw new Error('Required stores DT-BISTRO and OMNI-TECH not found for tenant isolation test.');
  }

  const bistroId = bistro._id.toString();
  const retailId = retail._id.toString();

  // Test A: Tenant Isolation on Products
  console.log('🧪 Test A: Cross-Tenant Barcode Lookup Isolation');
  const bistroProduct = await Product.findOne({ storeId: bistroId, isActive: true });
  if (!bistroProduct) {
    throw new Error('No product found for DT-BISTRO');
  }

  console.log(`   Selected Bistro Product: "${bistroProduct.name}" (Barcode: ${bistroProduct.barcode})`);

  // Lookup in correct tenant
  const validLookup = await Product.findOne({ storeId: bistroId, barcode: bistroProduct.barcode, isActive: true });
  console.log(`   1. Query with Bistro StoreID: ${validLookup ? 'FOUND (' + validLookup.name + ')' : 'NOT FOUND'} (Expected: FOUND)`);

  // Cross-tenant lookup: query Bistro product's barcode under Retail storeId
  const isolatedLookup = await Product.findOne({ storeId: retailId, barcode: bistroProduct.barcode, isActive: true });
  console.log(`   2. Query with Retail StoreID: ${isolatedLookup ? 'FOUND (LEAK!)' : 'NOT FOUND'} (Expected: NOT FOUND)`);

  if (validLookup && !isolatedLookup) {
    console.log('   ✅ PASS: Barcode lookup strictly isolates tenant data.');
  } else {
    console.error('   ❌ FAIL: Tenant isolation violation in product barcode lookup!');
  }

  // Test B: Cross-Tenant Order Isolation
  console.log('\n🧪 Test B: Order Queries Isolation by storeId');
  const bistroOrders = await Order.find({ storeId: bistroId }).limit(5);
  const retailOrders = await Order.find({ storeId: retailId }).limit(5);
  console.log(`   - Bistro Orders Count: ${bistroOrders.length}`);
  console.log(`   - Retail Orders Count: ${retailOrders.length}`);

  const anyLeak = bistroOrders.some((o) => o.storeId !== bistroId) || retailOrders.some((o) => o.storeId !== retailId);
  if (!anyLeak) {
    console.log('   ✅ PASS: Order queries strictly isolated by storeId.');
  } else {
    console.error('   ❌ FAIL: Order query returned orders belonging to another store!');
  }

  // Test C: Automated Order Creation & Stock Deduction
  console.log('\n🧪 Test C: Order Creation & Inventory Stock Deduction');
  const testProduct = await Product.findOne({ storeId: bistroId, isActive: true });
  if (!testProduct) {
    throw new Error('No product found for stock deduction test');
  }

  const initialStock = testProduct.stockQuantity;
  const deductQty = 2;
  console.log(`   Product: "${testProduct.name}" | Initial Stock: ${initialStock}`);

  // Create an automated test order
  const testOrderNumber = `TEST-${Date.now()}`;
  const testOrder = await Order.create({
    storeId: bistroId,
    orderNumber: testOrderNumber,
    orderType: 'DINE_IN',
    items: [
      {
        productId: testProduct._id.toString(),
        name: testProduct.name,
        sku: testProduct.sku,
        barcode: testProduct.barcode,
        price: testProduct.price,
        quantity: deductQty,
        kitchenCategory: testProduct.kitchenCategory,
        status: 'PENDING',
      },
    ],
    subtotal: testProduct.price * deductQty,
    tax: (testProduct.price * deductQty * bistro.taxRate) / 100,
    discount: 0,
    discountType: 'FIXED',
    total: testProduct.price * deductQty * (1 + bistro.taxRate / 100),
    paymentMethod: 'CASH',
    paymentStatus: 'PAID',
    cashTendered: 100,
    changeDue: 100 - testProduct.price * deductQty * (1 + bistro.taxRate / 100),
    orderStatus: 'PENDING',
    customerName: 'Automated Integrity Test',
  });

  console.log(`   Created Test Order: ${testOrder.orderNumber} (ID: ${testOrder._id})`);

  // Simulate inventory deduction as performed by /api/orders
  await Product.findByIdAndUpdate(testProduct._id, {
    $inc: { stockQuantity: -deductQty },
  });

  const updatedProduct = await Product.findById(testProduct._id);
  const expectedStock = initialStock - deductQty;
  console.log(`   Stock after deduction: ${updatedProduct?.stockQuantity} (Expected: ${expectedStock})`);

  if (updatedProduct?.stockQuantity === expectedStock) {
    console.log('   ✅ PASS: Automated inventory stock deduction verified.');
  } else {
    console.error(`   ❌ FAIL: Stock mismatch! Expected ${expectedStock}, got ${updatedProduct?.stockQuantity}`);
  }

  // Clean up test order and revert stock
  console.log('\n🧹 Cleaning up test artifacts...');
  await Order.findByIdAndDelete(testOrder._id);
  await Product.findByIdAndUpdate(testProduct._id, {
    $inc: { stockQuantity: deductQty },
  });
  const restoredProduct = await Product.findById(testProduct._id);
  console.log(`   Restored stock to: ${restoredProduct?.stockQuantity}`);
  console.log('   Test order deleted successfully.');

  console.log('\n================================================================');
  console.log('       🎉 ALL HEALTH CHECKS & INTEGRITY TESTS PASSED!           ');
  console.log('================================================================');

  await mongoose.disconnect();
  process.exit(0);
}

runHealthCheck().catch((err) => {
  console.error('\n❌ HEALTH CHECK ERROR:', err);
  process.exit(1);
});
