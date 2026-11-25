import { S, IC, WEEKDAYS, esc } from '../state.js';

export function notificationsPage() {
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  const allOn = S.notifyDays.length === 7;
  const todayIdx = new Date().getDay();
  const isTodayDietNotif = S.notifyDays.includes(todayIdx);
  const isTodayVeg = S.vegDays.includes(todayIdx) || S.profile?.diet_pref === 'veg';

  const items = [
    ...(isTodayDietNotif ? [{
      tag: 'fit', ic: IC.utensils, kind: 'Diet Reminder',
      title: isTodayVeg ? 'Today is a Veg-Only Diet Day' : 'Today’s Meal Plan Reminder',
      sub: 'Breakfast 8:30 AM · Lunch 1:30 PM · Dinner 8:00 PM',
      go: '/health/diet',
    }] : []),
    ...S.workouts.filter(w => !w.done).map(w => ({
      tag: 'fit', ic: IC.dumbbell, kind: 'Workout', title: w.title, sub: `${w.category} · ${w.duration_min} min`, go: '/exercise',
    })),
    ...S.study.filter(s => !s.done).map(s => ({
      tag: 'study', ic: IC.book, kind: 'Study', title: s.title, sub: `${s.subject} · ${s.duration_min} min`, go: '/study/sessions',
    })),
    ...S.goals.filter(g => !g.done).map(g => ({
      tag: 'goals', ic: IC.target, kind: 'Daily Goal', title: g.title, sub: g.time_label || g.category, go: '/goals',
    })),
  ];

  return `
    <div class="dp-section card">
      <div class="sched-summary-top">
        <div>
          <h3>Push Alerts</h3>
          <div class="mute">${perm === 'granted' ? 'Browser notifications enabled' : perm === 'denied' ? 'Blocked in browser settings' : 'Enable browser alerts for diet days'}</div>
        </div>
        ${perm === 'default'
      ? `<button type="button" class="btn sm" id="reqNotifPermBtn">Enable</button>`
      : perm === 'granted'
        ? `<button type="button" class="btn sm sec" id="testNotifBtn">Test Alert</button>`
        : `<span class="tag">${perm}</span>`}
      </div>
    </div>

    <div class="sec-head">
      <h2>Weekly Diet Reminders</h2>
      <button type="button" class="bell-btn ${allOn ? 'on' : ''}" id="notifyAllBtn">${IC.bell} ${allOn ? 'All On' : 'Notify All'}</button>
    </div>

    <div class="week-strip">
      ${WEEKDAYS.map((day, idx) => {
          const on = S.notifyDays.includes(idx);
          const veg = S.vegDays.includes(idx) || S.profile?.diet_pref === 'veg';
          return `<button type="button" class="day-pill ${on ? 'on' : ''}" data-togglebell="${idx}">
          <span>${day}</span>
          <span>${on ? 'On' : 'Off'}</span>
          <span class="day-dots">${veg ? '<i class="dot-veg" title="Veg-only"></i>' : ''}</span>
        </button>`;
        }).join('')}
    </div>

    <div class="sec-head"><h2>Today's Reminders</h2><span class="mute">${items.length} active</span></div>
    <div class="list-stack">
      ${items.length ? items.map(it => `
        <div class="dp-row dp-row--clickable" data-go="${it.go}">
          <div class="dp-row-ic ic-${it.tag}">${it.ic}</div>
          <div class="dp-row-body">
            <div class="dp-row-title">${esc(it.title)}</div>
            <div class="dp-row-sub"><span>${it.kind}</span><span>·</span><span>${esc(it.sub)}</span></div>
          </div>
          <span class="mute">${IC.chevronRight}</span>
        </div>
      `).join('') : '<div class="card dp-empty"><div class="mute">You are all caught up for today.</div></div>'}
    </div>`;
}
