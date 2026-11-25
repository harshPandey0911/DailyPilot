import { S, IC, esc, localDate, metrics, matchesSearch, searchBarView } from '../state.js';

function sparkSvg(pctVal, compact = false) {
  const h = compact ? 44 : 68;
  const barH = Math.max(4, Math.round((Math.min(100, Math.max(0, pctVal)) / 100) * h));
  const y = h - barH;
  return `<svg class="dp-spark-svg ${compact ? 'dp-spark-svg--sm' : ''}" viewBox="0 0 24 ${h}" aria-hidden="true">
    <rect class="dp-spark-rect" x="0" y="${y}" width="24" height="${barH}" rx="4"/>
  </svg>`;
}

export function overviewPage() {
  const m = metrics();
  const hr = new Date().getHours();
  const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  const first = esc((S.user?.name || 'Alex').split(' ')[0]);
  const eaten = Math.round(S.plan?.totals?.eaten?.kcal || 0);
  const targetKcal = S.targets?.calories || 2200;
  const dateLabel = new Date((S.viewDate || localDate()) + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const r = 26, circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - Math.min(100, m.goalPct) / 100);

  const wDone = S.workouts.filter(w => w.done).length, wTot = S.workouts.length;
  const sDone = S.study.filter(s => s.done).length, sTot = S.study.length;
  const gDone = S.goals.filter(g => g.done).length, gTot = S.goals.length;

  const pct = (d, t) => (t ? Math.round((d / t) * 100) : 0);

  const upNext = [
    ...S.goals.filter(x => !x.done).map(x => ({ col: 'goals', id: x.id, title: x.title, sub: x.time_label || x.category, tag: 'Goal', cls: 'goals', ic: IC.target })),
    ...S.workouts.filter(x => !x.done).map(x => ({ col: 'workouts', id: x.id, title: x.title, sub: `${x.category} · ${x.duration_min}m`, tag: 'Fitness', cls: 'fit', ic: IC.dumbbell })),
    ...S.study.filter(x => !x.done).map(x => ({ col: 'study', id: x.id, title: x.title, sub: `${x.subject} · ${x.duration_min}m`, tag: 'Study', cls: 'study', ic: IC.book })),
  ].slice(0, 5);

  const tip = (S.recommendations?.insights && S.recommendations.insights[0]) || (S.tips && S.tips[0]) || {
    title: 'Stay consistent',
    body: 'Small daily wins across fitness, study, and goals compound faster than occasional intense sprints.',
  };

  return `
    <div class="dp-section">
      <div class="hero-flat-card">
        <div class="hero-top-row">
          <div class="hero-greet">${greet}, ${first}</div>
          <div class="home-date-pill">${dateLabel}</div>
        </div>
        <div class="hero-main-row">
          <div>
            <div class="hero-pct">${m.goalPct}%</div>
            <div class="hero-sub">${m.doneCount} of ${m.totalCount} tasks complete</div>
          </div>
          <div class="dp-ring">
            <svg viewBox="0 0 64 64">
              <circle class="dp-ring-track" cx="32" cy="32" r="${r}"/>
              <circle class="dp-ring-arc" cx="32" cy="32" r="${r}"
                stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${dashOffset.toFixed(1)}"/>
            </svg>
            <div class="dp-ring-label">${m.goalPct}%</div>
          </div>
        </div>
        <div class="hero-chips">
          <span class="hero-chip">Fit ${wDone}/${wTot}</span>
          <span class="hero-chip">Study ${sDone}/${sTot}</span>
          <span class="hero-chip">Goals ${gDone}/${gTot}</span>
        </div>
      </div>
    </div>

    <div class="dp-section grid3">
      <div class="stat-card stat-card--clickable" data-pillar="goals"><b>${m.doneCount}/${m.totalCount}</b><span>Tasks Done</span></div>
      <div class="stat-card stat-card--clickable" data-pillar="study"><b>${m.focusFmt}</b><span>Focus Time</span></div>
      <div class="stat-card stat-card--clickable" data-pillar="health"><b>${eaten}</b><span>kcal Today</span></div>
    </div>

    <div class="home-grid">
      <div class="dp-col-stack">
        <div>
          <div class="sec-head">
            <h2>Up Next Today</h2>
            <button type="button" class="link" data-openadd="goals">+ Quick Add</button>
          </div>
          <div class="list-stack">
          ${upNext.length ? upNext.map(it => `
            <div class="dp-row">
              <div class="dp-row-ic ic-${it.cls}">${it.ic}</div>
              <div class="dp-row-body">
                <div class="dp-row-title">${esc(it.title)}</div>
                <div class="dp-row-sub"><span>${it.tag}</span><span>·</span><span>${esc(it.sub)}</span></div>
              </div>
              <button type="button" class="chk chk--${it.cls}" data-toggle="${it.col}" data-id="${it.id}" data-done="true" title="Mark done" aria-label="Mark done"></button>
            </div>
          `).join('') : `
            <div class="card dp-empty">
              <div class="dp-empty-title">All caught up</div>
              <div class="mute dp-empty-sub">You've completed every scheduled item for today.</div>
              <button type="button" class="btn sm" data-openadd="goals">+ Add Another Goal</button>
            </div>
          `}
          </div>
        </div>
      </div>

      <div class="dp-col-stack">
        <div>
          <div class="sec-head">
            <h2>Workspaces</h2>
            <span class="mute">Jump in</span>
          </div>
          <div class="list-stack">
            <div class="dp-row dp-row--clickable" data-pillar="health">
              <div class="dp-row-ic ic-fit">${IC.drop}</div>
              <div class="dp-row-body">
                <div class="dp-row-title">Health &amp; 7-Day Diet</div>
                <div class="dp-row-sub">${eaten}/${targetKcal} kcal · Steps &amp; water</div>
                <div class="dp-prog-wrap"><progress class="dp-progress dp-progress--fit" value="${Math.min(100, Math.round((eaten / (targetKcal || 1)) * 100))}" max="100"></progress></div>
              </div>
              <span class="mute">${IC.chevronRight}</span>
            </div>
            <div class="dp-row dp-row--clickable" data-pillar="exercise">
              <div class="dp-row-ic ic-fit">${IC.dumbbell}</div>
              <div class="dp-row-body">
                <div class="dp-row-title">Exercise &amp; Workouts</div>
                <div class="dp-row-sub">${wDone}/${wTot} workouts completed today</div>
                <div class="dp-prog-wrap"><progress class="dp-progress dp-progress--fit" value="${pct(wDone, wTot)}" max="100"></progress></div>
              </div>
              <span class="mute">${IC.chevronRight}</span>
            </div>
            <div class="dp-row dp-row--clickable" data-pillar="study">
              <div class="dp-row-ic ic-study">${IC.book}</div>
              <div class="dp-row-body">
                <div class="dp-row-title">Study &amp; Focus Timer</div>
                <div class="dp-row-sub">${m.focusFmt} focused · ${sTot - sDone} sessions left</div>
                <div class="dp-prog-wrap"><progress class="dp-progress dp-progress--study" value="${pct(sDone, sTot)}" max="100"></progress></div>
              </div>
              <span class="mute">${IC.chevronRight}</span>
            </div>
            <div class="dp-row dp-row--clickable" data-pillar="goals">
              <div class="dp-row-ic ic-goals">${IC.target}</div>
              <div class="dp-row-body">
                <div class="dp-row-title">Daily Goals</div>
                <div class="dp-row-sub">${gDone}/${gTot} completed today</div>
                <div class="dp-prog-wrap"><progress class="dp-progress dp-progress--goals" value="${pct(gDone, gTot)}" max="100"></progress></div>
              </div>
              <span class="mute">${IC.chevronRight}</span>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="dp-kicker dp-kicker--green">Daily Wellness Tip</div>
          <div class="dp-tip-title">${esc(tip.title)}</div>
          <div class="mute">${esc(tip.body)}</div>
        </div>
      </div>
    </div>`;
}

