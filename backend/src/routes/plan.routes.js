const express = require('express');
const { col, oid } = require('../config/db');
const { auth } = require('../middleware/auth');
const { SLOTS } = require('../services/calc');
const { getPlan, getWeekPlan, rebalanceNext6Days } = require('../services/plan.service');
const { wrap, fail, dateParam, str, num } = require('../utils/helpers');

const router = express.Router();

router.get(
  '/plan/week',
  auth,
  wrap(async (req, res) => {
    const d = dateParam(req, res);
    if (!d) return;
    const week = await getWeekPlan(req.user._id, d);
    week ? res.json({ week }) : fail(res, 'Pehle profile complete karo.', 409);
  })
);

router.get(
  '/plan',
  auth,
  wrap(async (req, res) => {
    const d = dateParam(req, res);
    if (!d) return;
    const plan = await getPlan(req.user._id, d);
    plan ? res.json(plan) : fail(res, 'Pehle profile complete karo.', 409);
  })
);

router.post(
  '/plan/check',
  auth,
  wrap(async (req, res) => {
    const d = dateParam(req, res);
    if (!d) return;
    if (!SLOTS[req.body.slot]) return fail(res, 'Invalid slot');
    await col('checks').updateOne(
      { user_id: req.user._id, date: d, slot: req.body.slot },
      { $set: { done: req.body.done ? 1 : 0 } },
      { upsert: true }
    );
    res.json(await getPlan(req.user._id, d));
  })
);

router.post(
  '/plan/swap',
  auth,
  wrap(async (req, res) => {
    const d = dateParam(req, res);
    if (!d) return;
    if (!SLOTS[req.body.slot]) return fail(res, 'Invalid slot');
    await col('checks').deleteOne({ user_id: req.user._id, date: d, slot: req.body.slot });
    res.json(await getPlan(req.user._id, d, req.body.slot));
  })
);

router.post(
  '/plan/log',
  auth,
  wrap(async (req, res) => {
    const d = dateParam(req, res);
    if (!d) return;
    const title = str(req.body.title, 120);
    const slot = req.body.slot === 'extra' || SLOTS[req.body.slot] ? req.body.slot : 'extra';
    const kcal = num(req.body.kcal);
    const protein = Math.max(0, num(req.body.protein) || 0);
    const carbs = Math.max(0, num(req.body.carbs) || 0);
    const fat = Math.max(0, num(req.body.fat) || 0);
    if (!title) return fail(res, 'Food name required');
    if (!Number.isFinite(kcal) || kcal < 0 || kcal > 5000) return fail(res, 'Valid calories (0-5000) required');
    await col('food_logs').insertOne({
      user_id: req.user._id,
      date: d,
      title,
      slot,
      kcal,
      protein,
      carbs,
      fat,
      created_at: new Date(),
    });
    const out = await rebalanceNext6Days(req.user._id, d);
    out ? res.json(out) : fail(res, 'Pehle profile complete karo.', 409);
  })
);

router.delete(
  '/plan/log/:id',
  auth,
  wrap(async (req, res) => {
    const id = oid(req.params.id);
    if (!id) return fail(res, 'Invalid id');
    const doc = await col('food_logs').findOne({ _id: id, user_id: req.user._id });
    if (!doc) return fail(res, 'Not found', 404);
    await col('food_logs').deleteOne({ _id: id, user_id: req.user._id });
    const out = await rebalanceNext6Days(req.user._id, doc.date);
    res.json(out || { ok: true });
  })
);

module.exports = router;
