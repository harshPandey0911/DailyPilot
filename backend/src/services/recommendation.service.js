const { col, loadMeals } = require('../config/db');
const { SLOTS, ACTIVITY, computeTargets, rankCandidates, round } = require('./calc');
const { todayStr } = require('../utils/helpers');

const ACTIVITY_DURATION_MULT = {
  sedentary: 0.75,
  light: 0.9,
  moderate: 1.0,
  active: 1.15,
};

// Base workout templates scored and scaled dynamically per user profile (weight, age, BMI, activity, goal).
const WORKOUT_CATALOG = [
  {
    id: 'brisk_walk_cardio',
    title: 'Brisk Walk / Zone-2 Cardio',
    category: 'Cardio',
    baseDuration: 35,
    met: 4.3,
    intensity: 'low',
    jointFriendly: true,
    goals: ['lose', 'fit'],
  },
  {
    id: 'cycling_endurance',
    title: 'Low-Impact Cycling / Elliptical',
    category: 'Cardio',
    baseDuration: 30,
    met: 6.8,
    intensity: 'moderate',
    jointFriendly: true,
    goals: ['lose', 'fit'],
  },
  {
    id: 'tempo_run',
    title: 'Tempo Run / Jogging',
    category: 'Cardio',
    baseDuration: 28,
    met: 8.3,
    intensity: 'high',
    jointFriendly: false,
    goals: ['lose', 'fit'],
  },
  {
    id: 'hiit_fat_burn',
    title: 'HIIT Metabolic Intervals',
    category: 'HIIT',
    baseDuration: 20,
    met: 8.5,
    intensity: 'high',
    jointFriendly: false,
    goals: ['lose', 'fit'],
  },
  {
    id: 'low_impact_circuits',
    title: 'Low-Impact Metabolic Circuit',
    category: 'HIIT',
    baseDuration: 22,
    met: 6.0,
    intensity: 'moderate',
    jointFriendly: true,
    goals: ['lose', 'fit'],
  },
  {
    id: 'full_body_strength',
    title: 'Full-Body Compound Strength',
    category: 'Strength',
    baseDuration: 40,
    met: 5.5,
    intensity: 'moderate',
    jointFriendly: true,
    goals: ['fit', 'bulk', 'lose'],
  },
  {
    id: 'upper_hypertrophy',
    title: 'Upper Body Hypertrophy',
    category: 'Strength',
    baseDuration: 45,
    met: 5.8,
    intensity: 'high',
    jointFriendly: true,
    goals: ['bulk', 'fit'],
  },
  {
    id: 'lower_strength',
    title: 'Lower Body Strength & Glutes',
    category: 'Strength',
    baseDuration: 45,
    met: 6.0,
    intensity: 'high',
    jointFriendly: true,
    goals: ['bulk', 'fit'],
  },
  {
    id: 'core_mobility',
    title: 'Core & Joint Mobility Flow',
    category: 'Mobility',
    baseDuration: 15,
    met: 3.0,
    intensity: 'low',
    jointFriendly: true,
    goals: ['lose', 'fit', 'bulk'],
  },
  {
    id: 'active_recovery_stretch',
    title: 'Active Recovery & Stretching',
    category: 'Mobility',
    baseDuration: 20,
    met: 2.8,
    intensity: 'low',
    jointFriendly: true,
    goals: ['lose', 'fit', 'bulk'],
  },
];

function computeEffectiveProfile(profile, date) {
  const dayIdx = new Date(`${date}T12:00:00Z`).getUTCDay();
  const isVegDay = Array.isArray(profile.veg_days) && profile.veg_days.includes(dayIdx);
  const effProfile = isVegDay ? { ...profile, diet_pref: 'veg' } : profile;
  return { dayIdx, isVegDay, effProfile };
}

function workoutDuration(tpl, profile, targets) {
  const actMult = ACTIVITY_DURATION_MULT[profile.activity] || 1.0;
  let ageMult = 1.0;
  if (profile.age >= 55) ageMult = 0.85;
  else if (profile.age < 18) ageMult = 0.85;

  const goalMult = targets.goal === 'bulk' && tpl.category === 'Cardio' ? 0.8 : 1.0;
  const raw = tpl.baseDuration * actMult * ageMult * goalMult;
  return Math.max(10, Math.min(75, Math.round(raw / 5) * 5));
}

