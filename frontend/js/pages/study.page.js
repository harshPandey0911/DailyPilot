import { S, IC, esc, pct, matchesSearch, searchBarView } from '../state.js';

function studySubNav() {
  const r = S.route;
  return `<div class="dp-subnav">
    <div class="dp-seg" role="tablist" aria-label="Study sections">
      <button type="button" class="dp-seg-btn ${r === '/study' ? 'on' : ''}" data-go="/study">Focus Timer</button>
      <button type="button" class="dp-seg-btn ${r === '/study/sessions' ? 'on' : ''}" data-go="/study/sessions">Sessions</button>
      <button type="button" class="dp-seg-btn ${r === '/study/subjects' ? 'on' : ''}" data-go="/study/subjects">Subjects</button>
    </div>
  </div>`;
}

export function studyTimerPage() {
  const mm = String(Math.floor(S.timer.sec / 60)).padStart(2, '0');
  const ss = String(S.timer.sec % 60).padStart(2, '0');
  const radius = 68;
  const circ = 2 * Math.PI * radius;
  const progRatio = (S.timer.total - S.timer.sec) / (S.timer.total || 1);
  const dashOffset = circ * (1 - progRatio);

  return `
    ${studySubNav()}

    <div class="dp-section card timer-card">
      <div class="timer-card-head">
        <span class="dp-kicker">Focus Session</span>
        <select class="dp-select" id="timerModeSel">
          ${[[25, 'Pomodoro · 25m'], [50, 'Deep Work · 50m'], [15, 'Quick Sprint · 15m']].map(([m, l]) => `<option value="${m}" ${S.studyMode == m ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>

      <div class="timer-ring-wrap" id="timerRing">
        <svg viewBox="0 0 156 156">
          <circle class="timer-ring-track" cx="78" cy="78" r="${radius}"/>
          <circle id="timerRingArc" class="timer-ring-arc" cx="78" cy="78" r="${radius}"
            stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${dashOffset.toFixed(1)}"/>
        </svg>
        <div class="timer-inner">
          <div class="timer-time" id="timerClock">${mm}:${ss}</div>
          <div class="mute">${S.timer.running ? 'Focusing…' : 'Ready'}</div>
        </div>
      </div>

      <div class="row timer-fields">
        <div>
          <label class="dp-label-first">Subject</label>
          <select id="timerSubjectSel">
            ${['Computer Science', 'Mathematics', 'Design', 'Reading', 'Languages', 'General'].map(sub => `<option value="${sub}" ${S.timerSubject === sub ? 'selected' : ''}>${sub}</option>`).join('')}
          </select>
        </div>
        <div class="dp-col-wide">
          <label class="dp-label-first">Topic (auto-logged on finish)</label>
          <input id="timerTitleIn" value="${esc(S.timerTitle)}" placeholder="e.g. Focus Session">
        </div>
      </div>

      <div class="row timer-actions">
        <button type="button" class="btn btn--flush" id="timerToggle">${S.timer.running ? 'Pause' : 'Start Focus'}</button>
        <button type="button" class="btn sec btn--flush" id="timerReset">Reset</button>
      </div>
    </div>

    <div class="sec-head">
      <h2>Recent Sessions</h2>
      <button type="button" class="link" data-go="/study/sessions">View All ›</button>
    </div>

    <div class="list-stack">
      ${S.study.length ? S.study.slice(0, 3).map(s => `<div class="dp-row ${s.done ? 'done' : ''}">
        <div class="dp-row-ic ic-study">${IC.book}</div>
        <div class="dp-row-body">
          <div class="dp-row-title">${esc(s.title)}</div>
          <div class="dp-row-sub"><span>${esc(s.subject)}</span><span>·</span><span>${s.duration_min} min</span></div>
        </div>
        <button type="button" class="chk chk--study ${s.done ? 'on' : ''}" data-toggle="study" data-id="${s.id}" data-done="${!s.done}" aria-label="Toggle session">${s.done ? IC.check : ''}</button>
      </div>`).join('') : '<div class="card dp-empty"><div class="mute">No study sessions logged yet.</div></div>'}
    </div>`;
}

export function studySessionsPage() {
  const sessions = S.study.filter(s => (S.studySubject === 'All' || s.subject === S.studySubject) && matchesSearch(s.title + ' ' + s.subject));
  return `
    ${studySubNav()}
    ${searchBarView('Search study sessions…')}
    <div class="sec-head">
      <select class="dp-select" id="studySubjSel">${['All', 'Computer Science', 'Mathematics', 'Design', 'Reading', 'Languages'].map(c => `<option value="${c}" ${S.studySubject === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
      <button type="button" class="btn sm" data-openadd="study">+ Log Session</button>
    </div>
    <div class="list-stack">
      ${sessions.length ? sessions.map(s => `<div class="dp-row ${s.done ? 'done' : ''}">
        <div class="dp-row-ic ic-study">${IC.book}</div>
        <div class="dp-row-body">
          <div class="dp-row-title">${esc(s.title)}</div>
          <div class="dp-row-sub"><span>${esc(s.subject)}</span><span>·</span><span>${s.duration_min} min</span><span>·</span><span>${esc(s.mode)}</span></div>
        </div>
        <div class="dp-row-actions">
          <button type="button" class="del-btn" data-edit="study" data-id="${s.id}" title="Edit" aria-label="Edit">${IC.edit}</button>
          <button type="button" class="del-btn del-btn--danger" data-del="study" data-id="${s.id}" title="Delete" aria-label="Delete">${IC.trash}</button>
          <button type="button" class="chk chk--study ${s.done ? 'on' : ''}" data-toggle="study" data-id="${s.id}" data-done="${!s.done}" aria-label="Toggle session">${s.done ? IC.check : ''}</button>
        </div>
      </div>`).join('') : '<div class="card dp-empty"><div class="mute">No study sessions yet.</div></div>'}
    </div>`;
}

export function studySubjectsPage() {
  return `
    ${studySubNav()}
    <div class="card">
      <div class="sec-head">
        <h3>Subject Breakdown</h3>
        <span class="dp-caption">120m daily benchmark</span>
      </div>
      ${['Computer Science', 'Mathematics', 'Design', 'Reading', 'Languages', 'General'].map(sub => {
    const mins = S.study.filter(x => x.subject === sub).reduce((a, b) => a + (b.duration_min || 0), 0);
    return `<div class="subj-row">
          <div class="subj-top"><span>${sub}</span><span class="mute dp-num">${mins} min</span></div>
          <progress class="dp-progress dp-progress--study" value="${pct(mins, 120)}" max="100"></progress>
        </div>`;
  }).join('')}
    </div>`;
}
