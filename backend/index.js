const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { connect, col, oid, withId, loadMeals, seedAdmin } = require('./db'); // db.js also loads backend/.env
const { runSeed } = require('./seed');
const { SLOTS, ACTIVITY, validateProfile, computeTargets, rankCandidates, round } = require('./calc');

const SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.JWT_SECRET) console.log('JWT_SECRET not set: logins reset on every restart.');

const app = express();
app.use(express.json({ limit: '100kb' }));
// CORS: only needed if the frontend is hosted on a different origin than the backend.
app.use((req, res, next) => {
  const origin = process.env.CORS_ORIGIN;
  if (origin) {
    res.set({ 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS' });
    if (req.method === 'OPTIONS') return res.sendStatus(204);
  }
  next();
});
// Frontend runtime config generated from frontend/.env (browsers can't read .env files themselves).
const FRONT = path.join(__dirname, '..', 'frontend');
app.get('/config.js', (req, res) => {
  let apiUrl = '';
  try { apiUrl = (fs.readFileSync(path.join(FRONT, '.env'), 'utf8').match(/^API_URL=(.*)$/m) || [])[1]?.trim() || ''; } catch { /* no file */ }
  res.type('js').send(`window.DP_CONFIG=${JSON.stringify({ API_URL: apiUrl })};`);
});
app.use(express.static(FRONT)); // dotfiles (.env) are never served

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(e => { console.error(e); res.status(500).json({ error: 'Server error' }); });
const fail = (res, msg, code = 400) => res.status(code).json({ error: msg });
const isDate = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d));
const num = v => (v === '' || v == null ? NaN : Number(v));
const str = (v, max = 300) => String(v ?? '').trim().slice(0, max);
const dayDiff = d => Math.abs(Date.parse(d) - Date.now()) / 86400000;
const todayStr = () => new Date().toISOString().slice(0, 10);

// ---------- auth ----------
const sign = u => jwt.sign({ id: String(u._id), role: u.role }, SECRET, { expiresIn: '30d' });
const pub = u => ({ id: String(u._id), name: u.name, email: u.email, role: u.role });
const auth = wrap(async (req, res, next) => {
  let p;
  try { p = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), SECRET); } catch { return fail(res, 'Login again', 401); }
  const _id = oid(p.id);
  const u = _id && await col('users').findOne({ _id });
  if (!u) return fail(res, 'Login again', 401);
  req.user = { ...pub(u), _id: u._id };
  next();
});
const admin = (req, res, next) => (req.user.role === 'admin' ? next() : fail(res, 'Admin only', 403));

app.post('/api/auth/register', wrap(async (req, res) => {
  const name = str(req.body.name, 60), email = str(req.body.email, 120).toLowerCase(), pw = String(req.body.password || '');
  if (!name) return fail(res, 'Naam daalo.');
  if (!/^\S+@\S+\.\S+$/.test(email)) return fail(res, 'Sahi email daalo.');
  if (pw.length < 8) return fail(res, 'Password kam se kam 8 characters ka ho.');
  let r;
  try { r = await col('users').insertOne({ name, email, password_hash: bcrypt.hashSync(pw, 10), role: 'user', created_at: new Date() }); }
  catch (e) { if (e.code === 11000) return fail(res, 'Ye email already registered hai.'); throw e; }
  const u = { _id: r.insertedId, name, email, role: 'user' };
  res.json({ token: sign(u), user: pub(u) });
}));
app.post('/api/auth/login', wrap(async (req, res) => {
  const u = await col('users').findOne({ email: str(req.body.email, 120).toLowerCase() });
  if (!u || !bcrypt.compareSync(String(req.body.password || ''), u.password_hash)) return fail(res, 'Email ya password galat hai.', 401);
  res.json({ token: sign(u), user: pub(u) });
}));
app.get('/api/me', auth, wrap(async (req, res) => res.json({ user: pub(req.user) })));

