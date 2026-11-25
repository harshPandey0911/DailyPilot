// DailyPilot user app (vanilla JS, mobile-first). All data comes from /api -> same API will serve the native app.
const $app = document.getElementById('app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const localDate = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
let S = { token: localStorage.getItem('dp_token'), user: null, tab: 'today', profile: null, targets: null, plan: null, progress: null, form: {}, step: 0, authMode: 'login', err: '' };

async function api(path, method = 'GET', body) {
  const r = await fetch(((window.DP_CONFIG && DP_CONFIG.API_URL) || '') + '/api' + path, { method, headers: { 'Content-Type': 'application/json', ...(S.token ? { Authorization: 'Bearer ' + S.token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && S.token) { logout(); throw new Error(j.error || 'Login again'); }
  if (!r.ok) throw new Error(j.error || 'Error');
  return j;
}
function logout() { localStorage.removeItem('dp_token'); S = { ...S, token: null, user: null, profile: null, plan: null }; render(); }
const setErr = e => { S.err = e; };
const errBox = () => (S.err ? `<div class="err">${esc(S.err)}</div>` : '');

// ---------- auth ----------
function authView() {
  const reg = S.authMode === 'register';
  return `<h1>🥗 DailyPilot</h1><p class="mute">Aapka personal fitness & diet saathi</p>${errBox()}
  <form id="authForm" class="card">
    ${reg ? '<label>Naam</label><input name="name" required maxlength="60" autocomplete="name">' : ''}
    <label>Email</label><input name="email" type="email" required autocomplete="email">
    <label>Password ${reg ? '(min 8 characters)' : ''}</label><input name="password" type="password" required minlength="${reg ? 8 : 1}" autocomplete="${reg ? 'new-password' : 'current-password'}">
    <button class="btn">${reg ? 'Account banao' : 'Login'}</button>
  </form>
  <button class="link" id="toggleAuth">${reg ? 'Account hai? Login karo' : 'Naya account banao'}</button>`;
}
function bindAuth() {
  document.getElementById('toggleAuth').onclick = () => { S.authMode = S.authMode === 'login' ? 'register' : 'login'; S.err = ''; render(); };
  document.getElementById('authForm').onsubmit = async e => {
    e.preventDefault();
    const b = Object.fromEntries(new FormData(e.target));
    try {
      const r = await api('/auth/' + S.authMode, 'POST', b);
      S.token = r.token; S.user = r.user; localStorage.setItem('dp_token', r.token); S.err = '';
      await boot();
    } catch (x) { setErr(x.message); render(); }
  };
}

// ---------- onboarding ----------
const GOAL_OPTS = [['lose', '🔥 Patla / Fat loss', 'Weight kam karna hai'], ['fit', '💪 Fit rehna', 'Weight maintain, body tone'], ['bulk', '🏋️ Bulking', 'Muscle & weight badhana']];
const ACT_OPTS = [['sedentary', 'Bahut kam', 'Desk job, exercise nahi'], ['light', 'Light', 'Hafte me 1-3 din'], ['moderate', 'Moderate', 'Hafte me 3-5 din'], ['active', 'Very active', 'Hafte me 6-7 din']];
const DIET_OPTS = [['veg', '🥬 Veg', 'Sirf veg'], ['nonveg', '🍗 Non-veg', 'Veg + non-veg'], ['both', '🍽️ Dono', 'Veg + non-veg']];
const optGroup = (name, opts) => `<div class="opts">${opts.map(([v, t, d]) => `<button type="button" class="opt ${S.form[name] === v ? 'on' : ''}" data-name="${name}" data-v="${v}"><b>${t}</b><span>${d || ''}</span></button>`).join('')}</div>`;

function onboardView() {
  const f = S.form, steps = [
    `<h2>Aapke baare me</h2><label>Gender</label>${optGroup('gender', [['male', '👨 Male'], ['female', '👩 Female']])}
     <div class="row"><div><label>Age (saal)</label><input name="age" type="number" inputmode="numeric" value="${esc(f.age)}"></div>
     <div><label>Height (cm)</label><input name="height_cm" type="number" inputmode="decimal" value="${esc(f.height_cm)}"></div></div>
     <label>Weight (kg)</label><input name="weight_kg" type="number" inputmode="decimal" step="0.1" value="${esc(f.weight_kg)}">`,
    `<h2>Aapka goal kya hai?</h2>${optGroup('goal', GOAL_OPTS)}<h2>Roz kitni activity?</h2>${optGroup('activity', ACT_OPTS)}`,
    `<h2>Aap kya khate ho?</h2>${optGroup('diet_pref', DIET_OPTS)}
     <label style="display:flex;gap:10px;align-items:center;margin-top:20px;color:var(--ink)"><input type="checkbox" name="skin_care" style="width:auto" ${f.skin_care ? 'checked' : ''}> Skin care bhi chahiye (skin-friendly diet + tips)</label>`,
  ];
  return `<h1>Profile banao</h1><p class="mute">Step ${S.step + 1} / 3</p>${errBox()}<div class="card">${steps[S.step]}</div>
  <div class="row">${S.step ? '<button class="btn sec" id="back">Back</button>' : ''}<button class="btn" id="next">${S.step === 2 ? 'Meri calories dikhao' : 'Aage'}</button></div>`;
}
function readFields() { document.querySelectorAll('#app input').forEach(i => { S.form[i.name] = i.type === 'checkbox' ? i.checked : i.value; }); }
function bindOnboard() {
  document.querySelectorAll('.opt').forEach(b => b.onclick = () => { readFields(); S.form[b.dataset.name] = b.dataset.v; render(); });
  const back = document.getElementById('back'); if (back) back.onclick = () => { readFields(); S.step--; S.err = ''; render(); };
  document.getElementById('next').onclick = async () => {
    readFields(); const f = S.form;
    const need = [['gender', 'Gender select karo'], ['age', 'Age daalo'], ['height_cm', 'Height daalo'], ['weight_kg', 'Weight daalo'], ['goal', 'Goal select karo'], ['activity', 'Activity select karo'], ['diet_pref', 'Diet type select karo']];
    const stepFields = [[0, 1, 2, 3], [4, 5], [6]][S.step];
    for (const i of stepFields) if (!f[need[i][0]]) { setErr(need[i][1]); return render(); }
    S.err = '';
    if (S.step < 2) { S.step++; return render(); }
    try { const r = await api('/profile', 'PUT', { ...f, date: localDate() }); S.profile = r.profile; S.targets = r.targets; S.step = 3; render(); }
    catch (x) { setErr(x.message); render(); }
  };
}
function resultView() {
  const t = S.targets, goalTxt = { lose: 'fat loss', fit: 'fit rehne', bulk: 'bulking' }[t.goal];
  return `<h1>Aapka plan taiyaar hai 🎉</h1>
  <div class="card"><div class="mute">Maintenance calories (weight same rakhne ke liye)</div><div class="big">${t.tdee} kcal</div>
  <div class="mute">BMI ${t.bmi} (${t.bmiCategory}) · BMR ${t.bmr} kcal</div></div>
  <div class="card"><div class="mute">${goalTxt} ke liye roz ki target</div><div class="big">${t.calories} kcal</div>
  <div class="grid3" style="margin-top:10px"><div><b>${t.protein}g</b><span class="mute">Protein</span></div><div><b>${t.carbs}g</b><span class="mute">Carbs</span></div><div><b>${t.fat}g</b><span class="mute">Fat</span></div></div>
  <p class="mute">🚶 Steps goal: ${t.stepsGoal.toLocaleString()} · 💧 Paani: ~${t.waterL} L</p></div>
  ${t.warnings.map(w => `<div class="warn">⚠️ ${esc(w)}</div>`).join('')}
  <button class="btn" id="start">Meri diet dekho</button>`;
}

// ---------- today ----------
const pct = (a, b) => Math.min(100, Math.round((a / (b || 1)) * 100));
function todayView() {
  const p = S.plan; if (!p) return '<p class="mute">Loading…</p>';
  const t = p.targets, e = p.totals.eaten;
  const prog = S.progress, todaySteps = (prog?.steps.find(s => s.date === localDate()) || {}).steps || '';
  return `<h1>Namaste, ${esc(S.user.name.split(' ')[0])} 👋</h1>${errBox()}
  <div class="card"><div class="row" style="align-items:end"><div><div class="mute">Aaj khaya</div><div class="big">${Math.round(e.kcal)}</div></div><div style="text-align:right"><div class="mute">Target</div><b>${t.calories} kcal</b></div></div>
  <div class="bar"><i style="width:${pct(e.kcal, t.calories)}%"></i></div>
  <div class="mute">Protein ${Math.round(e.protein)}/${t.protein}g · Carbs ${Math.round(e.carbs)}/${t.carbs}g · Fat ${Math.round(e.fat)}/${t.fat}g</div></div>
  ${p.slots.map(slotView).join('')}
  <div class="card"><h3>🚶 Aaj ke steps</h3><div class="steps" style="margin-top:8px"><input id="stepsIn" type="number" inputmode="numeric" placeholder="0" value="${todaySteps}"><button class="btn sm" id="saveSteps">Save</button></div>
  <div class="bar"><i style="width:${pct(todaySteps || 0, t.stepsGoal)}%"></i></div><div class="mute">Goal ${t.stepsGoal.toLocaleString()} steps</div></div>
  <p class="mute" style="font-size:12px">ℹ️ Ye general jaankari hai, medical advice nahi. Koi bimari, pregnancy ya allergy ho to doctor/dietitian se poochho.</p>`;
}
function slotView(s) {
  const m = s.meal;
  if (!m) return `<div class="card"><h3>${s.label}</h3><p class="mute">Is slot ke liye abhi koi verified meal available nahi hai.</p></div>`;
  return `<div class="card meal ${s.done ? 'done' : ''}">
    <button class="chk ${s.done ? 'on' : ''}" data-check="${s.slot}" data-done="${s.done ? 0 : 1}" aria-label="Mark ${s.label} done">${s.done ? '✓' : ''}</button>
    <div style="flex:1"><div class="mute">${s.time} · ${s.label}</div><h3>${esc(m.title)}</h3>
    <ul class="items">${m.items.map(i => `<li>${esc(i.name)} — ${i.grams} g</li>`).join('')}</ul>
    <span class="tag">${m.kcal} kcal</span><span class="tag">P ${m.protein}g</span><span class="tag">C ${m.carbs}g</span><span class="tag">F ${m.fat}g</span>
    ${m.allergens ? `<div class="mute" style="font-size:12px;margin-top:4px">Allergens: ${esc(m.allergens)}</div>` : ''}
    ${m.notes ? `<div class="mute" style="font-size:12px">${esc(m.notes)}</div>` : ''}
    <button class="link" data-swap="${s.slot}">🔄 Kuch aur dikhao</button></div></div>`;
}
async function loadToday() {
  try { [S.plan, S.progress] = await Promise.all([api('/plan?date=' + localDate()), api('/progress')]); S.err = ''; }
  catch (x) { setErr(x.message); }
}
function bindToday() {
  document.querySelectorAll('[data-check]').forEach(b => b.onclick = async () => {
    try { S.plan = await api('/plan/check', 'POST', { date: localDate(), slot: b.dataset.check, done: b.dataset.done === '1' }); S.err = ''; } catch (x) { setErr(x.message); } render();
  });
  document.querySelectorAll('[data-swap]').forEach(b => b.onclick = async () => {
    try { S.plan = await api('/plan/swap', 'POST', { date: localDate(), slot: b.dataset.swap }); S.err = ''; } catch (x) { setErr(x.message); } render();
  });
  const ss = document.getElementById('saveSteps'); if (ss) ss.onclick = async () => {
    try { await api('/steps', 'PUT', { date: localDate(), steps: document.getElementById('stepsIn').value }); S.progress = await api('/progress'); S.err = ''; } catch (x) { setErr(x.message); } render();
  };
}

// ---------- progress / tips / profile ----------
function progressView() {
  const pr = S.progress || { steps: [], weights: [] }, goal = S.targets.stepsGoal;
  const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); const k = new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); return { k, l: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][d.getDay()], v: (pr.steps.find(s => s.date === k) || {}).steps || 0 }; });
  const max = Math.max(goal, ...days.map(d => d.v));
  const w = pr.weights, change = w.length > 1 ? (w[w.length - 1].kg - w[0].kg).toFixed(1) : null;
  return `<h1>Progress</h1><div class="card"><h3>Steps (7 din)</h3><div class="spark" style="margin-top:10px">${days.map(d => `<div><i style="height:${Math.max(2, (d.v / max) * 70)}px;${d.v >= goal ? '' : 'opacity:.55'}"></i>${d.l}</div>`).join('')}</div><div class="mute">Goal: ${goal.toLocaleString()} steps</div></div>
  <div class="card"><h3>⚖️ Weight</h3>${w.length ? `<div class="big">${w[w.length - 1].kg} kg</div>${change !== null ? `<div class="mute">Shuru se ${change > 0 ? '+' : ''}${change} kg</div>` : ''}
  <ul class="items">${w.slice(-6).reverse().map(x => `<li>${x.date}: ${x.kg} kg</li>`).join('')}</ul>` : '<p class="mute">Abhi koi entry nahi.</p>'}
  <p class="mute">Naya weight daalne ke liye Profile tab me update karo.</p></div>`;
}
function tipsView() {
  const tips = S.plan?.tips || [];
  if (!S.profile.skin_care) return '<h1>Skin care</h1><div class="card"><p>Skin care mode off hai. Profile me ON karo to skin-friendly diet aur tips milenge.</p></div>';
  return `<h1>Skin care tips ✨</h1>${tips.length ? tips.map(t => `<div class="card"><h3>${esc(t.title)}</h3><p>${esc(t.body)}</p><small class="src">Source: ${t.source_url ? `<a href="${esc(t.source_url)}" target="_blank" rel="noopener">${esc(t.source_name)}</a>` : esc(t.source_name)}</small></div>`).join('') : '<p class="mute">Abhi koi tip available nahi.</p>'}
  <p class="mute" style="font-size:12px">Skin ki koi problem (acne, allergy, rashes) ho to dermatologist se milo.</p>`;
}
function profileView() {
  const f = S.form;
  return `<h1>Profile</h1>${errBox()}<div class="card"><b>${esc(S.user.name)}</b><div class="mute">${esc(S.user.email)}</div></div>
  <div class="card"><div class="row"><div><label>Age</label><input name="age" type="number" value="${esc(f.age)}"></div><div><label>Height (cm)</label><input name="height_cm" type="number" value="${esc(f.height_cm)}"></div></div>
  <label>Weight (kg)</label><input name="weight_kg" type="number" step="0.1" value="${esc(f.weight_kg)}">
  <label>Goal</label>${optGroup('goal', GOAL_OPTS)}<label>Activity</label>${optGroup('activity', ACT_OPTS)}<label>Diet</label>${optGroup('diet_pref', DIET_OPTS)}
  <label style="display:flex;gap:10px;align-items:center;color:var(--ink)"><input type="checkbox" name="skin_care" style="width:auto" ${f.skin_care ? 'checked' : ''}> Skin care mode</label>
  <button class="btn" id="saveProfile">Update karo</button></div><button class="btn sec" id="logout">Logout</button>`;
}
function bindProfile() {
  document.querySelectorAll('.opt').forEach(b => b.onclick = () => { readFields(); S.form[b.dataset.name] = b.dataset.v; render(); });
  document.getElementById('logout').onclick = logout;
  document.getElementById('saveProfile').onclick = async () => {
    readFields();
    try { const r = await api('/profile', 'PUT', { ...S.form, date: localDate() }); S.profile = r.profile; S.targets = r.targets; await loadToday(); S.tab = 'today'; S.err = ''; }
    catch (x) { setErr(x.message); } render();
  };
}

