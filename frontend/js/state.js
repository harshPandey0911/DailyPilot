export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const localDate = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
export const pct = (a, b) => Math.min(100, Math.round((a / (b || 1)) * 100));
export const errBox = () => (S.err ? `<div class="err">${esc(S.err)}</div>` : '');
export const setErr = e => { S.err = e; };
export const matchesSearch = txt => !S.searchQ || String(txt || '').toLowerCase().includes(S.searchQ.toLowerCase());
export const searchBarView = (placeholder = 'Search…') => `
  <div class="dp-search">
    <span class="dp-search-ic">${IC.search}</span>
    <input id="searchBox" type="search" placeholder="${esc(placeholder)}" value="${esc(S.searchQ)}">
    ${S.searchQ ? `<button class="dp-search-clear" id="clearSearch" type="button" title="Clear">✕</button>` : ''}
  </div>`;

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const IC = {
  home: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>`,
  cal: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
  chart: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 14l4-4 4 3 5-6"/></svg>`,
  user: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>`,
  search: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`,
  bell: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>`,
  back: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`,
  dumbbell: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M6 7v10M18 7v10M3 9v6M21 9v6M6 12h12"/></svg>`,
  steps: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M13 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/><path d="m7 21 3-6 3 2 2 4M10 15l1-5 4 2 3-2"/></svg>`,
  drop: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M12 2.7 6.3 10a7 7 0 1 0 11.4 0z"/></svg>`,
  swap: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M17 3l4 4-4 4"/><path d="M3 7h18M7 21l-4-4 4-4"/><path d="M21 17H3"/></svg>`,
  trash: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>`,
  menu: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>`,
};

export const PILLARS = {
  overview: { id: 'overview', label: 'All Pillars',   short: 'All',      color: '#4f46e5', desc: 'Unified daily summary' },
  health:   { id: 'health',   label: 'Health & Diet', short: 'Health',   color: '#059669', desc: 'Calories, macros, steps, water & 7-day diet' },
  exercise: { id: 'exercise', label: 'Exercise',      short: 'Exercise', color: '#0d9488', desc: 'Workouts, active minutes & calories burned' },
  study:    { id: 'study',    label: 'Study',         short: 'Study',    color: '#7c3aed', desc: 'Focus timer & study sessions' },
  goals:    { id: 'goals',    label: 'Daily Goals',   short: 'Goals',    color: '#ea580c', desc: 'Tasks, priorities & streaks' },
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
  fitFilter: 'All',
  waterMl: 2000,
  editingSteps: false,
  weekPlan: null,
  selectedDayIdx: 0,
  vegDays: [],
  notifyDays: [],
  studySubject: 'All',
  studyMode: 25,
  goalTab: 'all',
  goalCat: 'All',
  goalPrio: 'All',
  schedFilter: 'all',
  timer: { sec: 25 * 60, total: 25 * 60, running: false, handle: null },
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