// ---------- profile ----------
const getProfile = uid => col('profiles').findOne({ user_id: uid });
const cleanProfile = p => { const { _id, user_id, ...rest } = p; return rest; };
async function profileResponse(uid) {
  const p = await getProfile(uid);
  if (!p || !p.gender) return { profile: null };
  return { profile: cleanProfile(p), targets: computeTargets(p), activityOptions: Object.fromEntries(Object.entries(ACTIVITY).map(([k, v]) => [k, v.label])) };
}
app.get('/api/profile', auth, wrap(async (req, res) => res.json(await profileResponse(req.user._id))));
app.put('/api/profile', auth, wrap(async (req, res) => {
  const b = req.body;
  const p = { gender: b.gender, age: num(b.age), height_cm: num(b.height_cm), weight_kg: num(b.weight_kg), goal: b.goal, activity: b.activity, diet_pref: b.diet_pref, skin_care: b.skin_care ? 1 : 0 };
  const errs = validateProfile(p);
  if (errs.length) return fail(res, errs.join(' '));
  const date = isDate(b.date) && dayDiff(b.date) <= 2 ? b.date : todayStr();
  const uid = req.user._id;
  await col('profiles').updateOne({ user_id: uid }, { $set: { ...p, updated_at: new Date() } }, { upsert: true });
  await col('weights').updateOne({ user_id: uid, date }, { $set: { kg: p.weight_kg } }, { upsert: true });
  // targets changed -> today's & future plans must be rebuilt
  await col('plans').deleteMany({ user_id: uid, date: { $gte: new Date(Date.now() - 86400000).toISOString().slice(0, 10) } });
  res.json(await profileResponse(uid));
}));

