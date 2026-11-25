import { S, IC, esc, pct, matchesSearch, searchBarView } from '../state.js';

export function goalsPage() {
  const list = S.goals.filter(g =>
    (S.goalTab === 'all' || (S.goalTab === 'done' ? g.done : !g.done)) &&
    (S.goalCat === 'All' || g.category === S.goalCat) &&
    (S.goalPrio === 'All' || g.priority === S.goalPrio) &&
    matchesSearch(g.title)
  );
  const done = S.goals.filter(g => g.done).length, total = S.goals.length || 1, gp = pct(done, total);

  return `<h1>Daily Goals</h1><div class="mute">Priorities, habits &amp; daily execution</div>
    <div class="hero-card" style="background:var(--goals-grad);box-shadow:0 10px 24px rgba(234,88,12,0.22)">
      <div class="mute">Daily Completion</div>
      <h2 style="margin:4px 0;color:#fff;font-size:var(--text-lg)">${done} of ${S.goals.length} Goals Done (${gp}%)</h2>
      <div class="hero-bar"><i style="width:${gp}%"></i></div>
    </div>
    ${searchBarView('Search goals…')}
    <div class="dp-subbar">
      <div class="dp-pills">
        ${[['all', 'All'], ['pending', 'Pending'], ['done', 'Done']].map(([id, lbl]) => `<button class="dp-pill ${S.goalTab === id ? 'on' : ''}" data-goaltab="${id}">${lbl}</button>`).join('')}
      </div>
      <div style="display:flex;gap:6px">
        <select class="dp-select" id="goalCatSel">${['All', 'Work', 'Health', 'Learning', 'Personal'].map(c => `<option value="${c}" ${S.goalCat === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
        <select class="dp-select" id="goalPrioSel">${[['All', 'Priority'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low']].map(([v, l]) => `<option value="${v}" ${S.goalPrio === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      </div>
    </div>
    <div class="sec-head"><h2>Checklist</h2><button class="link" data-openadd="goals">+ Add Goal</button></div>
    <div class="list-stack">
    ${list.length ? list.map(g => `<div class="wo-card accent-goals ${g.done ? 'done' : ''}">
      <button class="chk goals ${g.done ? 'on' : ''}" data-toggle="goals" data-id="${g.id}" data-done="${!g.done}">${g.done ? '✓' : ''}</button>
      <div style="flex:1;min-width:0"><div class="wo-title">${esc(g.title)}</div>
        <div class="wo-meta"><span>${esc(g.category)}</span><span>•</span><span style="text-transform:capitalize">${esc(g.priority)}</span>${g.time_label ? `<span>•</span><span>${esc(g.time_label)}</span>` : ''}</div>
      </div>
      <button class="del-btn" data-edit="goals" data-id="${g.id}" title="Edit">${IC.edit}</button>
      <button class="del-btn" data-del="goals" data-id="${g.id}" title="Delete">${IC.trash}</button>
    </div>`).join('') : '<div class="card mute">No goals match these filters.</div>'}
    </div>`;
}
