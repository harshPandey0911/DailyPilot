const assert = require('assert');
const http = require('http');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { connect, close } = require('../src/config/db');
const app = require('../src/app');

(async () => {
  const mongo = await MongoMemoryServer.create();
  await connect(mongo.getUri(), 'test_activities');

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

  // 1. Auth required
  const unauth = await req('/api/activities');
  assert.strictEqual(unauth.status, 401);

  // 2. Register user
  const reg = await req('/api/auth/register', 'POST', {
    name: 'Runner',
    email: 'runner@dailypilot.local',
    password: 'Password@123',
  });
  assert.strictEqual(reg.status, 200);
  const token = reg.json.token;

  // 3. Create activity with GPS points (computes distance, pace, calories, elevation)
  const points = [
    { lat: 37.7749, lng: -122.4194, alt: 10, ts: 1000 },
    { lat: 37.7794, lng: -122.4194, alt: 25, ts: 121000 },
    { lat: 37.7839, lng: -122.4194, alt: 20, ts: 241000 },
  ];
  const created = await req('/api/activities', 'POST', {
    type: 'run',
    title: 'Morning Park Loop',
    duration_sec: 300,
    points,
  }, token);
  assert.strictEqual(created.status, 200);
  assert.strictEqual(created.json.title, 'Morning Park Loop');
  assert.strictEqual(created.json.type, 'run');
  assert.ok(created.json.distance_m > 900 && created.json.distance_m < 1100, `Unexpected distance: ${created.json.distance_m}`);
  assert.strictEqual(created.json.elevation_gain_m, 15);
  assert.ok(created.json.avg_pace_sec_km > 250 && created.json.avg_pace_sec_km < 350);
  assert.ok(created.json.calories > 0);
  assert.strictEqual(created.json.points.length, 3);

  // 4. List & filter activities
  const list = await req('/api/activities?type=run', 'GET', null, token);
  assert.strictEqual(list.status, 200);
  assert.strictEqual(list.json.length, 1);
  assert.strictEqual(list.json[0].id, created.json.id);

  const emptyList = await req('/api/activities?type=ride', 'GET', null, token);
  assert.strictEqual(emptyList.status, 200);
  assert.strictEqual(emptyList.json.length, 0);

  // 5. Delete activity
  const del = await req(`/api/activities/${created.json.id}`, 'DELETE', null, token);
  assert.strictEqual(del.status, 200);
  assert.strictEqual(del.json.ok, true);

  const afterDel = await req('/api/activities', 'GET', null, token);
  assert.strictEqual(afterDel.json.length, 0);

  console.log('ACTIVITIES TESTS OK');
  await new Promise(resolve => server.close(resolve));
  await close();
  await mongo.stop();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
