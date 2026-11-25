const assert = require('assert');
const http = require('http');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { connect, close, seedAdmin } = require('../src/config/db');
const { runSeed } = require('../src/services/seed');
const app = require('../src/app');

(async () => {
  const mongo = await MongoMemoryServer.create();
  await connect(mongo.getUri(), 'test_recommendations');
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

  const today = new Date().toISOString().slice(0, 10);

  // 1. Auth required
  const unauth = await req(`/api/recommendations?date=${today}`);
  assert.strictEqual(unauth.status, 401);

  // 2. Register user without profile -> 409
  const reg = await req('/api/auth/register', 'POST', {
    name: 'Rec User',
    email: 'rec@dailypilot.local',
    password: 'Password@123',
  });
  assert.strictEqual(reg.status, 200);
  const token = reg.json.token;

  const noProf = await req(`/api/recommendations?date=${today}`, 'GET', null, token);
  assert.strictEqual(noProf.status, 409);

  // 3. Profile A: 95kg, 170cm (BMI ~32.9 Obese), lose, veg, light activity, skin_care=1
  const profA = await req('/api/profile', 'PUT', {
    gender: 'male',
    age: 34,
    height_cm: 170,
    weight_kg: 95,
    goal: 'lose',
    activity: 'light',
    diet_pref: 'veg',
    skin_care: 1,
    date: today,
  }, token);
  assert.strictEqual(profA.status, 200);

  const recA = await req(`/api/recommendations?date=${today}`, 'GET', null, token);
  assert.strictEqual(recA.status, 200);
  const a = recA.json;
  assert.strictEqual(a.profileSummary.goal, 'lose');
  assert(a.profileSummary.bmi >= 30, 'BMI should be >= 30');
  assert(Array.isArray(a.workouts) && a.workouts.length === 4, 'Should return 4 workout recommendations');
  assert(a.workouts.every(w => w.jointFriendly), 'High BMI should prioritize joint-friendly workouts');
  for (const slot of ['breakfast', 'lunch', 'snack', 'dinner']) {
    assert(a.meals[slot] && a.meals[slot].items.length > 0, `Should have meal recs for ${slot}`);
    assert(a.meals[slot].items.every(m => m.diet_type === 'veg'), `Veg profile should only get veg meals in ${slot}`);
  }
  assert(a.habits.length >= 3, 'Should return dynamic habits');
  assert(a.insights.length >= 2, 'Should return dynamic insights including skin_care tips');

  // 4. Profile B: 58kg, 175cm, bulk, both, active -> different workouts, durations, calories
  const profB = await req('/api/profile', 'PUT', {
    gender: 'male',
    age: 22,
    height_cm: 175,
    weight_kg: 58,
    goal: 'bulk',
    activity: 'active',
    diet_pref: 'both',
    skin_care: 0,
    date: today,
  }, token);
  assert.strictEqual(profB.status, 200);

  const recB = await req(`/api/recommendations?date=${today}`, 'GET', null, token);
  assert.strictEqual(recB.status, 200);
  const b = recB.json;
  assert.strictEqual(b.profileSummary.goal, 'bulk');
  assert.strictEqual(b.workouts[0].category, 'Strength', 'Bulk goal should prioritize Strength workouts');
  assert.notStrictEqual(
    JSON.stringify(a.workouts.map(w => [w.id, w.duration_min, w.calories])),
    JSON.stringify(b.workouts.map(w => [w.id, w.duration_min, w.calories])),
    'Recommendations must change dynamically with profile'
  );

  // 5. Adding the top recommended workout today should adapt recommendations (deprioritize it)
  const topWorkout = b.workouts[0];
  const addW = await req('/api/workouts', 'POST', {
    date: today,
    title: topWorkout.title,
    category: topWorkout.category,
    duration_min: topWorkout.duration_min,
    calories: topWorkout.calories,
    done: true,
  }, token);
  assert.strictEqual(addW.status, 200);

  const recAfterWorkout = await req(`/api/recommendations?date=${today}`, 'GET', null, token);
  assert.strictEqual(recAfterWorkout.status, 200);
  assert.notStrictEqual(
    recAfterWorkout.json.workouts[0].id,
    topWorkout.id,
    'Already-completed workout today should be deprioritized'
  );

  // 6. Teen profile (age 16) with bulk -> safety-adjusted to fit
  await req('/api/profile', 'PUT', {
    gender: 'female',
    age: 16,
    height_cm: 162,
    weight_kg: 54,
    goal: 'bulk',
    activity: 'moderate',
    diet_pref: 'both',
    skin_care: 0,
    date: today,
  }, token);
  const recTeen = await req(`/api/recommendations?date=${today}`, 'GET', null, token);
  assert.strictEqual(recTeen.status, 200);
  assert.strictEqual(recTeen.json.profileSummary.goal, 'fit', 'Teen goal should be safety-adjusted to fit');
  assert(recTeen.json.insights.some(i => i.category === 'safety'), 'Teen should receive safety insight');

  console.log('RECOMMENDATIONS TESTS OK');
  server.close();
  await close();
  await mongo.stop();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
