const express = require('express');
const bcrypt = require('bcryptjs');
const { col, oid, withId, loadMeals } = require('../config/db');
const { adm } = require('../middleware/auth');
const { SLOTS, computeTargets } = require('../services/calc');
const { wrap, fail, num, str } = require('../utils/helpers');

const router = express.Router();
const STATUS = ['draft', 'published'];
const PENDING = /^PENDING/i;

router.get(
  '/admin/stats',
  ...adm,
  wrap(async (req, res) => {
    const c = (n, f) => col(n).countDocuments(f);
    const [
      users,
      publishedMeals,
      draftMeals,
      needsReviewMeals,
      publishedTips,
      draftTips,
      needsReviewTips,
      foods,
      workouts,
      workoutsDone,
      studySessions,
      goals,
      goalsDone,
      meals,
      profiles,
      recentUserDocs,
      studyAgg,
    ] = await Promise.all([
      c('users', { role: 'user' }),
      c('meals', { status: 'published' }),
      c('meals', { status: 'draft' }),
      c('meals', { status: 'published', reviewed_by: PENDING }),
      c('tips', { status: 'published' }),
      c('tips', { status: 'draft' }),
      c('tips', { status: 'published', reviewed_by: PENDING }),
      c('foods', {}),
      c('workouts', {}),
      c('workouts', { done: true }),
      c('study_sessions', {}),
      c('goals', {}),
      c('goals', { done: true }),
      col('meals').find({}, { projection: { slot: 1, diet_type: 1 } }).toArray(),
      col('profiles').find({}, { projection: { user_id: 1, goal: 1 } }).toArray(),
      col('users').find({ role: 'user' }, { projection: { password_hash: 0 } }).sort({ _id: -1 }).limit(5).toArray(),
      col('study_sessions').aggregate([{ $group: { _id: null, mins: { $sum: '$duration_min' } } }]).toArray(),
    ]);

    const mealSlots = { breakfast: 0, lunch: 0, snack: 0, dinner: 0 };
    const dietBreakdown = { veg: 0, nonveg: 0 };
    for (const m of meals) {
      if (mealSlots[m.slot] !== undefined) mealSlots[m.slot]++;
      if (dietBreakdown[m.diet_type] !== undefined) dietBreakdown[m.diet_type]++;
    }

    const userGoals = { lose: 0, fit: 0, bulk: 0, unset: 0 };
    const goalByUser = new Map();
    for (const p of profiles) {
      goalByUser.set(String(p.user_id), p.goal);
      if (userGoals[p.goal] !== undefined) userGoals[p.goal]++;
      else userGoals.unset++;
    }
    if (users > profiles.length) userGoals.unset += users - profiles.length;

    res.json({
      users,
      publishedMeals,
      draftMeals,
      needsReviewMeals,
      publishedTips,
      draftTips,
      needsReviewTips,
      foods,
      mealSlots,
      dietBreakdown,
      userGoals,
      pillars: {
        workouts,
        workoutsDone,
        studySessions,
        studyMinutes: studyAgg[0]?.mins || 0,
        goals,
        goalsDone,
      },
      recentUsers: recentUserDocs.map(u => ({
        id: String(u._id),
        name: u.name,
        email: u.email,
        created_at: u.created_at,
        goal: goalByUser.get(String(u._id)) || null,
      })),
    });
  })
);

router.get(
  '/admin/users',
  ...adm,
  wrap(async (req, res) => {
    const [users, profiles] = await Promise.all([
      col('users').find({}, { projection: { password_hash: 0 } }).sort({ _id: -1 }).toArray(),
      col('profiles').find().toArray(),
    ]);
    const pm = new Map(profiles.map(p => [String(p.user_id), p]));
    res.json(
      users.map(u => {
        const p = pm.get(String(u._id)) || {};
        return {
          id: String(u._id),
          name: u.name,
          email: u.email,
          role: u.role || 'user',
          disabled: !!u.disabled,
          created_at: u.created_at,
          goal: p.goal,
          diet_pref: p.diet_pref,
          weight_kg: p.weight_kg,
          height_cm: p.height_cm,
          age: p.age,
          gender: p.gender,
          activity: p.activity,
          skin_care: !!p.skin_care,
        };
      })
    );
  })
);