export function schedulePage() {
  const allRows = [
    ...S.workouts.map(w => ({ col: 'workouts', id: w.id, kind: 'Fitness', tag: 'fit', ic: IC.dumbbell, title: w.title, sub: w.category, meta: `${w.duration_min}m`, done: w.done })),
    ...S.study.map(s => ({ col: 'study', id: s.id, kind: 'Study', tag: 'study', ic: IC.book, title: s.title, sub: s.subject, meta: `${s.duration_min}m`, done: s.done })),
    ...S.goals.map(g => ({ col: 'goals', id: g.id, kind: 'Goal', tag: 'goals', ic: IC.target, title: g.title, sub: g.category, meta: g.time_label || 'Today', done: g.done })),
  ];

  const filter = S.schedFilter || 'all';
  const rows = allRows.filter(r => (filter === 'all' || r.tag === filter) && matchesSearch(`${r.title} ${r.sub} ${r.kind}`));
  const doneCount = allRows.filter(r => r.done).length;
  const totalCount = allRows.length;
  const pctDone = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
  const dateLabel = new Date((S.viewDate || localDate()) + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const pending = rows.filter(r => !r.done);
  const completed = rows.filter(r => r.done);

  const renderRow = r => `
    <div class="dp-row ${r.done ? 'done' : ''}">
      <div class="dp-row-ic ic-${r.tag}">${r.ic}</div>
      <div class="dp-row-body">
        <div class="dp-row-title">${esc(r.title)}</div>
        <div class="dp-row-sub">
          <span>${r.kind}</span>
          <span>·</span>
          <span>${esc(r.sub)}</span>
        </div>
      </div>
      <span class="sched-time">${esc(r.meta)}</span>
      <button type="button" class="chk chk--${r.tag} ${r.done ? 'on' : ''}" data-toggle="${r.col}" data-id="${r.id}" data-done="${!r.done}" title="${r.done ? 'Mark pending' : 'Mark done'}" aria-label="${r.done ? 'Mark pending' : 'Mark done'}">${r.done ? IC.check : ''}</button>
    </div>`;

  return `
    <div class="dp-section card">
      <div class="sched-summary-top">
        <div>
          <div class="sched-date">${dateLabel}</div>
          <div class="mute">${doneCount} of ${totalCount} tasks completed</div>
        </div>
        <div class="dp-inline-group">
          <input type="date" id="viewDateIn" class="dp-date-input" value="${esc(S.viewDate || localDate())}">
          <span class="tag brand dp-num">${pctDone}%</span>
          <button type="button" class="btn sm" data-openadd="goals">+ Add</button>
        </div>
      </div>
      <div class="dp-prog-wrap"><progress class="dp-progress" value="${pctDone}" max="100"></progress></div>
    </div>

    ${searchBarView('Search schedule…')}

    <div class="dp-seg-wrap">
      <div class="dp-seg" role="tablist" aria-label="Filter schedule">
        ${[
      ['all', `All (${allRows.length})`],
      ['fit', `Fitness (${S.workouts.length})`],
      ['study', `Study (${S.study.length})`],
      ['goals', `Goals (${S.goals.length})`],
    ].map(([k, lbl]) => `<button type="button" class="dp-seg-btn ${filter === k ? 'on' : ''}" data-schedfilter="${k}">${lbl}</button>`).join('')}
      </div>
    </div>

    ${!rows.length ? `
      <div class="card dp-empty">
        <div class="dp-empty-title">No items scheduled</div>
        <div class="mute dp-empty-sub">Add a workout, study session, or daily goal to your agenda.</div>
        <button type="button" class="btn sm" data-openadd="${filter === 'fit' ? 'exercise' : filter === 'study' ? 'study' : 'goals'}">+ Add Task</button>
      </div>
    ` : `
      ${pending.length ? `
        <div class="sched-sec-head">
          <span>Up Next</span>
          <span class="sched-count">${pending.length}</span>
        </div>
        <div class="list-stack dp-section">${pending.map(renderRow).join('')}</div>
      ` : ''}
      ${completed.length ? `
        <div class="sched-sec-head">
          <span>Completed</span>
          <span class="sched-count">${completed.length}</span>
        </div>
        <div class="list-stack">${completed.map(renderRow).join('')}</div>
      ` : ''}
    `}`;
}

export function analyticsPage() {
  const m = metrics();
  const pct = (d, t) => (t ? Math.min(100, Math.round((d / t) * 100)) : 0);

  const wDone = S.workouts.filter(w => w.done).length, wTot = S.workouts.length;
  const sDone = S.study.filter(s => s.done).length, sTot = S.study.length;
  const gDone = S.goals.filter(g => g.done).length, gTot = S.goals.length;

  const fitMin = S.workouts.filter(w => w.done).reduce((a, b) => a + (b.duration_min || 0), 0);
  const kcalBurned = S.workouts.filter(w => w.done).reduce((a, b) => a + (b.calories || 0), 0);

  const eaten = S.plan?.totals?.eaten || { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const target = S.targets || { calories: 2250, protein: 140, carbs: 250, fat: 72, stepsGoal: 9000, waterL: 3.2 };
  const todaySteps = (S.progress?.steps?.find(s => s.date === localDate()) || {}).steps || 0;
  const waterGoalMl = Math.round((target.waterL || 3.2) * 1000);

  const todayStr = localDate();
  const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const weekly = S.progress?.weekly || [];
  const weekScores = days.map((d, i) => {
    const row = weekly[i];
    const isToday = row ? row.date === todayStr : i === (new Date().getDay() + 6) % 7;
    const val = isToday ? m.goalPct : (row ? row.pct : 0);
    return { day: d, val, isToday };
  });
  const weekAvg = Math.round(weekScores.reduce((a, b) => a + b.val, 0) / 7);

  const r = 26, circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - Math.min(100, m.goalPct) / 100);

  const insight = m.goalPct >= 80
    ? { title: 'Peak Momentum', body: 'You are outperforming your weekly average across all pillars today.' }
    : eaten.protein < (target.protein || 140) * 0.65
      ? { title: 'Boost Protein Intake', body: `You've had ${Math.round(eaten.protein)}g of your ${target.protein}g protein target so far.` }
      : S.waterMl < waterGoalMl * 0.75
        ? { title: 'Hydration Check', body: `${((waterGoalMl - S.waterMl) / 1000).toFixed(1)} L remaining to hit today's water goal.` }
        : { title: 'Steady Progress', body: `${m.totalCount - m.doneCount} remaining task(s) to close out your day at 100%.` };

  return `
    <div class="page-head">
      <div>
        <div class="mute">Performance across Fitness, Study &amp; Daily Goals</div>
        <h1>Analytics</h1>
      </div>
      <div class="home-date-pill">Avg ${weekAvg}%</div>
    </div>

    <div class="dp-section hero-flat-card">
      <div class="hero-top-row">
        <div class="hero-greet">Today's Consistency Score</div>
        <span class="home-date-pill">${kcalBurned} kcal burned</span>
      </div>
      <div class="hero-main-row">
        <div>
          <div class="hero-pct">${m.goalPct}%</div>
          <div class="hero-sub">${m.doneCount} of ${m.totalCount} tasks completed</div>
        </div>
        <div class="dp-ring">
          <svg viewBox="0 0 64 64">
            <circle class="dp-ring-track" cx="32" cy="32" r="${r}"/>
            <circle class="dp-ring-arc" cx="32" cy="32" r="${r}"
              stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${dashOffset.toFixed(1)}"/>
          </svg>
          <div class="dp-ring-label">${m.goalPct}%</div>
        </div>
      </div>
      <div class="hero-chips">
        <span class="hero-chip">${fitMin}m Workout</span>
        <span class="hero-chip">${m.focusFmt} Study</span>
      </div>
    </div>

    <div class="dp-section grid3">
      <div class="stat-card stat-card--clickable" data-pillar="exercise"><b>${fitMin}m</b><span>Workout</span></div>
      <div class="stat-card stat-card--clickable" data-pillar="study"><b>${m.focusMin}m</b><span>Study</span></div>
      <div class="stat-card stat-card--clickable" data-pillar="goals"><b>${gDone}/${gTot}</b><span>Goals Done</span></div>
    </div>

    <div class="home-grid">
      <div class="dp-col-stack">
        <div class="card">
          <div class="sec-head">
            <h3>Weekly Activity</h3>
            <span class="tag brand">7-Day Trend</span>
          </div>
          <div class="spark">
            ${weekScores.map(s => `
              <div class="spark-col ${s.isToday ? 'today' : ''}">
                <span class="spark-val">${s.val}%</span>
                ${sparkSvg(s.val)}
                <span class="spark-lbl">${s.day}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="card">
          <h3>Pillar Breakdown</h3>
          <div class="dp-pillar-list">
            <div class="dp-pillar-item" data-pillar="exercise">
              <div class="dp-pillar-top"><span>Exercise &amp; Workouts</span><span class="mute dp-num">${wDone}/${wTot} · ${pct(wDone, wTot)}%</span></div>
              <progress class="dp-progress dp-progress--fit" value="${pct(wDone, wTot)}" max="100"></progress>
            </div>
            <div class="dp-pillar-item" data-pillar="study">
              <div class="dp-pillar-top"><span>Study &amp; Focus</span><span class="mute dp-num">${sDone}/${sTot} · ${pct(sDone, sTot)}%</span></div>
              <progress class="dp-progress dp-progress--study" value="${pct(sDone, sTot)}" max="100"></progress>
            </div>
            <div class="dp-pillar-item" data-pillar="goals">
              <div class="dp-pillar-top"><span>Daily Goals</span><span class="mute dp-num">${gDone}/${gTot} · ${pct(gDone, gTot)}%</span></div>
              <progress class="dp-progress dp-progress--goals" value="${pct(gDone, gTot)}" max="100"></progress>
            </div>
          </div>
        </div>
      </div>

      <div class="dp-col-stack">
        <div class="card">
          <div class="sec-head">
            <h3>Nutrition &amp; Energy</h3>
            <button type="button" class="link" data-pillar="health">Health ›</button>
          </div>
          <div class="hero-top-row">
            <span class="bento-val">${Math.round(eaten.kcal)} <span class="mute">/ ${target.calories} kcal</span></span>
            <span class="tag fit dp-num">${pct(eaten.kcal, target.calories)}%</span>
          </div>
          <progress class="dp-progress dp-progress--fit" value="${pct(eaten.kcal, target.calories)}" max="100"></progress>
          <div class="dp-macro-grid">
            <div class="dp-macro-item"><small>Protein</small><b>${Math.round(eaten.protein)}/${target.protein}g</b></div>
            <div class="dp-macro-item"><small>Carbs</small><b>${Math.round(eaten.carbs)}/${target.carbs}g</b></div>
            <div class="dp-macro-item"><small>Fat</small><b>${Math.round(eaten.fat)}/${target.fat}g</b></div>
          </div>
        </div>

        <div class="bento-2">
          <div class="bento-card">
            <div class="bento-head"><span class="dp-row-ic ic-goals">${IC.steps}</span><span class="bento-sub dp-num">${pct(todaySteps, target.stepsGoal)}%</span></div>
            <div>
              <div class="bento-val">${Number(todaySteps).toLocaleString()}</div>
              <div class="bento-sub">of ${Number(target.stepsGoal).toLocaleString()} steps</div>
              <div class="dp-prog-wrap"><progress class="dp-progress dp-progress--goals" value="${pct(todaySteps, target.stepsGoal)}" max="100"></progress></div>
            </div>
          </div>
          <div class="bento-card">
            <div class="bento-head"><span class="dp-row-ic ic-brand">${IC.drop}</span><span class="bento-sub dp-num">${pct(S.waterMl, waterGoalMl)}%</span></div>
            <div>
              <div class="bento-val">${(S.waterMl / 1000).toFixed(1)} L</div>
              <div class="bento-sub">of ${(waterGoalMl / 1000).toFixed(1)} L water</div>
              <div class="dp-prog-wrap"><progress class="dp-progress" value="${pct(S.waterMl, waterGoalMl)}" max="100"></progress></div>
            </div>
          </div>
        </div>

        ${(S.progress?.weights?.length || S.progress?.steps?.length) ? `
        <div class="card">
          <div class="sec-head">
            <h3>Progress History</h3>
            <span class="mute">${S.progress?.weights?.length || 0} weight logs</span>
          </div>
          ${S.progress?.weights?.length ? `<div class="dp-weight-strip">
            ${S.progress.weights.slice(-5).map(w => `<div class="dp-weight-cell"><small>${w.date.slice(5)}</small><b>${w.kg} kg</b></div>`).join('')}
          </div>` : ''}
          ${S.progress?.steps?.length ? `<div class="spark">
            ${S.progress.steps.slice(-7).map(st => `<div class="spark-col ${st.date === localDate() ? 'today' : ''}">
              <span class="spark-val">${st.steps >= 1000 ? (st.steps / 1000).toFixed(1) + 'k' : st.steps}</span>
              ${sparkSvg(pct(st.steps, target.stepsGoal), true)}
              <span class="spark-lbl">${st.date.slice(8)}</span>
            </div>`).join('')}
          </div>` : ''}
        </div>` : ''}

        <div class="card">
          <div class="dp-kicker dp-kicker--green">Smart Insight</div>
          <div class="dp-tip-title">${esc(insight.title)}</div>
          <div class="mute">${esc(insight.body)}</div>
        </div>
      </div>
    </div>`;
}
