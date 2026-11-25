import { S, PILLARS, IC, esc, localDate, activeReminderCount } from '../state.js';

export function statusBarView() {
  return '';
}

const ROUTE_META = {
  '/overview':         { title: 'Overview',         back: null,        showPillars: true },
  '/health':           { title: 'Health & Diet',    back: null,        showPillars: true },
  '/fitness':          { title: 'Health & Diet',    back: null,        showPillars: true },
  '/health/diet':      { title: '7-Day Diet',       back: '/health',   showPillars: true },
  '/fitness/diet':     { title: '7-Day Diet',       back: '/health',   showPillars: true },
  '/health/activity':  { title: 'Activity Tracker', back: '/health',   showPillars: true },
  '/exercise':         { title: 'Exercise',         back: null,        showPillars: true },
  '/fitness/workouts': { title: 'Exercise',         back: '/exercise', showPillars: true },
  '/study':            { title: 'Study & Focus',    back: null,        showPillars: true },
  '/study/sessions':   { title: 'Study Sessions',   back: '/study',    showPillars: true },
  '/study/subjects':   { title: 'Subjects',         back: '/study',    showPillars: true },
  '/goals':            { title: 'Daily Goals',      back: null,        showPillars: true },
  '/schedule':         { title: 'Schedule',         back: null,        showPillars: false },
  '/analytics':        { title: 'Analytics',        back: null,        showPillars: false },
  '/notifications':    { title: 'Notifications',    back: '/overview', showPillars: false },
  '/profile':          { title: 'Profile',          back: null,        showPillars: false },
  '/profile/edit':     { title: 'Edit Profile',     back: '/profile',  showPillars: false },
};

const PILLAR_ICONS = {
  overview: IC.home,
  health:   IC.drop,
  exercise: IC.dumbbell,
  study:    IC.book,
  goals:    IC.target,
};

const PILLAR_CLS = {
  overview: 'ic-brand',
  health:   'ic-fit',
  exercise: 'ic-fit',
  study:    'ic-study',
  goals:    'ic-goals',
};

export function headerView() {
  const meta = ROUTE_META[S.route] || { title: 'Overview', back: null };
  const bellDot = activeReminderCount() > 0 ? '<span class="badge-dot"></span>' : '';

  return `<header class="dp-header">
    <div class="dp-header-inner">
      <div class="dp-header-left">
        ${meta.back ? `<button class="dp-icon-btn" data-go="${meta.back}" title="Back" aria-label="Back">${IC.back}</button>` : ''}
        <button class="dp-brand-left" data-go="/overview" title="DailyPilot Home">
          <span class="dp-logo-mark" aria-hidden="true">${IC.logo}</span>
          <span class="dp-wordmark ${meta.back ? 'dp-wordmark--sub' : ''}">DailyPilot</span>
        </button>
      </div>
      <div class="dp-header-title">${esc(meta.title)}</div>
      <div class="dp-header-actions">
        ${S.route !== '/notifications' ? `<button class="dp-icon-btn" data-go="/notifications" title="Notifications" aria-label="Notifications">${IC.bell}${bellDot}</button>` : ''}
        <button class="dp-icon-btn" id="openSideNav" title="Menu" aria-label="Menu">${IC.menu}</button>
      </div>
    </div>
  </header>`;
}

export function pillarTabsView() {
  const meta = ROUTE_META[S.route];
  if (!meta || !meta.showPillars) return '';
  const items = [
    ['overview', 'All'],
    ['health',   'Health'],
    ['exercise', 'Exercise'],
    ['study',    'Study'],
    ['goals',    'Goals'],
  ];
  return `<div class="dp-seg-wrap">
    <div class="dp-seg" role="tablist" aria-label="Pillars">
      ${items.map(([id, label]) => `
        <button type="button" role="tab" aria-selected="${S.pillar === id}" class="dp-seg-btn ${S.pillar === id ? 'on' : ''}" data-pillar="${id}">${label}</button>
      `).join('')}
    </div>
  </div>`;
}

