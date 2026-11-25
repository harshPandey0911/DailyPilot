const assert = require('assert');
const { computeTargets, validateProfile, rankCandidates, SLOTS } = require('./calc');
const { runSeed } = require('./seed'); const { connect, close, loadMeals } = require('./db');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Known value: Mifflin-St Jeor male 30y 175cm 75kg => 10*75+6.25*175-150+5 = 1698.75
let t = computeTargets({ gender: 'male', age: 30, height_cm: 175, weight_kg: 75, goal: 'fit', activity: 'sedentary' });
assert.strictEqual(t.bmr, 1699); assert.strictEqual(t.tdee, Math.round(1698.75 * 1.2));
// Female BMR: 10*60+6.25*160-5*25-161 = 1314
t = computeTargets({ gender: 'female', age: 25, height_cm: 160, weight_kg: 60, goal: 'lose', activity: 'sedentary' });
assert.strictEqual(t.bmr, 1314); assert(t.calories >= 1200 && t.calories < t.tdee);
// floor
t = computeTargets({ gender: 'female', age: 60, height_cm: 150, weight_kg: 45, goal: 'lose', activity: 'sedentary' });
assert(t.calories >= 1200);
// underweight cannot lose; teen cannot cut
assert(validateProfile({ gender: 'male', age: 25, height_cm: 180, weight_kg: 55, goal: 'lose', activity: 'light', diet_pref: 'veg' }).length);
assert.strictEqual(computeTargets({ gender: 'male', age: 16, height_cm: 170, weight_kg: 60, goal: 'bulk', activity: 'light' }).goal, 'fit');
assert(validateProfile({ gender: 'x' }).length);

// plan accuracy across many profiles
(async () => {
const mongo = await MongoMemoryServer.create(); await connect(mongo.getUri(), 'test');
await runSeed(); const pub = await loadMeals({ status: 'published' });
let worst = 0, n = 0;
for (const gender of ['male', 'female']) for (const w of [45, 60, 75, 95, 120]) for (const goal of ['lose', 'fit', 'bulk'])
for (const diet_pref of ['veg', 'nonveg', 'both']) for (const skin_care of [0, 1]) {
  const p = { gender, age: 28, height_cm: gender === 'male' ? 175 : 162, weight_kg: w, goal, activity: 'moderate', diet_pref, skin_care };
  if (validateProfile(p).length) continue;
  const tg = computeTargets(p); let total = 0;
  for (const [slot, info] of Object.entries(SLOTS)) {
    const c = rankCandidates(p, pub.filter(m => m.slot === slot), tg.calories * info.share);
    assert(c.length, `no meal ${slot}`); total += c[0].kcal;
  }
  const err = Math.abs(total - tg.calories) / tg.calories; worst = Math.max(worst, err); n++;
}
console.log(`plans checked: ${n}, worst daily kcal error: ${(worst * 100).toFixed(1)}%`);
assert(worst < 0.2);
console.log('ALL OK');
await close(); await mongo.stop();
})().catch(e => { console.error(e); process.exit(1); });
