import { S, IC, WEEKDAYS, esc, localDate, pct, matchesSearch, searchBarView } from '../state.js';

function sparkSvg(pctVal) {
  const h = 44;
  const barH = Math.max(4, Math.round((Math.min(100, Math.max(0, pctVal)) / 100) * h));
  return `<svg class="dp-spark-svg dp-spark-svg--sm" viewBox="0 0 24 ${h}" aria-hidden="true">
    <rect class="dp-spark-rect" x="0" y="${h - barH}" width="24" height="${barH}" rx="4"/>
  </svg>`;
}

export function healthSubNav() {
  const r = S.route;
  const isHealth = r === '/health' || r === '/fitness';
  const isDiet = r === '/health/diet' || r === '/fitness/diet';
  const isAct = r === '/health/activity';
  return `<div class="dp-subnav">
    <div class="dp-seg" role="tablist" aria-label="Health sections">
      <button type="button" class="dp-seg-btn ${isHealth ? 'on' : ''}" data-go="/health">Summary</button>
      <button type="button" class="dp-seg-btn ${isDiet ? 'on' : ''}" data-go="/health/diet">7-Day Diet</button>
      <button type="button" class="dp-seg-btn ${isAct ? 'on' : ''}" data-go="/health/activity">Activity</button>
    </div>
  </div>`;
}

