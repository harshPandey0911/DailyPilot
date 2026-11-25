export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const localDate = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
export const pct = (a, b) => Math.min(100, Math.round((a / (b || 1)) * 100));
export const errBox = () => (S.err ? `<div class="err">${esc(S.err)}</div>` : '');
export const setErr = e => { S.err = e; };
export const matchesSearch = txt => !S.searchQ || String(txt || '').toLowerCase().includes(S.searchQ.toLowerCase());

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const IC = {
  logo: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 2.5 2.5 7.2l4.4 1.9 1.9 4.4 4.7-11z"/><path d="M6.9 9.1 13.5 2.5"/></svg>`,
  logoLg: `<svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 2.5 2.5 7.2l4.4 1.9 1.9 4.4 4.7-11z"/><path d="M6.9 9.1 13.5 2.5"/></svg>`,
  plus: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
  check: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
  x: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
  chevronRight: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`,
  home: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>`,
  cal: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
  chart: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 14l4-4 4 3 5-6"/></svg>`,
  user: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>`,
  search: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`,
  bell: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>`,
  back: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`,
  dumbbell: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"><path d="M6 7v10M18 7v10M3 9v6M21 9v6M6 12h12"/></svg>`,
  steps: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"><path d="M13 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/><path d="m7 21 3-6 3 2 2 4M10 15l1-5 4 2 3-2"/></svg>`,
  drop: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"><path d="M12 2.7 6.3 10a7 7 0 1 0 11.4 0z"/></svg>`,
  utensils: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`,
  book: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>`,
  target: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></svg>`,
  swap: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 3l4 4-4 4"/><path d="M3 7h18M7 21l-4-4 4-4"/><path d="M21 17H3"/></svg>`,
  trash: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>`,
  edit: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
  menu: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>`,
  route: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>`,
};

export const searchBarView = (placeholder = 'Search…') => `
  <div class="dp-search">
    <span class="dp-search-ic">${IC.search}</span>
    <input id="searchBox" type="search" placeholder="${esc(placeholder)}" value="${esc(S.searchQ)}">
    ${S.searchQ ? `<button class="dp-search-clear" id="clearSearch" type="button" title="Clear" aria-label="Clear search">${IC.x}</button>` : ''}
  </div>`;

export const PILLARS = {
  overview: { id: 'overview', label: 'All Pillars', short: 'All', color: '#4F46E5', desc: 'Unified daily summary' },
  health: { id: 'health', label: 'Health & Diet', short: 'Health', color: '#16A34A', desc: 'Calories, macros, steps, water & 7-day diet' },
  exercise: { id: 'exercise', label: 'Exercise', short: 'Exercise', color: '#16A34A', desc: 'Workouts, active minutes & calories burned' },
  study: { id: 'study', label: 'Study', short: 'Study', color: '#7C3AED', desc: 'Focus timer & study sessions' },
  goals: { id: 'goals', label: 'Daily Goals', short: 'Goals', color: '#D97706', desc: 'Tasks, priorities & streaks' },
};

export const S = {
  token: localStorage.getItem('dp_token'),
  user: null,
  profile: null,
  targets: null,
  plan: null,
  recommendations: null,
  progress: null,
  workouts: [],
  activities: [],
  study: [],
  goals: [],
  route: (location.hash.startsWith('#/') ? location.hash.slice(1) : location.pathname === '/' ? '/overview' : location.pathname) || '/overview',
  pillar: 'overview',
  ddOpen: false,
  sideNavOpen: false,
  arcOpen: false,
  arcPos: (() => { try { return JSON.parse(localStorage.getItem('dp_arc_pos')) || { side: 'right', y: null }; } catch { return { side: 'right', y: null }; } })(),
  searchOpen: false,
  searchQ: '',
  modal: null,
  modalPillar: 'goals',
  editItem: null,
  viewDate: localDate(),
  fitFilter: 'All',
  waterMl: 0,
  editingSteps: false,
  weekPlan: null,
  selectedDayIdx: 0,
  vegDays: [],
  notifyDays: [],
  studySubject: 'All',
  studyMode: 25,
  timerSubject: 'Computer Science',
  timerTitle: '',
  goalTab: 'all',
  goalCat: 'All',
  goalPrio: 'All',
  schedFilter: 'all',
  timer: { sec: 25 * 60, total: 25 * 60, running: false, handle: null },
  activityFilter: 'all',
  selectedActivityId: null,
  tracker: {
    status: 'idle',
    type: 'run',
    title: '',
    points: [],
    distanceM: 0,
    elevationGainM: 0,
    elapsedSec: 0,
    startedAt: null,
    watchId: null,
    timerId: null,
    simId: null,
    simulating: false,
    gpsStatus: 'Ready',
  },
  form: {},
  step: 0,
  authMode: 'login',
  err: '',
};

export function metrics() {
  const allItems = [...S.workouts, ...S.study, ...S.goals];
  const doneCount = allItems.filter(x => x.done).length;
  const totalCount = allItems.length || 1;
  const focusMin = S.study.filter(x => x.done).reduce((a, b) => a + (b.duration_min || 0), 0);
  const focusFmt = `${Math.floor(focusMin / 60)}h ${focusMin % 60}m`;
  return { doneCount, totalCount, focusMin, focusFmt, goalPct: pct(doneCount, totalCount) };
}

export function activeReminderCount() {
  const todayIdx = new Date().getDay();
  const dietReminder = S.notifyDays.includes(todayIdx) ? 1 : 0;
  const pendingCount =
    S.workouts.filter(w => !w.done).length +
    S.study.filter(s => !s.done).length +
    S.goals.filter(g => !g.done).length;
  return dietReminder + pendingCount;
}
