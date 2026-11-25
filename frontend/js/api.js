import { S, localDate, setErr } from './state.js';

export async function api(path, method = 'GET', body) {
  const r = await fetch(((window.DP_CONFIG && window.DP_CONFIG.API_URL) || '') + '/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(S.token ? { Authorization: 'Bearer ' + S.token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && S.token) { logout(); throw new Error(j.error || 'Login again'); }
  if (!r.ok) throw new Error(j.error || 'Error');
  return j;
}

export function logout(onDone) {
  localStorage.removeItem('dp_token');
  S.token = null; S.user = null; S.profile = null;
  S.plan = null; S.recommendations = null; S.workouts = []; S.study = []; S.goals = [];
  if (onDone) onDone();
}

export async function loadData() {
  const d = localDate();
  const [plan, weekRes, progress, workouts, study, goals, recommendations] = await Promise.all([
    api('/plan?date=' + d).catch(() => null),
    api('/plan/week?date=' + d).catch(() => null),
    api('/progress').catch(() => ({ steps: [], weights: [] })),
    api('/workouts?date=' + d).catch(() => []),
    api('/study?date=' + d).catch(() => []),
    api('/goals?date=' + d).catch(() => []),
    api('/recommendations?date=' + d).catch(() => null),
  ]);
  S.plan = plan;
  S.recommendations = recommendations;
  S.vegDays = S.profile?.veg_days || [];
  S.notifyDays = S.profile?.notify_days || [];
  S.weekPlan = weekRes?.week || [];
  S.progress = progress; S.workouts = workouts; S.study = study; S.goals = goals;
}

export async function savePrefs(patch, onDone) {
  if (patch.goal) S.profile.goal = patch.goal;
  if (patch.diet_pref) S.profile.diet_pref = patch.diet_pref;
  if (patch.veg_days) S.vegDays = patch.veg_days;
  if (patch.notify_days) S.notifyDays = patch.notify_days;
  try {
    const r = await api('/profile/preferences', 'PATCH', patch);
    S.profile = r.profile; S.targets = r.targets; S.err = '';
    await loadData(); onDone();
  } catch {
    try {
      const r = await api('/profile', 'PUT', { ...S.profile, date: localDate(), veg_days: S.vegDays, notify_days: S.notifyDays });
      S.profile = r.profile; S.targets = r.targets; S.err = '';
      await loadData(); onDone();
    } catch (x) { setErr(x.message); onDone(); }
  }
}