router.get(
  '/admin/users/:id',
  ...adm,
  wrap(async (req, res) => {
    const id = oid(req.params.id);
    if (!id) return fail(res, 'Invalid id');
    const user = await col('users').findOne({ _id: id }, { projection: { password_hash: 0 } });
    if (!user) return fail(res, 'User not found', 404);
    const [profile, weights, steps, workouts, studySessions, goals, foodLogs, plans] = await Promise.all([
      col('profiles').findOne({ user_id: id }),
      col('weights').find({ user_id: id }).sort({ date: -1 }).limit(10).toArray(),
      col('steps').find({ user_id: id }).sort({ date: -1 }).limit(7).toArray(),
      col('workouts').find({ user_id: id }).sort({ _id: -1 }).limit(15).toArray(),
      col('study_sessions').find({ user_id: id }).sort({ _id: -1 }).limit(15).toArray(),
      col('goals').find({ user_id: id }).sort({ _id: -1 }).limit(15).toArray(),
      col('food_logs').find({ user_id: id }).sort({ _id: -1 }).limit(15).toArray(),
      col('plans').find({ user_id: id }).sort({ date: -1 }).limit(7).toArray(),
    ]);
    let targets = null;
    if (profile) {
      try { targets = computeTargets(profile); } catch { /* ignore invalid profile */ }
    }
    res.json({
      user: { ...withId(user), disabled: !!user.disabled },
      profile: profile ? withId(profile) : null,
      targets,
      weights: weights.map(withId),
      steps: steps.map(withId),
      workouts: workouts.map(withId),
      studySessions: studySessions.map(withId),
      goals: goals.map(withId),
      foodLogs: foodLogs.map(withId),
      plans: plans.map(p => ({ id: String(p._id), date: p.date, adjusted_kcal: p.adjusted_kcal || null, adjustment_delta: p.adjustment_delta || 0 })),
    });
  })
);

router.post(
  '/admin/users',
  ...adm,
  wrap(async (req, res) => {
    const name = str(req.body.name, 60);
    const email = str(req.body.email, 120).toLowerCase();
    const pw = String(req.body.password || '');
    const role = ['user', 'admin'].includes(req.body.role) ? req.body.role : 'user';
    if (!name) return fail(res, 'Name required');
    if (!/^\S+@\S+\.\S+$/.test(email)) return fail(res, 'Valid email required');
    if (pw.length < 8) return fail(res, 'Password must be at least 8 characters');
    try {
      const r = await col('users').insertOne({
        name,
        email,
        password_hash: bcrypt.hashSync(pw, 10),
        role,
        disabled: false,
        created_at: new Date(),
      });
      res.json({ ok: true, id: String(r.insertedId) });
    } catch (e) {
      if (e.code === 11000) return fail(res, 'Email already registered.');
      throw e;
    }
  })
);

router.put(
  '/admin/users/:id',
  ...adm,
  wrap(async (req, res) => {
    const id = oid(req.params.id);
    if (!id) return fail(res, 'Invalid id');
    const existing = await col('users').findOne({ _id: id });
    if (!existing) return fail(res, 'User not found', 404);
    const isSelf = String(id) === String(req.user._id);

    const userPatch = {};
    if (req.body.name !== undefined) {
      const n = str(req.body.name, 60);
      if (!n) return fail(res, 'Name required');
      userPatch.name = n;
    }
    if (req.body.role !== undefined) {
      if (!['user', 'admin'].includes(req.body.role)) return fail(res, 'Invalid role');
      if (isSelf && req.body.role !== 'admin') return fail(res, 'Cannot demote your own admin account.');
      userPatch.role = req.body.role;
    }
    if (req.body.disabled !== undefined) {
      if (isSelf && req.body.disabled) return fail(res, 'Cannot disable your own admin account.');
      userPatch.disabled = !!req.body.disabled;
    }
    if (req.body.newPassword) {
      const pw = String(req.body.newPassword);
      if (pw.length < 8) return fail(res, 'Password must be at least 8 characters');
      userPatch.password_hash = bcrypt.hashSync(pw, 10);
    }
    if (Object.keys(userPatch).length) {
      await col('users').updateOne({ _id: id }, { $set: userPatch });
    }

    if (req.body.profile && typeof req.body.profile === 'object') {
      const p = req.body.profile;
      const profPatch = {};
      if (['lose', 'fit', 'bulk'].includes(p.goal)) profPatch.goal = p.goal;
      if (['veg', 'nonveg', 'both'].includes(p.diet_pref)) profPatch.diet_pref = p.diet_pref;
      if (['sedentary', 'light', 'moderate', 'active'].includes(p.activity)) profPatch.activity = p.activity;
      if (['male', 'female'].includes(p.gender)) profPatch.gender = p.gender;
      if (p.weight_kg !== undefined && num(p.weight_kg) >= 25 && num(p.weight_kg) <= 250) profPatch.weight_kg = num(p.weight_kg);
      if (p.height_cm !== undefined && num(p.height_cm) >= 100 && num(p.height_cm) <= 240) profPatch.height_cm = num(p.height_cm);
      if (p.age !== undefined && num(p.age) >= 13 && num(p.age) <= 100) profPatch.age = num(p.age);
      if (p.skin_care !== undefined) profPatch.skin_care = p.skin_care ? 1 : 0;
      if (Object.keys(profPatch).length) {
        await col('profiles').updateOne({ user_id: id }, { $set: { ...profPatch, updated_at: new Date() } });
      }
    }
    res.json({ ok: true });
  })
);

