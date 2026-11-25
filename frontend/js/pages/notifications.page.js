import { S, IC, WEEKDAYS, esc } from '../state.js';

export function notificationsPage() {
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  const allOn = S.notifyDays.length === 7;
  const todayIdx = new Date().getDay();
  const isTodayDietNotif = S.notifyDays.includes(todayIdx);
  const isTodayVeg = S.vegDays.includes(todayIdx) || S.profile?.diet_pref === 'veg';

  const items = [
    ...(isTodayDietNotif ? [{
      tag: 'fit', kind: 'Diet Reminder',
      title: isTodayVeg ? 'Today is a Veg-Only Diet Day' : 'Today’s Meal Plan Reminder',
      sub: 'Breakfast 8:30 AM · Lunch 1:30 PM · Dinner 8:00 PM',
      go: '/fitness/diet',
    }] : []),
    ...S.workouts.filter(w => !w.done).map(w => ({
      tag: 'fit', kind: 'Workout', title: w.title, sub: `${w.category} · ${w.duration_min} min`, go: '/fitness/workouts',
    })),
    ...S.study.filter(s => !s.done).map(s => ({
      tag: 'study', kind: 'Study', title: s.title, sub: `${s.subject} · ${s.duration_min} min`, go: '/study/sessions',
    })),
    ...S.goals.filter(g => !g.done).map(g => ({
      tag: 'goals', kind: 'Daily Goal', title: g.title, sub: g.time_label || g.category, go: '/goals',
    })),
  ];

  return `
    <div class="card" style="margin-top:0">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
        <div>
          <h3 style="margin:0">Push Alerts</h3>
          <div class="mute">${perm === 'granted' ? 'Browser notifications enabled' : perm === 'denied' ? 'Blocked in browser settings' : 'Enable browser alerts for diet days'}</div>
        </div>
        ${perm === 'default'
      ? `<button class="btn sm" id="reqNotifPermBtn">Enable</button>`
      : perm === 'granted'
        ? `<button class="btn sm sec" id="testNotifBtn">Test Alert</button>`
        : `<span class="tag">${perm}</span>`}
      </div>
    </div>

    <div class="sec-head">
      <h2>Weekly Diet Reminders</h2>
      <button class="bell-btn ${allOn ? 'on' : ''}" id="notifyAllBtn">${IC.bell} ${allOn ? 'All On' : 'Notify All'}</button>
    </div>
    <div class="week-strip">
      ${WEEKDAYS.map((day, idx) => {
          const on = S.notifyDays.includes(idx);
          const veg = S.vegDays.includes(idx) || S.profile?.diet_pref === 'veg';
          return `<button class="day-pill ${on ? 'on' : ''}" data-togglebell="${idx}">
          <span>${day}</span>
          <span style="font-size:10px;opacity:.85">${on ? 'On' : 'Off'}</span>
          <span class="day-dots">${veg ? '<i class="dot-veg" title="Veg-only"></i>' : ''}</span>
        </button>`;
        }).join('')}
    </div>

    <div class="sec-head"><h2>Today's Reminders</h2><span class="mute">${items.length} active</span></div>
    <div class="list-stack">
    ${items.length ? items.map(it => `
      <div class="wo-card accent-${it.tag}" data-go="${it.go}" style="cursor:pointer">
        <span class="tag ${it.tag}">${it.kind}</span>
        <div style="flex:1;min-width:0"><div class="wo-title">${esc(it.title)}</div><div class="mute">${esc(it.sub)}</div></div>
        <span class="mute">›</span>
      </div>
    `).join('') : '<div class="card mute">You are all caught up for today.</div>'}
    </div>`;
}
