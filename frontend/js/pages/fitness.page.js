import { S, IC, WEEKDAYS, esc, localDate, pct, matchesSearch, searchBarView } from '../state.js';

export function healthOverviewPage() {
  const t = S.plan?.targets || S.targets || { calories: 2250, protein: 140, carbs: 250, fat: 72, stepsGoal: 9000, waterL: 3.2, bmi: 22.5, bmiCategory: 'Normal' };
  const e = S.plan?.totals?.eaten || { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const todaySteps = (S.progress?.steps?.find(s => s.date === localDate()) || {}).steps || 0;
  const kcalPct = pct(e.kcal, t.calories);
  const remainKcal = Math.max(0, Math.round(t.calories - e.kcal));
  const circ = 2 * Math.PI * 42;
  const dashOffset = circ - (circ * kcalPct) / 100;
  const waterGoalMl = Math.round((t.waterL || 3.2) * 1000);
  const goalLbl = { lose: 'Slim / Fat Loss', fit: 'Stay Fit', bulk: 'Bulking' }[S.profile?.goal || 'fit'];
  const dietLbl = { veg: 'Veg Only', nonveg: 'Non-Veg', both: 'Both' }[S.profile?.diet_pref || 'both'];
  const slots = S.plan?.slots || [];

  return `
    <div class="page-head">
      <div><div class="mute">Health &amp; Nutrition</div><h1>Daily Health</h1></div>
      <button class="tag fit" data-go="/profile/edit" style="border:0;cursor:pointer;padding:5px 11px">${goalLbl} · ${dietLbl} · Edit</button>
    </div>

    <div class="home-grid">
      <div>
        <div class="fit-hero" style="margin-top:0">
          <div class="fit-hero-top">
            <div class="fit-ring-wrap">
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="9"/>
                <circle cx="50" cy="50" r="42" fill="none" stroke="#10b981" stroke-width="9" stroke-linecap="round"
                  stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${dashOffset.toFixed(1)}"/>
              </svg>
              <div class="fit-ring-center"><b>${Math.round(e.kcal)}</b><span>of ${t.calories}</span></div>
            </div>
            <div style="flex:1">
              <div style="font-size:12px;color:rgba(255,255,255,0.78);font-weight:600">Profile Nutrition Target</div>
              <div style="font-size:21px;font-weight:800;margin:2px 0">${remainKcal} kcal left</div>
              <div style="font-size:12px;color:#6ee7b7;font-weight:600">${t.bmi ? `BMI ${t.bmi} (${t.bmiCategory})` : goalLbl}</div>
            </div>
          </div>
          <div class="fit-macros">
            <div class="fit-macro-item"><small>Protein</small><b>${Math.round(e.protein)}/${t.protein}g</b><div class="fit-macro-bar"><i style="width:${pct(e.protein, t.protein)}%;background:#10b981"></i></div></div>
            <div class="fit-macro-item"><small>Carbs</small><b>${Math.round(e.carbs)}/${t.carbs}g</b><div class="fit-macro-bar"><i style="width:${pct(e.carbs, t.carbs)}%;background:#38bdf8"></i></div></div>
            <div class="fit-macro-item"><small>Fat</small><b>${Math.round(e.fat)}/${t.fat}g</b><div class="fit-macro-bar"><i style="width:${pct(e.fat, t.fat)}%;background:#fbbf24"></i></div></div>
          </div>
        </div>

        <div class="bento-2">
          <div class="bento-card" style="border-top:3px solid var(--goals)">
            <div class="bento-head"><span class="bento-ic" style="background:var(--goals-soft);color:var(--goals)">${IC.steps}</span><button class="link" id="toggleEditSteps" style="font-size:12px">${S.editingSteps ? 'Done' : 'Edit'}</button></div>
            <div><div class="bento-val">${Number(todaySteps).toLocaleString()}</div><div class="bento-sub">of ${t.stepsGoal.toLocaleString()} steps</div><div class="bar" style="margin:8px 0 0"><i style="width:${pct(todaySteps, t.stepsGoal)}%;background:var(--goals-grad)"></i></div></div>
            ${S.editingSteps ? `<div class="steps" style="margin-top:8px"><input id="stepsIn" type="number" value="${todaySteps}" style="padding:7px 9px;font-size:13px"><button class="btn sm" id="saveSteps">Save</button></div>` : `<button class="mini-action" id="add500Steps">+ 500 steps</button>`}
          </div>
          <div class="bento-card" style="border-top:3px solid var(--water)">
            <div class="bento-head"><span class="bento-ic" style="background:var(--water-soft);color:var(--water)">${IC.drop}</span><span class="bento-sub">${pct(S.waterMl, waterGoalMl)}%</span></div>
            <div><div class="bento-val">${(S.waterMl / 1000).toFixed(1)} L</div><div class="bento-sub">of ${(waterGoalMl / 1000).toFixed(1)} L water</div><div class="bar" style="margin:8px 0 0"><i style="width:${pct(S.waterMl, waterGoalMl)}%;background:var(--water)"></i></div></div>
            <button class="mini-action" id="addWater">+ 250 ml</button>
          </div>
        </div>
      </div>

      <div>
        <div class="sec-head" style="margin-top:0">
          <h2>Today's Diet Plan</h2>
          <div style="display:flex;gap:10px;align-items:center">
            <button class="link" id="openLogFoodBtn">+ Log Ate</button>
            <button class="link" data-go="/health/diet">7-Day Plan →</button>
          </div>
        </div>
        ${slots.length ? slots.map(s => {
          const m = s.meal; if (!m) return '';
          return `<div class="wo-card accent-fit ${s.done ? 'done' : ''}">
            <button class="chk ${s.done ? 'on' : ''}" data-mealcheck="${s.slot}" data-done="${s.done ? 0 : 1}">${s.done ? '✓' : ''}</button>
            <div style="flex:1;min-width:0">
              <div class="mute" style="font-size:11px;font-weight:700">${s.label} · ${s.time}</div>
              <div class="wo-title">${esc(m.title)}</div>
              <div class="wo-meta"><span>${Math.round(m.kcal)} kcal</span><span>•</span><span>P ${Math.round(m.protein)}g</span></div>
            </div>
          </div>`;
        }).join('') : '<div class="card mute">Open 7-Day Diet to view your meals.</div>'}

        <div class="wo-card accent-fit" data-go="/exercise" style="cursor:pointer;margin-top:12px">
          <div class="wo-badge" style="background:var(--fit-soft);color:var(--fit)">${IC.dumbbell}</div>
          <div style="flex:1"><div class="wo-title">Exercise Panel</div><div class="wo-meta">${S.workouts.filter(w => w.done).length}/${S.workouts.length} workouts done today</div></div>
          <span class="mute">›</span>
        </div>
      </div>
    </div>`;
}

function arcIcon(cat) {
  if (cat === 'Cardio') return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"/></svg>`;
  if (cat === 'HIIT') return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9z"/></svg>`;
  if (cat === 'Mobility') return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" transform="translate(0 2)"/><path d="M4 17c2.5-3 5-4 8-4s5.5 1 8 4"/><path d="M9 13v-3l3-2 3 2v3"/></svg>`;
  return IC.dumbbell;
}

export function exercisePage() {
  const goal = S.recommendations?.profileSummary?.goal || S.profile?.goal || 'fit';
  const goalLbl = { lose: 'Fat Loss', fit: 'Stay Fit', bulk: 'Muscle / Bulk' }[goal];
  const activityLbl = { sedentary: 'Sedentary', light: 'Light', moderate: 'Moderate', active: 'Active' }[S.profile?.activity || 'moderate'];
  const recs = S.recommendations?.workouts || [];
  const workouts = S.workouts.filter(w => (S.fitFilter === 'All' || w.category === S.fitFilter) && matchesSearch(w.title));
  const doneList = S.workouts.filter(w => w.done);
  const mins = doneList.reduce((a, b) => a + (b.duration_min || 0), 0);
  const kcal = doneList.reduce((a, b) => a + (b.calories || 0), 0);

  const pos = S.arcPos || { side: 'right', y: null };
  const isLeft = pos.side === 'left';
  const posStyle = `${isLeft ? 'left:18px;right:auto;' : 'right:18px;left:auto;'}${pos.y != null ? `top:${pos.y}px;bottom:auto;` : ''}`;

  return `
    <div class="page-head">
      <div><div class="mute">Exercise &amp; Training</div><h1>Your Workouts</h1></div>
      <button class="tag fit" data-go="/profile/edit" style="border:0;cursor:pointer;padding:5px 11px">${goalLbl} · ${activityLbl}</button>
    </div>

    <div class="fit-summary-bar">
      <div><b>${doneList.length}/${S.workouts.length}</b><span>Completed</span></div>
      <div><b>${mins}m</b><span>Active Time</span></div>
      <div><b>${kcal}</b><span>kcal Burned</span></div>
    </div>

    <div class="card" style="border-left:4px solid var(--fit);margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div>
          <div style="font-weight:800;font-size:14px">Recommended for ${goalLbl}</div>
          <div class="mute" style="font-size:12px">Tap any exercise to add it to today's plan</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${recs.length ? recs.map((r, idx) => `
          <button class="dp-pill" data-addrec="${idx}" title="${esc(r.reason || '')}" style="display:inline-flex;align-items:center;gap:6px;background:var(--fit-soft);color:var(--fit);border-color:rgba(5,150,105,0.28)">
            <span>+ ${esc(r.title)}</span><span style="opacity:0.75">(${r.duration_min}m · ${r.calories} kcal)</span>
          </button>`).join('') : '<span class="mute" style="font-size:12px">Complete your profile to get personalized workout recommendations.</span>'}
      </div>
    </div>

    ${searchBarView('Search workouts…')}
    <div class="sec-head" style="margin-top:0">
      <div class="dp-pills">
        ${['All', 'Strength', 'Cardio', 'Mobility', 'HIIT'].map(c => `<button class="dp-pill ${S.fitFilter === c ? 'on' : ''}" onclick="document.getElementById('fitFilterSel').value='${c}';document.getElementById('fitFilterSel').dispatchEvent(new Event('change'))">${c}</button>`).join('')}
      </div>
      <select class="dp-select" id="fitFilterSel" style="display:none">${['All', 'Strength', 'Cardio', 'Mobility', 'HIIT'].map(c => `<option value="${c}" ${S.fitFilter === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
      <button class="btn sm" data-openadd="exercise">+ Custom</button>
    </div>
    ${workouts.length ? workouts.map(w => `
      <div class="wo-card accent-fit ${w.done ? 'done' : ''}">
        <div class="wo-badge" style="background:var(--fit-soft);color:var(--fit)">${IC.dumbbell}</div>
        <div style="flex:1;min-width:0"><div class="wo-title">${esc(w.title)}</div><div class="wo-meta"><span class="tag fit" style="margin:0">${esc(w.category)}</span><span>${w.duration_min} min</span><span>•</span><span>${w.calories} kcal</span></div></div>
        <button class="chk ${w.done ? 'on' : ''}" data-toggle="workouts" data-id="${w.id}" data-done="${!w.done}">${w.done ? '✓' : ''}</button>
        <button class="del-btn" data-del="workouts" data-id="${w.id}" title="Delete">${IC.trash}</button>
      </div>`).join('') : '<div class="card mute" style="text-align:center;padding:24px">No workouts match this filter.</div>'}

    ${S.arcOpen ? `<div class="dp-arc-backdrop" id="arcBackdrop"></div>` : ''}
    <div class="dp-arc-wrap ${S.arcOpen ? 'open' : ''} ${isLeft ? 'left' : 'right'}" id="arcWrap" style="${posStyle}">
      ${S.arcOpen && recs.length ? `
        <div class="dp-arc-oval" aria-hidden="true"></div>
        ${recs.slice(0, 4).map((r, idx, arr) => {
          const n = arr.length;
          const startDeg = isLeft ? -58 : 122;
          const angleDeg = n === 1 ? (isLeft ? 0 : 180) : startDeg + (idx * (116 / (n - 1)));
          const rad = (angleDeg * Math.PI) / 180;
          const rx = 92;
          const ry = 108;
          const x = Math.round(Math.cos(rad) * rx);
          const y = Math.round(-Math.sin(rad) * ry);
          return `<div class="dp-arc-item" style="--tx:${x}px;--ty:${y}px;--d:${idx * 35}ms">
            <button class="dp-arc-pill" data-addrec="${idx}" title="${esc(r.reason || '')}">
              <b>${esc(r.title)}</b><span>${r.duration_min}m · ${r.calories} kcal</span>
            </button>
            <button class="dp-arc-dot" data-addrec="${idx}" title="${esc(r.title)}">${arcIcon(r.category)}</button>
          </div>`;
        }).join('')}
      ` : ''}
      <button class="dp-arc-fab" id="arcFabBtn" aria-expanded="${!!S.arcOpen}" title="Drag to move · Tap for recommendations">
        <span>+</span>
      </button>
    </div>`;
}

export function healthDietPage() {
  const curDiet = S.profile?.diet_pref || 'both';
  const week = S.weekPlan || [];
  const selDay = week[S.selectedDayIdx] || week[0];
  const daySlots = selDay?.slots || S.plan?.slots || [];
  const dayLogs = selDay?.logs || [];
  const allNotifyOn = S.notifyDays.length === 7;
  const dayKcal = selDay?.totals?.projected?.kcal ?? daySlots.reduce((a, s) => a + (s.meal?.kcal || 0), 0);
  const dayP = selDay?.totals?.projected?.protein ?? daySlots.reduce((a, s) => a + (s.meal?.protein || 0), 0);
  const dayC = selDay?.totals?.projected?.carbs ?? daySlots.reduce((a, s) => a + (s.meal?.carbs || 0), 0);
  const dayF = selDay?.totals?.projected?.fat ?? daySlots.reduce((a, s) => a + (s.meal?.fat || 0), 0);
  const adj = selDay?.adjustmentDelta || 0;

  return `<div class="sec-head" style="margin-top:0">
      <button class="tag fit" data-go="/profile/edit" style="border:0;cursor:pointer;padding:5px 11px">Diet: ${curDiet.toUpperCase()} · Edit</button>
      <div style="display:flex;gap:6px">
        ${S.selectedDayIdx === 0 ? `<button class="btn sm" id="openLogFoodBtn">+ Log What You Ate</button>` : ''}
        <button class="bell-btn ${allNotifyOn ? 'on' : ''}" id="notifyAllBtn">${IC.bell} ${allNotifyOn ? 'All On' : 'Notify All'}</button>
      </div>
    </div>
    ${S.logFoodOpen && S.selectedDayIdx === 0 ? `
      <form id="logFoodForm" class="card" style="border-left:4px solid var(--fit);margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <h3 style="margin:0">Log What You Ate Today</h3>
          <button type="button" class="del-btn" id="closeLogFoodBtn">✕</button>
        </div>
        <div class="mute" style="font-size:12px;margin-bottom:8px">The next 6 days will automatically rebalance based on today's intake.</div>
        <div class="row">
          <div style="flex:2"><label style="margin-top:0">Food / Meal Name</label><input name="title" required placeholder="e.g. Masala Dosa or Pizza"></div>
          <div><label style="margin-top:0">Meal Slot</label><select name="slot">
            <option value="extra">Extra Snack / Treat</option>
            <option value="breakfast">Replaced Breakfast</option>
            <option value="lunch">Replaced Lunch</option>
            <option value="snack">Replaced Snack</option>
            <option value="dinner">Replaced Dinner</option>
          </select></div>
        </div>
        <div class="row">
          <div><label>Calories (kcal)</label><input name="kcal" type="number" min="0" max="5000" required placeholder="450"></div>
          <div><label>Protein (g)</label><input name="protein" type="number" min="0" step="0.5" placeholder="12"></div>
          <div><label>Carbs (g)</label><input name="carbs" type="number" min="0" step="0.5" placeholder="55"></div>
          <div><label>Fat (g)</label><input name="fat" type="number" min="0" step="0.5" placeholder="16"></div>
        </div>
        <button class="btn dp-btn-grad" type="submit">Save &amp; Update Next 6 Days</button>
      </form>` : ''}
    <div class="week-strip">
      ${week.map((d, i) => {
        const isVeg = S.vegDays.includes(d.dayIdx) || curDiet === 'veg';
        const hasBell = S.notifyDays.includes(d.dayIdx);
        return `<button class="day-pill ${S.selectedDayIdx === i ? 'on' : ''}" data-dayidx="${i}">
          <span>${WEEKDAYS[d.dayIdx]}</span><span>${d.date.slice(8)}</span>
          <span class="day-dots">${isVeg ? '<i class="dot-veg"></i>' : ''}${hasBell ? '<i class="dot-bell"></i>' : ''}</span>
        </button>`;
      }).join('')}
    </div>
    ${adj ? `<div class="card" style="background:var(--brand-soft);border-color:rgba(79,70,229,0.28);padding:10px 14px;margin:8px 0;font-size:12.5px">
      <b>6-Day Auto-Balance:</b> ${adj > 0 ? `+${adj}` : adj} kcal/day (${selDay.adjustedKcal} kcal target) to balance today's logged intake.
    </div>` : ''}
    ${selDay ? `<div class="day-ctrl-bar">
      <div>
        <div style="font-size:13px;font-weight:800">${WEEKDAYS[selDay.dayIdx]} · ${selDay.date}</div>
        <div class="mute" style="font-size:11.5px">${Math.round(dayKcal)} kcal · P ${Math.round(dayP)}g · C ${Math.round(dayC)}g · F ${Math.round(dayF)}g</div>
      </div>
      <div style="display:flex;gap:6px">
        ${curDiet !== 'veg' ? `<button class="veg-btn ${S.vegDays.includes(selDay.dayIdx) ? 'on' : ''}" data-toggleveg="${selDay.dayIdx}">${S.vegDays.includes(selDay.dayIdx) ? 'Veg-Only ✓' : 'Veg Day?'}</button>` : '<span class="tag fit">Veg</span>'}
        <button class="bell-btn ${S.notifyDays.includes(selDay.dayIdx) ? 'on' : ''}" data-togglebell="${selDay.dayIdx}">${IC.bell} ${S.notifyDays.includes(selDay.dayIdx) ? 'On' : 'Notify'}</button>
      </div>
    </div>` : ''}
    ${dayLogs.length ? `<div class="sec-head" style="margin-top:8px"><h2>Logged Today</h2><span class="mute">${dayLogs.length} item(s)</span></div>
      ${dayLogs.map(l => `<div class="wo-card accent-goals">
        <div class="wo-badge" style="background:var(--goals-soft);color:var(--goals)">+</div>
        <div style="flex:1;min-width:0">
          <div class="wo-title">${esc(l.title)} <span class="tag goals" style="margin:0">${l.slot === 'extra' ? 'Extra' : 'Replaced ' + l.slot}</span></div>
          <div class="wo-meta"><span><b>${Math.round(l.kcal)}</b> kcal</span><span>•</span><span>P ${l.protein}g</span><span>•</span><span>C ${l.carbs}g</span><span>•</span><span>F ${l.fat}g</span></div>
        </div>
        <button class="del-btn" data-dellog="${l.id}" title="Remove log">${IC.trash}</button>
      </div>`).join('')}` : ''}
    ${daySlots.map(s => {
      const m = s.meal; if (!m) return '';
      return `<div class="wo-card accent-fit ${s.done ? 'done' : ''}">
        <button class="chk ${s.done ? 'on' : ''}" data-mealcheck="${s.slot}" data-done="${s.done ? 0 : 1}">${s.done ? '✓' : ''}</button>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <span class="mute" style="font-size:11.5px;font-weight:700">${s.time} · ${s.label}</span>
            <span class="tag ${m.diet_type === 'veg' ? 'fit' : 'med'}" style="margin:0">${m.diet_type === 'veg' ? 'Veg' : 'Non-veg'}</span>
            ${s.replacedByLog ? `<span class="tag goals" style="margin:0">Logged</span>` : ''}
          </div>
          <div class="wo-title" style="margin-top:2px">${esc(m.title)}</div>
          <div class="wo-meta"><span><b>${Math.round(m.kcal)}</b> kcal</span><span>•</span><span>P ${Math.round(m.protein)}g</span><span>•</span><span>C ${Math.round(m.carbs)}g</span><span>•</span><span>F ${Math.round(m.fat)}g</span></div>
        </div>
        ${S.selectedDayIdx === 0 ? `<button class="mini-action" style="margin:0;padding:6px 10px" data-swap="${s.slot}" title="Swap meal">${IC.swap}</button>` : ''}
      </div>`;
    }).join('')}`;
}

export {
  healthOverviewPage as fitnessOverviewPage,
  exercisePage as fitnessWorkoutsPage,
  healthDietPage as fitnessDietPage,
};
