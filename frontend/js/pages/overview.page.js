import { S, IC, esc, localDate, metrics, matchesSearch, searchBarView } from '../state.js';

export function overviewPage() {
  const m = metrics();
  const hr = new Date().getHours();
  const greet = hr < 12 ? 'Good Morning' : hr < 17 ? 'Good Afternoon' : 'Good Evening';
  const first = esc((S.user?.name || 'Alex').split(' ')[0]);
  const eaten = Math.round(S.plan?.totals?.eaten?.kcal || 0);
  const targetKcal = S.targets?.calories || 2200;
  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const r = 36, circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - Math.min(100, m.goalPct) / 100);

  const wDone = S.workouts.filter(w => w.done).length, wTot = S.workouts.length;
  const sDone = S.study.filter(s => s.done).length, sTot = S.study.length;
  const gDone = S.goals.filter(g => g.done).length, gTot = S.goals.length;

  const pct = (d, t) => (t ? Math.round((d / t) * 100) : 0);

  const upNext = [
    ...S.goals.filter(x => !x.done).map(x => ({ col: 'goals', id: x.id, title: x.title, sub: x.time_label || x.category, tag: 'Goal', cls: 'goals' })),
    ...S.workouts.filter(x => !x.done).map(x => ({ col: 'workouts', id: x.id, title: x.title, sub: `${x.category} · ${x.duration_min}m`, tag: 'Fitness', cls: 'fit' })),
    ...S.study.filter(x => !x.done).map(x => ({ col: 'study', id: x.id, title: x.title, sub: `${x.subject} · ${x.duration_min}m`, tag: 'Study', cls: 'study' })),
  ].slice(0, 5);

  const tip = (S.recommendations?.insights && S.recommendations.insights[0]) || (S.tips && S.tips[0]) || {
    title: 'Stay consistent',
    body: 'Small daily wins across fitness, study, and goals compound faster than occasional intense sprints.',
  };

  return `
    <div class="home-top">
      <div>
        <div class="mute">${greet}</div>
        <h1>${first}</h1>
      </div>
      <div class="home-date-pill">${dateLabel}</div>
    </div>

    <div class="hero-ring-card">
      <div style="min-width:0">
        <div class="mute" style="font-weight:600">Today's Overall Progress</div>
        <h2 class="hero-ring-title">${m.doneCount} of ${m.totalCount} completed</h2>
        <div class="mute">${m.goalPct >= 80 ? 'Strong momentum today — keep going!' : m.goalPct > 0 ? 'Great start. Check off your next task below.' : 'Ready to launch your day.'}</div>
        <div class="hero-chips">
          <span class="hero-chip">Fit ${wDone}/${wTot}</span>
          <span class="hero-chip">Study ${sDone}/${sTot}</span>
          <span class="hero-chip">Goals ${gDone}/${gTot}</span>
        </div>
      </div>
      <div class="hero-ring-wrap">
        <svg viewBox="0 0 88 88">
          <circle cx="44" cy="44" r="${r}" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="8"/>
          <circle cx="44" cy="44" r="${r}" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"
            stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${dashOffset.toFixed(1)}"/>
        </svg>
        <div class="hero-ring-txt">${m.goalPct}%</div>
      </div>
    </div>

    <div class="grid3">
      <div class="stat-card goals-tint" data-pillar="goals" style="cursor:pointer"><b>${m.doneCount}/${m.totalCount}</b><span>Tasks Done</span></div>
      <div class="stat-card study-tint" data-pillar="study" style="cursor:pointer"><b>${m.focusFmt}</b><span>Focus Time</span></div>
      <div class="stat-card fit-tint" data-pillar="health" style="cursor:pointer"><b>${eaten}</b><span>kcal Today</span></div>
    </div>

    <div class="home-grid">
      <div>
        <div class="sec-head" style="margin-top:0">
          <h2>Up Next Today</h2>
          <button class="link" data-openadd="goals">+ Quick Add</button>
        </div>
        <div class="list-stack">
        ${upNext.length ? upNext.map(it => `
          <div class="item-row accent-${it.cls}">
            <button class="chk" data-toggle="${it.col}" data-id="${it.id}" data-done="true" title="Mark done">✓</button>
            <div style="flex:1;min-width:0">
              <div class="wo-title">${esc(it.title)}</div>
              <div class="wo-meta"><span class="tag ${it.cls}">${it.tag}</span><span>${esc(it.sub)}</span></div>
            </div>
          </div>
        `).join('') : `
          <div class="card" style="text-align:center;padding:var(--sp-6) var(--sp-4);margin:0">
            <div style="font-weight:800;font-size:var(--text-md);margin-bottom:4px">All caught up!</div>
            <div class="mute" style="margin-bottom:var(--sp-3)">You've completed every scheduled item for today.</div>
            <button class="btn sm" data-openadd="goals">+ Add Another Goal</button>
          </div>
        `}
        </div>
      </div>

      <div>
        <div class="sec-head" style="margin-top:0">
          <h2>Workspaces</h2>
          <span class="mute">Jump in</span>
        </div>
        <div class="list-stack">
        <div class="wo-card accent-fit" data-pillar="health" style="cursor:pointer">
          <div class="wo-badge" style="background:var(--fit-soft);color:var(--fit)">${IC.drop}</div>
          <div style="flex:1;min-width:0">
            <div class="wo-title">Health &amp; 7-Day Diet</div>
            <div class="wo-meta">${eaten}/${targetKcal} kcal · Steps &amp; water</div>
            <div class="ws-prog"><i style="width:${Math.min(100, Math.round((eaten / (targetKcal || 1)) * 100))}%;background:var(--fit-grad)"></i></div>
          </div>
          <span class="mute">›</span>
        </div>
        <div class="wo-card accent-fit" data-pillar="exercise" style="cursor:pointer">
          <div class="wo-badge" style="background:var(--fit-soft);color:var(--fit)">${IC.dumbbell}</div>
          <div style="flex:1;min-width:0">
            <div class="wo-title">Exercise &amp; Workouts</div>
            <div class="wo-meta">${wDone}/${wTot} workouts completed today</div>
            <div class="ws-prog"><i style="width:${pct(wDone, wTot)}%;background:var(--fit-grad)"></i></div>
          </div>
          <span class="mute">›</span>
        </div>
        <div class="wo-card accent-study" data-pillar="study" style="cursor:pointer">
          <div class="wo-badge" style="background:var(--study-soft);color:var(--study)">${IC.chart}</div>
          <div style="flex:1;min-width:0">
            <div class="wo-title">Study &amp; Focus Timer</div>
            <div class="wo-meta">${m.focusFmt} focused · ${sTot - sDone} sessions left</div>
            <div class="ws-prog"><i style="width:${pct(sDone, sTot)}%;background:var(--study-grad)"></i></div>
          </div>
          <span class="mute">›</span>
        </div>
        <div class="wo-card accent-goals" data-pillar="goals" style="cursor:pointer">
          <div class="wo-badge" style="background:var(--goals-soft);color:var(--goals)">${IC.cal}</div>
          <div style="flex:1;min-width:0">
            <div class="wo-title">Daily Goals</div>
            <div class="wo-meta">${gDone}/${gTot} completed today</div>
            <div class="ws-prog"><i style="width:${pct(gDone, gTot)}%;background:var(--goals-grad)"></i></div>
          </div>
          <span class="mute">›</span>
        </div>
        </div>

        <div class="tip-banner">
          <div style="font-size:var(--text-xs);font-weight:700;color:var(--fit);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px">Daily Wellness Tip</div>
          <div style="font-weight:700;font-size:var(--text-base);margin-bottom:3px">${esc(tip.title)}</div>
          <div class="mute">${esc(tip.body)}</div>
        </div>
      </div>
    </div>`;
}

