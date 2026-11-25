const assert = require('assert');
const http = require('http');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { connect, close, seedAdmin } = require('../src/config/db');
const { runSeed } = require('../src/services/seed');
const app = require('../src/app');

(async () => {
  const mongo = await MongoMemoryServer.create();
  await connect(mongo.getUri(), 'test_admin');
  await seedAdmin();
  await runSeed();

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  const req = async (path, method = 'GET', body, token) => {
    const r = await fetch(base + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* non-json */ }
    return { status: r.status, json, text };
  };

  // 1. Static admin assets served
  for (const p of ['/admin.html', '/css/admin.css', '/js/admin.js']) {
    const r = await req(p);
    assert.strictEqual(r.status, 200, `${p} should return 200`);
  }

  // 2. Admin login
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@dailypilot.local').toLowerCase();
  const adminPw = process.env.ADMIN_PASSWORD || 'Admin@12345';
  const login = await req('/api/auth/login', 'POST', { email: adminEmail, password: adminPw });
  assert.strictEqual(login.status, 200);
  const adminToken = login.json.token;
  assert.strictEqual(login.json.user.role, 'admin');

  // 3. Stats endpoint
  const stats = await req('/api/admin/stats', 'GET', null, adminToken);
  assert.strictEqual(stats.status, 200);
  assert(stats.json.publishedMeals > 0);
  assert(stats.json.needsReviewMeals > 0);
  assert(stats.json.mealSlots && typeof stats.json.mealSlots.breakfast === 'number');
  assert(stats.json.pillars && typeof stats.json.pillars.workouts === 'number');

  // 4. Register normal user, inspect, disable, enable, delete
  const reg = await req('/api/auth/register', 'POST', { name: 'Test User', email: 'testuser@example.com', password: 'Password123' });
  assert.strictEqual(reg.status, 200);
  const userId = reg.json.user.id;
  const userToken = reg.json.token;

  const users = await req('/api/admin/users', 'GET', null, adminToken);
  assert.strictEqual(users.status, 200);
  assert(users.json.some(u => u.id === userId));

  const detail = await req(`/api/admin/users/${userId}`, 'GET', null, adminToken);
  assert.strictEqual(detail.status, 200);
  assert.strictEqual(detail.json.user.email, 'testuser@example.com');

  const disable = await req(`/api/admin/users/${userId}`, 'PATCH', { disabled: true }, adminToken);
  assert.strictEqual(disable.status, 200);
  const blockedMe = await req('/api/me', 'GET', null, userToken);
  assert.strictEqual(blockedMe.status, 403);

  const enable = await req(`/api/admin/users/${userId}`, 'PATCH', { disabled: false }, adminToken);
  assert.strictEqual(enable.status, 200);
  const okMe = await req('/api/me', 'GET', null, userToken);
  assert.strictEqual(okMe.status, 200);

  // Self-disable prevented
  const selfDisable = await req(`/api/admin/users/${login.json.user.id}`, 'PATCH', { disabled: true }, adminToken);
  assert.strictEqual(selfDisable.status, 400);

  // 5. Verify meal & tip endpoints
  const meals = await req('/api/admin/meals', 'GET', null, adminToken);
  const firstMeal = meals.json[0];
  const vMeal = await req(`/api/admin/meals/${firstMeal.id}/verify`, 'POST', { reviewed_by: 'Dr. Test RD' }, adminToken);
  assert.strictEqual(vMeal.status, 200);

  const tips = await req('/api/admin/tips', 'GET', null, adminToken);
  const firstTip = tips.json[0];
  const vTip = await req(`/api/admin/tips/${firstTip.id}/verify`, 'POST', { reviewed_by: 'Dr. Derm' }, adminToken);
  assert.strictEqual(vTip.status, 200);

  // 6. Pillars endpoint
  const pillars = await req('/api/admin/pillars', 'GET', null, adminToken);
  assert.strictEqual(pillars.status, 200);
  assert(Array.isArray(pillars.json.workouts));

  // 7. Delete user
  const delUser = await req(`/api/admin/users/${userId}`, 'DELETE', null, adminToken);
  assert.strictEqual(delUser.status, 200);

  // 7b. Food log & 6-day rebalance
  const reg2 = await req('/api/auth/register', 'POST', {
    name: 'Diet User', email: 'dietuser@example.com', password: 'Password123',
    gender: 'male', age: 26, height_cm: 175, weight_kg: 72, goal: 'fit', activity: 'moderate',
  });
  assert.strictEqual(reg2.status, 200);
  const dToken = reg2.json.token;
  const today = new Date().toISOString().slice(0, 10);
  const logRes = await req('/api/plan/log', 'POST', {
    date: today, title: 'Extra Pizza', slot: 'extra', kcal: 600, protein: 20, carbs: 70, fat: 24,
  }, dToken);
  assert.strictEqual(logRes.status, 200);
  assert.strictEqual(logRes.json.week.length, 7);
  assert(logRes.json.week[1].adjustmentDelta < 0, 'Next 6 days should reduce calories after extra intake');
  const logId = logRes.json.plan.logs[0].id;
  const delLog = await req(`/api/plan/log/${logId}`, 'DELETE', null, dToken);
  assert.strictEqual(delLog.status, 200);
  assert.strictEqual(delLog.json.week[1].adjustmentDelta, 0, 'Removing log should reset next 6 days');

  // 7c. Admin create & edit user + full visibility
  const createdU = await req('/api/admin/users', 'POST', { name: 'Created By Admin', email: 'created@example.com', password: 'Password123', role: 'user' }, adminToken);
  assert.strictEqual(createdU.status, 200);
  const editedU = await req(`/api/admin/users/${createdU.json.id}`, 'PUT', { name: 'Updated Name', role: 'admin' }, adminToken);
  assert.strictEqual(editedU.status, 200);
  const pillarsWithLogs = await req('/api/admin/pillars', 'GET', null, adminToken);
  assert.strictEqual(pillarsWithLogs.status, 200);
  assert(Array.isArray(pillarsWithLogs.json.foodLogs));

  // 8. Change admin password
  const cpw = await req('/api/admin/change-password', 'POST', { currentPassword: adminPw, newPassword: 'NewAdmin@12345' }, adminToken);
  assert.strictEqual(cpw.status, 200);
  const relogin = await req('/api/auth/login', 'POST', { email: adminEmail, password: 'NewAdmin@12345' });
  assert.strictEqual(relogin.status, 200);

  console.log('ADMIN INTEGRATION TESTS: ALL OK');
  server.close();
  await close();
  await mongo.stop();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