router.patch(
  '/admin/users/:id',
  ...adm,
  wrap(async (req, res) => {
    const id = oid(req.params.id);
    if (!id) return fail(res, 'Invalid id');
    if (String(id) === String(req.user._id)) return fail(res, 'Apne khud ke account ko modify nahi kar sakte.');
    const patch = {};
    if (req.body.disabled !== undefined) patch.disabled = !!req.body.disabled;
    if (req.body.role !== undefined) {
      if (!['user', 'admin'].includes(req.body.role)) return fail(res, 'Invalid role');
      patch.role = req.body.role;
    }
    if (!Object.keys(patch).length) return fail(res, 'Nothing to update');
    const r = await col('users').findOneAndUpdate({ _id: id }, { $set: patch }, { returnDocument: 'after', projection: { password_hash: 0 } });
    if (!r) return fail(res, 'User not found', 404);
    res.json({ ok: true, user: withId(r) });
  })
);

router.delete(
  '/admin/users/:id',
  ...adm,
  wrap(async (req, res) => {
    const id = oid(req.params.id);
    if (!id) return fail(res, 'Invalid id');
    if (String(id) === String(req.user._id)) return fail(res, 'Apne khud ke account ko delete nahi kar sakte.');
    const u = await col('users').findOne({ _id: id });
    if (!u) return fail(res, 'User not found', 404);
    await Promise.all([
      col('users').deleteOne({ _id: id }),
      col('profiles').deleteMany({ user_id: id }),
      col('plans').deleteMany({ user_id: id }),
      col('checks').deleteMany({ user_id: id }),
      col('steps').deleteMany({ user_id: id }),
      col('weights').deleteMany({ user_id: id }),
      col('workouts').deleteMany({ user_id: id }),
      col('study_sessions').deleteMany({ user_id: id }),
      col('goals').deleteMany({ user_id: id }),
    ]);
    res.json({ ok: true });
  })
);

router.get(
  '/admin/pillars',
  ...adm,
  wrap(async (req, res) => {
    const [workouts, studySessions, goals, foodLogs, users] = await Promise.all([
      col('workouts').find().sort({ _id: -1 }).limit(50).toArray(),
      col('study_sessions').find().sort({ _id: -1 }).limit(50).toArray(),
      col('goals').find().sort({ _id: -1 }).limit(50).toArray(),
      col('food_logs').find().sort({ _id: -1 }).limit(50).toArray(),
      col('users').find({}, { projection: { name: 1, email: 1 } }).toArray(),
    ]);
    const um = new Map(users.map(u => [String(u._id), u]));
    const attach = list => list.map(item => {
      const u = um.get(String(item.user_id));
      return { ...withId(item), user_name: u?.name || 'Unknown', user_email: u?.email || '' };
    });
    res.json({
      workouts: attach(workouts),
      studySessions: attach(studySessions),
      goals: attach(goals),
      foodLogs: attach(foodLogs),
    });
  })
);

router.delete(
  '/admin/activity/:kind/:id',
  ...adm,
  wrap(async (req, res) => {
    const allowed = { workouts: 'workouts', study: 'study_sessions', goals: 'goals', food_logs: 'food_logs' };
    const cName = allowed[req.params.kind];
    const id = oid(req.params.id);
    if (!cName || !id) return fail(res, 'Invalid request');
    await col(cName).deleteOne({ _id: id });
    res.json({ ok: true });
  })
);