export function navView() {
  const r = S.route;
  const isHome = r === '/overview' || r.startsWith('/health') || r.startsWith('/exercise') || r.startsWith('/fitness') || r.startsWith('/study') || r === '/goals';
  return `<nav class="dp-nav" aria-label="Primary Navigation">
    <div class="dp-nav-inner">
      <button type="button" data-go="/overview" class="dp-nav-btn ${isHome ? 'on' : ''}" title="Home" aria-label="Home">
        <span class="dp-nav-ic">${IC.home}</span>
        <span class="dp-nav-lbl">Home</span>
      </button>
      <button type="button" data-go="/schedule" class="dp-nav-btn ${r === '/schedule' ? 'on' : ''}" title="Schedule" aria-label="Schedule">
        <span class="dp-nav-ic">${IC.cal}</span>
        <span class="dp-nav-lbl">Schedule</span>
      </button>
      <button type="button" class="dp-nav-add" id="fabAdd" title="Quick Add" aria-label="Quick Add">
        ${IC.plus}
      </button>
      <button type="button" data-go="/analytics" class="dp-nav-btn ${r === '/analytics' ? 'on' : ''}" title="Analytics" aria-label="Analytics">
        <span class="dp-nav-ic">${IC.chart}</span>
        <span class="dp-nav-lbl">Analytics</span>
      </button>
      <button type="button" data-go="/profile" class="dp-nav-btn ${r.startsWith('/profile') ? 'on' : ''}" title="Profile" aria-label="Profile">
        <span class="dp-nav-ic">${IC.user}</span>
        <span class="dp-nav-lbl">Profile</span>
      </button>
    </div>
  </nav>`;
}

function pillarFormFields(mp, item = {}) {
  const isEx = mp === 'exercise' || mp === 'fitness' || mp === 'workouts';
  const isStudy = mp === 'study';
  const d = item.date || S.viewDate || localDate();
  const sel = (opts, cur) => opts.map(o => `<option value="${esc(o)}" ${cur === o ? 'selected' : ''}>${esc(o)}</option>`).join('');

  return `
    <label>Title</label><input name="title" required value="${esc(item.title || '')}" placeholder="${isEx ? 'e.g. 5km Run' : isStudy ? 'e.g. React Hooks' : 'e.g. Read 20 pages'}">
    <label>Date</label><input name="date" type="date" value="${esc(d)}">
    ${isEx ? `<div class="row">
      <div><label>Category</label><select name="category">${sel(['Strength', 'Cardio', 'Mobility', 'HIIT'], item.category || 'Strength')}</select></div>
      <div><label>Minutes</label><input name="duration_min" type="number" min="1" max="600" value="${esc(item.duration_min ?? 30)}"></div>
      <div><label>Calories</label><input name="calories" type="number" min="0" max="5000" value="${esc(item.calories ?? 180)}"></div>
    </div>` : ''}
    ${isStudy ? `<div class="row">
      <div><label>Subject</label><select name="subject">${sel(['Computer Science', 'Mathematics', 'Design', 'Reading', 'Languages', 'General'], item.subject || 'Computer Science')}</select></div>
      <div><label>Minutes</label><input name="duration_min" type="number" min="1" max="720" value="${esc(item.duration_min ?? 25)}"></div>
      <div><label>Mode</label><select name="mode">${sel(['Pomodoro', 'Deep Work', 'Quick Sprint'], item.mode || 'Pomodoro')}</select></div>
    </div>` : ''}
    ${!isEx && !isStudy ? `<div class="row">
      <div><label>Category</label><select name="category">${sel(['Work', 'Health', 'Learning', 'Personal', 'Daily'], item.category || 'Work')}</select></div>
      <div><label>Priority</label><select name="priority">
        <option value="high" ${item.priority === 'high' ? 'selected' : ''}>High</option>
        <option value="medium" ${!item.priority || item.priority === 'medium' ? 'selected' : ''}>Medium</option>
        <option value="low" ${item.priority === 'low' ? 'selected' : ''}>Low</option>
      </select></div>
      <div><label>Time Label</label><input name="time_label" value="${esc(item.time_label || '')}" placeholder="e.g. 9:00 AM"></div>
    </div>` : ''}`;
}

