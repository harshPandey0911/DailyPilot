const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

// Load backend/.env (Node 20.12+ built-in, no dotenv needed). Real env vars win.
try { process.loadEnvFile(path.join(__dirname, '.env')); } catch { /* no .env file */ }

let client, database;
const col = name => database.collection(name);
const oid = v => { try { return ObjectId.isValid(v) && String(new ObjectId(v)) === String(v) ? new ObjectId(v) : null; } catch { return null; } };
const withId = d => (d ? { ...d, id: String(d._id) } : d);

async function connect(uri = process.env.MONGODB_URI, dbName = process.env.DB_NAME || 'dailypilot') {
  if (!uri) throw new Error('MONGODB_URI backend/.env me set karo.');
  if (uri.includes('<db_password>')) throw new Error('backend/.env me <db_password> ki jagah apna asli MongoDB password daalo.');
  client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  await client.connect();
  database = client.db(dbName);
  await Promise.all([
    col('users').createIndex({ email: 1 }, { unique: true }),
    col('foods').createIndex({ name: 1 }, { unique: true }),
    col('profiles').createIndex({ user_id: 1 }, { unique: true }),
    col('plans').createIndex({ user_id: 1, date: 1 }, { unique: true }),
    col('checks').createIndex({ user_id: 1, date: 1, slot: 1 }, { unique: true }),
    col('steps').createIndex({ user_id: 1, date: 1 }, { unique: true }),
    col('weights').createIndex({ user_id: 1, date: 1 }, { unique: true }),
    col('meals').createIndex({ status: 1, slot: 1 }),
  ]);
}
const close = () => client && client.close();

// Meal with items + totals computed from foods (single source of truth => no hand-typed calorie errors).
async function loadMeals(filter = {}) {
  const [meals, foods] = await Promise.all([col('meals').find(filter).sort({ _id: 1 }).toArray(), col('foods').find().toArray()]);
  const fm = new Map(foods.map(f => [String(f._id), f]));
  return meals.map(m => {
    const items = (m.items || []).filter(i => fm.has(String(i.food_id))).map(i => {
      const f = fm.get(String(i.food_id));
      return { food_id: String(i.food_id), grams: i.grams, name: f.name, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat };
    });
    const t = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    for (const i of items) for (const k of Object.keys(t)) t[k] += (i[k] * i.grams) / 100;
    return { ...m, id: String(m._id), items, ...t };
  });
}

async function seedAdmin() {
  if (await col('users').findOne({ role: 'admin' })) return;
  const email = (process.env.ADMIN_EMAIL || 'admin@dailypilot.local').toLowerCase();
  const pw = process.env.ADMIN_PASSWORD || 'Admin@12345';
  await col('users').insertOne({ name: 'Admin', email, password_hash: bcrypt.hashSync(pw, 10), role: 'admin', created_at: new Date() });
  console.log(`Admin created: ${email} / ${process.env.ADMIN_PASSWORD ? '(from env)' : pw}  <- change this!`);
}

module.exports = { connect, close, col, oid, withId, loadMeals, seedAdmin, ObjectId };