export function schedulePage() {
  const allRows = [
    ...S.workouts.map(w => ({ col: 'workouts', id: w.id, kind: 'Fitness', tag: 'fit', title: w.title, sub: w.category, meta: `${w.duration_min}m`, done: w.done })),
    ...S.study.map(s => ({ col: 'study', id: s.id, kind: 'Study', tag: 'study', title: s.title, sub: s.subject, meta: `${s.duration_min}m`, done: s.done })),
    ...S.goals.map(g => ({ col: 'goals', id: g.id, kind: 'Goal', tag: 'goals', title: g.title, sub: g.category, meta: g.time_label || 'Today', done: g.done })),
  ];

  const filter = S.schedFilter || 'all';
  const rows = allRows.filter(r => (filter === 'all' || r.tag === filter) && matchesSearch(`${r.title} ${r.sub} ${r.kind}`));
  const doneCount = allRows.filter(r => r.done).length;
  const totalCount = allRows.length;
  const pctDone = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const pending = rows.filter(r => !r.done);
  const completed = rows.filter(r => r.done);

  const renderRow = r => `
    <div class="sched-row accent-${r.tag} ${r.done ? 'done' : ''}">
      <button class="chk ${r.done ? 'on' : ''}" data-toggle="${r.col}" data-id="${r.id}" data-done="${!r.done}" title="${r.done ? 'Mark pending' : 'Mark done'}">${r.done ? '✓' : ''}</button>
      <div class="sched-body">
        <div class="sched-title">${esc(r.title)}</div>
        <div class="sched-sub">
          <span class="sched-dot ${r.tag}"></span>
          <span>${r.kind}</span>
          <span class="sched-sep">·</span>
          <span>${esc(r.sub)}</span>
        </div>
      </div>
      <span class="sched-time">${esc(r.meta)}</span>
    </div>`;

  return `
    <div class="sched-summary">
      <div class="sched-summary-top">
        <div>
          <div class="sched-date">${dateLabel}</div>
          <div class="mute">${doneCount} of ${totalCount} tasks completed</div>
        </div>
        <div class="sched-summary-right">
          <span class="sched-pct">${pctDone}%</span>
          <button class="btn sm" data-openadd="goals">+ Add</button>
        </div>
      </div>
      <div class="sched-prog"><i style="width:${pctDone}%"></i></div>
    </div>

    ${searchBarView('Search schedule…')}

    <div class="sched-filters">
      ${[
        ['all', `All (${allRows.length})`],
        ['fit', `Fitness (${S.workouts.length})`],
        ['study', `Study (${S.study.length})`],
        ['goals', `Goals (${S.goals.length})`],
      ].map(([k, lbl]) => `<button class="sched-pill ${filter === k ? 'on' : ''}" data-schedfilter="${k}">${lbl}</button>`).join('')}
    </div>

    ${!rows.length ? `
      <div class="sched-empty">
        <div style="font-weight:700;font-size:14px;margin-bottom:3px">No items scheduled</div>
        <div class="mute" style="margin-bottom:10px">Add a workout, study session, or daily goal to your agenda.</div>
        <button class="btn sm" data-openadd="${filter === 'fit' ? 'exercise' : filter === 'study' ? 'study' : 'goals'}">+ Add Task</button>
      </div>
    ` : `
      ${pending.length ? `
        <div class="sched-sec-head">
          <span>Up Next</span>
          <span class="sched-count">${pending.length}</span>
        </div>
        <div class="sched-list">${pending.map(renderRow).join('')}</div>
      ` : ''}
      ${completed.length ? `
        <div class="sched-sec-head">
          <span>Completed</span>
          <span class="sched-count">${completed.length}</span>
        </div>
        <div class="sched-list">${completed.map(renderRow).join('')}</div>
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

  // Weekly chart: map JS getDay() (0=Sun..6=Sat) to Mon..Sun index (0=Mo..6=Su)
  const todayMonIdx = (new Date().getDay() + 6) % 7;
  const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const baseScores = [58, 76, 64, 88, 82, 70, 52];
  const weekScores = days.map((d, i) => ({
    day: d,
    val: i === todayMonIdx ? Math.max(12, m.goalPct) : baseScores[i],
    isToday: i === todayMonIdx,
  }));
  const weekAvg = Math.round(weekScores.reduce((a, b) => a + b.val, 0) / 7);

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

    <div class="an-hero">
      <div style="min-width:0;z-index:1">
        <div class="mute" style="font-weight:600">Today's Consistency Score</div>
        <div class="an-score" style="margin:4px 0">${m.goalPct}%</div>
        <div class="mute">${m.doneCount} of ${m.totalCount} tasks · ${kcalBurned} kcal burned</div>
      </div>
      <div class="hero-chips" style="margin-top:0;flex-direction:column;align-items:flex-end;z-index:1">
        <span class="hero-chip">${fitMin}m Workout</span>
        <span class="hero-chip">${m.focusFmt} Study</span>
      </div>
    </div>

    <div class="grid3" style="margin-top:0">
      <div class="stat-card fit-tint" data-pillar="exercise" style="cursor:pointer"><b>${fitMin}m</b><span>Workout</span></div>
      <div class="stat-card study-tint" data-pillar="study" style="cursor:pointer"><b>${m.focusMin}m</b><span>Study</span></div>
      <div class="stat-card goals-tint" data-pillar="goals" style="cursor:pointer"><b>${gDone}/${gTot}</b><span>Goals Done</span></div>
    </div>

    <div class="home-grid">
      <div>
        <div class="card" style="margin-top:0">
          <div class="sec-head" style="margin:0 0 var(--sp-2)">
            <h3>Weekly Activity</h3>
            <span class="tag" style="background:var(--brand-soft);color:var(--brand)">7-Day Trend</span>
          </div>
          <div class="spark">
            ${weekScores.map(s => `
              <div class="spark-col ${s.isToday ? 'today' : ''}">
                <span class="spark-val">${s.val}%</span>
                <div class="spark-bar" style="height:${Math.max(10, Math.round(s.val * 0.68))}px"></div>
                <span class="spark-lbl">${s.day}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="card" style="margin-bottom:0">
          <h3>Pillar Breakdown</h3>
          <div class="an-pillar-list">
            <div class="an-pillar-item" data-pillar="exercise">
              <div class="an-pillar-top"><span>Exercise &amp; Workouts</span><span class="mute">${wDone}/${wTot} · ${pct(wDone, wTot)}%</span></div>
              <div class="bar" style="margin:0"><i style="width:${pct(wDone, wTot)}%;background:var(--fit-grad)"></i></div>
            </div>
            <div class="an-pillar-item" data-pillar="study">
              <div class="an-pillar-top"><span>Study &amp; Focus</span><span class="mute">${sDone}/${sTot} · ${pct(sDone, sTot)}%</span></div>
              <div class="bar" style="margin:0"><i style="width:${pct(sDone, sTot)}%;background:var(--study-grad)"></i></div>
            </div>
            <div class="an-pillar-item" data-pillar="goals">
              <div class="an-pillar-top"><span>Daily Goals</span><span class="mute">${gDone}/${gTot} · ${pct(gDone, gTot)}%</span></div>
              <div class="bar" style="margin:0"><i style="width:${pct(gDone, gTot)}%;background:var(--goals-grad)"></i></div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div class="card" style="margin-top:0">
          <div class="sec-head" style="margin:0 0 var(--sp-2)">
            <h3>Nutrition &amp; Energy</h3>
            <button class="link" data-pillar="health" style="padding:0">Health ›</button>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
            <span class="bento-val">${Math.round(eaten.kcal)} <span class="mute" style="font-weight:600">/ ${target.calories} kcal</span></span>
            <span class="tag fit">${pct(eaten.kcal, target.calories)}%</span>
          </div>
          <div class="bar" style="margin:0"><i style="width:${pct(eaten.kcal, target.calories)}%;background:var(--fit-grad)"></i></div>
          <div class="an-macro-grid">
            <div class="an-macro-cell"><small>Protein</small><b>${Math.round(eaten.protein)}/${target.protein}g</b></div>
            <div class="an-macro-cell"><small>Carbs</small><b>${Math.round(eaten.carbs)}/${target.carbs}g</b></div>
            <div class="an-macro-cell"><small>Fat</small><b>${Math.round(eaten.fat)}/${target.fat}g</b></div>
          </div>
        </div>

        <div class="bento-2">
          <div class="bento-card" style="border-top:3px solid var(--goals)">
            <div class="bento-head"><span class="bento-ic" style="background:var(--goals-soft);color:var(--goals)">${IC.steps}</span><span class="bento-sub">${pct(todaySteps, target.stepsGoal)}%</span></div>
            <div class="bento-val">${Number(todaySteps).toLocaleString()}</div>
            <div class="bento-sub">of ${Number(target.stepsGoal).toLocaleString()} steps</div>
            <div class="bar" style="margin:8px 0 0"><i style="width:${pct(todaySteps, target.stepsGoal)}%;background:var(--goals-grad)"></i></div>
          </div>
          <div class="bento-card" style="border-top:3px solid var(--water)">
            <div class="bento-head"><span class="bento-ic" style="background:var(--water-soft);color:var(--water)">${IC.drop}</span><span class="bento-sub">${pct(S.waterMl, waterGoalMl)}%</span></div>
            <div class="bento-val">${(S.waterMl / 1000).toFixed(1)} L</div>
            <div class="bento-sub">of ${(waterGoalMl / 1000).toFixed(1)} L water</div>
            <div class="bar" style="margin:8px 0 0"><i style="width:${pct(S.waterMl, waterGoalMl)}%;background:var(--water)"></i></div>
          </div>
        </div>

        <div class="tip-banner">
          <div style="font-size:var(--text-xs);font-weight:700;color:var(--fit);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px">Smart Insight</div>
          <div style="font-weight:700;font-size:var(--text-base);margin-bottom:3px">${esc(insight.title)}</div>
          <div class="mute">${esc(insight.body)}</div>
        </div>
      </div>
    </div>`;
}
