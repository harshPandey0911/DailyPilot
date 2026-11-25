const express = require('express');
const bcrypt = require('bcryptjs');
const { col } = require('../config/db');
const { sign, pub, auth } = require('../middleware/auth');
const { validateProfile } = require('../services/calc');
const { wrap, fail, str, num, todayStr } = require('../utils/helpers');

const router = express.Router();

router.post(
  '/auth/register',
  wrap(async (req, res) => {
    const name = str(req.body.name, 60);
    const email = str(req.body.email, 120).toLowerCase();
    const pw = String(req.body.password || '');
    if (!name) return fail(res, 'Naam daalo.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return fail(res, 'Sahi email daalo.');
    if (pw.length < 8) return fail(res, 'Password kam se kam 8 characters ka ho.');
    let r;
    try {
      r = await col('users').insertOne({
        name,
        email,
        password_hash: bcrypt.hashSync(pw, 10),
        role: 'user',
        created_at: new Date(),
      });
    } catch (e) {
      if (e.code === 11000) return fail(res, 'Ye email already registered hai.');
      throw e;
    }
    const u = { _id: r.insertedId, name, email, role: 'user' };
    if (req.body.age && req.body.height_cm && req.body.weight_kg) {
      const p = {
        gender: req.body.gender || 'male',
        age: num(req.body.age),
        height_cm: num(req.body.height_cm),
        weight_kg: num(req.body.weight_kg),
        goal: req.body.goal || 'fit',
        activity: req.body.activity || 'moderate',
        diet_pref: req.body.diet_pref || 'both',
        skin_care: req.body.skin_care ? 1 : 0,
        veg_days: [],
        notify_days: [],
      };
      const errs = validateProfile(p);
      if (errs.length) {
        await col('users').deleteOne({ _id: r.insertedId });
        return fail(res, errs.join(' '));
      }
      await col('profiles').insertOne({ user_id: r.insertedId, ...p, updated_at: new Date() });
      await col('weights').insertOne({ user_id: r.insertedId, date: todayStr(), kg: p.weight_kg });
    }
    res.json({ token: sign(u), user: pub(u) });
  })
);

router.post(
  '/auth/login',
  wrap(async (req, res) => {
    const u = await col('users').findOne({ email: str(req.body.email, 120).toLowerCase() });
    if (!u || !bcrypt.compareSync(String(req.body.password || ''), u.password_hash)) {
      return fail(res, 'Email ya password galat hai.', 401);
    }
    res.json({ token: sign(u), user: pub(u) });
  })
);

router.get('/me', auth, wrap(async (req, res) => res.json({ user: pub(req.user) })));

module.exports = router;