// ---------- shell ----------
const TABS = [['today', '🍽️', 'Aaj'], ['progress', '📈', 'Progress'], ['tips', '✨', 'Skin'], ['profile', '👤', 'Profile']];
function render() {
  if (!S.token || !S.user) { $app.innerHTML = authView(); return bindAuth(); }
  if (!S.profile || S.step > 0) {
    $app.innerHTML = S.step === 3 ? resultView() : onboardView();
    if (S.step === 3) document.getElementById('start').onclick = async () => { S.step = 0; await loadToday(); S.tab = 'today'; render(); };
    else bindOnboard();
    return;
  }
  const views = { today: [todayView, bindToday], progress: [progressView], tips: [tipsView], profile: [profileView, bindProfile] };
  const [v, b] = views[S.tab];
  $app.innerHTML = v() + `<nav><div>${TABS.map(([k, i, l]) => `<button data-tab="${k}" class="${S.tab === k ? 'on' : ''}"><span>${i}</span>${l}</button>`).join('')}</div></nav>`;
  document.querySelectorAll('[data-tab]').forEach(x => x.onclick = () => {
    S.tab = x.dataset.tab; S.err = '';
    if (S.tab === 'profile') S.form = { ...S.profile };
    if (S.tab === 'progress') api('/progress').then(p => { S.progress = p; render(); });
    render();
  });
  if (b) b();
}
async function boot() {
  if (!S.token) return render();
  try {
    S.user = (await api('/me')).user;
    const r = await api('/profile');
    S.profile = r.profile; S.targets = r.targets || null;
    if (S.profile) { S.form = { ...S.profile }; await loadToday(); } else S.form = {};
  } catch (x) { return; }
  render();
}
boot();
