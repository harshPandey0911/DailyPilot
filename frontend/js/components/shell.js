import { S, PILLARS, IC, esc } from '../state.js';

export function statusBarView() {
  return '';
}

const SUB_PAGE_HEADERS = {
  '/profile/edit': { title: 'Edit Profile', back: '/profile' },
  '/health/diet': { title: '7-Day Diet', back: '/health' },
  '/fitness/workouts': { title: 'Exercise', back: '/exercise' },
  '/fitness/diet': { title: '7-Day Diet', back: '/health' },
  '/study/sessions': { title: 'Study Sessions', back: '/study' },
  '/study/subjects': { title: 'Subjects', back: '/study' },
  '/notifications': { title: 'Notifications', back: '/overview' },
  '/schedule': { title: 'Schedule', back: null },
  '/analytics': { title: 'Analytics', back: null },
  '/profile': { title: 'Profile', back: null },
};

export function headerView() {
  const sub = SUB_PAGE_HEADERS[S.route];
  const p = PILLARS[S.pillar];

  if (sub) {
    return `<header class="dp-header dp-header-sub">
      <div class="dp-header-left">
        ${sub.back ? `<button class="dp-icon-btn" data-go="${sub.back}" title="Back">${IC.back}</button>` : `<img src="/assets/logo.jpg" alt="DailyPilot" class="dp-hdr-logo">`}
        <div class="dp-header-page">${sub.title}</div>
      </div>
      <div class="dp-header-actions">
        ${S.route !== '/notifications' ? `<button class="dp-icon-btn" data-go="/notifications" title="Notifications">${IC.bell}<span class="badge-dot"></span></button>` : ''}
        <button class="dp-icon-btn" id="openSideNav" title="Menu">${IC.menu}</button>
      </div>
    </header>`;
  }

  return `<header class="dp-header">
    <button class="dp-brand-left" data-go="/overview" title="DailyPilot Home">
      <img src="/assets/logo.jpg" alt="DailyPilot" class="dp-hdr-logo">
      <span>DailyPilot</span>
    </button>
    <div class="dp-dropdown-wrap">
      <button class="dp-title-btn" id="ddTrigger" aria-expanded="${S.ddOpen}">
        <span class="dp-pillar-dot" style="background:${p.color}"></span>
        <span>${p.label}</span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      ${S.ddOpen ? `<div class="dp-dropdown-menu" id="ddMenu">
        ${Object.values(PILLARS).map(x => `<button class="dp-dd-item ${S.pillar === x.id ? 'on' : ''}" data-pillar="${x.id}">
          <span class="dd-ic" style="background:${x.color}18;color:${x.color}">${x.id === 'exercise' ? IC.dumbbell : x.id === 'health' ? IC.drop : x.id === 'study' ? IC.chart : x.id === 'goals' ? IC.cal : IC.home}</span>
          <span>${x.label}<small>${x.desc}</small></span>
        </button>`).join('')}
      </div>` : ''}
    </div>
    <div class="dp-header-actions">
      <button class="dp-icon-btn" data-go="/notifications" title="Notifications">${IC.bell}<span class="badge-dot"></span></button>
      <button class="dp-icon-btn" id="openSideNav" title="Menu">${IC.menu}</button>
    </div>
  </header>`;
}

export function navView() {
  const r = S.route;
  if (S.pillar === 'health') {
    return `<nav class="dp-nav"><div class="dp-nav-inner">
      <button data-go="/health" class="${r === '/health' ? 'on' : ''}"><span class="nav-ic">${IC.home}</span>Health</button>
      <button data-go="/health/diet" class="${r === '/health/diet' || r === '/fitness/diet' ? 'on' : ''}"><span class="nav-ic">${IC.cal}</span>7-Day Diet</button>
      <button class="dp-fab" id="fabAdd" title="Quick Add">+</button>
      <button data-go="/exercise" class="${r === '/exercise' ? 'on' : ''}"><span class="nav-ic">${IC.dumbbell}</span>Exercise</button>
      <button data-go="/profile" class="${r.startsWith('/profile') ? 'on' : ''}"><span class="nav-ic">${IC.user}</span>Profile</button>
    </div></nav>`;
  }
  if (S.pillar === 'exercise') {
    return `<nav class="dp-nav"><div class="dp-nav-inner">
      <button data-go="/exercise" class="${r === '/exercise' ? 'on' : ''}"><span class="nav-ic">${IC.dumbbell}</span>Workouts</button>
      <button data-go="/health" class="${r === '/health' ? 'on' : ''}"><span class="nav-ic">${IC.drop}</span>Health</button>
      <button class="dp-fab" id="fabAdd" title="Quick Add">+</button>
      <button data-go="/schedule" class="${r === '/schedule' ? 'on' : ''}"><span class="nav-ic">${IC.cal}</span>Schedule</button>
      <button data-go="/profile" class="${r.startsWith('/profile') ? 'on' : ''}"><span class="nav-ic">${IC.user}</span>Profile</button>
    </div></nav>`;
  }
  if (S.pillar === 'study') {
    return `<nav class="dp-nav"><div class="dp-nav-inner">
      <button data-go="/study" class="${r === '/study' ? 'on' : ''}"><span class="nav-ic">${IC.home}</span>Timer</button>
      <button data-go="/study/sessions" class="${r === '/study/sessions' ? 'on' : ''}"><span class="nav-ic">${IC.cal}</span>Sessions</button>
      <button class="dp-fab" id="fabAdd" title="Quick Add">+</button>
      <button data-go="/study/subjects" class="${r === '/study/subjects' ? 'on' : ''}"><span class="nav-ic">${IC.chart}</span>Subjects</button>
      <button data-go="/profile" class="${r.startsWith('/profile') ? 'on' : ''}"><span class="nav-ic">${IC.user}</span>Profile</button>
    </div></nav>`;
  }
  const homeRoute = S.pillar === 'goals' ? '/goals' : '/overview';
  return `<nav class="dp-nav"><div class="dp-nav-inner">
    <button data-go="${homeRoute}" class="${r === homeRoute ? 'on' : ''}"><span class="nav-ic">${IC.home}</span>${S.pillar === 'goals' ? 'Today' : 'Home'}</button>
    <button data-go="/schedule" class="${r === '/schedule' ? 'on' : ''}"><span class="nav-ic">${IC.cal}</span>Schedule</button>
    <button class="dp-fab" id="fabAdd" title="Quick Add">+</button>
    <button data-go="/analytics" class="${r === '/analytics' ? 'on' : ''}"><span class="nav-ic">${IC.chart}</span>Analytics</button>
    <button data-go="/profile" class="${r.startsWith('/profile') ? 'on' : ''}"><span class="nav-ic">${IC.user}</span>Profile</button>
  </div></nav>`;
}

