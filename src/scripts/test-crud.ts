import { connectToDatabase } from '../lib/db';
import { Store } from '../models/Store';
import { Product } from '../models/Product';
import { NextRequest } from 'next/server';
import { POST as createProduct, GET as getProducts } from '../app/api/products/route';
import { PUT as updateProduct, DELETE as deleteProduct } from '../app/api/products/[id]/route';

async function runTests() {
  console.log('🧪 Starting Manager Product & Menu CRUD Integration Test...');
  await connectToDatabase();

  // Find sample store: Downtown Bistro & Bar
  const bistro = await Store.findOne({ code: 'DT-BISTRO' });
  const retailStore = await Store.findOne({ code: 'OMNI-TECH' });

  if (!bistro || !retailStore) {
    throw new Error('Required stores not found in database! Seed first.');
  }

  console.log(`🏢 Testing with Bistro (${bistro._id}) and Retail (${retailStore._id})`);

  // 1. Create a restaurant dish under Bistro
  console.log('\n--- TEST 1: POST /api/products (Restaurant Food Item) ---');
  const dishPayload = {
    storeId: String(bistro._id),
    name: 'Gourmet Truffle Burger',
    category: 'Mains',
    price: 3200,
    costPrice: 1500,
    description: 'Fresh wagyu patty with black truffle aioli and brioche bun',
    kitchenCategory: 'GRILL',
    trackStock: false,
    stockQuantity: 50,
  };

  const createReq = new NextRequest('http://localhost:3000/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dishPayload),
  });

  const createRes = await createProduct(createReq);
  const createdDish = await createRes.json();
  console.log(`Created Dish: HTTP ${createRes.status} -> ID: ${createdDish._id}, Name: ${createdDish.name}, Barcode: ${createdDish.barcode}, Kitchen: ${createdDish.kitchenCategory}`);

  if (createRes.status !== 201 || !createdDish._id) {
    throw new Error(`Failed to create dish: ${JSON.stringify(createdDish)}`);
  }

  // 2. Cross-tenant isolation verification:
  console.log('\n--- TEST 2: Multi-Tenant Isolation Check (Cross-Store Query & Modification) ---');
  // Attempt to update the Bistro item using the Retail storeId
  const crossTenantPutReq = new NextRequest(`http://localhost:3000/api/products/${createdDish._id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storeId: String(retailStore._id), // Wrong tenant!
      name: 'Hacked Burger',
      price: 10,
    }),
  });

  const crossPutRes = await updateProduct(crossTenantPutReq, { params: Promise.resolve({ id: createdDish._id }) });
  console.log(`Cross-Tenant PUT Status: HTTP ${crossPutRes.status} (Expected: 404 Not Found)`);
  if (crossPutRes.status !== 404) {
    throw new Error('Tenant isolation breach! Cross-store update succeeded or returned wrong status');
  }

  // 3. Update the dish with valid Bistro storeId
  console.log('\n--- TEST 3: PUT /api/products/[id] (Valid Store Manager Update) ---');
  const validPutReq = new NextRequest(`http://localhost:3000/api/products/${createdDish._id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storeId: String(bistro._id),
      name: 'Gourmet Double Truffle Burger',
      price: 3600,
      description: 'Double wagyu patty with aged gruyere and black truffle aioli',
      kitchenCategory: 'GRILL',
    }),
  });

  const validPutRes = await updateProduct(validPutReq, { params: Promise.resolve({ id: createdDish._id }) });
  const updatedDish = await validPutRes.json();
  console.log(`Updated Dish: HTTP ${validPutRes.status} -> Name: "${updatedDish.name}", Price: Rs. ${updatedDish.price}`);

  if (validPutRes.status !== 200 || updatedDish.price !== 3600) {
    throw new Error('Failed to update dish');
  }

  // 4. Soft Archive / Delete
  console.log('\n--- TEST 4: DELETE /api/products/[id] (Soft Archive) ---');
  const deleteReq = new NextRequest(
    `http://localhost:3000/api/products/${createdDish._id}?storeId=${bistro._id}`,
    { method: 'DELETE' }
  );

  const deleteRes = await deleteProduct(deleteReq, { params: Promise.resolve({ id: createdDish._id }) });
  const deleteData = await deleteRes.json();
  console.log(`Delete Dish: HTTP ${deleteRes.status} -> ${JSON.stringify(deleteData)}`);

  if (deleteRes.status !== 200 || !deleteData.success) {
    throw new Error('Failed to delete dish');
  }

  // Verify it is deactivated in database
  const archivedDish = await Product.findById(createdDish._id);
  console.log(`Archived dish in DB: isActive = ${archivedDish?.isActive}`);
  if (archivedDish?.isActive !== false) {
    throw new Error('Product was not archived properly');
  }

  // Clean up test document completely
  await Product.findByIdAndDelete(createdDish._id);
  console.log('🧹 Cleaned up test document from database.');

  console.log('\n✅ ALL INTEGRATION TESTS PASSED SUCCESSFULLY! Multi-tenant isolation verified.');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Integration test failed:', err);
  process.exit(1);
});
