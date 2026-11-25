const assert = require('assert');
const http = require('http');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { connect, close, seedAdmin } = require('../src/config/db');
const { runSeed } = require('../src/services/seed');
const app = require('../src/app');

(async () => {
  const mongo = await MongoMemoryServer.create();
  await connect(mongo.getUri(), 'test_features');
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
    return { status: r.status, json };
  };

  const today = new Date().toISOString().slice(0, 10);

  // 1. Register with skin_care enabled
  const reg = await req('/api/auth/register', 'POST', {
    name: 'Feature User',
    email: 'feature@dailypilot.local',
    password: 'Password@123',
    age: 26,
    height_cm: 174,
    weight_kg: 68,
    gender: 'female',
    goal: 'fit',
    activity: 'moderate',
    diet_pref: 'both',
    skin_care: true,
  });
  assert.strictEqual(reg.status, 200);
  const token = reg.json.token;

  const prof = await req('/api/profile', 'GET', null, token);
  assert.strictEqual(prof.json.profile.skin_care, 1);

  const plan = await req(`/api/plan?date=${today}`, 'GET', null, token);
  assert.strictEqual(plan.status, 200);
  assert.ok(Array.isArray(plan.json.tips) && plan.json.tips.length > 0, 'Expected skin tips when skin_care=1');

  // 2. Water persistence
  const badWater = await req('/api/water', 'PUT', { date: today, ml: -10 }, token);
  assert.strictEqual(badWater.status, 400);

  const waterRes = await req('/api/water', 'PUT', { date: today, ml: 1750 }, token);
  assert.strictEqual(waterRes.status, 200);
  assert.strictEqual(waterRes.json.ml, 1750);

  // 3. Pillar create & PATCH full fields
  const g1 = await req('/api/goals', 'POST', { date: today, title: 'Read 10 pages', category: 'Learning', priority: 'low' }, token);
  assert.strictEqual(g1.status, 200);
  const g1Patch = await req(`/api/goals/${g1.json.id}`, 'PATCH', { title: 'Read 20 pages', priority: 'high', time_label: '8:00 PM', done: true }, token);
  assert.strictEqual(g1Patch.status, 200);
  assert.strictEqual(g1Patch.json.title, 'Read 20 pages');
  assert.strictEqual(g1Patch.json.priority, 'high');
  assert.strictEqual(g1Patch.json.time_label, '8:00 PM');
  assert.strictEqual(g1Patch.json.done, true);

  const w1 = await req('/api/workouts', 'POST', { date: today, title: 'Run', category: 'Cardio', duration_min: 20, calories: 200 }, token);
  assert.strictEqual(w1.status, 200);
  const w1Patch = await req(`/api/workouts/${w1.json.id}`, 'PATCH', { category: 'HIIT', duration_min: 30, calories: 320, done: false }, token);
  assert.strictEqual(w1Patch.status, 200);
  assert.strictEqual(w1Patch.json.category, 'HIIT');
  assert.strictEqual(w1Patch.json.calories, 320);

  const s1 = await req('/api/study', 'POST', { date: today, title: 'Algebra', subject: 'Mathematics', mode: 'Pomodoro', duration_min: 25 }, token);
  assert.strictEqual(s1.status, 200);
  const s1Patch = await req(`/api/study/${s1.json.id}`, 'PATCH', { subject: 'Computer Science', mode: 'Deep Work', duration_min: 50, done: true }, token);
  assert.strictEqual(s1Patch.status, 200);
  assert.strictEqual(s1Patch.json.subject, 'Computer Science');
  assert.strictEqual(s1Patch.json.mode, 'Deep Work');

  // 4. Progress returns water + weekly completion (2 of 3 done => 67%)
  const prog = await req(`/api/progress?date=${today}`, 'GET', null, token);
  assert.strictEqual(prog.status, 200);
  assert.strictEqual(prog.json.water.find(w => w.date === today)?.ml, 1750);
  assert.strictEqual(prog.json.weekly.length, 7);
  const todayWeek = prog.json.weekly.find(d => d.date === today);
  assert.ok(todayWeek, 'Today should be in Mon-Sun weekly array');
  assert.strictEqual(todayWeek.done, 2);
  assert.strictEqual(todayWeek.total, 3);
  assert.strictEqual(todayWeek.pct, 67);

  console.log('FEATURES TESTS OK');
  server.close();
  await close();
  await mongo.stop();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
