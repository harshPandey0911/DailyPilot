const express = require('express');
const { col } = require('../config/db');
const { auth } = require('../middleware/auth');
const { validateProfile } = require('../services/calc');
const { profileResponse } = require('../services/plan.service');
const { wrap, fail, isDate, num, dayDiff, todayStr } = require('../utils/helpers');

const router = express.Router();

router.get('/profile', auth, wrap(async (req, res) => res.json(await profileResponse(req.user._id))));

const cleanDays = arr => (Array.isArray(arr) ? [...new Set(arr.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 6))] : undefined);

router.put(
  '/profile',
  auth,
  wrap(async (req, res) => {
    const b = req.body;
    const p = {
      gender: b.gender,
      age: num(b.age),
      height_cm: num(b.height_cm),
      weight_kg: num(b.weight_kg),
      goal: b.goal,
      activity: b.activity,
      diet_pref: b.diet_pref,
      skin_care: b.skin_care ? 1 : 0,
    };
    const vd = cleanDays(b.veg_days);
    const nd = cleanDays(b.notify_days);
    if (vd) p.veg_days = vd;
    if (nd) p.notify_days = nd;
    const errs = validateProfile(p);
    if (errs.length) return fail(res, errs.join(' '));
    const date = isDate(b.date) && dayDiff(b.date) <= 2 ? b.date : todayStr();
    const uid = req.user._id;
    await col('profiles').updateOne({ user_id: uid }, { $set: { ...p, updated_at: new Date() } }, { upsert: true });
    await col('weights').updateOne({ user_id: uid, date }, { $set: { kg: p.weight_kg } }, { upsert: true });
    // targets changed -> today's & future plans must be rebuilt
    await col('plans').deleteMany({ user_id: uid, date: { $gte: new Date(Date.now() - 86400000).toISOString().slice(0, 10) } });
    res.json(await profileResponse(uid));
  })
);

router.patch(
  '/profile/preferences',
  auth,
  wrap(async (req, res) => {
    const uid = req.user._id;
    const cur = await col('profiles').findOne({ user_id: uid });
    if (!cur) return fail(res, 'Profile not found', 404);
    const patch = { updated_at: new Date() };
    if (['lose', 'fit', 'bulk'].includes(req.body.goal)) patch.goal = req.body.goal;
    if (['veg', 'nonveg', 'both'].includes(req.body.diet_pref)) patch.diet_pref = req.body.diet_pref;
    const vd = cleanDays(req.body.veg_days);
    const nd = cleanDays(req.body.notify_days);
    if (vd) patch.veg_days = vd;
    if (nd) patch.notify_days = nd;
    await col('profiles').updateOne({ user_id: uid }, { $set: patch });
    await col('plans').deleteMany({ user_id: uid, date: { $gte: new Date(Date.now() - 86400000).toISOString().slice(0, 10) } });
    res.json(await profileResponse(uid));
  })
);

module.exports = router;
