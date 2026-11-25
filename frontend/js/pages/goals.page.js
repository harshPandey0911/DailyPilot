import { S, IC, esc, pct, matchesSearch, searchBarView } from '../state.js';

export function goalsPage() {
  const list = S.goals.filter(g =>
    (S.goalTab === 'all' || (S.goalTab === 'done' ? g.done : !g.done)) &&
    (S.goalCat === 'All' || g.category === S.goalCat) &&
    (S.goalPrio === 'All' || g.priority === S.goalPrio) &&
    matchesSearch(g.title)
  );
  const done = S.goals.filter(g => g.done).length, total = S.goals.length || 1, gp = pct(done, total);

  return `
    <div class="dp-section hero-flat-card">
      <div class="hero-top-row">
        <div class="hero-greet">Daily Goals Completion</div>
        <div class="home-date-pill">${done}/${S.goals.length} done</div>
      </div>
      <div class="hero-pct">${gp}%</div>
      <div class="hero-sub">${done} of ${S.goals.length} goals complete</div>
      <div class="dp-prog-wrap"><progress class="dp-progress dp-progress--goals" value="${gp}" max="100"></progress></div>
    </div>

    ${searchBarView('Search goals…')}

    <div class="dp-subbar">
      <div class="dp-seg dp-seg--inline" role="tablist" aria-label="Goal status">
        ${[['all', 'All'], ['pending', 'Pending'], ['done', 'Done']].map(([id, lbl]) => `<button type="button" class="dp-seg-btn ${S.goalTab === id ? 'on' : ''}" data-goaltab="${id}">${lbl}</button>`).join('')}
      </div>
      <div class="dp-inline-group">
        <select class="dp-select" id="goalCatSel">${['All', 'Work', 'Health', 'Learning', 'Personal'].map(c => `<option value="${c}" ${S.goalCat === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
        <select class="dp-select" id="goalPrioSel">${[['All', 'Priority'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low']].map(([v, l]) => `<option value="${v}" ${S.goalPrio === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      </div>
    </div>

    <div class="sec-head">
      <h2>Checklist</h2>
      <button type="button" class="link" data-openadd="goals">+ Add Goal</button>
    </div>

    <div class="list-stack">
      ${list.length ? list.map(g => `<div class="dp-row ${g.done ? 'done' : ''}">
        <div class="dp-row-ic ic-goals">${IC.target}</div>
        <div class="dp-row-body">
          <div class="dp-row-title">${esc(g.title)}</div>
          <div class="dp-row-sub"><span>${esc(g.category)}</span><span>·</span><span class="dp-cap">${esc(g.priority)}</span>${g.time_label ? `<span>·</span><span>${esc(g.time_label)}</span>` : ''}</div>
        </div>
        <div class="dp-row-actions">
          <button type="button" class="del-btn" data-edit="goals" data-id="${g.id}" title="Edit" aria-label="Edit">${IC.edit}</button>
          <button type="button" class="del-btn del-btn--danger" data-del="goals" data-id="${g.id}" title="Delete" aria-label="Delete">${IC.trash}</button>
          <button type="button" class="chk chk--goals ${g.done ? 'on' : ''}" data-toggle="goals" data-id="${g.id}" data-done="${!g.done}" title="${g.done ? 'Mark pending' : 'Mark done'}" aria-label="${g.done ? 'Mark pending' : 'Mark done'}">${g.done ? IC.check : ''}</button>
        </div>
      </div>`).join('') : `<div class="card dp-empty"><div class="mute">No goals match these filters.</div></div>`}
    </div>`;
}