function recommendWorkouts(profile, targets, todayWorkouts, recentWorkouts) {
  const needsJointCare = targets.bmi >= 30 || profile.age >= 55;
  const isBeginner = profile.activity === 'sedentary' || profile.activity === 'light';
  const todayTitles = new Set(todayWorkouts.map(w => String(w.title || '').toLowerCase()));
  const recentCounts = new Map();
  for (const w of recentWorkouts) {
    const key = String(w.title || '').toLowerCase();
    recentCounts.set(key, (recentCounts.get(key) || 0) + 1);
  }
  const doneIntensityToday = todayWorkouts.filter(w => w.done).length;

  const scored = WORKOUT_CATALOG.map(tpl => {
    let score = 50;
    const reasons = [];

    if (tpl.goals[0] === targets.goal) {
      score += 28;
      reasons.push(`Aligned with your ${targets.goal} goal`);
    } else if (tpl.goals.includes(targets.goal)) {
      score += 14;
      reasons.push(`Supports your ${targets.goal} target`);
    } else {
      score -= 20;
    }

    if (needsJointCare) {
      if (tpl.jointFriendly) {
        score += 18;
        reasons.push(targets.bmi >= 30 ? `Joint-friendly for BMI ${targets.bmi}` : `Joint-friendly for age ${profile.age}`);
      } else {
        score -= 40;
      }
    }

    if (isBeginner && tpl.intensity === 'high') {
      score -= 18;
    } else if (!isBeginner && targets.goal !== 'fit' && tpl.intensity === 'high') {
      score += 8;
    }

    if (doneIntensityToday > 0 && tpl.category === 'Mobility') {
      score += 16;
      reasons.push('Great recovery after today’s session');
    }

    const key = tpl.title.toLowerCase();
    if (todayTitles.has(key)) {
      score -= 35;
    } else if (recentCounts.has(key)) {
      score -= Math.min(15, recentCounts.get(key) * 5);
    }

    const duration_min = workoutDuration(tpl, profile, targets);
    // Standard MET formula: kcal/min = MET * 3.5 * weight_kg / 200
    const calories = Math.max(25, round(((tpl.met * 3.5 * profile.weight_kg) / 200) * duration_min));

    return {
      id: tpl.id,
      title: tpl.title,
      category: tpl.category,
      intensity: tpl.intensity,
      jointFriendly: tpl.jointFriendly,
      duration_min,
      calories,
      score: round(score, 1),
      reason: reasons[0] || `Scaled for ${profile.weight_kg} kg & ${profile.activity} activity`,
    };
  });

  return scored.sort((a, b) => b.score - a.score || b.calories - a.calories).slice(0, 4);
}

function scoreMealCandidate(cand, targets, effProfile) {
  const { meal, kcal, err } = cand;
  let score = (1 - Math.min(err, 1)) * 60;
  const reasons = [`Matches ~${round(kcal)} kcal slot target`];

  const protDensity = kcal > 0 ? (meal.protein * cand.factor * 4) / kcal : 0;
  if ((targets.goal === 'lose' || targets.goal === 'bulk') && protDensity >= 0.24) {
    score += 18;
    reasons.push('High protein density');
  } else if (protDensity >= 0.18) {
    score += 8;
  }

  if (effProfile.skin_care && meal.skin_friendly) {
    score += 12;
    reasons.push('Skin-friendly pick');
  }

  return {
    id: meal.id,
    title: meal.title,
    factor: cand.factor,
    kcal: round(meal.kcal * cand.factor),
    protein: round(meal.protein * cand.factor, 1),
    carbs: round(meal.carbs * cand.factor, 1),
    fat: round(meal.fat * cand.factor, 1),
    diet_type: meal.diet_type,
    skin_friendly: !!meal.skin_friendly,
    score: round(score, 1),
    reason: reasons.join(' · '),
  };
}

function recommendMeals(effProfile, targets, mealsBySlot, remainingRatio = 1) {
  const result = {};
  for (const [slot, info] of Object.entries(SLOTS)) {
    const slotTarget = targets.calories * info.share * remainingRatio;
    const cands = rankCandidates(effProfile, mealsBySlot[slot] || [], slotTarget);
    const ranked = cands
      .map(c => scoreMealCandidate(c, targets, effProfile))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    result[slot] = {
      slot,
      label: info.label,
      time: info.time,
      targetKcal: round(slotTarget),
      items: ranked,
    };
  }
  return result;
}

