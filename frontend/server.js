const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const ENV_API_URL = process.env.API_URL;
// Load frontend/.env (Node 20.12+ built-in, no dotenv needed). Real env vars win.
try { process.loadEnvFile(path.join(ROOT, '.env')); } catch { /* no .env file */ }

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};
const BLOCKED_FILES = new Set(['server.js', 'package.json', 'package-lock.json']);

function readApiUrl() {
  if (ENV_API_URL !== undefined) return ENV_API_URL.trim();
  try {
    const m = fs.readFileSync(path.join(ROOT, '.env'), 'utf8').match(/^API_URL=(.*)$/m);
    if (m) return m[1].trim();
  } catch { /* no .env file */ }
  return (process.env.API_URL || '').trim();
}

function createServer() {
  return http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Method Not Allowed');
    }

    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { res.writeHead(400); return res.end('Bad Request'); }

    if (pathname === '/config.js') {
      const body = `window.DP_CONFIG=${JSON.stringify({ API_URL: readApiUrl() })};`;
      res.writeHead(200, { 'Content-Type': MIME['.js'], 'Cache-Control': 'no-store' });
      return res.end(req.method === 'HEAD' ? undefined : body);
    }

    const rel = pathname === '/' ? 'index.html' : (pathname === '/admin' ? 'admin.html' : pathname.replace(/^\/+/, ''));
    const parts = rel.split('/');
    if (!rel || rel.includes('\0') || rel.includes('\\') || parts.some(p => !p || p === '..' || p.startsWith('.')) || BLOCKED_FILES.has(rel.toLowerCase())) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not Found');
    }

    const filePath = path.resolve(ROOT, rel);
    if (!filePath.startsWith(ROOT + path.sep)) {
      res.writeHead(404); return res.end('Not Found');
    }

    fs.stat(filePath, (err, st) => {
      if (err || !st.isFile()) {
        if (!path.extname(pathname)) {
          res.writeHead(200, { 'Content-Type': MIME['.html'] });
          if (req.method === 'HEAD') return res.end();
          return fs.createReadStream(path.join(ROOT, 'index.html')).pipe(res);
        }
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Not Found');
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(filePath).pipe(res);
    });
  });
}

if (require.main === module) {
  const PORT = Number(process.env.PORT) || 5173;
  createServer().listen(PORT, () => {
    console.log(`DailyPilot frontend running: http://localhost:${PORT}  (admin: /admin.html, API: ${readApiUrl() || 'same-origin'})`);
  });
}

module.exports = { createServer, readApiUrl };
