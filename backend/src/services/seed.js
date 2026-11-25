// Starter data so the app works on day 1. Per-100g values are approximate figures from
// USDA FoodData Central / IFCT 2017. They are NOT yet signed off by a dietitian:
// every seeded meal carries reviewed_by = PENDING and shows up in the admin "needs review" list.
const { col } = require('../config/db');

const SRC = 'USDA FoodData Central / IFCT 2017 (approx.)';
const FOODS = [
  // name, kcal, protein, carbs, fat  (per 100 g, as eaten/cooked unless "dry")
  ['Rolled oats (dry)', 379, 13.2, 67.7, 6.5], ['Milk, 2% fat', 50, 3.3, 4.8, 2.0],
  ['Banana', 89, 1.1, 22.8, 0.3], ['Egg, whole (cooked)', 155, 12.6, 1.1, 10.6],
  ['Egg white (cooked)', 52, 10.9, 0.7, 0.2], ['Whole wheat flour / atta (dry)', 340, 13.2, 72, 2.5],
  ['White rice (cooked)', 130, 2.7, 28.2, 0.3], ['Brown rice (cooked)', 123, 2.7, 25.6, 1.0],
  ['Dal / lentils (cooked)', 116, 9.0, 20.1, 0.4], ['Chickpeas (cooked)', 164, 8.9, 27.4, 2.6],
  ['Paneer', 265, 18.3, 1.2, 20.8], ['Curd / plain yogurt', 61, 3.5, 4.7, 3.3],
  ['Chicken breast (cooked, skinless)', 165, 31, 0, 3.6], ['White fish (cooked)', 105, 22.8, 0, 0.9],
  ['Mixed vegetables (boiled)', 65, 3.3, 12.0, 0.5], ['Spinach (raw)', 23, 2.9, 3.6, 0.4],
  ['Cucumber', 15, 0.7, 3.6, 0.1], ['Tomato', 18, 0.9, 3.9, 0.2], ['Almonds', 579, 21.2, 21.6, 49.9],
  ['Walnuts', 654, 15.2, 13.7, 65.2], ['Peanuts', 567, 25.8, 16.1, 49.2], ['Peanut butter', 588, 25, 20, 50],
  ['Cooking oil', 884, 0, 0, 100], ['Ghee', 876, 0.3, 0, 99.5], ['Apple', 52, 0.3, 13.8, 0.2],
  ['Papaya', 43, 0.5, 10.8, 0.3], ['Orange', 47, 0.9, 11.8, 0.1], ['Sweet potato (boiled)', 76, 1.4, 17.7, 0.1],
  ['Whole wheat bread', 247, 13, 41, 3.4], ['Poha / flattened rice (dry)', 346, 6.6, 77.3, 1.2],
  ['Besan / chickpea flour', 387, 22.4, 57.8, 6.7], ['Soya chunks (dry)', 345, 52, 33, 0.5],
  ['Moong sprouts (raw)', 30, 3.0, 5.9, 0.2], ['Makhana / fox nuts (roasted)', 347, 9.7, 76.9, 0.1],
  ['Quinoa (cooked)', 120, 4.4, 21.3, 1.9],
];

