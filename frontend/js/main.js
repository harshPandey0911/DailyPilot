import { S, localDate, setErr } from './state.js';
import { api, loadData, logout, savePrefs } from './api.js';
import { statusBarView, headerView, navView, modalView, sideNavView } from './components/shell.js';
import { authView, bindAuth, onboardView, bindOnboard } from './pages/auth.page.js';
import { overviewPage, schedulePage, analyticsPage } from './pages/overview.page.js';
import { healthOverviewPage, exercisePage, healthDietPage } from './pages/fitness.page.js';
import { activityPage, bindActivity } from './pages/activity.page.js';
import { studyTimerPage, studySessionsPage, studySubjectsPage } from './pages/study.page.js';
import { goalsPage } from './pages/goals.page.js';
import { profilePage, profileEditPage } from './pages/profile.page.js';
import { notificationsPage } from './pages/notifications.page.js';

const $app = document.getElementById('app');

const ROUTES = {
  '/overview': overviewPage,
  '/health': healthOverviewPage,
  '/health/diet': healthDietPage,
  '/health/activity': activityPage,
  '/exercise': exercisePage,
  '/fitness': healthOverviewPage,
  '/fitness/workouts': exercisePage,
  '/fitness/diet': healthDietPage,
  '/study': studyTimerPage,
  '/study/sessions': studySessionsPage,
  '/study/subjects': studySubjectsPage,
  '/goals': goalsPage,
  '/notifications': notificationsPage,
  '/schedule': schedulePage,
  '/analytics': analyticsPage,
  '/profile': profilePage,
  '/profile/edit': profileEditPage,
};

function go(route, push = true) {
  if (!S.token) {
    S.route = (route === '/signup' || route === '/register') ? '/signup' : '/login';
  } else {
    S.route = ROUTES[route] ? route : '/overview';
  }
  if (S.route.startsWith('/health') || S.route === '/fitness' || S.route === '/fitness/diet') S.pillar = 'health';
  else if (S.route.startsWith('/exercise') || S.route === '/fitness/workouts') S.pillar = 'exercise';
  else if (S.route.startsWith('/study')) S.pillar = 'study';
  else if (S.route === '/goals') S.pillar = 'goals';
  else if (S.route === '/overview') S.pillar = 'overview';
  S.ddOpen = false;
  S.sideNavOpen = false;
  S.arcOpen = false;
  if (location.pathname !== S.route) {
    history[push ? 'pushState' : 'replaceState'](null, '', S.route);
  }
  render();
}

function render() {
  if (!S.token) {
    const isSignup = S.route === '/signup' || S.route === '/register';
    S.authMode = isSignup ? 'register' : 'login';
    const targetPath = isSignup ? '/signup' : '/login';
    if (location.pathname !== targetPath) history.replaceState(null, '', targetPath);
    $app.innerHTML = statusBarView() + `<div class="dp-scroll dp-auth-stage">${authView()}</div>`;
    return bindAuth(render, boot, go);
  }
  if (!S.profile) {
    $app.innerHTML = statusBarView() + `<div class="dp-scroll">${onboardView()}</div>`;
    return bindOnboard(render, loadData);
  }
  const pageFn = ROUTES[S.route] || overviewPage;
  $app.innerHTML = statusBarView() + headerView() + `<main class="dp-scroll">${pageFn()}</main>` + navView() + modalView() + sideNavView();
  bindShell();
}

