const express = require('express');
const { col, oid, withId } = require('../config/db');
const { auth } = require('../middleware/auth');
const { wrap, fail, isDate, num, str, dayDiff, todayStr } = require('../utils/helpers');

const router = express.Router();

const ACTIVITY_TYPES = ['run', 'walk', 'ride', 'hike'];
const MET_BY_TYPE = { run: 9.8, walk: 3.8, ride: 7.5, hike: 6.0 };

function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const h = s1 * s1 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function sanitizePoints(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const p of raw.slice(0, 5000)) {
    const lat = Number(p?.lat);
    const lng = Number(p?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      continue;
    }
    const pt = { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 };
    if (Number.isFinite(Number(p?.alt))) pt.alt = Math.round(Number(p.alt) * 10) / 10;
    if (Number.isFinite(Number(p?.ts))) pt.ts = Number(p.ts);
    out.push(pt);
  }
  return out;
}

function computeDistanceMeters(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineMeters(points[i - 1], points[i]);
  }
  return Math.round(total);
}

function computeElevationGain(points) {
  let gain = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].alt != null && points[i - 1].alt != null && points[i].alt > points[i - 1].alt) {
      gain += points[i].alt - points[i - 1].alt;
    }
  }
  return Math.round(gain);
}

router.get(
  '/activities',
  auth,
  wrap(async (req, res) => {
    const q = { user_id: req.user._id };
    if (req.query.date && isDate(req.query.date)) q.date = req.query.date;
    if (req.query.type && ACTIVITY_TYPES.includes(req.query.type)) q.type = req.query.type;
    const rows = await col('activities').find(q).sort({ _id: -1 }).limit(100).toArray();
    res.json(rows.map(withId));
  })
);

router.post(
  '/activities',
  auth,
  wrap(async (req, res) => {
    const b = req.body || {};
    const type = ACTIVITY_TYPES.includes(b.type) ? b.type : 'run';
    const defaultTitle = { run: 'Outdoor Run', walk: 'Outdoor Walk', ride: 'Outdoor Ride', hike: 'Outdoor Hike' }[type];
    const title = str(b.title, 120) || defaultTitle;
    const date = isDate(b.date) && dayDiff(b.date) <= 7 ? b.date : todayStr();
    const points = sanitizePoints(b.points);
    const duration_sec = Math.max(1, Math.min(86400, Math.round(num(b.duration_sec) || 60)));

    const rawDist = num(b.distance_m);
    const distance_m = rawDist >= 0 && Number.isFinite(rawDist) && b.distance_m !== undefined
      ? Math.min(500000, Math.round(rawDist))
      : computeDistanceMeters(points);

    const avg_pace_sec_km = distance_m >= 10
      ? Math.round(duration_sec / (distance_m / 1000))
      : 0;

    let calories = num(b.calories);
    if (!Number.isFinite(calories) || calories <= 0) {
      const profile = await col('profiles').findOne({ user_id: req.user._id });
      const weightKg = Number(profile?.weight_kg) > 20 ? Number(profile.weight_kg) : 70;
      calories = Math.round((MET_BY_TYPE[type] || 7) * weightKg * (duration_sec / 3600));
    } else {
      calories = Math.min(10000, Math.round(calories));
    }

    const rawElev = num(b.elevation_gain_m);
    const elevation_gain_m = Number.isFinite(rawElev) && rawElev >= 0 && b.elevation_gain_m !== undefined
      ? Math.min(20000, Math.round(rawElev))
      : computeElevationGain(points);

    const doc = {
      user_id: req.user._id,
      date,
      type,
      title,
      duration_sec,
      distance_m,
      avg_pace_sec_km,
      calories,
      elevation_gain_m,
      points,
      started_at: b.started_at ? String(b.started_at).slice(0, 40) : new Date().toISOString(),
      created_at: new Date(),
    };

    const r = await col('activities').insertOne(doc);
    res.json(withId({ ...doc, _id: r.insertedId }));
  })
);

router.delete(
  '/activities/:id',
  auth,
  wrap(async (req, res) => {
    const id = oid(req.params.id);
    if (!id) return fail(res, 'Invalid id');
    const r = await col('activities').deleteOne({ _id: id, user_id: req.user._id });
    if (!r.deletedCount) return fail(res, 'Not found', 404);
    res.json({ ok: true });
  })
);

module.exports = router;
