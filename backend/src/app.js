const express = require('express');
const path = require('path');
const fs = require('fs');
const { fail } = require('./utils/helpers');

const authRoutes = require('./routes/auth.routes');
const profileRoutes = require('./routes/profile.routes');
const planRoutes = require('./routes/plan.routes');
const progressRoutes = require('./routes/progress.routes');
const pillarsRoutes = require('./routes/pillars.routes');
const recommendationsRoutes = require('./routes/recommendations.routes');
const adminRoutes = require('./routes/admin.routes');
const activitiesRoutes = require('./routes/activities.routes');

const app = express();
app.use(express.json({ limit: '512kb' }));

// CORS: needed when the frontend is hosted on a different origin than the backend.
app.use((req, res, next) => {
  const allowed = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
  if (allowed.length) {
    const reqOrigin = req.headers.origin;
    const allowOrigin = allowed.includes('*') ? '*' : (reqOrigin && allowed.includes(reqOrigin) ? reqOrigin : (allowed.length === 1 ? allowed[0] : ''));
    if (allowOrigin) {
      res.set({
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        ...(allowOrigin !== '*' ? { Vary: 'Origin' } : {}),
      });
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
  }
  next();
});

// Optional single-server static hosting (default on unless SERVE_FRONTEND=false).
const FRONT = path.join(__dirname, '..', '..', 'frontend');
if (process.env.SERVE_FRONTEND !== 'false') {
  app.get('/config.js', (req, res) => {
    let apiUrl = '';
    try {
      apiUrl = (fs.readFileSync(path.join(FRONT, '.env'), 'utf8').match(/^API_URL=(.*)$/m) || [])[1]?.trim() || '';
    } catch {
      /* no file */
    }
    res.type('js').send(`window.DP_CONFIG=${JSON.stringify({ API_URL: apiUrl })};`);
  });
  app.use(express.static(FRONT)); // dotfiles (.env) are never served
} else {
  app.get('/', (req, res) => res.json({ ok: true, service: 'dailypilot-api' }));
}

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'dailypilot-api' }));
app.use('/api', authRoutes);
app.use('/api', profileRoutes);
app.use('/api', planRoutes);
app.use('/api', progressRoutes);
app.use('/api', pillarsRoutes);
app.use('/api', recommendationsRoutes);
app.use('/api', adminRoutes);
app.use('/api', activitiesRoutes);

app.use('/api', (req, res) => fail(res, 'Not found', 404));

if (process.env.SERVE_FRONTEND !== 'false') {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || path.extname(req.path)) return next();
    res.sendFile(path.join(FRONT, 'index.html'));
  });
}

module.exports = app;
