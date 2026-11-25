const { col, loadMeals } = require('../config/db');
const { SLOTS, ACTIVITY, computeTargets, rankCandidates, round } = require('./calc');

const getProfile = uid => col('profiles').findOne({ user_id: uid });
const cleanProfile = p => {
  const { _id, user_id, ...rest } = p;
  return rest;
};

async function profileResponse(uid) {
  const p = await getProfile(uid);
  if (!p || !p.gender) return { profile: null };
  return {
    profile: cleanProfile(p),
    targets: computeTargets(p),
    activityOptions: Object.fromEntries(Object.entries(ACTIVITY).map(([k, v]) => [k, v.label])),
  };
}

async function publishedBySlot() {
  const by = {};
  for (const m of await loadMeals({ status: 'published' })) (by[m.slot] ||= []).push(m);
  return by;
}

function pickSlot(profile, targetCalories, slot, by, uid, date, afterMealId) {
  const cands = rankCandidates(profile, by[slot] || [], targetCalories * SLOTS[slot].share);
  if (!cands.length) return null;
  let i;
  if (afterMealId) {
    const cur = cands.findIndex(c => c.meal.id === afterMealId);
    i = (cur + 1) % cands.length;
  } else {
    i = (Math.floor(Date.parse(date) / 86400000) + parseInt(String(uid).slice(-6), 16)) % cands.length;
  }
  return { meal_id: cands[i].meal.id, factor: cands[i].factor };
}

const scale = (m, f) => ({
  id: m.id,
  title: m.title,
  factor: f,
  allergens: m.allergens,
  notes: m.notes,
  source_name: m.source_name,
  source_url: m.source_url,
  reviewed_by: m.reviewed_by,
  kcal: round(m.kcal * f),
  protein: round(m.protein * f, 1),
  carbs: round(m.carbs * f, 1),
  fat: round(m.fat * f, 1),
  items: m.items.map(i => ({ name: i.name, grams: Math.round(i.grams * f) })),
});

async function getPlan(uid, date, swapSlot, prefetched) {
  const profile = prefetched?.profile || (await getProfile(uid));
  if (!profile || !profile.gender) return null;
  const dayIdx = new Date(date + 'T12:00:00Z').getUTCDay();
  const isVegDay = Array.isArray(profile.veg_days) && profile.veg_days.includes(dayIdx);
  const effProfile = isVegDay ? { ...profile, diet_pref: 'veg' } : profile;
  const targets = computeTargets(effProfile);
  const by = prefetched?.by || (await publishedBySlot());
  const row = await col('plans').findOne({ user_id: uid, date });
  const stored = row ? row.data : {};
  const effCalories = row?.adjusted_kcal || targets.calories;
  let changed = !row;
  const plan = {};
  for (const slot of Object.keys(SLOTS)) {
    let s = stored[slot];
    const meal = s && (by[slot] || []).find(m => m.id === s.meal_id);
    const dietOk = meal && (effProfile.diet_pref !== 'veg' || meal.diet_type === 'veg');
    if (slot === swapSlot) {
      s = pickSlot(effProfile, effCalories, slot, by, uid, date, s && s.meal_id);
      changed = true;
    } else if (!meal || !dietOk) {
      s = pickSlot(effProfile, effCalories, slot, by, uid, date);
      changed = true;
    }
    plan[slot] = s;
  }
  if (changed) await col('plans').updateOne({ user_id: uid, date }, { $set: { data: plan } }, { upsert: true });

  const [checkRows, logRows] = await Promise.all([
    col('checks').find({ user_id: uid, date }).toArray(),
    col('food_logs').find({ user_id: uid, date }).sort({ _id: -1 }).toArray(),
  ]);
  const done = Object.fromEntries(checkRows.map(r => [r.slot, !!r.done]));
  const logs = logRows.map(l => ({
    id: String(l._id),
    title: l.title,
    slot: l.slot || 'extra',
    kcal: round(l.kcal),
    protein: round(l.protein || 0, 1),
    carbs: round(l.carbs || 0, 1),
    fat: round(l.fat || 0, 1),
  }));

  const mealMap = Object.fromEntries(Object.values(by).flat().map(m => [m.id, m]));
  const slots = Object.entries(SLOTS).map(([slot, info]) => {
    const s = plan[slot];
    const slotLogs = logs.filter(l => l.slot === slot);
    return {
      slot,
      label: info.label,
      time: info.time,
      targetKcal: round(effCalories * info.share),
      done: !!done[slot] || slotLogs.length > 0,
      replacedByLog: slotLogs.length > 0,
      meal: s ? scale(mealMap[s.meal_id], s.factor) : null,
    };
  });

  // Calculate eaten & projected totals combining planned meals + custom food logs
  const extraLogs = logs.filter(l => l.slot === 'extra');
  const sumLogs = (arr, k) => arr.reduce((a, l) => a + (l[k] || 0), 0);

  const eatenTotals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const projectedTotals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const plannedTotals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

  for (const s of slots) {
    const slotLogs = logs.filter(l => l.slot === s.slot);
    for (const k of Object.keys(eatenTotals)) {
      if (s.meal) plannedTotals[k] += s.meal[k];
      if (slotLogs.length) {
        const v = sumLogs(slotLogs, k);
        eatenTotals[k] += v;
        projectedTotals[k] += v;
      } else {
        if (s.done && s.meal) eatenTotals[k] += s.meal[k];
        if (s.meal) projectedTotals[k] += s.meal[k];
      }
    }
  }
  for (const k of Object.keys(eatenTotals)) {
    const ext = sumLogs(extraLogs, k);
    eatenTotals[k] += ext;
    projectedTotals[k] += ext;
  }

  for (const obj of [eatenTotals, projectedTotals, plannedTotals]) {
    obj.kcal = round(obj.kcal);
    obj.protein = round(obj.protein, 1);
    obj.carbs = round(obj.carbs, 1);
    obj.fat = round(obj.fat, 1);
  }

  const tips = profile.skin_care
    ? (await col('tips').find({ status: 'published', category: 'skin' }).sort({ _id: 1 }).toArray()).map(
        ({ title, body, source_name, source_url }) => ({ title, body, source_name, source_url })
      )
    : [];

  return {
    date,
    dayIdx,
    isVegDay,
    notifyOn: Array.isArray(profile.notify_days) && profile.notify_days.includes(dayIdx),
    targets,
    adjustedKcal: row?.adjusted_kcal || null,
    adjustmentDelta: row?.adjustment_delta || 0,
    slots,
    logs,
    tips,
    totals: {
      planned: plannedTotals,
      eaten: eatenTotals,
      projected: projectedTotals,
    },
  };
}

