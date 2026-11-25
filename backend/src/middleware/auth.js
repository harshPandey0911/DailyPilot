const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { col, oid } = require('../config/db');
const { wrap, fail } = require('../utils/helpers');

const SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.JWT_SECRET) console.log('JWT_SECRET not set: logins reset on every restart.');

const sign = u => jwt.sign({ id: String(u._id), role: u.role }, SECRET, { expiresIn: '30d' });
const pub = u => ({ id: String(u._id), name: u.name, email: u.email, role: u.role });

const auth = wrap(async (req, res, next) => {
  let p;
  try {
    p = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), SECRET);
  } catch {
    return fail(res, 'Login again', 401);
  }
  const _id = oid(p.id);
  const u = _id && (await col('users').findOne({ _id }));
  if (!u) return fail(res, 'Login again', 401);
  if (u.disabled) return fail(res, 'Account disabled', 403);
  req.user = { ...pub(u), _id: u._id };
  next();
});

const admin = (req, res, next) => (req.user.role === 'admin' ? next() : fail(res, 'Admin only', 403));
const adm = [auth, admin];

module.exports = { sign, pub, auth, admin, adm };
