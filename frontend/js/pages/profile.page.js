import { S, IC, esc, errBox } from '../state.js';

export function profilePage() {
  const initials = (S.user?.name || 'DP').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const p = S.profile || {};
  const goalLabels = { lose: 'Slim / Fat Loss', fit: 'Stay Fit', bulk: 'Bulking' };
  const dietLabels = { veg: 'Veg Only', nonveg: 'Non-Veg', both: 'Both' };

  return `${errBox()}
    <div class="prof-hero">
      <div class="prof-avatar">${esc(initials)}</div>
      <h2>${esc(S.user?.name)}</h2>
      <div class="mute">${esc(S.user?.email)}</div>
    </div>

    <div class="grid3 dp-section" data-go="/profile/edit" title="Tap to edit">
      <div class="stat-card stat-card--clickable"><b>${p.age || 24}</b><span>Age (yrs)</span></div>
      <div class="stat-card stat-card--clickable"><b>${p.height_cm || 175}</b><span>Height (cm)</span></div>
      <div class="stat-card stat-card--clickable"><b>${p.weight_kg || 70}</b><span>Weight (kg)</span></div>
    </div>

    <div class="prof-group">
      <button type="button" class="prof-row" data-go="/profile/edit">
        <span class="prof-row-left"><span class="prof-row-ic prof-ic--brand">${IC.user}</span>Edit Body &amp; Preferences</span>
        <span class="prof-row-val">Age, Height, Weight ${IC.chevronRight}</span>
      </button>
      <button type="button" class="prof-row" data-go="/profile/edit">
        <span class="prof-row-left"><span class="prof-row-ic prof-ic--green">${IC.dumbbell}</span>Fitness Goal</span>
        <span class="prof-row-val">${goalLabels[p.goal] || 'Stay Fit'} ${IC.chevronRight}</span>
      </button>
      <button type="button" class="prof-row" data-go="/profile/edit">
        <span class="prof-row-left"><span class="prof-row-ic prof-ic--green">${IC.utensils}</span>Diet Preference</span>
        <span class="prof-row-val">${dietLabels[p.diet_pref] || 'Both'} ${IC.chevronRight}</span>
      </button>
      <button type="button" class="prof-row" data-go="/profile/edit">
        <span class="prof-row-left"><span class="prof-row-ic prof-ic--purple">${IC.drop}</span>Skin-Care Mode</span>
        <span class="prof-row-val">${p.skin_care ? 'Enabled' : 'Off'} ${IC.chevronRight}</span>
      </button>
      <button type="button" class="prof-row" data-go="/health/diet">
        <span class="prof-row-left"><span class="prof-row-ic prof-ic--amber">${IC.bell}</span>7-Day Diet &amp; Reminders</span>
        <span class="prof-row-val">${S.notifyDays.length}/7 days · ${S.vegDays.length} veg ${IC.chevronRight}</span>
      </button>
    </div>

    <div class="prof-group">
      <button type="button" class="prof-row" data-pillar="study">
        <span class="prof-row-left"><span class="prof-row-ic prof-ic--purple">${IC.book}</span>Study Workspace</span>
        <span class="prof-row-val">${S.study.length} sessions ${IC.chevronRight}</span>
      </button>
      <button type="button" class="prof-row" data-pillar="goals">
        <span class="prof-row-left"><span class="prof-row-ic prof-ic--amber">${IC.target}</span>Daily Goals</span>
        <span class="prof-row-val">${S.goals.length} tasks ${IC.chevronRight}</span>
      </button>
    </div>

    <div class="prof-group">
      <button type="button" class="prof-row prof-row--logout" id="logoutBtn">Sign Out</button>
    </div>`;
}

export function profileEditPage() {
  const p = S.profile || {};
  const bmi = p.height_cm && p.weight_kg ? (p.weight_kg / ((p.height_cm / 100) ** 2)).toFixed(1) : '—';
  return `${errBox()}
    <div class="mute dp-modal-desc">Update your body metrics, fitness goal, and diet preference.</div>
    <form id="editProfileForm" class="card">
      <div class="row">
        <div><label class="dp-label-first">Age</label><input name="age" type="number" min="13" max="100" required value="${esc(p.age || 24)}"></div>
        <div><label class="dp-label-first">Height (cm)</label><input name="height_cm" type="number" min="100" max="240" required value="${esc(p.height_cm || 175)}"></div>
        <div><label class="dp-label-first">Weight (kg)</label><input name="weight_kg" type="number" step="0.1" min="25" max="250" required value="${esc(p.weight_kg || 70)}"></div>
      </div>
      <div id="editBmiPreview" class="dp-caption">Current BMI: ${bmi}</div>
      <div class="row">
        <div><label>Gender</label><select name="gender">
          <option value="male" ${!p.gender || p.gender === 'male' ? 'selected' : ''}>Male</option>
          <option value="female" ${p.gender === 'female' ? 'selected' : ''}>Female</option>
        </select></div>
        <div><label>Activity</label><select name="activity">
          <option value="sedentary" ${p.activity === 'sedentary' ? 'selected' : ''}>Sedentary</option>
          <option value="light" ${p.activity === 'light' ? 'selected' : ''}>Light</option>
          <option value="moderate" ${!p.activity || p.activity === 'moderate' ? 'selected' : ''}>Moderate</option>
          <option value="active" ${p.activity === 'active' ? 'selected' : ''}>Active</option>
        </select></div>
      </div>
      <label>Fitness Goal</label>
      <select name="goal">
        <option value="lose" ${p.goal === 'lose' ? 'selected' : ''}>Slim / Fat Loss</option>
        <option value="fit" ${!p.goal || p.goal === 'fit' ? 'selected' : ''}>Stay Fit</option>
        <option value="bulk" ${p.goal === 'bulk' ? 'selected' : ''}>Bulking</option>
      </select>
      <label>Diet Preference</label>
      <select name="diet_pref">
        <option value="veg" ${p.diet_pref === 'veg' ? 'selected' : ''}>Veg Only</option>
        <option value="nonveg" ${p.diet_pref === 'nonveg' ? 'selected' : ''}>Non-Veg</option>
        <option value="both" ${!p.diet_pref || p.diet_pref === 'both' ? 'selected' : ''}>Both</option>
      </select>
      <label class="dp-check-row">
        <input type="checkbox" name="skin_care" value="1" ${p.skin_care ? 'checked' : ''}>
        Include Skin-Care Nutrition &amp; Daily Tips
      </label>
      <button class="btn" type="submit">Save Profile</button>
    </form>`;
}