async function getWeekPlan(uid, startDate) {
  const profile = await getProfile(uid);
  if (!profile || !profile.gender) return null;
  const by = await publishedBySlot();
  const base = new Date(startDate + 'T12:00:00Z');
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(base.getTime() + i * 86400000).toISOString().slice(0, 10);
    days.push(await getPlan(uid, d, null, { profile, by }));
  }
  return days;
}

async function rebalanceNext6Days(uid, todayDate) {
  const profile = await getProfile(uid);
  if (!profile || !profile.gender) return null;
  const by = await publishedBySlot();
  const todayPlan = await getPlan(uid, todayDate, null, { profile, by });
  const delta = todayPlan.totals.projected.kcal - todayPlan.targets.calories;
  const perDayRaw = -delta / 6;

  const base = new Date(todayDate + 'T12:00:00Z');
  for (let i = 1; i <= 6; i++) {
    const d = new Date(base.getTime() + i * 86400000).toISOString().slice(0, 10);
    const dayIdx = new Date(d + 'T12:00:00Z').getUTCDay();
    const isVegDay = Array.isArray(profile.veg_days) && profile.veg_days.includes(dayIdx);
    const effProfile = isVegDay ? { ...profile, diet_pref: 'veg' } : profile;
    const baseKcal = computeTargets(effProfile).calories;
    const minSafe = Math.max(1200, Math.round(baseKcal * 0.78));
    const maxSafe = Math.round(baseKcal * 1.25);
    const adjKcal = Math.max(minSafe, Math.min(maxSafe, Math.round(baseKcal + perDayRaw)));
    const isNeutral = Math.abs(adjKcal - baseKcal) < 15;
    const effCalories = isNeutral ? baseKcal : adjKcal;

    const newPlan = {};
    for (const slot of Object.keys(SLOTS)) {
      newPlan[slot] = pickSlot(effProfile, effCalories, slot, by, uid, d);
    }
    await col('plans').updateOne(
      { user_id: uid, date: d },
      {
        $set: {
          data: newPlan,
          adjusted_kcal: isNeutral ? null : effCalories,
          adjustment_delta: isNeutral ? 0 : effCalories - baseKcal,
        },
      },
      { upsert: true }
    );
  }

  const week = await getWeekPlan(uid, todayDate);
  return {
    plan: week[0],
    week,
    delta: Math.round(delta),
    perDayAdjust: Math.round(perDayRaw),
  };
}

module.exports = { getProfile, profileResponse, getPlan, getWeekPlan, rebalanceNext6Days };