function bindShell() {
  // Navigation & Dropdown
  const trig = document.getElementById('ddTrigger');
  if (trig) trig.onclick = e => { e.stopPropagation(); S.ddOpen = !S.ddOpen; render(); };

  const osn = document.getElementById('openSideNav');
  if (osn) osn.onclick = e => { e.stopPropagation(); S.ddOpen = false; S.sideNavOpen = true; render(); };
  const csn = document.getElementById('closeSideNav');
  if (csn) csn.onclick = () => { S.sideNavOpen = false; render(); };
  const snb = document.getElementById('sideNavBackdrop');
  if (snb) snb.onclick = e => { if (e.target === snb) { S.sideNavOpen = false; render(); } };

  document.querySelectorAll('[data-pillar]').forEach(b => b.onclick = () => {
    const p = b.dataset.pillar;
    S.pillar = p;
    go(p === 'overview' ? '/overview' : '/' + p);
  });
  document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go));

  const sb = document.getElementById('searchBox');
  if (sb) sb.oninput = e => {
    const pos = e.target.selectionStart;
    S.searchQ = e.target.value;
    render();
    const next = document.getElementById('searchBox');
    if (next) { next.focus(); if (pos != null) next.setSelectionRange(pos, pos); }
  };
  const cs = document.getElementById('clearSearch');
  if (cs) cs.onclick = () => { S.searchQ = ''; render(); document.getElementById('searchBox')?.focus(); };

  // Quick Add FAB
  const fab = document.getElementById('fabAdd');
  if (fab) fab.onclick = () => { S.sideNavOpen = false; S.modalPillar = (S.pillar === 'overview' || S.pillar === 'health') ? 'goals' : S.pillar; S.modal = 'add'; render(); };
  document.querySelectorAll('[data-openadd]').forEach(b => b.onclick = () => { S.sideNavOpen = false; S.modalPillar = b.dataset.openadd; S.modal = 'add'; render(); });

  // Recommended exercise preset add
  document.querySelectorAll('[data-addrec]').forEach(b => b.onclick = async () => {
    const rec = S.recommendations?.workouts?.[Number(b.dataset.addrec)];
    if (!rec) return;
    S.arcOpen = false;
    const payload = { title: rec.title, category: rec.category, duration_min: rec.duration_min, calories: rec.calories };
    await api('/workouts', 'POST', { date: localDate(), ...payload, done: false });
    await loadData();
    render();
  });

  // Floating half-oval arc menu (tap to toggle, drag to snap left/right anywhere vertically)
  const arcBtn = document.getElementById('arcFabBtn');
  const arcWrap = document.getElementById('arcWrap');
  if (arcBtn && arcWrap) {
    let dragging = false, moved = false, startX = 0, startY = 0, origLeft = 0, origTop = 0;
    arcBtn.onpointerdown = e => {
      if (e.button && e.button !== 0) return;
      const rect = arcWrap.getBoundingClientRect();
      dragging = true;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      origLeft = rect.left;
      origTop = rect.top;
      arcBtn.setPointerCapture(e.pointerId);
    };
    arcBtn.onpointermove = e => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!moved && Math.hypot(dx, dy) > 6) {
        moved = true;
        if (S.arcOpen) S.arcOpen = false;
        arcWrap.classList.add('dragging');
      }
      if (!moved) return;
      const maxX = window.innerWidth - 62;
      const maxY = window.innerHeight - (window.innerWidth <= 640 ? 136 : 74);
      const nx = Math.max(8, Math.min(maxX, origLeft + dx));
      const ny = Math.max(68, Math.min(maxY, origTop + dy));
      arcWrap.style.left = nx + 'px';
      arcWrap.style.right = 'auto';
      arcWrap.style.top = ny + 'px';
      arcWrap.style.bottom = 'auto';
    };
    const endDrag = e => {
      if (!dragging) return;
      dragging = false;
      arcWrap.classList.remove('dragging');
      if (!moved) {
        S.arcOpen = !S.arcOpen;
        return render();
      }
      const rect = arcWrap.getBoundingClientRect();
      const side = rect.left + rect.width / 2 < window.innerWidth / 2 ? 'left' : 'right';
      const maxY = window.innerHeight - (window.innerWidth <= 640 ? 136 : 74);
      const y = Math.round(Math.max(68, Math.min(maxY, rect.top)));
      S.arcPos = { side, y };
      localStorage.setItem('dp_arc_pos', JSON.stringify(S.arcPos));
      render();
    };
    arcBtn.onpointerup = endDrag;
    arcBtn.onpointercancel = endDrag;
  }
  const arcBg = document.getElementById('arcBackdrop');
  if (arcBg) arcBg.onclick = () => { S.arcOpen = false; render(); };

  // Filters
  const ff = document.getElementById('fitFilterSel'); if (ff) ff.onchange = e => { S.fitFilter = e.target.value; render(); };
  const ss = document.getElementById('studySubjSel'); if (ss) ss.onchange = e => { S.studySubject = e.target.value; render(); };
  document.querySelectorAll('[data-goaltab]').forEach(b => b.onclick = () => { S.goalTab = b.dataset.goaltab; render(); });
  const gc = document.getElementById('goalCatSel'); if (gc) gc.onchange = e => { S.goalCat = e.target.value; render(); };
  const gp = document.getElementById('goalPrioSel'); if (gp) gp.onchange = e => { S.goalPrio = e.target.value; render(); };
  document.querySelectorAll('[data-schedfilter]').forEach(b => b.onclick = () => { S.schedFilter = b.dataset.schedfilter; render(); });
  const vdi = document.getElementById('viewDateIn');
  if (vdi) vdi.onchange = async e => { S.viewDate = e.target.value || localDate(); await loadData(); render(); };

  // Study Timer
  const tss = document.getElementById('timerSubjectSel');
  if (tss) tss.onchange = e => { S.timerSubject = e.target.value; };
  const tti = document.getElementById('timerTitleIn');
  if (tti) tti.oninput = e => { S.timerTitle = e.target.value; };
  const tm = document.getElementById('timerModeSel');
  if (tm) tm.onchange = e => {
    clearInterval(S.timer.handle);
    S.studyMode = Number(e.target.value);
    S.timer = { sec: S.studyMode * 60, total: S.studyMode * 60, running: false, handle: null };
    render();
  };
  const tt = document.getElementById('timerToggle');
  if (tt) tt.onclick = () => {
    if (S.timer.running) { clearInterval(S.timer.handle); S.timer.running = false; }
    else {
      S.timer.running = true;
        S.timer.handle = setInterval(async () => {
          if (S.timer.sec > 0) {
            S.timer.sec--;
            const clk = document.getElementById('timerClock');
            if (clk) clk.textContent = `${String(Math.floor(S.timer.sec / 60)).padStart(2, '0')}:${String(S.timer.sec % 60).padStart(2, '0')}`;
          const ring = document.getElementById('timerRing');
          if (ring) ring.style.setProperty('--p', Math.round(((S.timer.total - S.timer.sec) / (S.timer.total || 1)) * 100));
        } else {
          clearInterval(S.timer.handle);
        S.timer.running = false;
        const modeName = S.studyMode === 50 ? 'Deep Work' : S.studyMode === 15 ? 'Quick Sprint' : 'Pomodoro';
        const title = (S.timerTitle || '').trim() || `${modeName} Focus`;
        playChime();
        try {
          await api('/study', 'POST', { date: localDate(), title, subject: S.timerSubject || 'General', mode: modeName, duration_min: S.studyMode, done: true });
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('DailyPilot Focus Complete', { body: `Logged ${S.studyMode}m of ${S.timerSubject}: ${title}` });
          }
        } catch { /* ignore */ }
        S.timer = { sec: S.studyMode * 60, total: S.studyMode * 60, running: false, handle: null };
        await loadData();
        render();
      }
      }, 1000);
  }
  render();
};
const tr = document.getElementById('timerReset');
if (tr) tr.onclick = () => { clearInterval(S.timer.handle); S.timer = { sec: S.studyMode * 60, total: S.studyMode * 60, running: false, handle: null }; render(); };

