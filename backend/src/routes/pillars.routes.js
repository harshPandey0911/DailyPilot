const express = require('express');
const { col, oid, withId } = require('../config/db');
const { auth } = require('../middleware/auth');
const { wrap, fail, isDate, num, str, dayDiff, todayStr } = require('../utils/helpers');

const router = express.Router();

const CRUD_PILLARS = [
  {
    path: 'workouts',
    col: 'workouts',
    fields: b => ({
      title: str(b.title, 120),
      category: str(b.category || 'Strength', 40),
      duration_min: Math.max(1, Math.min(600, Math.round(num(b.duration_min) || 30))),
      calories: Math.max(0, Math.min(5000, Math.round(num(b.calories) || 180))),
      done: !!b.done,
    }),
  },
  {
    path: 'study',
    col: 'study_sessions',
    fields: b => ({
      subject: str(b.subject || 'General', 60),
      title: str(b.title || b.topic, 140),
      mode: str(b.mode || 'Pomodoro', 40),
      duration_min: Math.max(1, Math.min(720, Math.round(num(b.duration_min) || 25))),
      done: !!b.done,
    }),
  },
  {
    path: 'goals',
    col: 'goals',
    fields: b => ({
      title: str(b.title, 140),
      category: str(b.category || 'Daily', 40),
      priority: ['low', 'medium', 'high'].includes(b.priority) ? b.priority : 'medium',
      time_label: str(b.time_label || '', 40),
      done: !!b.done,
    }),
  },
];

for (const p of CRUD_PILLARS) {
  router.get(
    `/${p.path}`,
    auth,
    wrap(async (req, res) => {
      const q = { user_id: req.user._id };
      if (req.query.date && isDate(req.query.date)) q.date = req.query.date;
      const rows = await col(p.col).find(q).sort({ _id: -1 }).limit(100).toArray();
      res.json(rows.map(withId));
    })
  );

  router.post(
    `/${p.path}`,
    auth,
    wrap(async (req, res) => {
      const d = isDate(req.body.date) && dayDiff(req.body.date) <= 7 ? req.body.date : todayStr();
      const doc = { user_id: req.user._id, date: d, ...p.fields(req.body), created_at: new Date() };
      if (!doc.title) return fail(res, 'Title required');
      const r = await col(p.col).insertOne(doc);
      res.json(withId({ ...doc, _id: r.insertedId }));
    })
  );

  router.patch(
    `/${p.path}/:id`,
    auth,
    wrap(async (req, res) => {
      const id = oid(req.params.id);
      if (!id) return fail(res, 'Invalid id');
      const patch = {};
      if (req.body.done !== undefined) patch.done = !!req.body.done;
        if (req.body.title !== undefined) {
          const t = str(req.body.title, 140);
          if (!t) return fail(res, 'Title required');
          patch.title = t;
        }
        if (req.body.date !== undefined && isDate(req.body.date) && dayDiff(req.body.date) <= 7) {
          patch.date = req.body.date;
        }
        if (p.path === 'workouts') {
          if (req.body.category !== undefined) patch.category = str(req.body.category || 'Strength', 40);
          if (req.body.duration_min !== undefined) patch.duration_min = Math.max(1, Math.min(600, Math.round(num(req.body.duration_min) || 30)));
          if (req.body.calories !== undefined) patch.calories = Math.max(0, Math.min(5000, Math.round(num(req.body.calories) || 0)));
        } else if (p.path === 'study') {
          if (req.body.subject !== undefined) patch.subject = str(req.body.subject || 'General', 60);
          if (req.body.mode !== undefined) patch.mode = str(req.body.mode || 'Pomodoro', 40);
          if (req.body.duration_min !== undefined) patch.duration_min = Math.max(1, Math.min(720, Math.round(num(req.body.duration_min) || 25)));
        } else if (p.path === 'goals') {
          if (req.body.category !== undefined) patch.category = str(req.body.category || 'Daily', 40);
          if (req.body.priority !== undefined && ['low', 'medium', 'high'].includes(req.body.priority)) patch.priority = req.body.priority;
          if (req.body.time_label !== undefined) patch.time_label = str(req.body.time_label || '', 40);
        }
        const r = await col(p.col).findOneAndUpdate(
          { _id: id, user_id: req.user._id },
          { $set: patch },
          { returnDocument: 'after' }
        );
        if (!r) return fail(res, 'Not found', 404);
        res.json(withId(r));
      })
  );

  router.delete(
    `/${p.path}/:id`,
    auth,
    wrap(async (req, res) => {
      const id = oid(req.params.id);
      if (!id) return fail(res, 'Invalid id');
      await col(p.col).deleteOne({ _id: id, user_id: req.user._id });
      res.json({ ok: true });
    })
  );
}

module.exports = router;
