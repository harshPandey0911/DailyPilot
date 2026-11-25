const wrap = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(e => {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  });

const fail = (res, msg, code = 400) => res.status(code).json({ error: msg });
const isDate = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d));
const num = v => (v === '' || v == null ? NaN : Number(v));
const str = (v, max = 300) => String(v ?? '').trim().slice(0, max);
const dayDiff = d => Math.abs(Date.parse(d) - Date.now()) / 86400000;
const todayStr = () => new Date().toISOString().slice(0, 10);

function dateParam(req, res) {
  const d = req.method === 'GET' ? req.query.date : req.body.date;
  if (!isDate(d) || dayDiff(d) > 2) {
    fail(res, 'Invalid date');
    return null;
  }
  return d;
}

module.exports = { wrap, fail, isDate, num, str, dayDiff, todayStr, dateParam };
