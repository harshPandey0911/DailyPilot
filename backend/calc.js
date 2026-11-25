// Nutrition maths. Formulas are standard & published:
//  - BMR: Mifflin-St Jeor (1990), recommended by the Academy of Nutrition and Dietetics
//  - TDEE: BMR x activity factor
//  - Protein g/kg ranges: ISSN position stand / ACSM
//  - Calorie floors 1200 (F) / 1500 (M): common clinical minimum for unsupervised dieting
//  - BMI categories: WHO
const ACTIVITY = {
  sedentary: { f: 1.2, label: 'Mostly sitting (desk job, little exercise)' },
  light: { f: 1.375, label: 'Light (exercise 1-3 days/week)' },
  moderate: { f: 1.55, label: 'Moderate (exercise 3-5 days/week)' },
  active: { f: 1.725, label: 'Very active (exercise 6-7 days/week)' },
};
const GOALS = ['lose', 'fit', 'bulk'];
const SLOTS = {
  breakfast: { label: 'Breakfast', time: 'Morning', share: 0.25 },
  lunch: { label: 'Lunch', time: 'Afternoon', share: 0.35 },
  snack: { label: 'Evening Snack', time: 'Evening', share: 0.10 },
  dinner: { label: 'Dinner', time: 'Night', share: 0.30 },
};

const round = (n, d = 0) => Math.round(n * 10 ** d) / 10 ** d;

function validateProfile(p) {
  const e = [];
  if (!['male', 'female'].includes(p.gender)) e.push('Gender select karo.');
  if (!Number.isFinite(p.age) || p.age < 13 || p.age > 80) e.push('Age 13 se 80 ke beech honi chahiye.');
  if (!Number.isFinite(p.height_cm) || p.height_cm < 120 || p.height_cm > 230) e.push('Height 120-230 cm ke beech honi chahiye.');
  if (!Number.isFinite(p.weight_kg) || p.weight_kg < 30 || p.weight_kg > 250) e.push('Weight 30-250 kg ke beech honi chahiye.');
  if (!GOALS.includes(p.goal)) e.push('Goal select karo.');
  if (!ACTIVITY[p.activity]) e.push('Activity level select karo.');
  if (!['veg', 'nonveg', 'both'].includes(p.diet_pref)) e.push('Diet type select karo (veg / non-veg / dono).');
  if (e.length) return e;
  const bmi = p.weight_kg / (p.height_cm / 100) ** 2;
  if (p.goal === 'lose' && bmi < 18.5)
    e.push('Aapka BMI already underweight range (<18.5) me hai. Weight-loss plan safe nahi hai. "Fit" ya "Bulk" choose karo ya doctor se milo.');
  return e;
}

function bmiCategory(b) {
  if (b < 18.5) return 'Underweight';
  if (b < 25) return 'Normal';
  if (b < 30) return 'Overweight';
  return 'Obese';
}

function computeTargets(p) {
  const warnings = [];
  const bmr = 10 * p.weight_kg + 6.25 * p.height_cm - 5 * p.age + (p.gender === 'male' ? 5 : -161);
  const tdee = bmr * ACTIVITY[p.activity].f;
  const bmi = p.weight_kg / (p.height_cm / 100) ** 2;
  let goal = p.goal;
  let calories = tdee;

  if (p.age < 18 && goal !== 'fit') {
    warnings.push('18 saal se kam age me calorie deficit/surplus nahi diya jata. Maintenance calories dikhayi gayi hain. Weight goal ke liye doctor/dietitian se milo.');
    goal = 'fit';
  }
  if (goal === 'lose') {
    const deficit = Math.min(tdee * 0.2, 750);
    const floor = p.gender === 'male' ? 1500 : 1200;
    calories = Math.max(tdee - deficit, floor);
    if (calories === floor && tdee - deficit < floor) warnings.push(`Safety ke liye calories minimum ${floor} kcal pe rokhi gayi hain.`);
    if (bmi < 23) warnings.push('Aapka BMI normal range me hai, fat-loss slow aur chhota rakhna better hai. Doctor se salah lo.');
  } else if (goal === 'bulk') {
    calories = tdee + Math.max(250, Math.min(tdee * 0.1, 500));
    if (bmi >= 30) warnings.push('BMI 30+ pe bulking ki jagah "Fit" goal behtar hota hai. Doctor se salah lo.');
  }

  const protPerKg = goal === 'lose' ? 2.0 : goal === 'bulk' ? 1.8 : 1.6;
  const protein = protPerKg * p.weight_kg;
  const fat = (calories * 0.25) / 9;
  const carbs = Math.max((calories - protein * 4 - fat * 9) / 4, 0);

  return {
    bmr: round(bmr), tdee: round(tdee), calories: round(calories),
    protein: round(protein), carbs: round(carbs), fat: round(fat),
    bmi: round(bmi, 1), bmiCategory: bmiCategory(bmi), goal,
    stepsGoal: goal === 'lose' ? 10000 : 8000,
    waterL: round(p.weight_kg * 0.033, 1),
    warnings,
  };
}

const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

// meals: published meals of one slot, each with .kcal. Returns ranked candidates [{meal, factor, kcal}]
function rankCandidates(profile, meals, target) {
  let pool = meals.filter(m => (profile.diet_pref === 'veg' ? m.diet_type === 'veg' : true));
  if (profile.skin_care) {
    const skin = pool.filter(m => m.skin_friendly);
    if (skin.length >= 2) pool = skin;
  }
  const scored = pool.filter(m => m.kcal > 0).map(m => {
    const factor = clamp(Math.round((target / m.kcal) * 4) / 4, 0.5, 2);
    const kcal = m.kcal * factor;
    return { meal: m, factor, kcal, err: Math.abs(kcal - target) / target };
  }).sort((a, b) => a.err - b.err || String(a.meal.id).localeCompare(String(b.meal.id)));
  const good = scored.filter(s => s.err <= 0.15);
  return good.length ? good : scored.slice(0, 3);
}

module.exports = { ACTIVITY, GOALS, SLOTS, validateProfile, computeTargets, rankCandidates, round };
