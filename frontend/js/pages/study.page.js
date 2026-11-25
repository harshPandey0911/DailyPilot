import { S, IC, esc, pct, matchesSearch, searchBarView } from '../state.js';

export function studyTimerPage() {
  const mm = String(Math.floor(S.timer.sec / 60)).padStart(2, '0');
  const ss = String(S.timer.sec % 60).padStart(2, '0');
  const prog = Math.round(((S.timer.total - S.timer.sec) / (S.timer.total || 1)) * 100);

  return `<h1>Study &amp; Focus</h1><div class="mute">Deep work timer &amp; active sessions</div>
    <div class="card" style="text-align:center;margin-top:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span class="tag study">Focus Session</span>
        <select class="dp-select" id="timerModeSel">
          ${[[25, 'Pomodoro · 25m'], [50, 'Deep Work · 50m'], [15, 'Quick Sprint · 15m']].map(([m, l]) => `<option value="${m}" ${S.studyMode == m ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>
      <div class="timer-ring" id="timerRing" style="--p:${prog}"><div class="timer-inner"><div><div class="timer-time" id="timerClock">${mm}:${ss}</div><div class="mute">${S.timer.running ? 'Focusing…' : 'Ready'}</div></div></div></div>
      <div class="row" style="margin-top:10px;text-align:left">
        <div>
          <label style="margin-top:0">Subject</label>
          <select id="timerSubjectSel">
            ${['Computer Science', 'Mathematics', 'Design', 'Reading', 'Languages', 'General'].map(sub => `<option value="${sub}" ${S.timerSubject === sub ? 'selected' : ''}>${sub}</option>`).join('')}
          </select>
        </div>
        <div style="flex:1.4">
          <label style="margin-top:0">Topic (auto-logged on finish)</label>
          <input id="timerTitleIn" value="${esc(S.timerTitle)}" placeholder="e.g. Focus Session">
        </div>
      </div>
      <div class="row" style="margin-top:10px">
        <button class="btn" id="timerToggle" style="margin-top:0;background:var(--study)">${S.timer.running ? 'Pause' : 'Start Focus'}</button>
        <button class="btn sec" id="timerReset" style="margin-top:0">Reset</button>
      </div>
    </div>
    <div class="sec-head"><h2>Recent Sessions</h2><button class="link" data-go="/study/sessions">View All ›</button></div>
    <div class="list-stack">
    ${S.study.slice(0, 2).map(s => `<div class="wo-card accent-study ${s.done ? 'done' : ''}">
      <button class="chk study ${s.done ? 'on' : ''}" data-toggle="study" data-id="${s.id}" data-done="${!s.done}">${s.done ? '✓' : ''}</button>
      <div style="flex:1;min-width:0"><div class="wo-title">${esc(s.title)}</div><div class="wo-meta"><span>${esc(s.subject)}</span><span>•</span><span>${s.duration_min} min</span></div></div>
    </div>`).join('')}
    </div>`;
}

export function studySessionsPage() {
  const sessions = S.study.filter(s => (S.studySubject === 'All' || s.subject === S.studySubject) && matchesSearch(s.title + ' ' + s.subject));
  return `${searchBarView('Search study sessions…')}
    <div class="sec-head" style="margin-top:0">
      <select class="dp-select" id="studySubjSel">${['All', 'Computer Science', 'Mathematics', 'Design', 'Reading', 'Languages'].map(c => `<option value="${c}" ${S.studySubject === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
      <button class="link" data-openadd="study">+ Log Session</button>
    </div>
    <div class="list-stack">
    ${sessions.length ? sessions.map(s => `<div class="wo-card accent-study ${s.done ? 'done' : ''}">
      <button class="chk study ${s.done ? 'on' : ''}" data-toggle="study" data-id="${s.id}" data-done="${!s.done}">${s.done ? '✓' : ''}</button>
      <div style="flex:1;min-width:0"><div class="wo-title">${esc(s.title)}</div><div class="wo-meta"><span>${esc(s.subject)}</span><span>•</span><span>${s.duration_min} min</span><span>•</span><span>${esc(s.mode)}</span></div></div>
      <button class="del-btn" data-edit="study" data-id="${s.id}" title="Edit">${IC.edit}</button>
      <button class="del-btn" data-del="study" data-id="${s.id}" title="Delete">${IC.trash}</button>
    </div>`).join('') : '<div class="card mute">No study sessions yet.</div>'}
    </div>`;
}

export function studySubjectsPage() {
  return `<div class="card" style="margin-top:0"><h3>Subject Breakdown</h3>
    ${['Computer Science', 'Mathematics', 'Design', 'Reading'].map(sub => {
    const mins = S.study.filter(x => x.subject === sub).reduce((a, b) => a + (b.duration_min || 0), 0);
    return `<div style="margin-top:12px"><div style="display:flex;justify-content:space-between"><b>${sub}</b><span class="mute">${mins} min</span></div><div class="bar"><i style="width:${pct(mins, 120)}%;background:var(--study)"></i></div></div>`;
  }).join('')}
  </div>`;
}