// ---------- diet plan ----------
async function publishedBySlot() {
  const by = {};
  for (const m of await loadMeals({ status: 'published' })) (by[m.slot] ||= []).push(m);
  return by;
}
function pickSlot(profile, targets, slot, by, uid, date, afterMealId) {
  const cands = rankCandidates(profile, by[slot] || [], targets.calories * SLOTS[slot].share);
  if (!cands.length) return null;
  let i;
  if (afterMealId) { const cur = cands.findIndex(c => c.meal.id === afterMealId); i = (cur + 1) % cands.length; }
  else i = (Math.floor(Date.parse(date) / 86400000) + parseInt(String(uid).slice(-6), 16)) % cands.length;
  return { meal_id: cands[i].meal.id, factor: cands[i].factor };
}
const scale = (m, f) => ({
  id: m.id, title: m.title, factor: f, allergens: m.allergens, notes: m.notes,
  source_name: m.source_name, source_url: m.source_url, reviewed_by: m.reviewed_by,
  kcal: round(m.kcal * f), protein: round(m.protein * f, 1), carbs: round(m.carbs * f, 1), fat: round(m.fat * f, 1),
  items: m.items.map(i => ({ name: i.name, grams: Math.round(i.grams * f) })),
});
async function getPlan(uid, date, swapSlot) {
  const profile = await getProfile(uid);
  if (!profile || !profile.gender) return null;
  const targets = computeTargets(profile);
  const by = await publishedBySlot();
  const row = await col('plans').findOne({ user_id: uid, date });
  const stored = row ? row.data : {};
  let changed = !row;
  const plan = {};
  for (const slot of Object.keys(SLOTS)) {
    let s = stored[slot];
    const meal = s && (by[slot] || []).find(m => m.id === s.meal_id);
    const dietOk = meal && (profile.diet_pref !== 'veg' || meal.diet_type === 'veg');
    if (slot === swapSlot) { s = pickSlot(profile, targets, slot, by, uid, date, s && s.meal_id); changed = true; }
    else if (!meal || !dietOk) { s = pickSlot(profile, targets, slot, by, uid, date); changed = true; }
    plan[slot] = s;
  }
  if (changed) await col('plans').updateOne({ user_id: uid, date }, { $set: { data: plan } }, { upsert: true });
  const done = Object.fromEntries((await col('checks').find({ user_id: uid, date }).toArray()).map(r => [r.slot, !!r.done]));
  const mealMap = Object.fromEntries(Object.values(by).flat().map(m => [m.id, m]));
  const slots = Object.entries(SLOTS).map(([slot, info]) => {
    const s = plan[slot];
    return { slot, label: info.label, time: info.time, targetKcal: round(targets.calories * info.share), done: !!done[slot], meal: s ? scale(mealMap[s.meal_id], s.factor) : null };
  });
  const eaten = slots.filter(s => s.done && s.meal);
  const sum = k => round(eaten.reduce((a, s) => a + s.meal[k], 0), 1);
  const planned = k => round(slots.reduce((a, s) => a + (s.meal ? s.meal[k] : 0), 0), 1);
  const tips = profile.skin_care ? (await col('tips').find({ status: 'published', category: 'skin' }).sort({ _id: 1 }).toArray()).map(({ title, body, source_name, source_url }) => ({ title, body, source_name, source_url })) : [];
  return {
    date, targets, slots, tips,
    totals: { planned: { kcal: planned('kcal'), protein: planned('protein'), carbs: planned('carbs'), fat: planned('fat') },
      eaten: { kcal: sum('kcal'), protein: sum('protein'), carbs: sum('carbs'), fat: sum('fat') } },
  };
}
function dateParam(req, res) {
  const d = req.method === 'GET' ? req.query.date : req.body.date;
  if (!isDate(d) || dayDiff(d) > 2) { fail(res, 'Invalid date'); return null; }
  return d;
}
app.get('/api/plan', auth, wrap(async (req, res) => {
  const d = dateParam(req, res); if (!d) return;
  const plan = await getPlan(req.user._id, d);
  plan ? res.json(plan) : fail(res, 'Pehle profile complete karo.', 409);
}));
app.post('/api/plan/check', auth, wrap(async (req, res) => {
  const d = dateParam(req, res); if (!d) return;
  if (!SLOTS[req.body.slot]) return fail(res, 'Invalid slot');
  await col('checks').updateOne({ user_id: req.user._id, date: d, slot: req.body.slot }, { $set: { done: req.body.done ? 1 : 0 } }, { upsert: true });
  res.json(await getPlan(req.user._id, d));
}));
app.post('/api/plan/swap', auth, wrap(async (req, res) => {
  const d = dateParam(req, res); if (!d) return;
  if (!SLOTS[req.body.slot]) return fail(res, 'Invalid slot');
  await col('checks').deleteOne({ user_id: req.user._id, date: d, slot: req.body.slot });
  res.json(await getPlan(req.user._id, d, req.body.slot));
}));

// ---------- steps & weight ----------
app.put('/api/steps', auth, wrap(async (req, res) => {
  const d = dateParam(req, res); if (!d) return;
  const n = Math.round(num(req.body.steps));
  if (!Number.isFinite(n) || n < 0 || n > 100000) return fail(res, 'Steps 0 se 100000 ke beech daalo.');
  await col('steps').updateOne({ user_id: req.user._id, date: d }, { $set: { steps: n } }, { upsert: true });
  res.json({ ok: true });
}));
app.get('/api/progress', auth, wrap(async (req, res) => {
  const from = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  const uid = req.user._id;
  const [steps, weights] = await Promise.all([
    col('steps').find({ user_id: uid, date: { $gte: from } }).sort({ date: 1 }).project({ _id: 0, date: 1, steps: 1 }).toArray(),
    col('weights').find({ user_id: uid }).sort({ date: -1 }).limit(30).project({ _id: 0, date: 1, kg: 1 }).toArray(),
  ]);
  res.json({ steps, weights: weights.reverse() });
}));