// slot, title, diet, skin, allergens, [[food, grams]]
const MEALS = [
  ['breakfast', 'Oats with milk, banana & almonds', 'veg', 1, 'Milk, nuts', [['Rolled oats (dry)', 40], ['Milk, 2% fat', 200], ['Banana', 100], ['Almonds', 10]]],
  ['breakfast', 'Vegetable poha with peanuts', 'veg', 0, 'Peanuts', [['Poha / flattened rice (dry)', 60], ['Mixed vegetables (boiled)', 80], ['Peanuts', 15], ['Cooking oil', 5]]],
  ['breakfast', 'Besan chilla with curd', 'veg', 1, 'Milk', [['Besan / chickpea flour', 50], ['Mixed vegetables (boiled)', 50], ['Cooking oil', 5], ['Curd / plain yogurt', 100]]],
  ['breakfast', 'Egg omelette with toast & tomato', 'nonveg', 0, 'Egg, gluten', [['Egg, whole (cooked)', 150], ['Whole wheat bread', 60], ['Cooking oil', 5], ['Tomato', 50]]],
  ['breakfast', 'Egg-white veggie scramble with roti', 'nonveg', 1, 'Egg, gluten', [['Egg white (cooked)', 150], ['Spinach (raw)', 50], ['Whole wheat flour / atta (dry)', 40], ['Cooking oil', 5]]],
  ['breakfast', 'Paneer sandwich with cucumber', 'veg', 0, 'Milk, gluten', [['Whole wheat bread', 60], ['Paneer', 50], ['Cucumber', 40], ['Tomato', 40]]],

  ['lunch', 'Dal, brown rice, sabzi & salad', 'veg', 1, '', [['Brown rice (cooked)', 150], ['Dal / lentils (cooked)', 150], ['Mixed vegetables (boiled)', 100], ['Cucumber', 80], ['Ghee', 5]]],
  ['lunch', 'Roti, paneer sabzi & curd', 'veg', 0, 'Milk, gluten', [['Whole wheat flour / atta (dry)', 60], ['Paneer', 80], ['Mixed vegetables (boiled)', 100], ['Cooking oil', 5], ['Curd / plain yogurt', 100]]],
  ['lunch', 'Chicken, brown rice & veggies', 'nonveg', 1, '', [['Chicken breast (cooked, skinless)', 150], ['Brown rice (cooked)', 150], ['Mixed vegetables (boiled)', 100], ['Cooking oil', 5], ['Cucumber', 60]]],
  ['lunch', 'Fish, roti & sabzi', 'nonveg', 1, 'Fish, gluten', [['White fish (cooked)', 150], ['Whole wheat flour / atta (dry)', 60], ['Mixed vegetables (boiled)', 100], ['Cooking oil', 5]]],
  ['lunch', 'Chole, rice & salad', 'veg', 0, '', [['Chickpeas (cooked)', 150], ['White rice (cooked)', 150], ['Cucumber', 60], ['Tomato', 50], ['Cooking oil', 5]]],
  ['lunch', 'Soya chunk roti bowl with curd', 'veg', 0, 'Soy, milk, gluten', [['Soya chunks (dry)', 40], ['Whole wheat flour / atta (dry)', 60], ['Mixed vegetables (boiled)', 100], ['Curd / plain yogurt', 100], ['Cooking oil', 5]]],

  ['snack', 'Apple with almonds', 'veg', 1, 'Nuts', [['Apple', 150], ['Almonds', 15]]],
  ['snack', 'Sprouts salad with peanuts', 'veg', 1, 'Peanuts', [['Moong sprouts (raw)', 100], ['Tomato', 50], ['Cucumber', 50], ['Peanuts', 10]]],
  ['snack', 'Curd with papaya & walnuts', 'veg', 1, 'Milk, nuts', [['Curd / plain yogurt', 150], ['Papaya', 150], ['Walnuts', 10]]],
  ['snack', 'Boiled eggs with orange', 'nonveg', 0, 'Egg', [['Egg, whole (cooked)', 100], ['Orange', 100]]],
  ['snack', 'Peanut butter banana toast', 'veg', 0, 'Peanuts, gluten', [['Whole wheat bread', 40], ['Peanut butter', 15], ['Banana', 80]]],
  ['snack', 'Roasted makhana with milk', 'veg', 0, 'Milk', [['Makhana / fox nuts (roasted)', 30], ['Ghee', 3], ['Milk, 2% fat', 150]]],

  ['dinner', 'Roti, dal & sabzi', 'veg', 0, 'Gluten', [['Whole wheat flour / atta (dry)', 60], ['Dal / lentils (cooked)', 150], ['Mixed vegetables (boiled)', 120], ['Cooking oil', 5]]],
  ['dinner', 'Paneer bhurji with roti', 'veg', 0, 'Milk, gluten', [['Paneer', 80], ['Whole wheat flour / atta (dry)', 60], ['Tomato', 60], ['Cooking oil', 5]]],
  ['dinner', 'Grilled chicken, sweet potato & salad', 'nonveg', 1, '', [['Chicken breast (cooked, skinless)', 150], ['Sweet potato (boiled)', 150], ['Cucumber', 80], ['Tomato', 60], ['Cooking oil', 5]]],
  ['dinner', 'Fish, quinoa & spinach', 'nonveg', 1, 'Fish', [['White fish (cooked)', 150], ['Quinoa (cooked)', 150], ['Spinach (raw)', 80], ['Cooking oil', 5]]],
  ['dinner', 'Vegetable khichdi with curd', 'veg', 1, 'Milk', [['White rice (cooked)', 150], ['Dal / lentils (cooked)', 100], ['Mixed vegetables (boiled)', 100], ['Ghee', 5], ['Curd / plain yogurt', 100]]],
  ['dinner', 'Egg curry with roti', 'nonveg', 0, 'Egg, gluten', [['Egg, whole (cooked)', 100], ['Whole wheat flour / atta (dry)', 60], ['Tomato', 80], ['Cooking oil', 7]]],
  ['dinner', 'Soya & veg stir-fry with quinoa', 'veg', 1, 'Soy', [['Soya chunks (dry)', 30], ['Quinoa (cooked)', 150], ['Mixed vegetables (boiled)', 120], ['Cooking oil', 5]]],
];