function buildHabitsAndInsights(profile, effProfile, targets, context) {
  const { todaySteps, workoutsBurned, isVegDay, dbTips } = context;
  const extraWater = round(workoutsBurned > 250 ? 0.4 : profile.activity === 'active' ? 0.3 : 0, 1);
  const recommendedWaterL = round(targets.waterL + extraWater, 1);
  const stepsRemaining = Math.max(0, targets.stepsGoal - todaySteps);

  const habits = [
    {
      id: 'hydration',
      title: `Drink ${recommendedWaterL} L water today`,
      target: recommendedWaterL,
      unit: 'L',
      reason: extraWater > 0
        ? `Base ${targets.waterL} L for ${profile.weight_kg} kg + ${extraWater} L for training`
        : `Calculated at 33 ml/kg for your ${profile.weight_kg} kg body weight`,
    },
    {
      id: 'steps',
      title: stepsRemaining > 0 ? `${stepsRemaining.toLocaleString()} steps left to hit ${targets.stepsGoal.toLocaleString()}` : `Daily ${targets.stepsGoal.toLocaleString()} step goal reached`,
      target: targets.stepsGoal,
      current: todaySteps,
      unit: 'steps',
      reason: targets.goal === 'lose' ? 'Higher step target to boost fat-loss NEAT' : 'Daily movement target for cardiovascular health',
    },
    {
      id: 'protein',
      title: `Aim for ${targets.protein}g protein across meals`,
      target: targets.protein,
      unit: 'g',
      reason: `${targets.goal === 'lose' ? '2.0' : targets.goal === 'bulk' ? '1.8' : '1.6'} g/kg based on your ${targets.goal} goal`,
    },
  ];

  const insights = [];
  if (isVegDay && profile.diet_pref !== 'veg') {
    insights.push({
      title: 'Veg-Only Day Active',
      body: `Today is configured as a vegetarian day in your schedule. Meal recommendations are filtered to veg options around ${targets.calories} kcal.`,
      category: 'diet',
    });
  }

  insights.push({
    title: `${targets.goal === 'lose' ? 'Fat-Loss' : targets.goal === 'bulk' ? 'Lean Bulk' : 'Maintenance'} Plan · ${targets.calories} kcal`,
    body: `Based on your ${profile.age}y, ${profile.height_cm}cm, ${profile.weight_kg}kg profile (BMI ${targets.bmi} · ${targets.bmiCategory}) and ${ACTIVITY[profile.activity]?.label || profile.activity}, target ${targets.protein}g protein, ${targets.carbs}g carbs, and ${targets.fat}g fat.`,
    category: 'nutrition',
  });

  for (const w of targets.warnings || []) {
    insights.push({ title: 'Safety Guidance', body: w, category: 'safety' });
  }

  if (profile.skin_care && dbTips.length) {
    for (const t of dbTips.slice(0, 2)) {
      insights.push({ title: t.title, body: t.body, category: 'skin' });
    }
  }

  return { habits, insights };
}

/**
 * Computes dynamic, profile-driven recommendations for a user on a given date.
 * Returns null if the user has not completed their profile.
 */
async function getRecommendations(uid, date = todayStr()) {
  const profile = await col('profiles').findOne({ user_id: uid });
  if (!profile || !profile.gender) return null;

  const { dayIdx, isVegDay, effProfile } = computeEffectiveProfile(profile, date);
  const targets = computeTargets(effProfile);
  const weekAgo = new Date(Date.parse(`${date}T12:00:00Z`) - 6 * 86400000).toISOString().slice(0, 10);

  const [meals, todayWorkouts, recentWorkouts, stepRow, dbTips] = await Promise.all([
    loadMeals({ status: 'published' }),
    col('workouts').find({ user_id: uid, date }).toArray(),
    col('workouts').find({ user_id: uid, date: { $gte: weekAgo, $lte: date } }).toArray(),
    col('steps').findOne({ user_id: uid, date }),
    profile.skin_care
      ? col('tips').find({ status: 'published', category: 'skin' }).sort({ _id: 1 }).toArray()
      : Promise.resolve([]),
  ]);

  const mealsBySlot = {};
  for (const m of meals) (mealsBySlot[m.slot] ||= []).push(m);

  const workouts = recommendWorkouts(effProfile, targets, todayWorkouts, recentWorkouts);
  const mealRecs = recommendMeals(effProfile, targets, mealsBySlot);
  const workoutsBurned = todayWorkouts.filter(w => w.done).reduce((a, b) => a + (b.calories || 0), 0);
  const todaySteps = stepRow?.steps || 0;
  const { habits, insights } = buildHabitsAndInsights(profile, effProfile, targets, {
    todaySteps,
    workoutsBurned,
    isVegDay,
    dbTips,
  });

  return {
    date,
    dayIdx,
    isVegDay,
    profileSummary: {
      age: profile.age,
      gender: profile.gender,
      height_cm: profile.height_cm,
      weight_kg: profile.weight_kg,
      activity: profile.activity,
      goal: targets.goal,
      requestedGoal: profile.goal,
      diet_pref: effProfile.diet_pref,
      skin_care: !!profile.skin_care,
      bmi: targets.bmi,
      bmiCategory: targets.bmiCategory,
    },
    targets,
    workouts,
    meals: mealRecs,
    habits,
    insights,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { getRecommendations, recommendWorkouts, recommendMeals };