function foodBody(b) {
  const f = {
    name: str(b.name, 100),
    kcal: num(b.kcal),
    protein: num(b.protein),
    carbs: num(b.carbs),
    fat: num(b.fat),
    source_name: str(b.source_name),
    source_url: str(b.source_url, 500),
  };
  if (!f.name) return 'Name required';
  for (const k of ['kcal', 'protein', 'carbs', 'fat']) if (!Number.isFinite(f[k]) || f[k] < 0) return `${k} invalid`;
  if (f.protein + f.carbs + f.fat > 100.5) return 'Protein+carbs+fat per 100g 100 se zyada nahi ho sakta.';
  const est = f.protein * 4 + f.carbs * 4 + f.fat * 9;
  if (f.kcal > 900 || Math.abs(est - f.kcal) > Math.max(40, f.kcal * 0.25)) {
    return `Calories macros se match nahi karti (macros se ~${Math.round(est)} kcal banti hain). Dobara check karo.`;
  }
  return f;
}

async function saveFood(id, req, res) {
  const f = foodBody(req.body);
  if (typeof f === 'string') return fail(res, f);
  try {
    if (id) {
      if (!id) return fail(res, 'Invalid id');
      await col('foods').updateOne({ _id: id }, { $set: f });
    } else {
      await col('foods').insertOne(f);
    }
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 11000) return fail(res, 'Is naam ka food already hai.');
    throw e;
  }
}

router.get('/admin/foods', ...adm, wrap(async (req, res) => res.json((await col('foods').find().sort({ name: 1 }).toArray()).map(withId))));
router.post('/admin/foods', ...adm, wrap((req, res) => saveFood(null, req, res)));
router.put('/admin/foods/:id', ...adm, wrap((req, res) => (oid(req.params.id) ? saveFood(oid(req.params.id), req, res) : fail(res, 'Invalid id'))));
router.delete(
  '/admin/foods/:id',
  ...adm,
  wrap(async (req, res) => {
    const id = oid(req.params.id);
    if (!id) return fail(res, 'Invalid id');
    if (await col('meals').findOne({ 'items.food_id': id })) {
      return fail(res, 'Ye food kisi meal me use ho raha hai, pehle wahan se hatao.');
    }
    await col('foods').deleteOne({ _id: id });
    res.json({ ok: true });
  })
);

async function mealBody(b) {
  const m = {
    title: str(b.title, 120),
    slot: b.slot,
    diet_type: b.diet_type,
    skin_friendly: b.skin_friendly ? 1 : 0,
    allergens: str(b.allergens, 200),
    notes: str(b.notes, 500),
    status: b.status,
    source_name: str(b.source_name, 200),
    source_url: str(b.source_url, 500),
    reviewed_by: str(b.reviewed_by, 120),
    items: Array.isArray(b.items) ? b.items.map(i => ({ food_id: oid(i.food_id), grams: num(i.grams) })) : [],
  };
  if (!m.title) return 'Title required';
  if (!SLOTS[m.slot]) return 'Invalid slot';
  if (!['veg', 'nonveg'].includes(m.diet_type)) return 'Veg/Non-veg select karo';
  if (!STATUS.includes(m.status)) return 'Invalid status';
  if (!m.items.length) return 'Kam se kam ek ingredient chahiye';
  if (m.items.some(i => !i.food_id || !(i.grams > 0 && i.grams <= 2000))) return 'Ingredient ya grams invalid';
  const uniq = [...new Set(m.items.map(i => String(i.food_id)))];
  if ((await col('foods').countDocuments({ _id: { $in: m.items.map(i => i.food_id) } })) !== uniq.length) {
    return 'Ingredient ya grams invalid';
  }
  if (m.status === 'published') {
    if (!m.source_name) return 'Publish karne ke liye source (kis doctor/dietitian/book/website se) zaroori hai.';
    if (!m.reviewed_by || PENDING.test(m.reviewed_by)) {
      return 'Publish karne ke liye reviewer ka naam (doctor/dietitian) zaroori hai.';
    }
  }
  return m;
}

async function saveMeal(id, req, res) {
  const m = await mealBody(req.body);
  if (typeof m === 'string') return fail(res, m);
  let mid = id;
  if (id) await col('meals').updateOne({ _id: id }, { $set: m });
  else mid = (await col('meals').insertOne({ ...m, created_at: new Date() })).insertedId;
  const saved = (await loadMeals({ _id: mid }))[0];
  const warn =
    saved && saved.status === 'published' && (saved.kcal < 80 || saved.kcal > 1200)
      ? `Dhyan do: meal ki total calories ${Math.round(saved.kcal)} kcal hain, ye unusual lag rahi hain.`
      : null;
  res.json({ ok: true, warning: warn });
}