// ---------- admin ----------
const adm = [auth, admin];
const STATUS = ['draft', 'published'];
const PENDING = /^PENDING/i;
app.get('/api/admin/stats', ...adm, wrap(async (req, res) => {
  const c = (n, f) => col(n).countDocuments(f);
  const [users, publishedMeals, draftMeals, needsReviewMeals, needsReviewTips, foods] = await Promise.all([
    c('users', { role: 'user' }), c('meals', { status: 'published' }), c('meals', { status: 'draft' }),
    c('meals', { status: 'published', reviewed_by: PENDING }), c('tips', { status: 'published', reviewed_by: PENDING }), c('foods', {}),
  ]);
  res.json({ users, publishedMeals, draftMeals, needsReviewMeals, needsReviewTips, foods });
}));
app.get('/api/admin/users', ...adm, wrap(async (req, res) => {
  const [users, profiles] = await Promise.all([col('users').find({ role: 'user' }).sort({ _id: -1 }).toArray(), col('profiles').find().toArray()]);
  const pm = new Map(profiles.map(p => [String(p.user_id), p]));
  res.json(users.map(u => { const p = pm.get(String(u._id)) || {}; return { id: String(u._id), name: u.name, email: u.email, created_at: u.created_at, goal: p.goal, diet_pref: p.diet_pref, weight_kg: p.weight_kg }; }));
}));

function foodBody(b) {
  const f = { name: str(b.name, 100), kcal: num(b.kcal), protein: num(b.protein), carbs: num(b.carbs), fat: num(b.fat), source_name: str(b.source_name), source_url: str(b.source_url, 500) };
  if (!f.name) return 'Name required';
  for (const k of ['kcal', 'protein', 'carbs', 'fat']) if (!Number.isFinite(f[k]) || f[k] < 0) return `${k} invalid`;
  if (f.protein + f.carbs + f.fat > 100.5) return 'Protein+carbs+fat per 100g 100 se zyada nahi ho sakta.';
  const est = f.protein * 4 + f.carbs * 4 + f.fat * 9;
  if (f.kcal > 900 || Math.abs(est - f.kcal) > Math.max(40, f.kcal * 0.25)) return `Calories macros se match nahi karti (macros se ~${Math.round(est)} kcal banti hain). Dobara check karo.`;
  return f;
}
app.get('/api/admin/foods', ...adm, wrap(async (req, res) => res.json((await col('foods').find().sort({ name: 1 }).toArray()).map(withId))));
async function saveFood(id, req, res) {
  const f = foodBody(req.body); if (typeof f === 'string') return fail(res, f);
  try {
    if (id) { if (!id) return fail(res, 'Invalid id'); await col('foods').updateOne({ _id: id }, { $set: f }); }
    else await col('foods').insertOne(f);
    res.json({ ok: true });
  } catch (e) { if (e.code === 11000) return fail(res, 'Is naam ka food already hai.'); throw e; }
}
app.post('/api/admin/foods', ...adm, wrap((req, res) => saveFood(null, req, res)));
app.put('/api/admin/foods/:id', ...adm, wrap((req, res) => (oid(req.params.id) ? saveFood(oid(req.params.id), req, res) : fail(res, 'Invalid id'))));
app.delete('/api/admin/foods/:id', ...adm, wrap(async (req, res) => {
  const id = oid(req.params.id); if (!id) return fail(res, 'Invalid id');
  if (await col('meals').findOne({ 'items.food_id': id })) return fail(res, 'Ye food kisi meal me use ho raha hai, pehle wahan se hatao.');
  await col('foods').deleteOne({ _id: id });
  res.json({ ok: true });
}));