export function healthOverviewPage() {
  const t = S.plan?.targets || S.targets || { calories: 2250, protein: 140, carbs: 250, fat: 72, stepsGoal: 9000, waterL: 3.2, bmi: 22.5, bmiCategory: 'Normal' };
  const e = S.plan?.totals?.eaten || { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const todaySteps = (S.progress?.steps?.find(s => s.date === localDate()) || {}).steps || 0;
  const kcalPct = pct(e.kcal, t.calories);
  const remainKcal = Math.max(0, Math.round(t.calories - e.kcal));
  const r = 26, circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - kcalPct / 100);
  const waterGoalMl = Math.round((t.waterL || 3.2) * 1000);
  const goalLbl = { lose: 'Slim / Fat Loss', fit: 'Stay Fit', bulk: 'Bulking' }[S.profile?.goal || 'fit'];
  const dietLbl = { veg: 'Veg Only', nonveg: 'Non-Veg', both: 'Both' }[S.profile?.diet_pref || 'both'];
  const slots = S.plan?.slots || [];

  return `
    ${healthSubNav()}

    <div class="page-head">
      <div><div class="mute">Health &amp; Nutrition</div><h1>Daily Health</h1></div>
      <button type="button" class="tag fit tag--clickable" data-go="/profile/edit">${goalLbl} · ${dietLbl} · Edit</button>
    </div>

    <div class="home-grid">
      <div class="dp-col-stack">
        <div class="hero-flat-card">
          <div class="hero-top-row">
            <div class="hero-greet">Profile Nutrition Target</div>
            <span class="home-date-pill">${t.bmi ? `BMI ${t.bmi} · ${t.bmiCategory}` : goalLbl}</span>
          </div>
          <div class="hero-main-row">
            <div>
              <div class="hero-pct">${remainKcal} kcal left</div>
              <div class="hero-sub">${Math.round(e.kcal)} of ${t.calories} kcal eaten</div>
            </div>
            <div class="dp-ring">
              <svg viewBox="0 0 64 64">
                <circle class="dp-ring-track" cx="32" cy="32" r="${r}"/>
                <circle class="dp-ring-arc dp-ring-arc--green" cx="32" cy="32" r="${r}"
                  stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${dashOffset.toFixed(1)}"/>
              </svg>
              <div class="dp-ring-label">${kcalPct}%</div>
            </div>
          </div>
          <div class="dp-macro-grid">
            <div class="dp-macro-item">
              <small>Protein</small>
              <b>${Math.round(e.protein)}/${t.protein}g</b>
              <progress class="dp-progress dp-progress--fit" value="${pct(e.protein, t.protein)}" max="100"></progress>
            </div>
            <div class="dp-macro-item">
              <small>Carbs</small>
              <b>${Math.round(e.carbs)}/${t.carbs}g</b>
              <progress class="dp-progress dp-progress--brand" value="${pct(e.carbs, t.carbs)}" max="100"></progress>
            </div>
            <div class="dp-macro-item">
              <small>Fat</small>
              <b>${Math.round(e.fat)}/${t.fat}g</b>
              <progress class="dp-progress dp-progress--goals" value="${pct(e.fat, t.fat)}" max="100"></progress>
            </div>
          </div>
        </div>

        <div class="bento-2">
          <div class="bento-card">
            <div class="bento-head">
              <span class="dp-row-ic ic-goals">${IC.steps}</span>
              <button type="button" class="link" id="toggleEditSteps">${S.editingSteps ? 'Done' : 'Edit'}</button>
            </div>
            <div>
              <div class="bento-val">${Number(todaySteps).toLocaleString()}</div>
              <div class="bento-sub">of ${t.stepsGoal.toLocaleString()} steps</div>
              <div class="dp-prog-wrap"><progress class="dp-progress dp-progress--goals" value="${pct(todaySteps, t.stepsGoal)}" max="100"></progress></div>
            </div>
            ${S.editingSteps
      ? `<div class="steps-edit"><input id="stepsIn" type="number" value="${todaySteps}"><button type="button" class="btn sm" id="saveSteps">Save</button></div>`
      : `<button type="button" class="btn sec sm btn--flush" id="add500Steps">+ 500 steps</button>`}
          </div>

          <div class="bento-card">
            <div class="bento-head">
              <span class="dp-row-ic ic-brand">${IC.drop}</span>
              <span class="bento-sub dp-num">${pct(S.waterMl, waterGoalMl)}%</span>
            </div>
            <div>
              <div class="bento-val">${(S.waterMl / 1000).toFixed(2).replace(/\.00$/, '.0')} L</div>
              <div class="bento-sub">of ${(waterGoalMl / 1000).toFixed(1)} L water</div>
              <div class="dp-prog-wrap"><progress class="dp-progress" value="${pct(S.waterMl, waterGoalMl)}" max="100"></progress></div>
            </div>
            <div class="dp-inline-group">
              <button type="button" class="btn sec sm btn--flush dp-flex-1" id="addWater">+ 250 ml</button>
              ${S.waterMl > 0 ? `<button type="button" class="btn sec sm btn--flush" id="subWater" title="Undo 250 ml">−250</button>` : ''}
            </div>
          </div>
        </div>

        ${(S.progress?.weights?.length || S.progress?.steps?.length) ? `
        <div class="card">
          <div class="sec-head">
            <h3>7-Day Steps &amp; Weight</h3>
            <button type="button" class="link" data-go="/analytics">Analytics ›</button>
          </div>
          ${S.progress?.weights?.length ? `<div class="dp-weight-row">
            <div><div class="dp-caption">Latest Weight</div><b>${S.progress.weights[S.progress.weights.length - 1].kg} kg</b></div>
            <div class="dp-text-right"><div class="dp-caption">Trend (${S.progress.weights.length} logs)</div><b>${(() => { const w = S.progress.weights; if (w.length < 2) return 'Baseline'; const diff = +(w[w.length - 1].kg - w[0].kg).toFixed(1); return `${diff > 0 ? '+' : ''}${diff} kg`; })()}</b></div>
          </div>` : ''}
          ${S.progress?.steps?.length ? `<div class="spark">
            ${S.progress.steps.slice(-7).map(st => `<div class="spark-col ${st.date === localDate() ? 'today' : ''}">
              <span class="spark-val">${st.steps >= 1000 ? (st.steps / 1000).toFixed(1) + 'k' : st.steps}</span>
              ${sparkSvg(pct(st.steps, t.stepsGoal))}
              <span class="spark-lbl">${st.date.slice(8)}</span>
            </div>`).join('')}
          </div>` : ''}
        </div>` : ''}

        ${S.profile?.skin_care && S.plan?.tips?.length ? `
        <div class="card">
          <div class="sec-head"><h3>Skin-Care Tips</h3><span class="tag fit">Active</span></div>
          ${S.plan.tips.slice(0, 3).map(tip => `<div class="dp-tip-item">
            <div class="dp-tip-title">${esc(tip.title)}</div>
            <div class="mute">${esc(tip.body)}</div>
          </div>`).join('')}
        </div>` : ''}
      </div>

      <div class="dp-col-stack">
        <div>
          <div class="sec-head">
            <h2>Today's Diet Plan</h2>
            <div class="dp-inline-group">
              <button type="button" class="link" id="openLogFoodBtn">+ Log Ate</button>
              <button type="button" class="link" data-go="/health/diet">7-Day Plan ›</button>
            </div>
          </div>
          <div class="list-stack">
            ${slots.length ? slots.map(s => {
    const m = s.meal; if (!m) return '';
    return `<div class="dp-row ${s.done ? 'done' : ''}">
                <div class="dp-row-ic ic-fit">${IC.utensils}</div>
                <div class="dp-row-body">
                  <div class="dp-row-title">${esc(m.title)}</div>
                  <div class="dp-row-sub"><span>${s.label} · ${s.time}</span><span>·</span><span>${Math.round(m.kcal)} kcal</span><span>·</span><span>P ${Math.round(m.protein)}g</span></div>
                </div>
                <button type="button" class="chk chk--fit ${s.done ? 'on' : ''}" data-mealcheck="${s.slot}" data-done="${s.done ? 0 : 1}" aria-label="Toggle meal">${s.done ? IC.check : ''}</button>
              </div>`;
  }).join('') : '<div class="card mute">Open 7-Day Diet to view your meals.</div>'}
          </div>
        </div>

        <div class="list-stack">
          <div class="dp-row dp-row--clickable" data-go="/exercise">
            <div class="dp-row-ic ic-fit">${IC.dumbbell}</div>
            <div class="dp-row-body">
              <div class="dp-row-title">Exercise Panel</div>
              <div class="dp-row-sub">${S.workouts.filter(w => w.done).length}/${S.workouts.length} workouts done today</div>
            </div>
            <span class="mute">${IC.chevronRight}</span>
          </div>

          <div class="dp-row dp-row--clickable" data-go="/health/activity">
            <div class="dp-row-ic ic-goals">${IC.route}</div>
            <div class="dp-row-body">
              <div class="dp-row-title">GPS Activity Tracker</div>
              <div class="dp-row-sub">${(S.activities || []).length} recorded runs, walks &amp; rides</div>
            </div>
            <span class="mute">${IC.chevronRight}</span>
          </div>
        </div>
      </div>
    </div>`;
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

  return `
    <div class="page-head">
      <div><div class="mute">Exercise &amp; Training</div><h1>Your Workouts</h1></div>
      <button type="button" class="tag fit tag--clickable" data-go="/profile/edit">${goalLbl} · ${activityLbl}</button>
    </div>

    <div class="dp-section grid3">
      <div class="stat-card"><b>${doneList.length}/${S.workouts.length}</b><span>Completed</span></div>
      <div class="stat-card"><b>${mins}m</b><span>Active Time</span></div>
      <div class="stat-card"><b>${kcal}</b><span>kcal Burned</span></div>
    </div>

    <div class="dp-section card">
      <div class="sec-head">
        <h3>Recommended for ${goalLbl}</h3>
        <span class="dp-caption">Tap to add</span>
      </div>
      <div class="dp-chip-list">
        ${recs.length ? recs.map((r, idx) => `
          <button type="button" class="dp-rec-chip" data-addrec="${idx}" title="${esc(r.reason || '')}">
            <span>+ ${esc(r.title)}</span>
            <span class="dp-rec-chip-meta">${r.duration_min}m · ${r.calories} kcal</span>
          </button>`).join('') : '<span class="mute">Complete your profile to get personalized workout recommendations.</span>'}
      </div>
    </div>

    ${searchBarView('Search workouts…')}

    <div class="dp-subbar">
      <div class="dp-seg dp-seg--inline" role="tablist" aria-label="Workout category">
        ${['All', 'Strength', 'Cardio', 'Mobility', 'HIIT'].map(c => `<button type="button" class="dp-seg-btn ${S.fitFilter === c ? 'on' : ''}" data-fitfilter="${c}">${c}</button>`).join('')}
      </div>
      <select class="dp-select dp-hidden-sel" id="fitFilterSel">${['All', 'Strength', 'Cardio', 'Mobility', 'HIIT'].map(c => `<option value="${c}" ${S.fitFilter === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
      <button type="button" class="btn sm" data-openadd="exercise">+ Custom</button>
    </div>

    <div class="list-stack">
      ${workouts.length ? workouts.map(w => `
        <div class="dp-row ${w.done ? 'done' : ''}">
          <div class="dp-row-ic ic-fit">${IC.dumbbell}</div>
          <div class="dp-row-body">
            <div class="dp-row-title">${esc(w.title)}</div>
            <div class="dp-row-sub"><span>${esc(w.category)}</span><span>·</span><span>${w.duration_min} min</span><span>·</span><span>${w.calories} kcal</span></div>
          </div>
          <div class="dp-row-actions">
            <button type="button" class="del-btn" data-edit="workouts" data-id="${w.id}" title="Edit" aria-label="Edit">${IC.edit}</button>
            <button type="button" class="del-btn del-btn--danger" data-del="workouts" data-id="${w.id}" title="Delete" aria-label="Delete">${IC.trash}</button>
            <button type="button" class="chk chk--fit ${w.done ? 'on' : ''}" data-toggle="workouts" data-id="${w.id}" data-done="${!w.done}" aria-label="Toggle workout">${w.done ? IC.check : ''}</button>
          </div>
        </div>`).join('') : '<div class="card dp-empty"><div class="mute">No workouts match this filter.</div></div>'}
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

  return `
    ${healthSubNav()}

    <div class="sec-head">
      <button type="button" class="tag fit tag--clickable" data-go="/profile/edit">Diet: ${curDiet.toUpperCase()} · Edit</button>
      <div class="dp-inline-group">
        ${S.selectedDayIdx === 0 ? `<button type="button" class="btn sm" id="openLogFoodBtn">+ Log What You Ate</button>` : ''}
        <button type="button" class="bell-btn ${allNotifyOn ? 'on' : ''}" id="notifyAllBtn">${IC.bell} ${allNotifyOn ? 'All On' : 'Notify All'}</button>
      </div>
    </div>

    ${S.logFoodOpen && S.selectedDayIdx === 0 ? `
      <form id="logFoodForm" class="card dp-section">
        <div class="dp-modal-head">
          <h3>Log What You Ate Today</h3>
          <button type="button" class="del-btn" id="closeLogFoodBtn" aria-label="Close">${IC.x}</button>
        </div>
        <div class="mute dp-modal-desc">The next 6 days will automatically rebalance based on today's intake.</div>
        <div class="row">
          <div class="dp-col-wide"><label class="dp-label-first">Food / Meal Name</label><input name="title" required placeholder="e.g. Masala Dosa or Pizza"></div>
          <div><label class="dp-label-first">Meal Slot</label><select name="slot">
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
        <button class="btn" type="submit">Save &amp; Update Next 6 Days</button>
      </form>` : ''}

    <div class="week-strip">
      ${week.map((d, i) => {
    const isVeg = S.vegDays.includes(d.dayIdx) || curDiet === 'veg';
    const hasBell = S.notifyDays.includes(d.dayIdx);
    return `<button type="button" class="day-pill ${S.selectedDayIdx === i ? 'on' : ''}" data-dayidx="${i}">
          <span>${WEEKDAYS[d.dayIdx]}</span><span>${d.date.slice(8)}</span>
          <span class="day-dots">${isVeg ? '<i class="dot-veg"></i>' : ''}${hasBell ? '<i class="dot-bell"></i>' : ''}</span>
        </button>`;
  }).join('')}
    </div>

    ${adj ? `<div class="dp-adj-banner">
      <b>6-Day Auto-Balance:</b> ${adj > 0 ? `+${adj}` : adj} kcal/day (${selDay.adjustedKcal} kcal target) to balance today's logged intake.
    </div>` : ''}

    ${selDay ? `<div class="day-ctrl-bar">
      <div>
        <div class="day-ctrl-title">${WEEKDAYS[selDay.dayIdx]} · ${selDay.date}</div>
        <div class="dp-caption dp-num">${Math.round(dayKcal)} kcal · P ${Math.round(dayP)}g · C ${Math.round(dayC)}g · F ${Math.round(dayF)}g</div>
      </div>
      <div class="dp-inline-group">
        ${curDiet !== 'veg' ? `<button type="button" class="veg-btn ${S.vegDays.includes(selDay.dayIdx) ? 'on' : ''}" data-toggleveg="${selDay.dayIdx}">${S.vegDays.includes(selDay.dayIdx) ? 'Veg-Only ✓' : 'Veg Day?'}</button>` : '<span class="tag fit">Veg</span>'}
        <button type="button" class="bell-btn ${S.notifyDays.includes(selDay.dayIdx) ? 'on' : ''}" data-togglebell="${selDay.dayIdx}">${IC.bell} ${S.notifyDays.includes(selDay.dayIdx) ? 'On' : 'Notify'}</button>
      </div>
    </div>` : ''}

    ${dayLogs.length ? `<div class="sec-head"><h2>Logged Today</h2><span class="mute">${dayLogs.length} item(s)</span></div>
      <div class="list-stack dp-section">
        ${dayLogs.map(l => `<div class="dp-row">
          <div class="dp-row-ic ic-goals">${IC.plus}</div>
          <div class="dp-row-body">
            <div class="dp-row-title">${esc(l.title)}</div>
            <div class="dp-row-sub"><span>${l.slot === 'extra' ? 'Extra' : 'Replaced ' + l.slot}</span><span>·</span><span>${Math.round(l.kcal)} kcal</span><span>·</span><span>P ${l.protein}g · C ${l.carbs}g · F ${l.fat}g</span></div>
          </div>
          <button type="button" class="del-btn del-btn--danger" data-dellog="${l.id}" title="Remove log" aria-label="Remove log">${IC.trash}</button>
        </div>`).join('')}
      </div>` : ''}

    <div class="list-stack">
      ${daySlots.map(s => {
    const m = s.meal; if (!m) return '';
    return `<div class="dp-row ${s.done ? 'done' : ''}">
          <div class="dp-row-ic ic-fit">${IC.utensils}</div>
          <div class="dp-row-body">
            <div class="dp-row-title">${esc(m.title)}</div>
            <div class="dp-row-sub">
              <span>${s.time} · ${s.label}</span>
              <span>·</span>
              <span>${m.diet_type === 'veg' ? 'Veg' : 'Non-veg'}</span>
              ${s.replacedByLog ? `<span>·</span><span class="tag goals">Logged</span>` : ''}
              <span>·</span>
              <span>${Math.round(m.kcal)} kcal (P ${Math.round(m.protein)}g · C ${Math.round(m.carbs)}g · F ${Math.round(m.fat)}g)</span>
            </div>
          </div>
          <div class="dp-row-actions">
            ${S.selectedDayIdx === 0 ? `<button type="button" class="del-btn" data-swap="${s.slot}" title="Swap meal" aria-label="Swap meal">${IC.swap}</button>` : ''}
            <button type="button" class="chk chk--fit ${s.done ? 'on' : ''}" data-mealcheck="${s.slot}" data-done="${s.done ? 0 : 1}" aria-label="Toggle meal">${s.done ? IC.check : ''}</button>
          </div>
        </div>`;
  }).join('')}
    </div>`;
}

export {
  healthOverviewPage as fitnessOverviewPage,
  exercisePage as fitnessWorkoutsPage,
  healthDietPage as fitnessDietPage,
};
