const express = require('express');
const { col } = require('../config/db');
const { auth } = require('../middleware/auth');
const { wrap, fail, num, dateParam } = require('../utils/helpers');

const router = express.Router();

router.put(
  '/steps',
  auth,
  wrap(async (req, res) => {
    const d = dateParam(req, res);
    if (!d) return;
    const n = Math.round(num(req.body.steps));
    if (!Number.isFinite(n) || n < 0 || n > 100000) return fail(res, 'Steps 0 se 100000 ke beech daalo.');
    await col('steps').updateOne({ user_id: req.user._id, date: d }, { $set: { steps: n } }, { upsert: true });
    res.json({ ok: true });
  })
);

router.get(
  '/progress',
  auth,
  wrap(async (req, res) => {
    const from = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
    const uid = req.user._id;
    const [steps, weights] = await Promise.all([
      col('steps').find({ user_id: uid, date: { $gte: from } }).sort({ date: 1 }).project({ _id: 0, date: 1, steps: 1 }).toArray(),
      col('weights').find({ user_id: uid }).sort({ date: -1 }).limit(30).project({ _id: 0, date: 1, kg: 1 }).toArray(),
    ]);
    res.json({ steps, weights: weights.reverse() });
  })
);

module.exports = router;
