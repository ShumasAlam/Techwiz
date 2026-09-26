const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = require('./server');

const testSuite = async () => {
  console.log('🧪 Starting Full Comprehensive API Verification Test Suite...\n');

  const server = app.listen(5099, async () => {
    console.log('🚀 Test server running on http://localhost:5099\n');

    const BASE_URL = 'http://localhost:5099/api';
    let passed = 0;
    let failed = 0;
    const errors = [];

    const request = async (name, url, options = {}) => {
      try {
        const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
        const res = await fetch(fullUrl, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
          }
        });
        
        let data = null;
        try {
          data = await res.json();
        } catch (e) {
          data = null;
        }

        if (res.ok) {
          console.log(`✅ [PASS] ${name} (${res.status})`);
          passed++;
          return { status: res.status, data, ok: true };
        } else {
          console.error(`❌ [FAIL] ${name} (${res.status}):`, data?.message || res.statusText);
          failed++;
          errors.push({ name, status: res.status, error: data?.message || res.statusText });
          return { status: res.status, data, ok: false };
        }
      } catch (err) {
        console.error(`❌ [ERROR] ${name}:`, err.message);
        failed++;
        errors.push({ name, status: 'ERROR', error: err.message });
        return { status: 'ERROR', error: err.message, ok: false };
      }
    };

    // Wait for DB connection
    let retries = 10;
    while (mongoose.connection.readyState !== 1 && retries > 0) {
      console.log('⏳ Waiting for MongoDB Atlas connection...');
      await new Promise(r => setTimeout(r, 1000));
      retries--;
    }

    console.log('📦 Database Connection State:', mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...');

    // 1. HEALTH CHECKS
    console.log('\n--- 🟢 HEALTH ENDPOINTS ---');
    await request('GET Root /', 'http://localhost:5099/');
    await request('GET /health', '/health');

    // 2. AUTH ENDPOINTS
    console.log('\n--- 🔐 AUTH ENDPOINTS ---');
    const testEmail = `test_${Date.now()}@marketlink.demo`;
    const regRes = await request('POST /auth/register (Customer)', '/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Auto Test User',
        email: testEmail,
        password: 'password123',
        role: 'customer',
        phone: '03009999999',
        address: 'Islamabad'
      })
    });

    const loginRes = await request('POST /auth/login', '/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'customer@marketlink.demo',
        password: 'demo123'
      })
    });

    const token = loginRes.data?.token || regRes.data?.token;
    const currentUserId = loginRes.data?.user?.id || regRes.data?.user?.id;

    if (token) {
      await request('GET /auth/profile', '/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      await request('PUT /auth/profile', '/auth/profile', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: 'Updated Test User' })
      });
    }

    // Farmer Login
    const farmerLoginRes = await request('POST /auth/login (Farmer)', '/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'farmer@marketlink.demo',
        password: 'demo123'
      })
    });
    const farmerToken = farmerLoginRes.data?.token;

    // 3. PRODUCTS ENDPOINTS
    console.log('\n--- 🥕 PRODUCTS ENDPOINTS ---');
    const productsRes = await request('GET /products', '/products');
    const sampleProduct = productsRes.data?.[0];

    if (sampleProduct) {
      await request(`GET /products/${sampleProduct.id}`, `/products/${sampleProduct.id}`);
    }

    let createdProductId = null;
    if (farmerToken) {
      await request('GET /products/farmer/my-products', '/products/farmer/my-products', {
        headers: { Authorization: `Bearer ${farmerToken}` }
      });

      const createProdRes = await request('POST /products', '/products', {
        method: 'POST',
        headers: { Authorization: `Bearer ${farmerToken}` },
        body: JSON.stringify({
          farmerId: 'f-1',
          marketIds: ['m-1'],
          name: 'Automated Test Organic Apples',
          category: 'Fruit',
          price: 250,
          unit: 'kg',
          stock: 40,
          badge: 'Organic',
          description: 'Crisp automated test apples'
        })
      });
      createdProductId = createProdRes.data?.id;

      if (createdProductId) {
        await request(`PUT /products/${createdProductId}`, `/products/${createdProductId}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${farmerToken}` },
          body: JSON.stringify({ price: 260, stock: 45 })
        });
      }
    }

    // 4. MARKETS ENDPOINTS
    console.log('\n--- 🏪 MARKETS ENDPOINTS ---');
    const marketsRes = await request('GET /markets', '/markets');
    await request('GET /markets/nearby?lat=33.72&lng=73.06', '/markets/nearby?lat=33.72&lng=73.06');

    const sampleMarket = marketsRes.data?.[0];
    if (sampleMarket) {
      await request(`GET /markets/${sampleMarket.id}`, `/markets/${sampleMarket.id}`);
    }

    const newMarketRes = await request('POST /markets', '/markets', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Auto Test Green Market',
        day: 'Saturday',
        openingTime: '08:00',
        closingTime: '14:00',
        address: 'E-11 Islamabad',
        distance: '3.5 km',
        stalls: 10,
        lat: 33.7,
        lng: 73.0
      })
    });
    const createdMarketId = newMarketRes.data?.id;

    if (createdMarketId) {
      await request(`PUT /markets/${createdMarketId}`, `/markets/${createdMarketId}`, {
        method: 'PUT',
        body: JSON.stringify({ distance: '4.0 km' })
      });
      await request(`DELETE /markets/${createdMarketId}`, `/markets/${createdMarketId}`, {
        method: 'DELETE'
      });
    }

    // 5. FARMERS ENDPOINTS
    console.log('\n--- 🧑‍🌾 FARMERS ENDPOINTS ---');
    const farmersRes = await request('GET /farmers', '/farmers');
    const sampleFarmer = farmersRes.data?.[0];
    if (sampleFarmer) {
      await request(`GET /farmers/${sampleFarmer.id}`, `/farmers/${sampleFarmer.id}`);
      await request(`GET /farmers/profile/${sampleFarmer.id}`, `/farmers/profile/${sampleFarmer.id}`);
    }

    // 6. ORDERS ENDPOINTS
    console.log('\n--- 📦 ORDERS ENDPOINTS ---');
    await request('GET /orders', '/orders');
    
    const orderCreateRes = await request('POST /orders', '/orders', {
      method: 'POST',
      body: JSON.stringify({
        customerId: currentUserId || 'u-1',
        marketId: sampleMarket?.id || 'm-1',
        pickupDate: '28 Sep 2026',
        pickupSlot: '8:00 AM - 10:00 AM',
        items: [
          { productId: sampleProduct?.id || 'p-1', quantity: 1 }
        ]
      })
    });
    const createdOrderId = orderCreateRes.data?.id || orderCreateRes.data?.[0]?.id;

    if (createdOrderId) {
      await request(`GET /orders/${createdOrderId}`, `/orders/${createdOrderId}`);
      await request(`PATCH /orders/${createdOrderId}`, `/orders/${createdOrderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'accepted' })
      });
      await request(`PUT /orders/${createdOrderId}/cancel`, `/orders/${createdOrderId}/cancel`, {
        method: 'PUT',
        body: JSON.stringify({ reason: 'Test cancel' })
      });
    }

    // 7. REVIEWS ENDPOINTS
    console.log('\n--- ⭐ REVIEWS ENDPOINTS ---');
    await request('GET /reviews', '/reviews');
    if (sampleProduct) {
      await request(`GET /reviews/product/${sampleProduct.id}`, `/reviews/product/${sampleProduct.id}`);
    }
    if (sampleFarmer) {
      await request(`GET /reviews/farmer/${sampleFarmer.id}`, `/reviews/farmer/${sampleFarmer.id}`);
    }

    // 8. NOTIFICATIONS ENDPOINTS
    console.log('\n--- 🔔 NOTIFICATIONS ENDPOINTS ---');
    const notifRes = await request(`GET /notifications?userId=${currentUserId}`, `/notifications?userId=${currentUserId}`);
    const sampleNotif = notifRes.data?.[0];
    if (sampleNotif) {
      await request(`PATCH /notifications/${sampleNotif.id}`, `/notifications/${sampleNotif.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ unread: false })
      });
    }

    await request('POST /notifications', '/notifications', {
      method: 'POST',
      body: JSON.stringify({
        userId: currentUserId,
        type: 'system',
        text: 'Test Notification from Automated Verifier'
      })
    });

    // 9. USERS ENDPOINTS
    console.log('\n--- 👤 USERS ENDPOINTS ---');
    await request(`GET /users/${currentUserId}/favorites`, `/users/${currentUserId}/favorites`);
    await request(`PATCH /users/${currentUserId}/favorites`, `/users/${currentUserId}/favorites`, {
      method: 'PATCH',
      body: JSON.stringify({ itemId: 'p-1' })
    });
    await request(`GET /users/${currentUserId}/notifications`, `/users/${currentUserId}/notifications`);
    await request(`PATCH /users/${currentUserId}/notifications/read-all`, `/users/${currentUserId}/notifications/read-all`, {
      method: 'PATCH'
    });

    // 10. SUBSCRIPTIONS ENDPOINTS
    console.log('\n--- 📬 SUBSCRIPTIONS ENDPOINTS ---');
    await request('GET /subscriptions', '/subscriptions');
    await request('POST /subscriptions', '/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        userId: currentUserId,
        productId: sampleProduct?.id || 'p-1'
      })
    });

    // 11. ANNOUNCEMENTS ENDPOINTS
    console.log('\n--- 📢 ANNOUNCEMENTS ENDPOINTS ---');
    await request('POST /announcements', '/announcements', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Automated test platform announcement for all shoppers!'
      })
    });

    // 12. ADMIN ENDPOINTS
    console.log('\n--- 🛡️ ADMIN ENDPOINTS ---');
    await request('GET /admin/dashboard', '/admin/dashboard');
    await request('GET /admin/users', '/admin/users');
    if (sampleFarmer) {
      await request(`PATCH /admin/farmers/${sampleFarmer.id}`, `/admin/farmers/${sampleFarmer.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved' })
      });
    }

    // 13. SNAPSHOT ENDPOINT
    console.log('\n--- 📸 SNAPSHOT ENDPOINT ---');
    const snapshotRes = await request('GET /snapshot', '/snapshot');
    if (snapshotRes.data) {
      console.log('  Snapshot contains collections:', Object.keys(snapshotRes.data).join(', '));
    }

    // Clean up created test product if any
    if (createdProductId && farmerToken) {
      await request(`DELETE /products/${createdProductId}`, `/products/${createdProductId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${farmerToken}` }
      });
    }

    // FINAL SUMMARY
    console.log('\n=========================================');
    console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('=========================================');

    if (failed > 0) {
      console.log('\nFailed Endpoints:');
      errors.forEach(e => console.log(` - ${e.name} (${e.status}): ${e.error}`));
    }

    server.close();
    process.exit(failed > 0 ? 1 : 0);
  });
};

testSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