const TIPS = [
  ['Daily sunscreen', 'Use a broad-spectrum, water-resistant sunscreen of SPF 30 or higher on exposed skin every day, and reapply every 2 hours when outdoors.', 'American Academy of Dermatology (AAD)', 'https://www.aad.org/public/everyday-care/sun-protection/shade-clothing-sunscreen/how-to-apply-sunscreen'],
  ['Eat a variety of whole foods', 'A diet rich in fruits, vegetables, whole grains and adequate protein supports overall health, including skin. No single food "cures" acne or wrinkles.', 'American Academy of Dermatology (AAD)', 'https://www.aad.org/public/diseases/acne/causes/diet'],
  ['Sleep 7+ hours', 'Adults should aim for 7 or more hours of sleep per night on a regular schedule.', 'CDC', 'https://www.cdc.gov/sleep/about/index.html'],
  ['Gentle cleansing', 'Wash your face twice a day and after sweating with a gentle, non-abrasive cleanser and lukewarm water. Avoid scrubbing.', 'American Academy of Dermatology (AAD)', 'https://www.aad.org/public/everyday-care/skin-care-basics/dry/healthy-skin-tips'],
];

async function runSeed() {
  if (await col('foods').countDocuments() > 0) return;
  const r = await col('foods').insertMany(FOODS.map(([name, kcal, protein, carbs, fat]) => ({ name, kcal, protein, carbs, fat, source_name: SRC, source_url: '' })));
  const ids = {};
  FOODS.forEach((f, i) => { ids[f[0]] = r.insertedIds[i]; });
  await col('meals').insertMany(MEALS.map(([slot, title, diet, skin, allergens, items]) => ({
    title, slot, diet_type: diet, skin_friendly: skin, allergens, notes: '', status: 'published', source_name: SRC, source_url: '',
    reviewed_by: 'PENDING EXPERT REVIEW', created_at: new Date(),
    items: items.map(([fn, grams]) => { if (!ids[fn]) throw new Error('Unknown food in seed: ' + fn); return { food_id: ids[fn], grams }; }),
  })));
  await col('tips').insertMany(TIPS.map(([title, body, source_name, source_url]) => ({ title, body, category: 'skin', source_name, source_url, reviewed_by: 'PENDING EXPERT REVIEW', status: 'published' })));
}
module.exports = { runSeed };
