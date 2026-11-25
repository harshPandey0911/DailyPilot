const express = require('express');
const { auth } = require('../middleware/auth');
const { getRecommendations } = require('../services/recommendation.service');
const { wrap, fail, isDate, dayDiff, todayStr } = require('../utils/helpers');

const router = express.Router();

router.get(
  '/recommendations',
  auth,
  wrap(async (req, res) => {
    const raw = req.query.date;
    const d = raw ? (isDate(raw) && dayDiff(raw) <= 2 ? raw : null) : todayStr();
    if (!d) return fail(res, 'Invalid date');
    const recs = await getRecommendations(req.user._id, d);
    recs ? res.json(recs) : fail(res, 'Pehle profile complete karo.', 409);
  })
);

module.exports = router;
