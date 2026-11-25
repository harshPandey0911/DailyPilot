const $app = document.getElementById('app');
const $toasts = document.getElementById('toast-root');

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pending = r => /^PENDING/i.test(r || '');
const fmtDate = d => {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt) ? esc(d) : dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const SLOTS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snack: 'Evening Snack',
  dinner: 'Dinner',
};

const ICONS = {
  dash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  meals: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>',
  foods: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/></svg>',
  tips: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a7 7 0 0 0-4 12.7V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3A7 7 0 0 0 12 2Z"/><path d="M9 21h6"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  pillars: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.77 1.02 1.4 1.11H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>',
};

const savedTheme = localStorage.getItem('dp_admin_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
document.documentElement.setAttribute('data-theme', savedTheme);

let S = {
  token: localStorage.getItem('dp_admin_token'),
  me: null,
  tab: 'dash',
  pillarTab: 'workouts',
  theme: savedTheme,
  sidebarOpen: false,
  loading: false,
  loginErr: '',
  data: {},
  filters: {
    meals: { q: '', slot: 'all', diet: 'all', status: 'all' },
    foods: { q: '' },
    tips: { q: '', status: 'all' },
    users: { q: '', role: 'all', goal: 'all' },
  },
  drawer: null, // { type: 'meal'|'food'|'tip'|'user', data: ..., err: '' }
  modal: null,  // { type: 'verify-meal'|'verify-tip'|'confirm', ... }
};

function toast(msg, kind = 'ok') {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = msg;
  $toasts.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.25s'; setTimeout(() => el.remove(), 260); }, 3400);
}

async function api(path, method = 'GET', body) {
  const r = await fetch(((window.DP_CONFIG && DP_CONFIG.API_URL) || '') + '/api' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(S.token ? { Authorization: 'Bearer ' + S.token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 || r.status === 403) {
    S.token = null;
    S.me = null;
    localStorage.removeItem('dp_admin_token');
    S.loginErr = j.error || 'Session expired. Please login again.';
    render();
    throw new Error(S.loginErr);
  }
  if (!r.ok) throw new Error(j.error || 'Request failed');
  return j;
}

function toggleTheme() {
  S.theme = S.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', S.theme);
  localStorage.setItem('dp_admin_theme', S.theme);
  render();
}

async function loadTab(tab, keepDrawer = false) {
  S.tab = tab;
  S.sidebarOpen = false;
  if (!keepDrawer) S.drawer = null;
  S.loading = true;
  render();
  try {
    if (!S.me) {
      const meRes = await api('/me');
      if (meRes.user.role !== 'admin') throw new Error('Admin access required.');
      S.me = meRes.user;
    }
    if (tab === 'dash') S.data.stats = await api('/admin/stats');
    if (tab === 'meals') {
      const [meals, foods, stats] = await Promise.all([api('/admin/meals'), api('/admin/foods'), api('/admin/stats')]);
      S.data.meals = meals;
      S.data.foods = foods;
      S.data.stats = stats;
    }
    if (tab === 'foods') S.data.foods = await api('/admin/foods');
    if (tab === 'tips') {
      const [tips, stats] = await Promise.all([api('/admin/tips'), api('/admin/stats')]);
      S.data.tips = tips;
      S.data.stats = stats;
    }
    if (tab === 'users') S.data.users = await api('/admin/users');
    if (tab === 'pillars') S.data.pillars = await api('/admin/pillars');
    if (tab === 'settings' && !S.data.stats) S.data.stats = await api('/admin/stats');
  } catch (e) {
    if (S.token) toast(e.message, 'err');
  } finally {
    S.loading = false;
    render();
  }
}

/* ---------- Views ---------- */
function loginView() {
  return `
  <div class="auth-shell">
    <div class="auth-card">
      <div class="auth-brand">
        <img src="assets/logo.jpg" alt="DailyPilot">
        <div>
          <h1>DailyPilot Admin</h1>
          <p>Sign in to manage nutrition, content &amp; users</p>
        </div>
      </div>
      ${S.loginErr ? `<div class="alert alert-err" style="margin-bottom:16px">${esc(S.loginErr)}</div>` : ''}
      <form id="login-form">
        <div class="field">
          <label>Admin Email</label>
          <input name="email" type="email" placeholder="admin@gmail.com" required autofocus>
        </div>
        <div class="field">
          <label>Password</label>
          <input name="password" type="password" placeholder="••••••••" required>
        </div>
        <button class="btn" style="width:100%;margin-top:4px" type="submit">Sign in to Console</button>
      </form>
      <div style="margin-top:18px;text-align:center;font-size:12.5px;color:var(--mute)">
        <a href="/">← Back to DailyPilot User App</a>
      </div>
    </div>
  </div>`;
}

function dashView() {
  const s = S.data.stats;
  if (!s) return '<div class="card">Loading overview…</div>';
  const totalPending = (s.needsReviewMeals || 0) + (s.needsReviewTips || 0);
  const totalMeals = (s.publishedMeals || 0) + (s.draftMeals || 0);
  const p = s.pillars || {};
  const wPct = p.workouts ? Math.round((p.workoutsDone / p.workouts) * 100) : 0;
  const gPct = p.goals ? Math.round((p.goalsDone / p.goals) * 100) : 0;

  const barRow = (label, val, max, color = '') => {
    const pct = max ? Math.round((val / max) * 100) : 0;
    return `<div>
      <div class="bar-row-top"><span>${esc(label)}</span><span class="mono mute">${val} (${pct}%)</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%;${color ? `background:${color}` : ''}"></div></div>
    </div>`;
  };

  return `
  ${totalPending > 0 ? `
    <div class="alert alert-warn">
      <div>
        <b>Expert Review Pending:</b> <b>${s.needsReviewMeals}</b> meals and <b>${s.needsReviewTips}</b> skin tips are starter data awaiting doctor/dietitian sign-off.
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0">
        ${s.needsReviewMeals ? `<button class="btn btn-sm" id="go-review-meals">Review Meals</button>` : ''}
        ${s.needsReviewTips ? `<button class="btn btn-sec btn-sm" id="go-review-tips">Review Tips</button>` : ''}
      </div>
    </div>` : `
    <div class="alert alert-ok">
      <div><b>All Clear:</b> Every published meal and skin tip has a verified reviewer and source.</div>
    </div>`}

  <div class="kpi-grid">
    <div class="kpi">
      <div>
        <div class="kpi-label">Registered Users</div>
        <div class="kpi-val mono">${s.users}</div>
        <div class="kpi-sub">Active community members</div>
      </div>
      <div class="kpi-icon" style="background:var(--brand-soft);color:var(--brand)">${ICONS.users}</div>
    </div>
    <div class="kpi">
      <div>
        <div class="kpi-label">Published Meals</div>
        <div class="kpi-val mono">${s.publishedMeals}</div>
        <div class="kpi-sub">${s.draftMeals} drafts in progress</div>
      </div>
      <div class="kpi-icon" style="background:var(--fit-soft);color:var(--fit)">${ICONS.meals}</div>
    </div>
    <div class="kpi">
      <div>
        <div class="kpi-label">Foods Database</div>
        <div class="kpi-val mono">${s.foods}</div>
        <div class="kpi-sub">Verified per-100g ingredients</div>
      </div>
      <div class="kpi-icon" style="background:var(--goals-soft);color:var(--goals)">${ICONS.foods}</div>
    </div>
    <div class="kpi">
      <div>
        <div class="kpi-label">Pending Reviews</div>
        <div class="kpi-val mono" style="color:${totalPending ? 'var(--warn)' : 'var(--fit)'}">${totalPending}</div>
        <div class="kpi-sub">${s.needsReviewMeals} meals · ${s.needsReviewTips} tips</div>
      </div>
      <div class="kpi-icon" style="background:var(--warn-soft);color:var(--warn)">${ICONS.tips}</div>
    </div>
  </div>

  <div class="grid-2">
    <div class="card">
      <div class="card-head">
        <h3 class="card-title">Meal Catalog Distribution</h3>
        <span class="badge badge-brand">${totalMeals} total</span>
      </div>
      <div class="bar-list">
        ${barRow('Breakfast', s.mealSlots?.breakfast || 0, totalMeals)}
        ${barRow('Lunch', s.mealSlots?.lunch || 0, totalMeals, 'var(--fit)')}
        ${barRow('Evening Snack', s.mealSlots?.snack || 0, totalMeals, 'var(--goals)')}
        ${barRow('Dinner', s.mealSlots?.dinner || 0, totalMeals, 'var(--study)')}
      </div>
      <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--line);display:flex;gap:12px;flex-wrap:wrap;font-size:12.5px">
        <span class="badge badge-ok">Veg: ${s.dietBreakdown?.veg || 0}</span>
        <span class="badge badge-warn">Non-Veg: ${s.dietBreakdown?.nonveg || 0}</span>
      </div>
    </div>

    <div class="card">
      <div class="card-head">
        <h3 class="card-title">User Goals &amp; 3-Pillar Activity</h3>
        <button class="btn btn-sec btn-sm" id="go-pillars">View Activity →</button>
      </div>
      <div class="bar-list">
        ${barRow('Stay Fit', s.userGoals?.fit || 0, s.users, 'var(--fit)')}
        ${barRow('Lose Weight', s.userGoals?.lose || 0, s.users, 'var(--goals)')}
        ${barRow('Build / Bulk', s.userGoals?.bulk || 0, s.users, 'var(--study)')}
      </div>
      <div class="pillar-mini-grid">
        <div class="pillar-mini">
          <b class="mono">${p.workouts || 0}</b>
          <span>Workouts (${wPct}% done)</span>
        </div>
        <div class="pillar-mini">
          <b class="mono">${p.studyMinutes || 0}m</b>
          <span>${p.studySessions || 0} study sessions</span>
        </div>
        <div class="pillar-mini">
          <b class="mono">${p.goals || 0}</b>
          <span>Goals (${gPct}% done)</span>
        </div>
      </div>
    </div>
  </div>

  <div class="grid-2">
    <div class="card">
      <div class="card-head">
        <h3 class="card-title">Recent Signups</h3>
        <button class="btn btn-sec btn-sm" id="go-users">All Users →</button>
      </div>
      ${(s.recentUsers || []).length ? `
        <div class="table-scroll">
          <table>
            <thead><tr><th>User</th><th>Goal</th><th>Joined</th></tr></thead>
            <tbody>
              ${s.recentUsers.map(u => `<tr>
                <td><div class="cell-title">${esc(u.name)}</div><div class="cell-sub">${esc(u.email)}</div></td>
                <td>${u.goal ? `<span class="badge badge-brand">${esc(u.goal)}</span>` : '<span class="mute">—</span>'}</td>
                <td class="mute">${fmtDate(u.created_at)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>` : '<div class="empty"><b>No users yet</b>New signups will appear here.</div>'}
    </div>

    <div class="card">
      <div class="card-head">
        <h3 class="card-title">Content Governance Rules</h3>
      </div>
      <ul style="margin:0;padding-left:18px;color:var(--ink-2);display:flex;flex-direction:column;gap:10px;font-size:13.5px">
        <li><b>Expert Sign-Off:</b> Meals &amp; skin tips can only be published with a valid <b>source</b> and <b>reviewer</b> (doctor/dietitian).</li>
        <li><b>Calculated Macros:</b> Meal calories and P/C/F are auto-computed from ingredient weights — never hand-typed.</li>
        <li><b>Atwater Check:</b> Food entries are validated so kcal aligns with protein/carbs/fat per 100 g.</li>
        <li><b>Safe Drafts:</b> Draft meals and tips remain hidden from the DailyPilot user app until published.</li>
      </ul>
    </div>
  </div>`;
}

function mealsView() {
  const f = S.filters.meals;
  const all = S.data.meals || [];
  const list = all.filter(m => {
    if (f.slot !== 'all' && m.slot !== f.slot) return false;
    if (f.diet !== 'all' && m.diet_type !== f.diet) return false;
    if (f.status === 'needs_review' && !(m.status === 'published' && pending(m.reviewed_by))) return false;
    if (f.status === 'published' && m.status !== 'published') return false;
    if (f.status === 'draft' && m.status !== 'draft') return false;
    if (f.q) {
      const q = f.q.toLowerCase();
      if (!`${m.title} ${m.allergens} ${m.source_name} ${m.reviewed_by}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return `
  <div class="toolbar">
    <div class="filters">
      <div class="search-wrap">${ICONS.search}<input id="q-meals" placeholder="Search meals, allergens, source…" value="${esc(f.q)}"></div>
      <select class="filter-select" id="f-meal-slot">
        <option value="all">All slots</option>
        ${Object.entries(SLOTS).map(([k, v]) => `<option value="${k}" ${f.slot === k ? 'selected' : ''}>${v}</option>`).join('')}
      </select>
      <select class="filter-select" id="f-meal-diet">
        <option value="all">All diets</option>
        <option value="veg" ${f.diet === 'veg' ? 'selected' : ''}>Veg only</option>
        <option value="nonveg" ${f.diet === 'nonveg' ? 'selected' : ''}>Non-veg</option>
      </select>
      <select class="filter-select" id="f-meal-status">
        <option value="all">All statuses</option>
        <option value="published" ${f.status === 'published' ? 'selected' : ''}>Published</option>
        <option value="draft" ${f.status === 'draft' ? 'selected' : ''}>Draft</option>
        <option value="needs_review" ${f.status === 'needs_review' ? 'selected' : ''}>Needs Review</option>
      </select>
    </div>
    <button class="btn" id="new-meal">+ New Meal</button>
  </div>

  <div class="table-card">
    <div class="table-scroll">
      <table>
        <thead>
          <tr><th>Meal</th><th>Slot</th><th>Diet</th><th>Nutrition</th><th>Status</th><th>Reviewer</th><th style="text-align:right">Actions</th></tr>
        </thead>
        <tbody>
          ${list.length ? list.map(m => `<tr>
            <td>
              <div class="cell-title">${esc(m.title)} ${m.skin_friendly ? '<span class="badge badge-study" style="margin-left:4px">Skin</span>' : ''}</div>
              <div class="cell-sub">${m.items.length} ingredients${m.allergens ? ` · Allergens: ${esc(m.allergens)}` : ''}</div>
            </td>
            <td>${SLOTS[m.slot] || m.slot}</td>
            <td><span class="badge ${m.diet_type === 'veg' ? 'badge-ok' : 'badge-warn'}">${m.diet_type === 'veg' ? 'Veg' : 'Non-veg'}</span></td>
            <td class="mono"><b>${Math.round(m.kcal)}</b> kcal<div class="cell-sub">${Math.round(m.protein)}P · ${Math.round(m.carbs)}C · ${Math.round(m.fat)}F</div></td>
            <td><span class="badge ${m.status === 'published' ? 'badge-ok' : 'badge-mute'}">${m.status}</span></td>
            <td>${pending(m.reviewed_by) ? '<span class="badge badge-warn">Pending Review</span>' : esc(m.reviewed_by) || '—'}</td>
            <td>
              <div class="actions">
                ${pending(m.reviewed_by) ? `<button class="btn btn-fit btn-sm" data-verify-meal="${m.id}">Verify</button>` : ''}
                <button class="btn btn-sec btn-sm" data-edit-meal="${m.id}">Edit</button>
                <button class="btn btn-sec btn-sm" style="color:var(--err)" data-del-meal="${m.id}">Delete</button>
              </div>
            </td>
          </tr>`).join('') : `<tr><td colspan="7"><div class="empty"><b>No meals match your filters</b>Try clearing search or changing status filter.</div></td></tr>`}
        </tbody>
      </table>
    </div>
  </div>`;
}

function foodsView() {
  const f = S.filters.foods;
  const all = S.data.foods || [];
  const list = all.filter(x => !f.q || `${x.name} ${x.source_name}`.toLowerCase().includes(f.q.toLowerCase()));

  return `
  <div class="toolbar">
    <div class="filters">
      <div class="search-wrap">${ICONS.search}<input id="q-foods" placeholder="Search foods or source…" value="${esc(f.q)}"></div>
      <span class="mute">${list.length} of ${all.length} foods</span>
    </div>
    <button class="btn" id="new-food">+ New Food</button>
  </div>
  <div class="table-card">
    <div class="table-scroll">
      <table>
        <thead><tr><th>Food (per 100 g)</th><th>Calories</th><th>Protein</th><th>Carbs</th><th>Fat</th><th>Source</th><th style="text-align:right">Actions</th></tr></thead>
        <tbody>
          ${list.length ? list.map(x => `<tr>
            <td><div class="cell-title">${esc(x.name)}</div></td>
            <td class="mono"><b>${x.kcal}</b> kcal</td>
            <td class="mono">${x.protein} g</td>
            <td class="mono">${x.carbs} g</td>
            <td class="mono">${x.fat} g</td>
            <td class="mute">${esc(x.source_name) || '—'}</td>
            <td>
              <div class="actions">
                <button class="btn btn-sec btn-sm" data-edit-food="${x.id}">Edit</button>
                <button class="btn btn-sec btn-sm" style="color:var(--err)" data-del-food="${x.id}">Delete</button>
              </div>
            </td>
          </tr>`).join('') : `<tr><td colspan="7"><div class="empty"><b>No foods found</b>Add a new food ingredient or adjust search.</div></td></tr>`}
        </tbody>
      </table>
    </div>
  </div>`;
}

function tipsView() {
  const f = S.filters.tips;
  const all = S.data.tips || [];
  const list = all.filter(t => {
    if (f.status === 'needs_review' && !(t.status === 'published' && pending(t.reviewed_by))) return false;
    if (f.status === 'published' && t.status !== 'published') return false;
    if (f.status === 'draft' && t.status !== 'draft') return false;
    if (f.q && !`${t.title} ${t.body} ${t.source_name}`.toLowerCase().includes(f.q.toLowerCase())) return false;
    return true;
  });

  return `
  <div class="toolbar">
    <div class="filters">
      <div class="search-wrap">${ICONS.search}<input id="q-tips" placeholder="Search skin tips…" value="${esc(f.q)}"></div>
      <select class="filter-select" id="f-tip-status">
        <option value="all">All statuses</option>
        <option value="published" ${f.status === 'published' ? 'selected' : ''}>Published</option>
        <option value="draft" ${f.status === 'draft' ? 'selected' : ''}>Draft</option>
        <option value="needs_review" ${f.status === 'needs_review' ? 'selected' : ''}>Needs Review</option>
      </select>
    </div>
    <button class="btn" id="new-tip">+ New Tip</button>
  </div>
  <div class="table-card">
    <div class="table-scroll">
      <table>
        <thead><tr><th>Skin Tip</th><th>Status</th><th>Source</th><th>Reviewer</th><th style="text-align:right">Actions</th></tr></thead>
        <tbody>
          ${list.length ? list.map(t => `<tr>
            <td style="max-width:380px">
              <div class="cell-title">${esc(t.title)}</div>
              <div class="cell-sub">${esc(t.body.slice(0, 110))}${t.body.length > 110 ? '…' : ''}</div>
            </td>
            <td><span class="badge ${t.status === 'published' ? 'badge-ok' : 'badge-mute'}">${t.status}</span></td>
            <td class="mute">${esc(t.source_name) || '—'}</td>
            <td>${pending(t.reviewed_by) ? '<span class="badge badge-warn">Pending Review</span>' : esc(t.reviewed_by) || '—'}</td>
            <td>
              <div class="actions">
                ${pending(t.reviewed_by) ? `<button class="btn btn-fit btn-sm" data-verify-tip="${t.id}">Verify</button>` : ''}
                <button class="btn btn-sec btn-sm" data-edit-tip="${t.id}">Edit</button>
                <button class="btn btn-sec btn-sm" style="color:var(--err)" data-del-tip="${t.id}">Delete</button>
              </div>
            </td>
          </tr>`).join('') : `<tr><td colspan="5"><div class="empty"><b>No skin tips found</b>Create a new tip or adjust filters.</div></td></tr>`}
        </tbody>
      </table>
    </div>
  </div>`;
}

function usersView() {
  const f = S.filters.users;
  const all = S.data.users || [];
  const list = all.filter(u => {
    if (f.role !== 'all' && u.role !== f.role) return false;
    if (f.goal !== 'all' && (u.goal || 'none') !== f.goal) return false;
    if (f.q && !`${u.name} ${u.email}`.toLowerCase().includes(f.q.toLowerCase())) return false;
    return true;
  });

  return `
  <div class="toolbar">
    <div class="filters">
      <div class="search-wrap">${ICONS.search}<input id="q-users" placeholder="Search name or email…" value="${esc(f.q)}"></div>
      <select class="filter-select" id="f-user-role">
        <option value="all">All roles</option>
        <option value="user" ${f.role === 'user' ? 'selected' : ''}>Users</option>
        <option value="admin" ${f.role === 'admin' ? 'selected' : ''}>Admins</option>
      </select>
      <select class="filter-select" id="f-user-goal">
        <option value="all">All goals</option>
        <option value="fit" ${f.goal === 'fit' ? 'selected' : ''}>Stay Fit</option>
        <option value="lose" ${f.goal === 'lose' ? 'selected' : ''}>Lose Weight</option>
        <option value="bulk" ${f.goal === 'bulk' ? 'selected' : ''}>Bulk</option>
      </select>
    </div>
    <div style="display:flex;align-items:center;gap:10px">
      <span class="mute">${list.length} accounts</span>
      <button class="btn" id="new-user">+ New User</button>
    </div>
  </div>
  <div class="table-card">
    <div class="table-scroll">
      <table>
        <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Goal &amp; Diet</th><th>Weight</th><th>Joined</th><th style="text-align:right">Actions</th></tr></thead>
        <tbody>
          ${list.length ? list.map(u => `<tr>
            <td><div class="cell-title">${esc(u.name)}</div><div class="cell-sub">${esc(u.email)}</div></td>
            <td><span class="badge ${u.role === 'admin' ? 'badge-study' : 'badge-mute'}">${u.role}</span></td>
            <td><span class="badge ${u.disabled ? 'badge-err' : 'badge-ok'}">${u.disabled ? 'Disabled' : 'Active'}</span></td>
            <td>${u.goal ? `<span class="badge badge-brand">${esc(u.goal)}</span>` : '—'} <span class="mute">${esc(u.diet_pref || '')}</span></td>
            <td class="mono">${u.weight_kg ? `${u.weight_kg} kg` : '—'}</td>
            <td class="mute">${fmtDate(u.created_at)}</td>
            <td>
              <div class="actions">
                <button class="btn btn-sec btn-sm" data-view-user="${u.id}">Manage</button>
              </div>
            </td>
          </tr>`).join('') : `<tr><td colspan="7"><div class="empty"><b>No matching users</b></div></td></tr>`}
        </tbody>
      </table>
    </div>
  </div>`;
}

function pillarsView() {
  const p = S.data.pillars || { workouts: [], studySessions: [], goals: [], foodLogs: [] };
  const t = S.pillarTab;
  const fl = p.foodLogs || [];
  return `
  <div class="seg-tabs">
    <button class="${t === 'workouts' ? 'active' : ''}" data-ptab="workouts">Exercises (${p.workouts.length})</button>
    <button class="${t === 'foodLogs' ? 'active' : ''}" data-ptab="foodLogs">Diet &amp; Food Logs (${fl.length})</button>
    <button class="${t === 'study' ? 'active' : ''}" data-ptab="study">Study Sessions (${p.studySessions.length})</button>
    <button class="${t === 'goals' ? 'active' : ''}" data-ptab="goals">Daily Goals (${p.goals.length})</button>
  </div>
  <div class="table-card">
    <div class="table-scroll">
      ${t === 'workouts' ? `<table>
        <thead><tr><th>Exercise</th><th>User</th><th>Category</th><th>Duration</th><th>Calories</th><th>Date</th><th>Status</th><th></th></tr></thead>
        <tbody>${p.workouts.length ? p.workouts.map(w => `<tr>
          <td><div class="cell-title">${esc(w.title)}</div></td>
          <td><div>${esc(w.user_name)}</div><div class="cell-sub">${esc(w.user_email)}</div></td>
          <td><span class="badge badge-ok">${esc(w.category)}</span></td>
          <td class="mono">${w.duration_min} min</td>
          <td class="mono">${w.calories} kcal</td>
          <td class="mute">${esc(w.date)}</td>
          <td><span class="badge ${w.done ? 'badge-ok' : 'badge-mute'}">${w.done ? 'Done' : 'Planned'}</span></td>
          <td><button class="btn btn-sec btn-sm" style="color:var(--err)" data-del-act="workouts:${w.id}">Delete</button></td>
        </tr>`).join('') : '<tr><td colspan="8"><div class="empty"><b>No exercises logged yet</b></div></td></tr>'}</tbody>
      </table>` : ''}
      ${t === 'foodLogs' ? `<table>
        <thead><tr><th>Food / Meal Logged</th><th>User</th><th>Slot</th><th>Calories</th><th>P / C / F</th><th>Date</th><th></th></tr></thead>
        <tbody>${fl.length ? fl.map(l => `<tr>
          <td><div class="cell-title">${esc(l.title)}</div></td>
          <td><div>${esc(l.user_name)}</div><div class="cell-sub">${esc(l.user_email)}</div></td>
          <td><span class="badge badge-brand">${esc(l.slot)}</span></td>
          <td class="mono"><b>${Math.round(l.kcal)}</b> kcal</td>
          <td class="mono">${l.protein || 0} / ${l.carbs || 0} / ${l.fat || 0}g</td>
          <td class="mute">${esc(l.date)}</td>
          <td><button class="btn btn-sec btn-sm" style="color:var(--err)" data-del-act="food_logs:${l.id}">Delete</button></td>
        </tr>`).join('') : '<tr><td colspan="7"><div class="empty"><b>No custom food logs yet</b></div></td></tr>'}</tbody>
      </table>` : ''}
      ${t === 'study' ? `<table>
        <thead><tr><th>Topic</th><th>User</th><th>Subject</th><th>Mode</th><th>Duration</th><th>Date</th><th>Status</th><th></th></tr></thead>
        <tbody>${p.studySessions.length ? p.studySessions.map(s => `<tr>
          <td><div class="cell-title">${esc(s.title)}</div></td>
          <td><div>${esc(s.user_name)}</div><div class="cell-sub">${esc(s.user_email)}</div></td>
          <td><span class="badge badge-study">${esc(s.subject)}</span></td>
          <td>${esc(s.mode)}</td>
          <td class="mono">${s.duration_min} min</td>
          <td class="mute">${esc(s.date)}</td>
          <td><span class="badge ${s.done ? 'badge-ok' : 'badge-mute'}">${s.done ? 'Completed' : 'In Progress'}</span></td>
          <td><button class="btn btn-sec btn-sm" style="color:var(--err)" data-del-act="study:${s.id}">Delete</button></td>
        </tr>`).join('') : '<tr><td colspan="8"><div class="empty"><b>No study sessions logged yet</b></div></td></tr>'}</tbody>
      </table>` : ''}
      ${t === 'goals' ? `<table>
        <thead><tr><th>Goal</th><th>User</th><th>Category</th><th>Priority</th><th>Date</th><th>Status</th><th></th></tr></thead>
        <tbody>${p.goals.length ? p.goals.map(g => `<tr>
          <td><div class="cell-title">${esc(g.title)}</div></td>
          <td><div>${esc(g.user_name)}</div><div class="cell-sub">${esc(g.user_email)}</div></td>
          <td>${esc(g.category)}</td>
          <td><span class="badge ${g.priority === 'high' ? 'badge-err' : g.priority === 'medium' ? 'badge-warn' : 'badge-mute'}">${esc(g.priority)}</span></td>
          <td class="mute">${esc(g.date)}</td>
          <td><span class="badge ${g.done ? 'badge-ok' : 'badge-mute'}">${g.done ? 'Done' : 'Open'}</span></td>
          <td><button class="btn btn-sec btn-sm" style="color:var(--err)" data-del-act="goals:${g.id}">Delete</button></td>
        </tr>`).join('') : '<tr><td colspan="7"><div class="empty"><b>No goals logged yet</b></div></td></tr>'}</tbody>
      </table>` : ''}
    </div>
  </div>`;
}

function settingsView() {
  return `
  <div class="grid-2">
    <div class="card">
      <div class="card-head"><h3 class="card-title">Admin Account</h3></div>
      <div class="field"><label>Name</label><input value="${esc(S.me?.name || 'Admin')}" disabled></div>
      <div class="field"><label>Email</label><input value="${esc(S.me?.email || '')}" disabled></div>
      <div class="field"><label>Role</label><input value="${esc(S.me?.role || 'admin')}" disabled></div>
    </div>
    <div class="card">
      <div class="card-head"><h3 class="card-title">Change Admin Password</h3></div>
      <form id="pw-form">
        <div class="field"><label>Current Password</label><input name="currentPassword" type="password" required></div>
        <div class="field"><label>New Password (min 8 chars)</label><input name="newPassword" type="password" minlength="8" required></div>
        <button class="btn" type="submit">Update Password</button>
      </form>
    </div>
  </div>`;
}

/* ---------- Drawers & Modals ---------- */
function mealIngRow(item = {}) {
  const foods = S.data.foods || [];
  return `<div class="ing-row">
    <select class="ing-food">${foods.map(f => `<option value="${f.id}" ${f.id === item.food_id ? 'selected' : ''}>${esc(f.name)} (${f.kcal} kcal/100g)</option>`).join('')}</select>
    <input class="ing-grams" type="number" min="1" max="2000" placeholder="grams" value="${item.grams ?? ''}">
    <button type="button" class="icon-btn ing-rm" title="Remove">✕</button>
  </div>`;
}

function renderDrawer() {
  const d = S.drawer;
  if (!d) return '';
  if (d.type === 'meal') {
    const m = d.data;
    return `<div class="overlay" id="drawer-overlay">
      <div class="drawer" role="dialog" aria-modal="true">
        <div class="drawer-head">
          <h2>${m.id ? 'Edit Meal' : 'New Meal'}</h2>
          <button class="icon-btn" id="close-drawer">${ICONS.close}</button>
        </div>
        <form id="meal-form" style="display:flex;flex-direction:column;flex:1;min-height:0">
          <div class="drawer-body">
            ${d.err ? `<div class="alert alert-err" style="margin-bottom:14px">${esc(d.err)}</div>` : ''}
            <div class="macro-preview" id="meal-macro-preview">
              <div><b id="mp-kcal">0</b><span>kcal</span></div>
              <div><b id="mp-p">0g</b><span>Protein</span></div>
              <div><b id="mp-c">0g</b><span>Carbs</span></div>
              <div><b id="mp-f">0g</b><span>Fat</span></div>
            </div>
            <div class="form-grid">
              <div class="field"><label>Meal Title</label><input name="title" required value="${esc(m.title)}"></div>
              <div class="field"><label>Slot</label><select name="slot">${Object.entries(SLOTS).map(([k, v]) => `<option value="${k}" ${m.slot === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
              <div class="field"><label>Diet Type</label><select name="diet_type"><option value="veg" ${m.diet_type === 'veg' ? 'selected' : ''}>Veg</option><option value="nonveg" ${m.diet_type === 'nonveg' ? 'selected' : ''}>Non-veg</option></select></div>
              <div class="field"><label>Allergens</label><input name="allergens" value="${esc(m.allergens)}" placeholder="Milk, nuts, gluten…"></div>
            </div>
            <label class="check-row"><input type="checkbox" name="skin_friendly" ${m.skin_friendly ? 'checked' : ''}> Skin-friendly meal</label>
            <div class="field">
              <label>Ingredients (cooked / as-eaten grams)</label>
              <div class="ing-list" id="ing-list">${(m.items?.length ? m.items : [{}]).map(mealIngRow).join('')}</div>
              <button type="button" class="btn btn-sec btn-sm" id="add-ing">+ Add Ingredient</button>
            </div>
            <div class="field"><label>Notes (optional)</label><textarea name="notes" rows="2">${esc(m.notes)}</textarea></div>
            <div class="form-grid">
              <div class="field"><label>Source (Doctor / Dietitian / Book / Site)</label><input name="source_name" value="${esc(m.source_name)}"></div>
              <div class="field"><label>Source URL</label><input name="source_url" value="${esc(m.source_url)}"></div>
              <div class="field"><label>Reviewed By</label><input name="reviewed_by" value="${esc(pending(m.reviewed_by) ? '' : m.reviewed_by)}" placeholder="Dr. / Dietitian name"></div>
              <div class="field"><label>Status</label><select name="status"><option value="draft" ${m.status === 'draft' ? 'selected' : ''}>Draft</option><option value="published" ${m.status === 'published' ? 'selected' : ''}>Published</option></select></div>
            </div>
          </div>
          <div class="drawer-foot">
            <button type="button" class="btn btn-sec" id="cancel-drawer">Cancel</button>
            <button type="submit" class="btn">Save Meal</button>
          </div>
        </form>
      </div>
    </div>`;
  }

  if (d.type === 'food') {
    const f = d.data;
    return `<div class="overlay" id="drawer-overlay">
      <div class="drawer" role="dialog" aria-modal="true">
        <div class="drawer-head">
          <h2>${f.id ? 'Edit Food' : 'New Food (per 100 g)'}</h2>
          <button class="icon-btn" id="close-drawer">${ICONS.close}</button>
        </div>
        <form id="food-form" style="display:flex;flex-direction:column;flex:1;min-height:0">
          <div class="drawer-body">
            ${d.err ? `<div class="alert alert-err" style="margin-bottom:14px">${esc(d.err)}</div>` : ''}
            <div class="field"><label>Food Name</label><input name="name" required value="${esc(f.name)}"></div>
            <div class="form-grid">
              <div class="field"><label>Calories (kcal)</label><input name="kcal" type="number" step="0.1" min="0" required value="${f.kcal ?? ''}"></div>
              <div class="field"><label>Protein (g)</label><input name="protein" type="number" step="0.1" min="0" required value="${f.protein ?? ''}"></div>
              <div class="field"><label>Carbs (g)</label><input name="carbs" type="number" step="0.1" min="0" required value="${f.carbs ?? ''}"></div>
              <div class="field"><label>Fat (g)</label><input name="fat" type="number" step="0.1" min="0" required value="${f.fat ?? ''}"></div>
            </div>
            <div id="food-atwater" class="mute" style="font-size:12.5px;margin-bottom:14px"></div>
            <div class="form-grid">
              <div class="field"><label>Source Name</label><input name="source_name" value="${esc(f.source_name)}" placeholder="USDA FoodData Central / IFCT 2017"></div>
              <div class="field"><label>Source URL</label><input name="source_url" value="${esc(f.source_url)}"></div>
            </div>
          </div>
          <div class="drawer-foot">
            <button type="button" class="btn btn-sec" id="cancel-drawer">Cancel</button>
            <button type="submit" class="btn">Save Food</button>
          </div>
        </form>
      </div>
    </div>`;
  }

  if (d.type === 'tip') {
    const t = d.data;
    return `<div class="overlay" id="drawer-overlay">
      <div class="drawer" role="dialog" aria-modal="true">
        <div class="drawer-head">
          <h2>${t.id ? 'Edit Skin Tip' : 'New Skin Tip'}</h2>
          <button class="icon-btn" id="close-drawer">${ICONS.close}</button>
        </div>
        <form id="tip-form" style="display:flex;flex-direction:column;flex:1;min-height:0">
          <div class="drawer-body">
            ${d.err ? `<div class="alert alert-err" style="margin-bottom:14px">${esc(d.err)}</div>` : ''}
            <div class="field"><label>Title</label><input name="title" required value="${esc(t.title)}"></div>
            <div class="field"><label>Body</label><textarea name="body" rows="4" required>${esc(t.body)}</textarea></div>
            <div class="form-grid">
              <div class="field"><label>Source</label><input name="source_name" value="${esc(t.source_name)}" placeholder="AAD / CDC / Dermatologist"></div>
              <div class="field"><label>Source URL</label><input name="source_url" value="${esc(t.source_url)}"></div>
              <div class="field"><label>Reviewed By</label><input name="reviewed_by" value="${esc(pending(t.reviewed_by) ? '' : t.reviewed_by)}"></div>
              <div class="field"><label>Status</label><select name="status"><option value="draft" ${t.status === 'draft' ? 'selected' : ''}>Draft</option><option value="published" ${t.status === 'published' ? 'selected' : ''}>Published</option></select></div>
            </div>
          </div>
          <div class="drawer-foot">
            <button type="button" class="btn btn-sec" id="cancel-drawer">Cancel</button>
            <button type="submit" class="btn">Save Tip</button>
          </div>
        </form>
      </div>
    </div>`;
  }

  if (d.type === 'new-user') {
    return `<div class="overlay" id="drawer-overlay">
      <div class="drawer" role="dialog" aria-modal="true">
        <div class="drawer-head">
          <h2>Create New User</h2>
          <button class="icon-btn" id="close-drawer">${ICONS.close}</button>
        </div>
        <form id="new-user-form" style="display:flex;flex-direction:column;flex:1;min-height:0">
          <div class="drawer-body">
            ${d.err ? `<div class="alert alert-err" style="margin-bottom:14px">${esc(d.err)}</div>` : ''}
            <div class="field"><label>Full Name</label><input name="name" required placeholder="Alex Morgan"></div>
            <div class="field"><label>Email</label><input name="email" type="email" required placeholder="user@example.com"></div>
            <div class="field"><label>Password (min 8 chars)</label><input name="password" type="password" minlength="8" required></div>
            <div class="field"><label>Role</label><select name="role"><option value="user">User</option><option value="admin">Admin</option></select></div>
          </div>
          <div class="drawer-foot">
            <button type="button" class="btn btn-sec" id="cancel-drawer">Cancel</button>
            <button type="submit" class="btn">Create User</button>
          </div>
        </form>
      </div>
    </div>`;
  }

  if (d.type === 'user') {
    const { user, profile, targets, workouts = [], studySessions = [], goals = [], foodLogs = [], plans = [] } = d.data;
    const isSelf = S.me && user.id === S.me.id;
    const utab = d.utab || 'overview';
    return `<div class="overlay" id="drawer-overlay">
      <div class="drawer" role="dialog" aria-modal="true">
        <div class="drawer-head">
          <div>
            <h2>${esc(user.name)}</h2>
            <div class="cell-sub">${esc(user.email)} · Joined ${fmtDate(user.created_at)}</div>
          </div>
          <button class="icon-btn" id="close-drawer">${ICONS.close}</button>
        </div>
        <div class="drawer-body">
          <div class="seg-tabs" style="margin-bottom:14px">
            <button class="${utab === 'overview' ? 'active' : ''}" data-utab="overview">Profile &amp; Edit</button>
            <button class="${utab === 'exercises' ? 'active' : ''}" data-utab="exercises">Exercises (${workouts.length})</button>
            <button class="${utab === 'diet' ? 'active' : ''}" data-utab="diet">Diet (${foodLogs.length})</button>
            <button class="${utab === 'study_goals' ? 'active' : ''}" data-utab="study_goals">Study &amp; Goals</button>
          </div>

          ${utab === 'overview' ? `
            ${targets ? `<div class="macro-preview">
              <div><b>${targets.calories}</b><span>Target kcal</span></div>
              <div><b>${targets.protein}g</b><span>Protein</span></div>
              <div><b>${targets.carbs}g</b><span>Carbs</span></div>
              <div><b>${targets.fat}g</b><span>Fat</span></div>
            </div>` : '<div class="alert alert-warn" style="margin-bottom:14px">User has not completed onboarding profile yet.</div>'}
            <form id="edit-user-form">
              <div class="form-grid">
                <div class="field"><label>Name</label><input name="name" required value="${esc(user.name)}"></div>
                <div class="field"><label>Role</label><select name="role" ${isSelf ? 'disabled' : ''}><option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option><option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option></select></div>
              </div>
              <div class="field"><label>Reset Password (leave blank to keep current)</label><input name="newPassword" type="password" minlength="8" placeholder="Min 8 characters"></div>
              ${profile ? `<div class="form-grid">
                <div class="field"><label>Goal</label><select name="goal"><option value="fit" ${profile.goal === 'fit' ? 'selected' : ''}>Stay Fit</option><option value="lose" ${profile.goal === 'lose' ? 'selected' : ''}>Lose Weight</option><option value="bulk" ${profile.goal === 'bulk' ? 'selected' : ''}>Bulk</option></select></div>
                <div class="field"><label>Diet Preference</label><select name="diet_pref"><option value="both" ${profile.diet_pref === 'both' ? 'selected' : ''}>Both</option><option value="veg" ${profile.diet_pref === 'veg' ? 'selected' : ''}>Veg Only</option><option value="nonveg" ${profile.diet_pref === 'nonveg' ? 'selected' : ''}>Non-Veg</option></select></div>
                <div class="field"><label>Activity</label><select name="activity"><option value="sedentary" ${profile.activity === 'sedentary' ? 'selected' : ''}>Sedentary</option><option value="light" ${profile.activity === 'light' ? 'selected' : ''}>Light</option><option value="moderate" ${profile.activity === 'moderate' ? 'selected' : ''}>Moderate</option><option value="active" ${profile.activity === 'active' ? 'selected' : ''}>Active</option></select></div>
                <div class="field"><label>Weight (kg)</label><input name="weight_kg" type="number" step="0.1" value="${profile.weight_kg || ''}"></div>
              </div>` : ''}
              <button class="btn btn-sm" type="submit">Save User Changes</button>
            </form>
            ${!isSelf ? `<div class="card" style="padding:14px;margin-top:16px;border-color:rgba(220,38,38,0.25)">
              <div style="font-weight:700;font-size:13px;margin-bottom:10px">Account Controls</div>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button class="btn btn-sec btn-sm" id="toggle-user-disable">${user.disabled ? 'Enable Account' : 'Disable Account'}</button>
                <button class="btn btn-danger btn-sm" id="delete-user-btn">Delete User</button>
              </div>
            </div>` : ''}
          ` : ''}

          ${utab === 'exercises' ? `
            ${workouts.length ? workouts.map(w => `<div class="card" style="padding:12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
              <div><div class="cell-title">${esc(w.title)}</div><div class="cell-sub">${esc(w.category)} · ${w.duration_min}m · ${w.calories} kcal · ${esc(w.date)}</div></div>
              <span class="badge ${w.done ? 'badge-ok' : 'badge-mute'}">${w.done ? 'Done' : 'Planned'}</span>
            </div>`).join('') : '<div class="empty"><b>No exercises logged</b></div>'}
          ` : ''}

          ${utab === 'diet' ? `
            <h3 style="margin:0 0 8px;font-size:13.5px">Custom Food Logs</h3>
            ${foodLogs.length ? foodLogs.map(l => `<div class="card" style="padding:12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
              <div><div class="cell-title">${esc(l.title)}</div><div class="cell-sub">${esc(l.slot)} · ${Math.round(l.kcal)} kcal · ${esc(l.date)}</div></div>
            </div>`).join('') : '<div class="mute" style="margin-bottom:14px">No custom food logs.</div>'}
            <h3 style="margin:12px 0 8px;font-size:13.5px">7-Day Plan Adjustments</h3>
            ${plans.length ? plans.map(p => `<div class="card" style="padding:10px 12px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center">
              <span class="mono">${esc(p.date)}</span>
              <span>${p.adjusted_kcal ? `<b>${p.adjusted_kcal} kcal</b> (${p.adjustment_delta > 0 ? '+' : ''}${p.adjustment_delta})` : 'Base target'}</span>
            </div>`).join('') : '<div class="mute">No generated plans yet.</div>'}
          ` : ''}

          ${utab === 'study_goals' ? `
            <h3 style="margin:0 0 8px;font-size:13.5px">Study Sessions (${studySessions.length})</h3>
            ${studySessions.map(s => `<div class="card" style="padding:10px 12px;margin-bottom:6px;display:flex;justify-content:space-between">
              <div><b>${esc(s.title)}</b><div class="cell-sub">${esc(s.subject)} · ${s.duration_min}m · ${esc(s.date)}</div></div>
              <span class="badge ${s.done ? 'badge-ok' : 'badge-mute'}">${s.done ? 'Done' : 'Open'}</span>
            </div>`).join('') || '<div class="mute" style="margin-bottom:12px">No study sessions.</div>'}
            <h3 style="margin:12px 0 8px;font-size:13.5px">Daily Goals (${goals.length})</h3>
            ${goals.map(g => `<div class="card" style="padding:10px 12px;margin-bottom:6px;display:flex;justify-content:space-between">
              <div><b>${esc(g.title)}</b><div class="cell-sub">${esc(g.category)} · ${esc(g.priority)} · ${esc(g.date)}</div></div>
              <span class="badge ${g.done ? 'badge-ok' : 'badge-mute'}">${g.done ? 'Done' : 'Open'}</span>
            </div>`).join('') || '<div class="mute">No goals logged.</div>'}
          ` : ''}
        </div>
        <div class="drawer-foot">
          <button type="button" class="btn btn-sec" id="cancel-drawer">Close</button>
        </div>
      </div>
    </div>`;
  }
  return '';
}

function renderModal() {
  const m = S.modal;
  if (!m) return '';
  if (m.type === 'verify') {
    return `<div class="overlay center" id="modal-overlay">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-head">
          <h2>Verify &amp; Publish ${m.kind === 'meal' ? 'Meal' : 'Skin Tip'}</h2>
          <button class="icon-btn" id="close-modal">${ICONS.close}</button>
        </div>
        <form id="verify-form">
          <div class="modal-body">
            <p style="margin:0 0 14px;color:var(--ink-2)">Signing off: <b>${esc(m.title)}</b></p>
            <div class="field"><label>Reviewed By (Doctor / Dietitian Name)</label><input name="reviewed_by" required placeholder="e.g. Dr. Ananya Sharma, RD" autofocus></div>
            <div class="field"><label>Source</label><input name="source_name" required value="${esc(m.source_name || '')}"></div>
            <div class="field"><label>Source URL (optional)</label><input name="source_url" value="${esc(m.source_url || '')}"></div>
          </div>
          <div class="modal-foot">
            <button type="button" class="btn btn-sec" id="cancel-modal">Cancel</button>
            <button type="submit" class="btn">Verify &amp; Publish</button>
          </div>
        </form>
      </div>
    </div>`;
  }
  if (m.type === 'confirm') {
    return `<div class="overlay center" id="modal-overlay">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-head">
          <h2>${esc(m.title)}</h2>
          <button class="icon-btn" id="close-modal">${ICONS.close}</button>
        </div>
        <div class="modal-body"><p style="margin:0;color:var(--ink-2)">${esc(m.body)}</p></div>
        <div class="modal-foot">
          <button type="button" class="btn btn-sec" id="cancel-modal">Cancel</button>
          <button type="button" class="btn btn-danger" id="confirm-ok">${esc(m.okText || 'Delete')}</button>
        </div>
      </div>
    </div>`;
  }
  return '';
}

function render() {
  if (!S.token) {
    $app.innerHTML = loginView();
    document.getElementById('login-form').onsubmit = async e => {
      e.preventDefault();
      S.loginErr = '';
      try {
        const r = await api('/auth/login', 'POST', Object.fromEntries(new FormData(e.target)));
        if (r.user.role !== 'admin') throw new Error('This account does not have admin privileges.');
        S.token = r.token;
        S.me = r.user;
        localStorage.setItem('dp_admin_token', r.token);
        toast('Welcome back, ' + r.user.name);
        loadTab('dash');
      } catch (err) {
        S.loginErr = err.message;
        render();
      }
    };
    return;
  }

  const st = S.data.stats || {};
  const nav = [
    { group: 'Overview', items: [['dash', 'Dashboard', ICONS.dash]] },
    {
      group: 'Content',
      items: [
        ['meals', 'Meals', ICONS.meals, st.needsReviewMeals || 0],
        ['foods', 'Foods', ICONS.foods],
        ['tips', 'Skin Tips', ICONS.tips, st.needsReviewTips || 0],
      ],
    },
    {
      group: 'Community',
      items: [
        ['users', 'Users', ICONS.users],
        ['pillars', 'Pillar Activity', ICONS.pillars],
      ],
    },
    { group: 'System', items: [['settings', 'Settings', ICONS.settings]] },
  ];

  const titles = {
    dash: ['Overview', 'Platform health, content reviews & engagement'],
    meals: ['Meals Catalog', 'Ingredient-based meals with live macro calculation'],
    foods: ['Foods Database', 'Per-100g verified nutrition entries'],
    tips: ['Skin Tips', 'Evidence-based dermatology & lifestyle tips'],
    users: ['User Management', 'Profiles, targets, roles & account status'],
    pillars: ['Pillar Activity', 'Recent Fitness, Study & Daily Goals logs'],
    settings: ['Admin Settings', 'Security & account configuration'],
  };
  const [title, sub] = titles[S.tab] || ['Admin', ''];
  const viewFn = { dash: dashView, meals: mealsView, foods: foodsView, tips: tipsView, users: usersView, pillars: pillarsView, settings: settingsView }[S.tab];

  $app.innerHTML = `
  <div class="shell">
    <div class="sb-backdrop ${S.sidebarOpen ? 'open' : ''}" id="sb-backdrop"></div>
    <aside class="sidebar ${S.sidebarOpen ? 'open' : ''}">
      <div class="sb-head">
        <img class="sb-logo" src="assets/logo.jpg" alt="DailyPilot">
        <div>
          <div class="sb-title">DailyPilot</div>
          <span class="sb-badge">Admin</span>
        </div>
      </div>
      <nav class="sb-nav">
        ${nav.map(g => `<div class="sb-group">${g.group}</div>${g.items.map(([k, label, icon, badge]) => `
          <button class="sb-item ${S.tab === k ? 'active' : ''}" data-nav="${k}">
            ${icon}<span>${label}</span>${badge ? `<span class="sb-count">${badge}</span>` : ''}
          </button>`).join('')}`).join('')}
      </nav>
      <div class="sb-foot">
        <div class="sb-user">
          <div class="avatar">${esc((S.me?.name || 'A')[0].toUpperCase())}</div>
          <div class="sb-user-info">
            <div class="sb-user-name">${esc(S.me?.name || 'Admin')}</div>
            <div class="sb-user-role">${esc(S.me?.email || 'Administrator')}</div>
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <a href="/" class="btn btn-sec btn-sm" style="flex:1;text-align:center">User App</a>
          <button class="btn btn-sec btn-sm" id="logout-btn" style="flex:1">Logout</button>
        </div>
      </div>
    </aside>

    <div class="main">
      <header class="topbar">
        <div class="tb-left">
          <button class="burger" id="burger-btn" aria-label="Menu">${ICONS.menu}</button>
          <div>
            <h1 class="tb-title">${title}</h1>
            <span class="tb-sub">${sub}</span>
          </div>
        </div>
        <div class="tb-right">
          <button class="icon-btn" id="theme-btn" title="Toggle theme">${S.theme === 'dark' ? ICONS.sun : ICONS.moon}</button>
          <button class="btn btn-sec btn-sm" id="refresh-btn">${S.loading ? 'Loading…' : 'Refresh'}</button>
        </div>
      </header>
      <main class="content">${viewFn()}</main>
    </div>
  </div>
  ${renderDrawer()}
  ${renderModal()}`;

  bindEvents();
}

function updateMealPreview() {
  const fm = new Map((S.data.foods || []).map(f => [f.id, f]));
  let kcal = 0, p = 0, c = 0, fat = 0;
  document.querySelectorAll('#ing-list .ing-row').forEach(row => {
    const food = fm.get(row.querySelector('.ing-food').value);
    const g = Number(row.querySelector('.ing-grams').value) || 0;
    if (food && g > 0) {
      kcal += (food.kcal * g) / 100;
      p += (food.protein * g) / 100;
      c += (food.carbs * g) / 100;
      fat += (food.fat * g) / 100;
    }
  });
  const el = id => document.getElementById(id);
  if (el('mp-kcal')) {
    el('mp-kcal').textContent = Math.round(kcal);
    el('mp-p').textContent = `${Math.round(p)}g`;
    el('mp-c').textContent = `${Math.round(c)}g`;
    el('mp-f').textContent = `${Math.round(fat)}g`;
  }
}

function bindEvents() {
  const g = id => document.getElementById(id);
  document.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => loadTab(b.dataset.nav));
  if (g('burger-btn')) g('burger-btn').onclick = () => { S.sidebarOpen = true; render(); };
  if (g('sb-backdrop')) g('sb-backdrop').onclick = () => { S.sidebarOpen = false; render(); };
  if (g('theme-btn')) g('theme-btn').onclick = toggleTheme;
  if (g('refresh-btn')) g('refresh-btn').onclick = () => loadTab(S.tab);
  if (g('logout-btn')) g('logout-btn').onclick = () => {
    S.token = null; S.me = null; localStorage.removeItem('dp_admin_token'); render();
  };

  // Dashboard quick links
  if (g('go-review-meals')) g('go-review-meals').onclick = () => { S.filters.meals.status = 'needs_review'; loadTab('meals'); };
  if (g('go-review-tips')) g('go-review-tips').onclick = () => { S.filters.tips.status = 'needs_review'; loadTab('tips'); };
  if (g('go-pillars')) g('go-pillars').onclick = () => loadTab('pillars');
  if (g('go-users')) g('go-users').onclick = () => loadTab('users');

  const focusEnd = id => { const el = g(id); if (el) { el.focus(); const n = el.value.length; el.setSelectionRange(n, n); } };
  // Meals filters & actions
  if (g('q-meals')) g('q-meals').oninput = e => { S.filters.meals.q = e.target.value; render(); focusEnd('q-meals'); };
  if (g('f-meal-slot')) g('f-meal-slot').onchange = e => { S.filters.meals.slot = e.target.value; render(); };
  if (g('f-meal-diet')) g('f-meal-diet').onchange = e => { S.filters.meals.diet = e.target.value; render(); };
  if (g('f-meal-status')) g('f-meal-status').onchange = e => { S.filters.meals.status = e.target.value; render(); };
  if (g('new-meal')) g('new-meal').onclick = () => {
    S.drawer = { type: 'meal', err: '', data: { title: '', slot: 'breakfast', diet_type: 'veg', skin_friendly: 0, allergens: '', notes: '', status: 'draft', source_name: '', source_url: '', reviewed_by: '', items: [] } };
    render();
  };
  document.querySelectorAll('[data-edit-meal]').forEach(b => b.onclick = () => {
    S.drawer = { type: 'meal', err: '', data: JSON.parse(JSON.stringify(S.data.meals.find(m => m.id === b.dataset.editMeal))) };
    render();
  });
  document.querySelectorAll('[data-verify-meal]').forEach(b => b.onclick = () => {
    const m = S.data.meals.find(x => x.id === b.dataset.verifyMeal);
    S.modal = { type: 'verify', kind: 'meal', id: m.id, title: m.title, source_name: m.source_name, source_url: m.source_url };
    render();
  });
  document.querySelectorAll('[data-del-meal]').forEach(b => b.onclick = () => {
    const m = S.data.meals.find(x => x.id === b.dataset.delMeal);
    S.modal = {
      type: 'confirm', title: 'Delete Meal', body: `Are you sure you want to delete "${m.title}"?`,
      onConfirm: async () => { await api('/admin/meals/' + m.id, 'DELETE'); toast('Meal deleted'); S.modal = null; loadTab('meals'); },
    };
    render();
  });

  // Foods filters & actions
  if (g('q-foods')) g('q-foods').oninput = e => { S.filters.foods.q = e.target.value; render(); focusEnd('q-foods'); };
  if (g('new-food')) g('new-food').onclick = () => { S.drawer = { type: 'food', err: '', data: { name: '', source_name: '', source_url: '' } }; render(); };
  document.querySelectorAll('[data-edit-food]').forEach(b => b.onclick = () => {
    S.drawer = { type: 'food', err: '', data: { ...S.data.foods.find(f => f.id === b.dataset.editFood) } };
    render();
  });
  document.querySelectorAll('[data-del-food]').forEach(b => b.onclick = () => {
    const f = S.data.foods.find(x => x.id === b.dataset.delFood);
    S.modal = {
      type: 'confirm', title: 'Delete Food', body: `Delete "${f.name}" from the database?`,
      onConfirm: async () => { await api('/admin/foods/' + f.id, 'DELETE'); toast('Food deleted'); S.modal = null; loadTab('foods'); },
    };
    render();
  });

  // Tips filters & actions
  if (g('q-tips')) g('q-tips').oninput = e => { S.filters.tips.q = e.target.value; render(); focusEnd('q-tips'); };
  if (g('f-tip-status')) g('f-tip-status').onchange = e => { S.filters.tips.status = e.target.value; render(); };
  if (g('new-tip')) g('new-tip').onclick = () => { S.drawer = { type: 'tip', err: '', data: { title: '', body: '', status: 'draft', source_name: '', source_url: '', reviewed_by: '' } }; render(); };
  document.querySelectorAll('[data-edit-tip]').forEach(b => b.onclick = () => {
    S.drawer = { type: 'tip', err: '', data: { ...S.data.tips.find(t => t.id === b.dataset.editTip) } };
    render();
  });
  document.querySelectorAll('[data-verify-tip]').forEach(b => b.onclick = () => {
    const t = S.data.tips.find(x => x.id === b.dataset.verifyTip);
    S.modal = { type: 'verify', kind: 'tip', id: t.id, title: t.title, source_name: t.source_name, source_url: t.source_url };
    render();
  });
  document.querySelectorAll('[data-del-tip]').forEach(b => b.onclick = () => {
    const t = S.data.tips.find(x => x.id === b.dataset.delTip);
    S.modal = {
      type: 'confirm', title: 'Delete Skin Tip', body: `Delete "${t.title}"?`,
      onConfirm: async () => { await api('/admin/tips/' + t.id, 'DELETE'); toast('Tip deleted'); S.modal = null; loadTab('tips'); },
    };
    render();
  });

  // Users filters & actions
  if (g('q-users')) g('q-users').oninput = e => { S.filters.users.q = e.target.value; render(); focusEnd('q-users'); };
  if (g('f-user-role')) g('f-user-role').onchange = e => { S.filters.users.role = e.target.value; render(); };
  if (g('f-user-goal')) g('f-user-goal').onchange = e => { S.filters.users.goal = e.target.value; render(); };
  if (g('new-user')) g('new-user').onclick = () => { S.drawer = { type: 'new-user', err: '' }; render(); };
  document.querySelectorAll('[data-view-user]').forEach(b => b.onclick = async () => {
    try {
      const detail = await api('/admin/users/' + b.dataset.viewUser);
      S.drawer = { type: 'user', utab: 'overview', data: detail };
      render();
    } catch (e) { toast(e.message, 'err'); }
  });
  document.querySelectorAll('[data-utab]').forEach(b => b.onclick = () => { if (S.drawer) { S.drawer.utab = b.dataset.utab; render(); } });

  // Pillars tabs & moderation delete
  document.querySelectorAll('[data-ptab]').forEach(b => b.onclick = () => { S.pillarTab = b.dataset.ptab; render(); });
  document.querySelectorAll('[data-del-act]').forEach(b => b.onclick = async () => {
    const [kind, id] = b.dataset.delAct.split(':');
    try { await api(`/admin/activity/${kind}/${id}`, 'DELETE'); toast('Item deleted'); loadTab('pillars'); }
    catch (err) { toast(err.message, 'err'); }
  });

  // Settings password form
  if (g('pw-form')) g('pw-form').onsubmit = async e => {
    e.preventDefault();
    try {
      await api('/admin/change-password', 'POST', Object.fromEntries(new FormData(e.target)));
      e.target.reset();
      toast('Admin password updated');
    } catch (err) { toast(err.message, 'err'); }
  };

  // Drawer bindings
  const closeDrawer = () => { S.drawer = null; render(); };
  if (g('close-drawer')) g('close-drawer').onclick = closeDrawer;
  if (g('cancel-drawer')) g('cancel-drawer').onclick = closeDrawer;
  if (g('drawer-overlay')) g('drawer-overlay').onclick = e => { if (e.target.id === 'drawer-overlay') closeDrawer(); };

  if (g('meal-form')) {
    updateMealPreview();
    g('ing-list').oninput = updateMealPreview;
    g('ing-list').onchange = updateMealPreview;
    g('ing-list').onclick = e => {
      if (e.target.classList.contains('ing-rm')) { e.target.closest('.ing-row').remove(); updateMealPreview(); }
    };
    g('add-ing').onclick = () => { g('ing-list').insertAdjacentHTML('beforeend', mealIngRow()); updateMealPreview(); };
    g('meal-form').onsubmit = async e => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(e.target));
      body.skin_friendly = e.target.skin_friendly.checked;
      body.items = [...document.querySelectorAll('#ing-list .ing-row')]
        .map(r => ({ food_id: r.querySelector('.ing-food').value, grams: r.querySelector('.ing-grams').value }))
        .filter(i => i.grams);
      try {
        const id = S.drawer.data.id;
        const r = await api('/admin/meals' + (id ? '/' + id : ''), id ? 'PUT' : 'POST', body);
        toast(r.warning || 'Meal saved', r.warning ? 'warn' : 'ok');
        S.drawer = null;
        loadTab('meals');
      } catch (err) {
        Object.assign(S.drawer.data, body);
        S.drawer.err = err.message;
        render();
      }
    };
  }

  if (g('food-form')) {
    const updateAtwater = () => {
      const f = g('food-form');
      const kcal = Number(f.kcal.value) || 0, p = Number(f.protein.value) || 0, c = Number(f.carbs.value) || 0, fat = Number(f.fat.value) || 0;
      const est = Math.round(p * 4 + c * 4 + fat * 9);
      const el = g('food-atwater');
      if (el) el.textContent = `Macro energy estimate: ~${est} kcal (entered: ${Math.round(kcal)} kcal)`;
    };
    updateAtwater();
    g('food-form').oninput = updateAtwater;
    g('food-form').onsubmit = async e => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(e.target));
      try {
        const id = S.drawer.data.id;
        await api('/admin/foods' + (id ? '/' + id : ''), id ? 'PUT' : 'POST', body);
        toast('Food saved');
        S.drawer = null;
        loadTab('foods');
      } catch (err) {
        Object.assign(S.drawer.data, body);
        S.drawer.err = err.message;
        render();
      }
    };
  }

  if (g('tip-form')) {
    g('tip-form').onsubmit = async e => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(e.target));
      try {
        const id = S.drawer.data.id;
        await api('/admin/tips' + (id ? '/' + id : ''), id ? 'PUT' : 'POST', body);
        toast('Skin tip saved');
        S.drawer = null;
        loadTab('tips');
      } catch (err) {
        Object.assign(S.drawer.data, body);
        S.drawer.err = err.message;
        render();
      }
    };
  }

  if (g('new-user-form')) {
    g('new-user-form').onsubmit = async e => {
      e.preventDefault();
      try {
        await api('/admin/users', 'POST', Object.fromEntries(new FormData(e.target)));
        toast('User created');
        S.drawer = null;
        loadTab('users');
      } catch (err) { S.drawer.err = err.message; render(); }
    };
  }

  if (g('edit-user-form')) {
    g('edit-user-form').onsubmit = async e => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(e.target));
      const u = S.drawer.data.user;
      const body = {
        name: fd.name,
        ...(fd.role ? { role: fd.role } : {}),
        ...(fd.newPassword ? { newPassword: fd.newPassword } : {}),
        profile: {
          ...(fd.goal ? { goal: fd.goal } : {}),
          ...(fd.diet_pref ? { diet_pref: fd.diet_pref } : {}),
          ...(fd.activity ? { activity: fd.activity } : {}),
          ...(fd.weight_kg ? { weight_kg: Number(fd.weight_kg) } : {}),
        },
      };
      try {
        await api('/admin/users/' + u.id, 'PUT', body);
        toast('User updated');
        S.drawer.data = await api('/admin/users/' + u.id);
        await loadTab('users', true);
      } catch (err) { toast(err.message, 'err'); }
    };
  }

  if (g('toggle-user-disable')) g('toggle-user-disable').onclick = async () => {
    const u = S.drawer.data.user;
    try {
      await api('/admin/users/' + u.id, 'PATCH', { disabled: !u.disabled });
      toast(u.disabled ? 'Account enabled' : 'Account disabled');
      S.drawer.data = await api('/admin/users/' + u.id);
      await loadTab('users', true);
    } catch (err) { toast(err.message, 'err'); }
  };

  if (g('toggle-user-role')) g('toggle-user-role').onclick = async () => {
    const u = S.drawer.data.user;
    const nextRole = u.role === 'admin' ? 'user' : 'admin';
    try {
      await api('/admin/users/' + u.id, 'PATCH', { role: nextRole });
      toast(`Role updated to ${nextRole}`);
      S.drawer.data = await api('/admin/users/' + u.id);
      await loadTab('users', true);
    } catch (err) { toast(err.message, 'err'); }
  };

  if (g('delete-user-btn')) g('delete-user-btn').onclick = () => {
    const u = S.drawer.data.user;
    S.modal = {
      type: 'confirm', title: 'Delete User', body: `Permanently delete ${u.name} (${u.email}) and all their logs?`,
      onConfirm: async () => { await api('/admin/users/' + u.id, 'DELETE'); toast('User deleted'); S.modal = null; S.drawer = null; loadTab('users'); },
    };
    render();
  };

  // Modal bindings
  const closeModal = () => { S.modal = null; render(); };
  if (g('close-modal')) g('close-modal').onclick = closeModal;
  if (g('cancel-modal')) g('cancel-modal').onclick = closeModal;
  if (g('modal-overlay')) g('modal-overlay').onclick = e => { if (e.target.id === 'modal-overlay') closeModal(); };
  if (g('confirm-ok')) g('confirm-ok').onclick = async () => {
    try { await S.modal.onConfirm(); } catch (err) { toast(err.message, 'err'); S.modal = null; render(); }
  };
  if (g('verify-form')) g('verify-form').onsubmit = async e => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    const ep = S.modal.kind === 'meal' ? `/admin/meals/${S.modal.id}/verify` : `/admin/tips/${S.modal.id}/verify`;
    try {
      await api(ep, 'POST', body);
      toast('Verified & published');
      S.modal = null;
      loadTab(S.tab);
    } catch (err) { toast(err.message, 'err'); }
  };
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (S.modal) { S.modal = null; render(); }
    else if (S.drawer) { S.drawer = null; render(); }
  }
});

S.token ? loadTab('dash') : render();