export function modalView() {
  if (S.modal === 'logout') {
    return `<div class="dp-modal-backdrop" id="modalBackdrop">
      <div class="dp-modal dp-modal--sm" role="dialog" aria-modal="true">
        <div class="dp-modal-handle" aria-hidden="true"></div>
        <div class="dp-modal-head">
          <h2>Sign Out?</h2>
          <button type="button" class="del-btn" id="closeModal" aria-label="Close">${IC.x}</button>
        </div>
        <div class="mute dp-modal-desc">You will need to sign in again to access your DailyPilot data.</div>
        <div class="row">
          <button type="button" class="btn sec btn--flush" id="cancelLogout">Cancel</button>
          <button type="button" class="btn danger btn--flush" id="confirmLogout">Sign Out</button>
        </div>
      </div>
    </div>`;
  }
  if (S.modal === 'edit' && S.editItem) {
    const { col, item } = S.editItem;
    const label = col === 'workouts' ? 'Exercise Workout' : col === 'study' ? 'Study Session' : 'Daily Goal';
    return `<div class="dp-modal-backdrop" id="modalBackdrop">
      <div class="dp-modal" role="dialog" aria-modal="true">
        <div class="dp-modal-handle" aria-hidden="true"></div>
        <div class="dp-modal-head">
          <h2>Edit ${label}</h2>
          <button type="button" class="del-btn" id="closeModal" aria-label="Close">${IC.x}</button>
        </div>
        <form id="editItemForm">
          ${pillarFormFields(col, item)}
          <button class="btn" type="submit">Save Changes</button>
        </form>
      </div>
    </div>`;
  }
  if (S.modal !== 'add') return '';
  const mp = S.modalPillar;
  return `<div class="dp-modal-backdrop" id="modalBackdrop">
    <div class="dp-modal" role="dialog" aria-modal="true">
      <div class="dp-modal-handle" aria-hidden="true"></div>
      <div class="dp-modal-head">
        <h2>Quick Add</h2>
        <button type="button" class="del-btn" id="closeModal" aria-label="Close">${IC.x}</button>
      </div>
      <label class="dp-label-first">Choose Pillar</label>
      <select id="modalPillarSel">
        <option value="exercise" ${mp === 'exercise' || mp === 'fitness' ? 'selected' : ''}>Exercise Workout</option>
        <option value="study" ${mp === 'study' ? 'selected' : ''}>Study Session</option>
        <option value="goals" ${mp === 'goals' ? 'selected' : ''}>Daily Goal</option>
      </select>
      <form id="quickAddForm">
        ${pillarFormFields(mp)}
        <button class="btn" type="submit">Add to ${PILLARS[mp].label}</button>
      </form>
    </div>
  </div>`;
}

export function sideNavView() {
  if (!S.sideNavOpen) return '';
  const name = esc(S.user?.name || 'Alex Morgan');
  const email = esc(S.user?.email || 'alex@dailypilot.app');
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const r = S.route;

  return `<div class="dp-sidenav-backdrop" id="sideNavBackdrop">
    <aside class="dp-sidenav" aria-label="Side Navigation">
      <div class="dp-sidenav-head">
        <div class="dp-sidenav-user">
          <div class="dp-sidenav-avatar">${initials}</div>
          <div class="dp-sidenav-user-text">
            <div class="dp-sidenav-name">${name}</div>
            <div class="dp-sidenav-email">${email}</div>
          </div>
        </div>
        <button type="button" class="dp-icon-btn" id="closeSideNav" title="Close" aria-label="Close menu">${IC.x}</button>
      </div>

      <div class="dp-sidenav-scroll">
        <div class="dp-sidenav-lbl">Pillars</div>
        ${Object.values(PILLARS).map(x => `
          <button type="button" class="dp-sn-item ${S.pillar === x.id ? 'on' : ''}" data-pillar="${x.id}">
            <span class="dp-sn-ic ${PILLAR_CLS[x.id] || 'ic-brand'}">${PILLAR_ICONS[x.id] || IC.home}</span>
            <span>${x.label}</span>
          </button>`).join('')}

        <div class="dp-sidenav-lbl">Pages</div>
        ${[
      ['/schedule', 'Schedule', IC.cal],
      ['/analytics', 'Analytics', IC.chart],
      ['/health/diet', '7-Day Diet', IC.utensils],
      ['/health/activity', 'Activity Tracker', IC.route],
      ['/notifications', 'Notifications', IC.bell],
      ['/profile', 'Profile & Settings', IC.user],
    ].map(([route, lbl, ic]) => `
          <button type="button" class="dp-sn-item ${r === route ? 'on' : ''}" data-go="${route}">
            <span class="dp-sn-ic ic-muted">${ic}</span>
            <span>${lbl}</span>
          </button>`).join('')}
      </div>

      <div class="dp-sidenav-foot">
        <button type="button" class="btn btn--flush" data-openadd="goals">+ Quick Add</button>
      </div>
    </aside>
  </div>`;
}