export function modalView() {
  if (S.modal === 'logout') {
    return `<div class="dp-modal-backdrop" id="modalBackdrop">
      <div class="dp-modal" style="max-width:380px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <h2 style="margin:0">Sign Out?</h2>
          <button class="del-btn" id="closeModal">✕</button>
        </div>
        <div class="mute" style="margin-bottom:16px">You will need to sign in again to access your DailyPilot data.</div>
        <div class="row">
          <button class="btn sec" id="cancelLogout" style="margin-top:0">Cancel</button>
          <button class="btn" id="confirmLogout" style="margin-top:0;background:var(--err)">Sign Out</button>
        </div>
      </div>
    </div>`;
  }
  if (S.modal !== 'add') return '';
  const mp = S.modalPillar;
  return `<div class="dp-modal-backdrop" id="modalBackdrop">
    <div class="dp-modal">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <h2 style="margin:0">Quick Add</h2>
        <button class="del-btn" id="closeModal">✕</button>
      </div>
      <label>Choose Pillar</label>
      <select id="modalPillarSel">
        <option value="exercise" ${mp === 'exercise' || mp === 'fitness' ? 'selected' : ''}>Exercise Workout</option>
        <option value="study" ${mp === 'study' ? 'selected' : ''}>Study Session</option>
        <option value="goals" ${mp === 'goals' ? 'selected' : ''}>Daily Goal</option>
      </select>
      <form id="quickAddForm">
        <label>Title</label><input name="title" required placeholder="${mp === 'exercise' || mp === 'fitness' ? 'e.g. 5km Run' : mp === 'study' ? 'e.g. React Hooks' : 'e.g. Read 20 pages'}">
        ${mp === 'exercise' || mp === 'fitness' ? `<div class="row"><div><label>Category</label><select name="category"><option>Strength</option><option>Cardio</option><option>Mobility</option><option>HIIT</option></select></div><div><label>Minutes</label><input name="duration_min" type="number" value="30"></div></div>` : ''}
        ${mp === 'study' ? `<div class="row"><div><label>Subject</label><select name="subject"><option>Computer Science</option><option>Mathematics</option><option>Design</option><option>Reading</option></select></div><div><label>Minutes</label><input name="duration_min" type="number" value="25"></div></div>` : ''}
        ${mp === 'goals' ? `<div class="row"><div><label>Category</label><select name="category"><option>Work</option><option>Health</option><option>Learning</option><option>Personal</option></select></div><div><label>Priority</label><select name="priority"><option value="high">High</option><option value="medium" selected>Medium</option><option value="low">Low</option></select></div></div>` : ''}
        <button class="btn">Add to ${PILLARS[mp].label}</button>
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
          <div style="min-width:0">
            <div class="dp-sidenav-name">${name}</div>
            <div class="dp-sidenav-email">${email}</div>
          </div>
        </div>
        <button class="dp-icon-btn" id="closeSideNav" title="Close">✕</button>
      </div>

      <div class="dp-sidenav-scroll">
        <div class="dp-sidenav-lbl">Pillars</div>
        ${Object.values(PILLARS).map(x => `
          <button class="dp-sn-item ${S.pillar === x.id ? 'on' : ''}" data-pillar="${x.id}">
            <span class="dp-sn-ic" style="background:${x.color}18;color:${x.color}">${x.id === 'exercise' ? IC.dumbbell : x.id === 'health' ? IC.drop : x.id === 'study' ? IC.chart : x.id === 'goals' ? IC.cal : IC.home}</span>
            <span>${x.label}</span>
          </button>`).join('')}

        <div class="dp-sidenav-lbl">Pages</div>
        ${[
          ['/schedule', 'Schedule', IC.cal],
          ['/analytics', 'Analytics', IC.chart],
          ['/health/diet', '7-Day Diet', IC.drop],
          ['/notifications', 'Notifications', IC.bell],
          ['/profile', 'Profile & Settings', IC.user],
        ].map(([route, lbl, ic]) => `
          <button class="dp-sn-item ${r === route ? 'on' : ''}" data-go="${route}">
            <span class="dp-sn-ic">${ic}</span>
            <span>${lbl}</span>
          </button>`).join('')}
      </div>

      <div class="dp-sidenav-foot">
        <button class="btn sm" style="width:100%" data-openadd="goals">+ Quick Add</button>
      </div>
    </aside>
  </div>`;
}
