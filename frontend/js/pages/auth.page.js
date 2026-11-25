import { S, esc, errBox, setErr, localDate } from '../state.js';
import { api } from '../api.js';

export function authView() {
  const reg = S.authMode === 'register';
  return `<div class="dp-auth-wrap ${reg ? 'signup' : 'login'}">
    <div class="dp-auth-brand">
      <img src="/assets/logo.jpg" alt="DailyPilot" class="dp-auth-logo">
      <h1>DailyPilot</h1>
      <div class="mute">${reg ? 'Create your account to unlock personalized plans' : 'Welcome back — sign in to your daily OS'}</div>
    </div>

    ${errBox()}

    <form id="authForm" class="card dp-auth-card">
      <div class="dp-auth-card-head">
        <h2>${reg ? 'Create Account' : 'Sign In'}</h2>
        <span class="dp-auth-badge">${reg ? 'Personalized Setup' : 'Member Access'}</span>
      </div>
      ${reg ? `
        <label style="margin-top:0">Full Name</label>
        <input name="name" required maxlength="60" placeholder="Your full name">
        <div class="row">
          <div><label>Age</label><input name="age" type="number" min="13" max="80" required placeholder="24"></div>
          <div><label>Height (cm)</label><input name="height_cm" type="number" min="120" max="230" required placeholder="175"></div>
          <div><label>Weight (kg)</label><input name="weight_kg" type="number" step="0.1" min="30" max="250" required placeholder="70"></div>
        </div>
        <div class="row">
          <div><label>Gender</label><select name="gender"><option value="male">Male</option><option value="female">Female</option></select></div>
          <div><label>Fitness Goal</label><select name="goal"><option value="fit">Stay Fit</option><option value="bulk">Bulking</option><option value="lose">Slim / Fat Loss</option></select></div>
        </div>
        <div class="row">
          <div><label>Activity</label><select name="activity"><option value="sedentary">Sedentary</option><option value="light">Light</option><option value="moderate" selected>Moderate</option><option value="active">Very Active</option></select></div>
          <div><label>Diet</label><select name="diet_pref"><option value="both">Both</option><option value="veg">Veg Only</option><option value="nonveg">Non-Veg</option></select></div>
        </div>
        <div id="bmiPreview" class="dp-auth-bmi"></div>
      ` : ''}
      <label style="${reg ? '' : 'margin-top:0'}">Email</label>
      <input name="email" type="email" required placeholder="you@example.com">
      <label>Password ${reg ? '(min 8 chars)' : ''}</label>
      <input name="password" type="password" required minlength="${reg ? 8 : 1}" placeholder="••••••••">
      <button class="btn dp-btn-grad" type="submit">${reg ? 'Create Account &amp; Start' : 'Sign In'}</button>

      <div class="dp-auth-switch">
        ${reg
          ? `Already have an account? <button type="button" class="link" id="goLogin">Sign In</button>`
          : `New to DailyPilot? <button type="button" class="link" id="goSignup">Create Account</button>`}
      </div>
    </form>
  </div>`;
}

export function bindAuth(render, boot, go) {
  const gl = document.getElementById('goLogin');
  if (gl) gl.onclick = () => { S.err = ''; go('/login'); };
  const gs = document.getElementById('goSignup');
  if (gs) gs.onclick = () => { S.err = ''; go('/signup'); };
  const form = document.getElementById('authForm');
  form.oninput = () => {
    const prev = document.getElementById('bmiPreview');
    if (!prev) return;
    const h = Number(form.height_cm?.value), w = Number(form.weight_kg?.value);
    prev.textContent = h > 90 && w > 20 ? `Live BMI: ${(w / ((h / 100) ** 2)).toFixed(1)} • Personalized calories ready on login` : '';
  };
  form.onsubmit = async e => {
    e.preventDefault();
    const b = Object.fromEntries(new FormData(e.target));
    try {
      const r = await api('/auth/' + S.authMode, 'POST', b);
      S.token = r.token; S.user = r.user; localStorage.setItem('dp_token', r.token); S.err = '';
      await boot();
    } catch (x) { setErr(x.message); render(); }
  };
}

export function onboardView() {
  const f = S.form;
  return `<div class="dp-auth-wrap" style="padding-top:16px"><h1>Complete Profile</h1><p class="mute">Required to calculate your daily targets</p>${errBox()}
    <form id="onboardForm" class="card">
      <div class="row">
        <div><label>Age</label><input name="age" type="number" required value="${esc(f.age || 24)}"></div>
        <div><label>Height (cm)</label><input name="height_cm" type="number" required value="${esc(f.height_cm || 175)}"></div>
        <div><label>Weight (kg)</label><input name="weight_kg" type="number" step="0.1" required value="${esc(f.weight_kg || 70)}"></div>
      </div>
      <div class="row">
        <div><label>Gender</label><select name="gender"><option value="male">Male</option><option value="female">Female</option></select></div>
        <div><label>Goal</label><select name="goal"><option value="fit">Stay Fit</option><option value="bulk">Bulking</option><option value="lose">Slim</option></select></div>
      </div>
      <div class="row">
        <div><label>Activity</label><select name="activity"><option value="sedentary">Sedentary</option><option value="light">Light</option><option value="moderate" selected>Moderate</option><option value="active">Active</option></select></div>
        <div><label>Diet</label><select name="diet_pref"><option value="both">Both</option><option value="veg">Veg Only</option><option value="nonveg">Non-Veg</option></select></div>
      </div>
      <button class="btn dp-btn-grad">Save &amp; Continue</button>
    </form></div>`;
}

export function bindOnboard(render, loadData) {
  const f = document.getElementById('onboardForm');
  if (f) f.onsubmit = async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    try {
      const r = await api('/profile', 'PUT', { ...d, date: localDate() });
      S.profile = r.profile; S.targets = r.targets; S.err = '';
      await loadData(); render();
    } catch (x) { setErr(x.message); render(); }
  };
}
