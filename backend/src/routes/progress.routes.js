const express = require('express');
const { col } = require('../config/db');
const { auth } = require('../middleware/auth');
const { wrap, fail, num, dateParam, isDate, todayStr } = require('../utils/helpers');

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

router.put(
  '/water',
  auth,
  wrap(async (req, res) => {
    const d = dateParam(req, res);
    if (!d) return;
    const ml = Math.round(num(req.body.ml));
    if (!Number.isFinite(ml) || ml < 0 || ml > 20000) return fail(res, 'Water 0 se 20000 ml ke beech daalo.');
    await col('water').updateOne({ user_id: req.user._id, date: d }, { $set: { ml } }, { upsert: true });
    res.json({ ok: true, date: d, ml });
  })
);

router.get(
  '/progress',
  auth,
  wrap(async (req, res) => {
    const refDate = req.query.date && isDate(req.query.date) ? req.query.date : todayStr();
    const refMs = Date.parse(refDate + 'T12:00:00Z');
    const from7 = new Date(refMs - 6 * 86400000).toISOString().slice(0, 10);

    // Compute Mon..Sun of the week containing refDate
    const monOffset = (new Date(refMs).getUTCDay() + 6) % 7;
    const monMs = refMs - monOffset * 86400000;
    const weekDates = Array.from({ length: 7 }, (_, i) => new Date(monMs + i * 86400000).toISOString().slice(0, 10));
    const weekStart = weekDates[0];
    const weekEnd = weekDates[6];

    const uid = req.user._id;
    const [steps, water, weights, workouts, study, goals] = await Promise.all([
        col('steps').find({ user_id: uid, date: { $gte: from7, $lte: refDate } }).sort({ date: 1 }).project({ _id: 0, date: 1, steps: 1 }).toArray(),
        col('water').find({ user_id: uid, date: { $gte: from7, $lte: refDate } }).sort({ date: 1 }).project({ _id: 0, date: 1, ml: 1 }).toArray(),
        col('weights').find({ user_id: uid }).sort({ date: -1 }).limit(30).project({ _id: 0, date: 1, kg: 1 }).toArray(),
        col('workouts').find({ user_id: uid, date: { $gte: weekStart, $lte: weekEnd } }).project({ _id: 0, date: 1, done: 1 }).toArray(),
        col('study_sessions').find({ user_id: uid, date: { $gte: weekStart, $lte: weekEnd } }).project({ _id: 0, date: 1, done: 1 }).toArray(),
        col('goals').find({ user_id: uid, date: { $gte: weekStart, $lte: weekEnd } }).project({ _id: 0, date: 1, done: 1 }).toArray(),
      ]);

    const byDate = {};
    for (const d of weekDates) byDate[d] = { done: 0, total: 0 };
    for (const item of [...workouts, ...study, ...goals]) {
      if (byDate[item.date]) {
        byDate[item.date].total += 1;
        if (item.done) byDate[item.date].done += 1;
      }
    }
    const weekly = weekDates.map(d => {
      const { done, total } = byDate[d];
      return { date: d, done, total, pct: total ? Math.round((done / total) * 100) : 0 };
    });

    res.json({ steps, water, weights: weights.reverse(), weekly });
  })
);

module.exports = router;
