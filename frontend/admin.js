const $app = document.getElementById('app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let S = { token: localStorage.getItem('dp_admin_token'), tab: 'dash', err: '', msg: '', data: {}, edit: null };

async function api(path, method = 'GET', body) {
  const r = await fetch(((window.DP_CONFIG && DP_CONFIG.API_URL) || '') + '/api' + path, { method, headers: { 'Content-Type': 'application/json', ...(S.token ? { Authorization: 'Bearer ' + S.token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 || r.status === 403) { S.token = null; localStorage.removeItem('dp_admin_token'); render(); throw new Error(j.error); }
  if (!r.ok) throw new Error(j.error || 'Error');
  return j;
}
const banner = () => (S.err ? `<div class="err">${esc(S.err)}</div>` : '') + (S.msg ? `<div class="warn">${esc(S.msg)}</div>` : '');
const flash = (err, msg = '') => { S.err = err; S.msg = msg; };
const pending = r => /^PENDING/i.test(r || '');
const SLOTS = { breakfast: 'Breakfast (morning)', lunch: 'Lunch (afternoon)', snack: 'Evening snack', dinner: 'Dinner' };

function loginView() {
  return `<h1>Admin login</h1>${banner()}<form id="lf" class="card" style="max-width:380px"><label>Email</label><input name="email" type="email" required>
  <label>Password</label><input name="password" type="password" required><button class="btn">Login</button></form>`;
}
async function load(tab) {
  S.tab = tab; S.edit = null;
  try {
    if (tab === 'dash') S.data.stats = await api('/admin/stats');
    if (tab === 'meals') { [S.data.meals, S.data.foods] = await Promise.all([api('/admin/meals'), api('/admin/foods')]); }
    if (tab === 'foods') S.data.foods = await api('/admin/foods');
    if (tab === 'tips') S.data.tips = await api('/admin/tips');
    if (tab === 'users') S.data.users = await api('/admin/users');
  } catch (x) { flash(x.message); }
  render();
}
function dashView() {
  const s = S.data.stats; if (!s) return '';
  return `<div class="grid3" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))">${[['Users', s.users], ['Published meals', s.publishedMeals], ['Draft meals', s.draftMeals], ['Foods', s.foods]].map(([l, v]) => `<div class="card"><b class="big">${v}</b><div class="mute">${l}</div></div>`).join('')}</div>
  ${s.needsReviewMeals + s.needsReviewTips ? `<div class="warn"><b>⚠️ Expert review pending:</b> ${s.needsReviewMeals} meals aur ${s.needsReviewTips} tips starter data hain jinhe kisi doctor/dietitian ne verify nahi kiya. Inhe Meals/Tips tab me kholo, apne dietitian se verify karwao, phir <b>Reviewed by</b> me unka naam aur source daalo.</div>` : '<div class="card">✅ Sab published content reviewed hai.</div>'}
  <div class="card"><h3>Content rules</h3><ul class="items"><li>Meal tabhi publish hoga jab <b>source</b> aur <b>reviewer (doctor/dietitian)</b> ka naam ho.</li><li>Calories & macros khud type nahi hote: ingredient × grams se automatic calculate hote hain.</li><li>Food ki calories macros se match na karein to save nahi hota.</li><li>Draft meals users ko nahi dikhte.</li></ul></div>`;
}

// ----- meals -----
function mealsView() {
  if (S.edit) return mealForm();
  const meals = S.data.meals || [];
  return `<div class="row" style="align-items:center"><h2>Meals (${meals.length})</h2><div style="text-align:right"><button class="btn sm" id="newMeal">+ New meal</button></div></div>
  <div class="card scroll"><table><tr><th>Meal</th><th>Slot</th><th>Type</th><th>kcal</th><th>P/C/F</th><th>Status</th><th>Reviewed by</th><th></th></tr>
  ${meals.map(m => `<tr><td>${esc(m.title)}${m.skin_friendly ? ' <span class="tag">skin</span>' : ''}</td><td>${m.slot}</td><td>${m.diet_type}</td><td>${Math.round(m.kcal)}</td>
  <td>${Math.round(m.protein)}/${Math.round(m.carbs)}/${Math.round(m.fat)}</td><td class="st-${m.status}">${m.status}</td><td class="${pending(m.reviewed_by) ? 'pend' : ''}">${esc(m.reviewed_by) || '-'}</td>
  <td><button class="link" data-editmeal="${m.id}">Edit</button> <button class="link" data-delmeal="${m.id}">Delete</button></td></tr>`).join('')}</table></div>`;
}
function ingRow(i = {}) {
  return `<div class="ing"><select class="food">${S.data.foods.map(f => `<option value="${f.id}" ${f.id === i.food_id ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}</select>
  <input class="grams" type="number" min="1" placeholder="grams" value="${i.grams ?? ''}"><button type="button" class="link rm">✕</button></div>`;
}
function mealForm() {
  const m = S.edit;
  return `<h2>${m.id ? 'Edit' : 'New'} meal</h2>${banner()}<form id="mf" class="card"><div class="form2">
  <div><label>Title</label><input name="title" required value="${esc(m.title)}"></div>
  <div><label>Slot</label><select name="slot">${Object.entries(SLOTS).map(([k, v]) => `<option value="${k}" ${m.slot === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
  <div><label>Veg / Non-veg</label><select name="diet_type"><option value="veg" ${m.diet_type === 'veg' ? 'selected' : ''}>Veg</option><option value="nonveg" ${m.diet_type === 'nonveg' ? 'selected' : ''}>Non-veg (egg/chicken/fish)</option></select></div>
  <div><label>Allergens</label><input name="allergens" value="${esc(m.allergens)}" placeholder="Milk, nuts, gluten…"></div></div>
  <label style="display:flex;gap:8px;align-items:center;color:var(--ink)"><input type="checkbox" name="skin_friendly" style="width:auto" ${m.skin_friendly ? 'checked' : ''}> Skin-friendly meal</label>
  <label>Ingredients (grams = jitna cooked/as-eaten weight)</label><div id="ings">${(m.items.length ? m.items : [{}]).map(ingRow).join('')}</div><button type="button" class="link" id="addIng">+ ingredient</button>
  <label>Notes (optional)</label><textarea name="notes" rows="2">${esc(m.notes)}</textarea>
  <div class="form2"><div><label>Source (doctor / dietitian / book / website)</label><input name="source_name" value="${esc(m.source_name)}"></div>
  <div><label>Source URL (optional)</label><input name="source_url" value="${esc(m.source_url)}"></div>
  <div><label>Reviewed by (doctor/dietitian name)</label><input name="reviewed_by" value="${esc(pending(m.reviewed_by) ? '' : m.reviewed_by)}"></div>
  <div><label>Status</label><select name="status"><option value="draft" ${m.status === 'draft' ? 'selected' : ''}>Draft (users ko nahi dikhega)</option><option value="published" ${m.status === 'published' ? 'selected' : ''}>Published</option></select></div></div>
  <div class="row"><button class="btn" type="submit">Save</button><button class="btn sec" type="button" id="cancel">Cancel</button></div></form>`;
}
function bindMeals() {
  const g = id => document.getElementById(id);
  if (g('newMeal')) g('newMeal').onclick = () => { S.edit = { title: '', slot: 'breakfast', diet_type: 'veg', skin_friendly: 0, allergens: '', notes: '', status: 'draft', source_name: '', source_url: '', reviewed_by: '', items: [] }; S.err = ''; render(); };
  document.querySelectorAll('[data-editmeal]').forEach(b => b.onclick = () => { S.edit = JSON.parse(JSON.stringify(S.data.meals.find(m => m.id == b.dataset.editmeal))); S.err = ''; render(); });
  document.querySelectorAll('[data-delmeal]').forEach(b => b.onclick = async () => { if (confirm('Delete this meal?')) { try { await api('/admin/meals/' + b.dataset.delmeal, 'DELETE'); } catch (x) { flash(x.message); } load('meals'); } });
  if (!g('mf')) return;
  g('cancel').onclick = () => { S.edit = null; S.err = ''; render(); };
  g('addIng').onclick = () => g('ings').insertAdjacentHTML('beforeend', ingRow());
  g('ings').onclick = e => { if (e.target.classList.contains('rm')) e.target.parentElement.remove(); };
  g('mf').onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target), body = Object.fromEntries(f);
    body.skin_friendly = e.target.skin_friendly.checked;
    body.items = [...document.querySelectorAll('.ing')].map(r => ({ food_id: r.querySelector('.food').value, grams: r.querySelector('.grams').value })).filter(i => i.grams);
    try {
      const r = await api('/admin/meals' + (S.edit.id ? '/' + S.edit.id : ''), S.edit.id ? 'PUT' : 'POST', body);
      flash('', r.warning || 'Saved ✔'); S.edit = null; await load('meals');
    } catch (x) { Object.assign(S.edit, body); S.err = x.message; render(); }
  };
}

// ----- foods -----
function foodsView() {
  const e = S.edit, foods = S.data.foods || [];
  const form = e ? `<form id="ff" class="card"><h3>${e.id ? 'Edit' : 'New'} food (per 100 g)</h3><div class="form2">
    <div><label>Name</label><input name="name" required value="${esc(e.name)}"></div>
    ${['kcal', 'protein', 'carbs', 'fat'].map(k => `<div><label>${k}${k === 'kcal' ? '' : ' (g)'}</label><input name="${k}" type="number" step="0.1" min="0" required value="${e[k] ?? ''}"></div>`).join('')}
    <div><label>Source</label><input name="source_name" value="${esc(e.source_name)}" placeholder="USDA FoodData Central / IFCT 2017"></div>
    <div><label>Source URL</label><input name="source_url" value="${esc(e.source_url)}"></div></div>
    <div class="row"><button class="btn">Save</button><button class="btn sec" type="button" id="cancel">Cancel</button></div></form>` : '';
  return `<div class="row" style="align-items:center"><h2>Foods (${foods.length})</h2><div style="text-align:right"><button class="btn sm" id="newFood">+ New food</button></div></div>${form}
  <div class="card scroll"><table><tr><th>Food</th><th>kcal</th><th>P</th><th>C</th><th>F</th><th>Source</th><th></th></tr>${foods.map(f => `<tr><td>${esc(f.name)}</td><td>${f.kcal}</td><td>${f.protein}</td><td>${f.carbs}</td><td>${f.fat}</td><td>${esc(f.source_name)}</td>
  <td><button class="link" data-editfood="${f.id}">Edit</button> <button class="link" data-delfood="${f.id}">Delete</button></td></tr>`).join('')}</table></div>`;
}
function bindFoods() {
  const g = id => document.getElementById(id);
  g('newFood').onclick = () => { S.edit = { name: '', source_name: '', source_url: '' }; S.err = ''; render(); };
  document.querySelectorAll('[data-editfood]').forEach(b => b.onclick = () => { S.edit = { ...S.data.foods.find(f => f.id == b.dataset.editfood) }; S.err = ''; render(); });
  document.querySelectorAll('[data-delfood]').forEach(b => b.onclick = async () => { if (confirm('Delete this food?')) { try { await api('/admin/foods/' + b.dataset.delfood, 'DELETE'); flash('', 'Deleted'); } catch (x) { flash(x.message); } load('foods'); } });
  if (!g('ff')) return;
  g('cancel').onclick = () => { S.edit = null; render(); };
  g('ff').onsubmit = async e => {
    e.preventDefault();
    try { await api('/admin/foods' + (S.edit.id ? '/' + S.edit.id : ''), S.edit.id ? 'PUT' : 'POST', Object.fromEntries(new FormData(e.target))); flash('', 'Saved ✔'); await load('foods'); }
    catch (x) { S.err = x.message; Object.assign(S.edit, Object.fromEntries(new FormData(e.target))); render(); }
  };
}

// ----- tips -----
function tipsView() {
  const e = S.edit, tips = S.data.tips || [];
  const form = e ? `<form id="tf" class="card"><h3>${e.id ? 'Edit' : 'New'} skin tip</h3><label>Title</label><input name="title" required value="${esc(e.title)}">
    <label>Body</label><textarea name="body" rows="3" required>${esc(e.body)}</textarea><div class="form2">
    <div><label>Source</label><input name="source_name" value="${esc(e.source_name)}"></div><div><label>Source URL</label><input name="source_url" value="${esc(e.source_url)}"></div>
    <div><label>Reviewed by</label><input name="reviewed_by" value="${esc(pending(e.reviewed_by) ? '' : e.reviewed_by)}"></div>
    <div><label>Status</label><select name="status"><option value="draft" ${e.status === 'draft' ? 'selected' : ''}>Draft</option><option value="published" ${e.status === 'published' ? 'selected' : ''}>Published</option></select></div></div>
    <div class="row"><button class="btn">Save</button><button class="btn sec" type="button" id="cancel">Cancel</button></div></form>` : '';
  return `<div class="row" style="align-items:center"><h2>Skin tips</h2><div style="text-align:right"><button class="btn sm" id="newTip">+ New tip</button></div></div>${form}
  <div class="card scroll"><table><tr><th>Tip</th><th>Status</th><th>Source</th><th>Reviewed by</th><th></th></tr>${tips.map(t => `<tr><td>${esc(t.title)}</td><td class="st-${t.status}">${t.status}</td><td>${esc(t.source_name)}</td><td class="${pending(t.reviewed_by) ? 'pend' : ''}">${esc(t.reviewed_by) || '-'}</td>
  <td><button class="link" data-edittip="${t.id}">Edit</button> <button class="link" data-deltip="${t.id}">Delete</button></td></tr>`).join('')}</table></div>`;
}
function bindTips() {
  const g = id => document.getElementById(id);
  g('newTip').onclick = () => { S.edit = { title: '', body: '', status: 'draft', source_name: '', source_url: '', reviewed_by: '' }; S.err = ''; render(); };
  document.querySelectorAll('[data-edittip]').forEach(b => b.onclick = () => { S.edit = { ...S.data.tips.find(t => t.id == b.dataset.edittip) }; S.err = ''; render(); });
  document.querySelectorAll('[data-deltip]').forEach(b => b.onclick = async () => { if (confirm('Delete this tip?')) { await api('/admin/tips/' + b.dataset.deltip, 'DELETE'); load('tips'); } });
  if (!g('tf')) return;
  g('cancel').onclick = () => { S.edit = null; render(); };
  g('tf').onsubmit = async e => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    try { await api('/admin/tips' + (S.edit.id ? '/' + S.edit.id : ''), S.edit.id ? 'PUT' : 'POST', body); flash('', 'Saved ✔'); await load('tips'); }
    catch (x) { S.err = x.message; Object.assign(S.edit, body); render(); }
  };
}
function usersView() {
  return `<h2>Users</h2><div class="card scroll"><table><tr><th>Name</th><th>Email</th><th>Goal</th><th>Diet</th><th>Weight</th><th>Joined</th></tr>${(S.data.users || []).map(u => `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.goal) || '-'}</td><td>${esc(u.diet_pref) || '-'}</td><td>${u.weight_kg ?? '-'}</td><td>${esc(u.created_at)}</td></tr>`).join('')}</table></div>`;
}

const TABS = [['dash', 'Dashboard'], ['meals', 'Meals'], ['foods', 'Foods'], ['tips', 'Skin tips'], ['users', 'Users']];
function render() {
  if (!S.token) {
    $app.innerHTML = loginView();
    document.getElementById('lf').onsubmit = async e => {
      e.preventDefault();
      try {
        const r = await api('/auth/login', 'POST', Object.fromEntries(new FormData(e.target)));
        if (r.user.role !== 'admin') throw new Error('Ye admin account nahi hai.');
        S.token = r.token; localStorage.setItem('dp_admin_token', r.token); flash(''); load('dash');
      } catch (x) { S.token = null; flash(x.message); render(); }
    };
    return;
  }
  const view = { dash: dashView, meals: mealsView, foods: foodsView, tips: tipsView, users: usersView }[S.tab]();
  $app.innerHTML = `<h1>DailyPilot Admin</h1><div class="top">${TABS.map(([k, l]) => `<button data-tab="${k}" class="${S.tab === k ? 'on' : ''}">${l}</button>`).join('')}<button id="out" style="margin-left:auto">Logout</button></div>${S.tab !== 'meals' || !S.edit ? banner() : ''}${view}`;
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { flash(''); load(b.dataset.tab); });
  document.getElementById('out').onclick = () => { S.token = null; localStorage.removeItem('dp_admin_token'); render(); };
  if (S.tab === 'meals') bindMeals(); if (S.tab === 'foods') bindFoods(); if (S.tab === 'tips') bindTips();
}
S.token ? load('dash') : render();