router.get('/admin/meals', ...adm, wrap(async (req, res) => res.json(await loadMeals())));
router.post('/admin/meals', ...adm, wrap((req, res) => saveMeal(null, req, res)));
router.put('/admin/meals/:id', ...adm, wrap((req, res) => (oid(req.params.id) ? saveMeal(oid(req.params.id), req, res) : fail(res, 'Invalid id'))));
router.post(
  '/admin/meals/:id/verify',
  ...adm,
  wrap(async (req, res) => {
    const id = oid(req.params.id);
    if (!id) return fail(res, 'Invalid id');
    const existing = await col('meals').findOne({ _id: id });
    if (!existing) return fail(res, 'Meal not found', 404);
    const reviewed_by = str(req.body.reviewed_by, 120);
    const source_name = str(req.body.source_name, 200) || existing.source_name;
    const source_url = req.body.source_url !== undefined ? str(req.body.source_url, 500) : existing.source_url;
    if (!source_name) return fail(res, 'Source zaroori hai.');
    if (!reviewed_by || PENDING.test(reviewed_by)) return fail(res, 'Valid reviewer naam zaroori hai.');
    await col('meals').updateOne({ _id: id }, { $set: { reviewed_by, source_name, source_url, status: 'published' } });
    res.json({ ok: true });
  })
);
router.delete(
  '/admin/meals/:id',
  ...adm,
  wrap(async (req, res) => {
    const id = oid(req.params.id);
    if (!id) return fail(res, 'Invalid id');
    await col('meals').deleteOne({ _id: id });
    res.json({ ok: true });
  })
);

async function saveTip(id, req, res) {
  const t = {
    title: str(req.body.title, 120),
    body: str(req.body.body, 800),
    status: req.body.status,
    source_name: str(req.body.source_name, 200),
    source_url: str(req.body.source_url, 500),
    reviewed_by: str(req.body.reviewed_by, 120),
  };
  if (!t.title || !t.body) return fail(res, 'Title aur body required');
  if (!STATUS.includes(t.status)) return fail(res, 'Invalid status');
  if (t.status === 'published' && (!t.source_name || !t.reviewed_by || PENDING.test(t.reviewed_by))) {
    return fail(res, 'Publish ke liye source aur reviewer naam zaroori hai.');
  }
  if (id) await col('tips').updateOne({ _id: id }, { $set: t });
  else await col('tips').insertOne({ ...t, category: 'skin' });
  res.json({ ok: true });
}

router.get('/admin/tips', ...adm, wrap(async (req, res) => res.json((await col('tips').find().sort({ _id: 1 }).toArray()).map(withId))));
router.post('/admin/tips', ...adm, wrap((req, res) => saveTip(null, req, res)));
router.put('/admin/tips/:id', ...adm, wrap((req, res) => (oid(req.params.id) ? saveTip(oid(req.params.id), req, res) : fail(res, 'Invalid id'))));
router.post(
  '/admin/tips/:id/verify',
  ...adm,
  wrap(async (req, res) => {
    const id = oid(req.params.id);
    if (!id) return fail(res, 'Invalid id');
    const existing = await col('tips').findOne({ _id: id });
    if (!existing) return fail(res, 'Tip not found', 404);
    const reviewed_by = str(req.body.reviewed_by, 120);
    const source_name = str(req.body.source_name, 200) || existing.source_name;
    const source_url = req.body.source_url !== undefined ? str(req.body.source_url, 500) : existing.source_url;
    if (!source_name) return fail(res, 'Source zaroori hai.');
    if (!reviewed_by || PENDING.test(reviewed_by)) return fail(res, 'Valid reviewer naam zaroori hai.');
    await col('tips').updateOne({ _id: id }, { $set: { reviewed_by, source_name, source_url, status: 'published' } });
    res.json({ ok: true });
  })
);
router.delete(
  '/admin/tips/:id',
  ...adm,
  wrap(async (req, res) => {
    const id = oid(req.params.id);
    if (!id) return fail(res, 'Invalid id');
    await col('tips').deleteOne({ _id: id });
    res.json({ ok: true });
  })
);

router.post(
  '/admin/change-password',
  ...adm,
  wrap(async (req, res) => {
    const cur = String(req.body.currentPassword || '');
    const next = String(req.body.newPassword || '');
    if (next.length < 8) return fail(res, 'New password kam se kam 8 characters ka ho.');
    const u = await col('users').findOne({ _id: req.user._id });
    if (!u || !bcrypt.compareSync(cur, u.password_hash)) return fail(res, 'Current password galat hai.', 401);
    await col('users').updateOne({ _id: req.user._id }, { $set: { password_hash: bcrypt.hashSync(next, 10) } });
    res.json({ ok: true });
  })
);

module.exports = router;