app.get('/api/admin/meals', ...adm, wrap(async (req, res) => res.json(await loadMeals())));
async function mealBody(b) {
  const m = {
    title: str(b.title, 120), slot: b.slot, diet_type: b.diet_type, skin_friendly: b.skin_friendly ? 1 : 0,
    allergens: str(b.allergens, 200), notes: str(b.notes, 500), status: b.status, source_name: str(b.source_name, 200),
    source_url: str(b.source_url, 500), reviewed_by: str(b.reviewed_by, 120),
    items: Array.isArray(b.items) ? b.items.map(i => ({ food_id: oid(i.food_id), grams: num(i.grams) })) : [],
  };
  if (!m.title) return 'Title required';
  if (!SLOTS[m.slot]) return 'Invalid slot';
  if (!['veg', 'nonveg'].includes(m.diet_type)) return 'Veg/Non-veg select karo';
  if (!STATUS.includes(m.status)) return 'Invalid status';
  if (!m.items.length) return 'Kam se kam ek ingredient chahiye';
  if (m.items.some(i => !i.food_id || !(i.grams > 0 && i.grams <= 2000))) return 'Ingredient ya grams invalid';
  const uniq = [...new Set(m.items.map(i => String(i.food_id)))];
  if (await col('foods').countDocuments({ _id: { $in: m.items.map(i => i.food_id) } }) !== uniq.length) return 'Ingredient ya grams invalid';
  if (m.status === 'published') {
    if (!m.source_name) return 'Publish karne ke liye source (kis doctor/dietitian/book/website se) zaroori hai.';
    if (!m.reviewed_by || PENDING.test(m.reviewed_by)) return 'Publish karne ke liye reviewer ka naam (doctor/dietitian) zaroori hai.';
  }
  return m;
}
async function saveMeal(id, req, res) {
  const m = await mealBody(req.body); if (typeof m === 'string') return fail(res, m);
  let mid = id;
  if (id) await col('meals').updateOne({ _id: id }, { $set: m });
  else mid = (await col('meals').insertOne({ ...m, created_at: new Date() })).insertedId;
  const saved = (await loadMeals({ _id: mid }))[0];
  const warn = saved && saved.status === 'published' && (saved.kcal < 80 || saved.kcal > 1200) ? `Dhyan do: meal ki total calories ${Math.round(saved.kcal)} kcal hain, ye unusual lag rahi hain.` : null;
  res.json({ ok: true, warning: warn });
}
app.post('/api/admin/meals', ...adm, wrap((req, res) => saveMeal(null, req, res)));
app.put('/api/admin/meals/:id', ...adm, wrap((req, res) => (oid(req.params.id) ? saveMeal(oid(req.params.id), req, res) : fail(res, 'Invalid id'))));
app.delete('/api/admin/meals/:id', ...adm, wrap(async (req, res) => { const id = oid(req.params.id); if (!id) return fail(res, 'Invalid id'); await col('meals').deleteOne({ _id: id }); res.json({ ok: true }); }));

app.get('/api/admin/tips', ...adm, wrap(async (req, res) => res.json((await col('tips').find().sort({ _id: 1 }).toArray()).map(withId))));
async function saveTip(id, req, res) {
  const t = { title: str(req.body.title, 120), body: str(req.body.body, 800), status: req.body.status, source_name: str(req.body.source_name, 200), source_url: str(req.body.source_url, 500), reviewed_by: str(req.body.reviewed_by, 120) };
  if (!t.title || !t.body) return fail(res, 'Title aur body required');
  if (!STATUS.includes(t.status)) return fail(res, 'Invalid status');
  if (t.status === 'published' && (!t.source_name || !t.reviewed_by || PENDING.test(t.reviewed_by))) return fail(res, 'Publish ke liye source aur reviewer naam zaroori hai.');
  if (id) await col('tips').updateOne({ _id: id }, { $set: t });
  else await col('tips').insertOne({ ...t, category: 'skin' });
  res.json({ ok: true });
}
app.post('/api/admin/tips', ...adm, wrap((req, res) => saveTip(null, req, res)));
app.put('/api/admin/tips/:id', ...adm, wrap((req, res) => (oid(req.params.id) ? saveTip(oid(req.params.id), req, res) : fail(res, 'Invalid id'))));
app.delete('/api/admin/tips/:id', ...adm, wrap(async (req, res) => { const id = oid(req.params.id); if (!id) return fail(res, 'Invalid id'); await col('tips').deleteOne({ _id: id }); res.json({ ok: true }); }));

app.use('/api', (req, res) => fail(res, 'Not found', 404));

async function start() {
  await connect();
  await runSeed();
  await seedAdmin();
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`DailyPilot running: http://localhost:${PORT}  (admin: /admin.html)`));
}
if (require.main === module) start().catch(e => { console.error('Startup failed:', e.message); process.exit(1); });
module.exports = app;