// CRUD toggles, edits & deletes
document.querySelectorAll('[data-toggle]').forEach(b => b.onclick = async () => {
  const { toggle: colName, id, done } = b.dataset;
  await api(`/${colName}/${id}`, 'PATCH', { done: done === 'true' });
  await loadData(); render();
});
document.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => {
  const { edit: colName, id } = b.dataset;
  const list = colName === 'workouts' ? S.workouts : colName === 'study' ? S.study : S.goals;
  const item = list.find(x => x.id === id);
  if (!item) return;
  S.editItem = { col: colName, item };
  S.modal = 'edit';
  render();
});
document.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
  const { del: colName, id } = b.dataset;
  await api(`/${colName}/${id}`, 'DELETE');
  await loadData(); render();
});

// Steps, Water & Meals
const toggleEditSteps = document.getElementById('toggleEditSteps');
if (toggleEditSteps) toggleEditSteps.onclick = () => { S.editingSteps = !S.editingSteps; render(); };
const add500 = document.getElementById('add500Steps');
if (add500) add500.onclick = async () => {
  const cur = (S.progress?.steps?.find(s => s.date === localDate()) || {}).steps || 0;
  await api('/steps', 'PUT', { date: localDate(), steps: cur + 500 });
  await loadData(); render();
};
const addWater = document.getElementById('addWater');
if (addWater) addWater.onclick = async () => {
  S.waterMl = Math.min(20000, S.waterMl + 250);
  render();
  await api('/water', 'PUT', { date: localDate(), ml: S.waterMl });
};
const subWater = document.getElementById('subWater');
if (subWater) subWater.onclick = async () => {
  S.waterMl = Math.max(0, S.waterMl - 250);
  render();
  await api('/water', 'PUT', { date: localDate(), ml: S.waterMl });
};
const saveSteps = document.getElementById('saveSteps');
if (saveSteps) saveSteps.onclick = async () => {
  const steps = Number(document.getElementById('stepsIn').value) || 0;
  S.editingSteps = false;
  await api('/steps', 'PUT', { date: localDate(), steps });
  await loadData(); render();
};
document.querySelectorAll('[data-mealcheck]').forEach(b => b.onclick = async () => {
  const slot = b.dataset.mealcheck, done = b.dataset.done === '1';
  S.plan = await api('/plan/check', 'POST', { date: localDate(), slot, done });
  render();
});
document.querySelectorAll('[data-swap]').forEach(b => b.onclick = async () => {
  S.plan = await api('/plan/swap', 'POST', { date: localDate(), slot: b.dataset.swap }); render();
});

// Log what you ate today & rebalance next 6 days
const olf = document.getElementById('openLogFoodBtn');
if (olf) olf.onclick = () => {
  S.logFoodOpen = true;
  S.selectedDayIdx = 0;
  if (S.route !== '/health/diet' && S.route !== '/fitness/diet') go('/health/diet');
  else render();
};
const clf = document.getElementById('closeLogFoodBtn');
if (clf) clf.onclick = () => { S.logFoodOpen = false; render(); };
const lff = document.getElementById('logFoodForm');
if (lff) lff.onsubmit = async e => {
  e.preventDefault();
  const b = Object.fromEntries(new FormData(e.target));
  b.date = localDate();
  b.kcal = Number(b.kcal);
  b.protein = Number(b.protein) || 0;
  b.carbs = Number(b.carbs) || 0;
  b.fat = Number(b.fat) || 0;
  const res = await api('/plan/log', 'POST', b);
  S.plan = res.plan;
  if (res.week) S.weekPlan = res.week;
  S.logFoodOpen = false;
  render();
};
document.querySelectorAll('[data-dellog]').forEach(b => b.onclick = async () => {
  const id = b.dataset.dellog;
  const res = await api('/plan/log/' + id, 'DELETE');
  if (res.plan) S.plan = res.plan;
  if (res.week) S.weekPlan = res.week;
  render();
});

// 7-Day Diet & Notification Bell
document.querySelectorAll('[data-dayidx]').forEach(b => b.onclick = () => { S.selectedDayIdx = Number(b.dataset.dayidx); render(); });
document.querySelectorAll('[data-toggleveg]').forEach(b => b.onclick = () => {
  const idx = Number(b.dataset.toggleveg);
  savePrefs({ veg_days: S.vegDays.includes(idx) ? S.vegDays.filter(x => x !== idx) : [...S.vegDays, idx] }, render);
});
const reqNotify = () => { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().then(() => { checkAndFireNotifications(); render(); }); };
const rnp = document.getElementById('reqNotifPermBtn');
if (rnp) rnp.onclick = reqNotify;
const tnb = document.getElementById('testNotifBtn');
if (tnb) tnb.onclick = () => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('DailyPilot Reminder', { body: 'Browser notifications are active for your scheduled diet & goal reminders.' });
  }
};
document.querySelectorAll('[data-togglebell]').forEach(b => b.onclick = () => {
  reqNotify();
  const idx = Number(b.dataset.togglebell);
  savePrefs({ notify_days: S.notifyDays.includes(idx) ? S.notifyDays.filter(x => x !== idx) : [...S.notifyDays, idx] }, render);
});
const nab = document.getElementById('notifyAllBtn');
if (nab) nab.onclick = () => { reqNotify(); savePrefs({ notify_days: S.notifyDays.length === 7 ? [] : [0, 1, 2, 3, 4, 5, 6] }, render); };

// Quick Add Modal
const mb = document.getElementById('modalBackdrop');
if (mb) mb.onclick = e => { if (e.target === mb) { S.modal = null; render(); } };
const cm = document.getElementById('closeModal');
if (cm) cm.onclick = () => { S.modal = null; render(); };
const mps = document.getElementById('modalPillarSel');
if (mps) mps.onchange = e => { S.modalPillar = e.target.value; render(); };
const qaf = document.getElementById('quickAddForm');
if (qaf) qaf.onsubmit = async e => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  d.date = d.date || S.viewDate || localDate();
  d.done = false;
  const colName = (S.modalPillar === 'fitness' || S.modalPillar === 'exercise') ? 'workouts' : S.modalPillar;
  await api('/' + colName, 'POST', d);
  S.modal = null; await loadData(); render();
};
const eif = document.getElementById('editItemForm');
if (eif && S.editItem) eif.onsubmit = async e => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  const { col, item } = S.editItem;
  await api(`/${col}/${item.id}`, 'PATCH', d);
  S.modal = null; S.editItem = null; await loadData(); render();
};

// Dedicated Edit Profile Page
const epf = document.getElementById('editProfileForm');
if (epf) {
  epf.oninput = () => {
    const prev = document.getElementById('editBmiPreview');
    const h = Number(epf.height_cm?.value), w = Number(epf.weight_kg?.value);
    if (prev && h > 90 && w > 20) prev.textContent = `Live BMI: ${(w / ((h / 100) ** 2)).toFixed(1)}`;
  };
  epf.onsubmit = async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    const updated = { ...S.profile, ...d, age: Number(d.age), height_cm: Number(d.height_cm), weight_kg: Number(d.weight_kg), skin_care: !!epf.skin_care?.checked };
    S.profile = updated;
    try {
      const r = await api('/profile', 'PUT', { ...updated, date: localDate(), veg_days: S.vegDays, notify_days: S.notifyDays });
      S.profile = r.profile; S.targets = r.targets; S.err = '';
      await loadData(); go('/profile');
    } catch (x) { setErr(x.message); render(); }
  };
}

  const lo = document.getElementById('logoutBtn');
  if (lo) lo.onclick = () => { S.sideNavOpen = false; S.modal = 'logout'; render(); };
  const cl = document.getElementById('cancelLogout');
  if (cl) cl.onclick = () => { S.modal = null; render(); };
  const cfl = document.getElementById('confirmLogout');
  if (cfl) cfl.onclick = () => { S.modal = null; logout(render); };
  if (S.route === '/health/activity') bindActivity(render);
}

document.addEventListener('click', () => { if (S.ddOpen) { S.ddOpen = false; render(); } });
window.addEventListener('popstate', () => { go(location.pathname === '/' ? '/overview' : location.pathname, false); });

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.6);
  } catch { /* audio blocked */ }
}

function checkAndFireNotifications() {
  if (!S.token || !S.profile || !('Notification' in window) || Notification.permission !== 'granted') return;
  const today = localDate();
  const todayIdx = new Date().getDay();
  if (!S.notifyDays.includes(todayIdx)) return;
  const key = `dp_notified_${today}`;
  if (localStorage.getItem(key)) return;
  const isVeg = S.vegDays.includes(todayIdx) || S.profile.diet_pref === 'veg';
  const pending = S.workouts.filter(w => !w.done).length + S.study.filter(s => !s.done).length + S.goals.filter(g => !g.done).length;
  new Notification(isVeg ? 'DailyPilot · Veg-Only Diet Day' : 'DailyPilot · Daily Reminder', {
    body: `Your meal plan is ready${pending ? ` and you have ${pending} pending task(s) today.` : '.'}`,
  });
  localStorage.setItem(key, '1');
}

async function boot() {
  if (!S.token) return render();
  try {
    S.user = (await api('/me')).user;
    const r = await api('/profile');
    S.profile = r.profile; S.targets = r.targets || null;
    if (S.profile) {
      await loadData();
      checkAndFireNotifications();
    }
  } catch { return render(); }
  go(S.route);
}
setInterval(checkAndFireNotifications, 60000);
boot();
