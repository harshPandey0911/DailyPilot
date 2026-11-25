import { S, IC, esc, localDate, matchesSearch, searchBarView } from '../state.js';
import { api, loadData } from '../api.js';

const TYPES = [
  { id: 'run', label: 'Run', met: 9.8, color: '#fc4c02' },
  { id: 'walk', label: 'Walk', met: 3.8, color: '#059669' },
  { id: 'ride', label: 'Ride', met: 7.5, color: '#0284c7' },
  { id: 'hike', label: 'Hike', met: 6.0, color: '#d97706' },
];

const TYPE_MAP = Object.fromEntries(TYPES.map(t => [t.id, t]));

export function fmtDuration(sec) {
  const s = Math.max(0, Math.round(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = n => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(r)}` : `${pad(m)}:${pad(r)}`;
}

export function fmtPace(secPerKm, type = 'run') {
  if (!secPerKm || secPerKm <= 0 || !Number.isFinite(secPerKm)) return type === 'ride' ? '0.0 km/h' : '--:-- /km';
  if (type === 'ride') {
    const kmh = 3600 / secPerKm;
    return `${kmh.toFixed(1)} km/h`;
  }
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')} /km`;
}

function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const h = s1 * s1 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function estCalories(type, durationSec) {
  const met = TYPE_MAP[type]?.met || 7.5;
  const weight = Number(S.profile?.weight_kg) > 20 ? Number(S.profile.weight_kg) : 70;
  return Math.round(met * weight * (durationSec / 3600));
}

function livePaceSecKm() {
  const tr = S.tracker;
  if (tr.distanceM < 10 || tr.elapsedSec < 2) return 0;
  return tr.elapsedSec / (tr.distanceM / 1000);
}

function svgFallbackRoute(el, points, color = '#fc4c02') {
  if (!el) return;
  if (!points || points.length < 2) {
    el.innerHTML = `<div class="act-map-empty"><span>${points?.length === 1 ? 'GPS locked — start moving to draw route' : 'Start GPS or Simulate Route to see live map'}</span></div>`;
    return;
  }
  const lats = points.map(p => p.lat);
  const lngs = points.map(p => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const spanLat = Math.max(0.0002, maxLat - minLat);
  const spanLng = Math.max(0.0002, maxLng - minLng);
  const w = 320, h = 180, pad = 20;
  const coords = points.map(p => {
    const x = pad + ((p.lng - minLng) / spanLng) * (w - pad * 2);
    const y = h - pad - ((p.lat - minLat) / spanLat) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const [sx, sy] = coords[0].split(',');
  const [ex, ey] = coords[coords.length - 1].split(',');
  el.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" class="act-svg-map" preserveAspectRatio="xMidYMid meet">
      <rect width="${w}" height="${h}" rx="12" fill="#f1f5f9"/>
      <polyline fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${coords.join(' ')}"/>
      <circle cx="${sx}" cy="${sy}" r="5.5" fill="#10b981" stroke="#fff" stroke-width="2"/>
      <circle cx="${ex}" cy="${ey}" r="5.5" fill="${color}" stroke="#fff" stroke-width="2"/>
    </svg>`;
}

let liveMap = null;
let livePoly = null;
let liveMarker = null;
let detailMap = null;

function renderLeafletRoute(containerId, points, color, isLive) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!window.L) {
    svgFallbackRoute(el, points, color);
    return;
  }

  if (isLive) {
    if (liveMap && liveMap.getContainer() !== el) {
      liveMap.remove();
      liveMap = null;
      livePoly = null;
      liveMarker = null;
    }
    if (!liveMap) {
      const center = points.length ? [points[points.length - 1].lat, points[points.length - 1].lng] : [37.7749, -122.4194];
      liveMap = window.L.map(el, { zoomControl: true, attributionControl: false }).setView(center, points.length ? 15 : 13);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(liveMap);
      livePoly = window.L.polyline([], { color, weight: 4, opacity: 0.9 }).addTo(liveMap);
      liveMarker = window.L.circleMarker(center, { radius: 7, color: '#fff', weight: 2, fillColor: color, fillOpacity: 1 }).addTo(liveMap);
    }
    const latlngs = points.map(p => [p.lat, p.lng]);
    livePoly.setStyle({ color });
    livePoly.setLatLngs(latlngs);
    if (latlngs.length) {
      const last = latlngs[latlngs.length - 1];
      liveMarker.setLatLng(last).setStyle({ fillColor: color });
      liveMap.panTo(last, { animate: true });
    }
    return;
  }

  if (detailMap) {
    detailMap.remove();
    detailMap = null;
  }
  if (!points || !points.length) {
    svgFallbackRoute(el, [], color);
    return;
  }
  const latlngs = points.map(p => [p.lat, p.lng]);
  detailMap = window.L.map(el, { zoomControl: true, attributionControl: false }).setView(latlngs[0], 15);
  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(detailMap);
  const poly = window.L.polyline(latlngs, { color, weight: 4, opacity: 0.92 }).addTo(detailMap);
  window.L.circleMarker(latlngs[0], { radius: 6, color: '#fff', weight: 2, fillColor: '#10b981', fillOpacity: 1 }).addTo(detailMap);
  window.L.circleMarker(latlngs[latlngs.length - 1], { radius: 6, color: '#fff', weight: 2, fillColor: color, fillOpacity: 1 }).addTo(detailMap);
  if (latlngs.length > 1) detailMap.fitBounds(poly.getBounds(), { padding: [22, 22] });
}

export function activityPage() {
  const tr = S.tracker;
  const activeType = TYPE_MAP[tr.type] || TYPES[0];
  const all = S.activities || [];
  const totalDistKm = (all.reduce((a, b) => a + (b.distance_m || 0), 0) / 1000).toFixed(1);
  const totalSec = all.reduce((a, b) => a + (b.duration_sec || 0), 0);

  const filtered = all.filter(a =>
    (S.activityFilter === 'all' || a.type === S.activityFilter) &&
    matchesSearch(`${a.title} ${a.type}`)
  );

  const selected = all.find(a => a.id === S.selectedActivityId) || filtered[0] || null;
  const selColor = selected ? (TYPE_MAP[selected.type]?.color || '#fc4c02') : '#fc4c02';

  return `
    <div class="page-head">
      <div><div class="mute">Health &amp; Fitness · GPS</div><h1>Activity Tracker</h1></div>
      <span class="tag" style="background:rgba(252,76,2,0.12);color:#fc4c02">${all.length} Logged</span>
    </div>

    <div class="fit-summary-bar" style="background:linear-gradient(135deg,#0f172a,#1e293b);margin-bottom:14px">
      <div><b>${totalDistKm} km</b><span>Total Distance</span></div>
      <div><b>${all.length}</b><span>Activities</span></div>
      <div><b>${fmtDuration(totalSec)}</b><span>Moving Time</span></div>
    </div>

    <div class="card act-recorder-card">
      <div class="act-rec-head">
        <div>
          <div style="font-weight:800;font-size:15px">Live GPS Recorder</div>
          <div class="mute" id="actGpsStatus" style="font-size:12px">${esc(tr.gpsStatus)}</div>
        </div>
        <div class="dp-pills">
          ${TYPES.map(t => `<button class="dp-pill ${tr.type === t.id ? 'on' : ''}" data-acttype="${t.id}" ${tr.status !== 'idle' ? 'disabled' : ''}>${t.label}</button>`).join('')}
        </div>
      </div>

      <div id="activityLiveMap" class="act-map-box"></div>

      <div class="act-metrics-grid">
        <div class="act-metric"><small>Distance</small><b id="actDist">${(tr.distanceM / 1000).toFixed(2)} km</b></div>
        <div class="act-metric"><small>Duration</small><b id="actDur">${fmtDuration(tr.elapsedSec)}</b></div>
        <div class="act-metric"><small>${tr.type === 'ride' ? 'Avg Speed' : 'Avg Pace'}</small><b id="actPace">${fmtPace(livePaceSecKm(), tr.type)}</b></div>
        <div class="act-metric"><small>Calories</small><b id="actKcal">${estCalories(tr.type, tr.elapsedSec)} kcal</b></div>
      </div>

      <input id="actTitleIn" value="${esc(tr.title)}" placeholder="Activity title (e.g. Morning ${activeType.label})" style="margin-bottom:10px">

      <div class="act-controls">
        ${tr.status === 'idle' ? `
          <button class="btn" id="actStartBtn" style="margin-top:0;background:${activeType.color}">Start ${activeType.label}</button>
          <button class="btn sec" id="actSimBtn" style="margin-top:0" title="Test live GPS tracking with a simulated park route">Simulate Route</button>
        ` : `
          <button class="btn sec" id="actPauseBtn" style="margin-top:0">${tr.status === 'paused' ? 'Resume' : 'Pause'}</button>
          <button class="btn" id="actFinishBtn" style="margin-top:0;background:#059669">Finish &amp; Save</button>
          <button class="btn sec" id="actDiscardBtn" style="margin-top:0;color:var(--err)">Discard</button>
        `}
      </div>
    </div>

    ${selected ? `
    <div class="card" style="margin-top:14px;border-left:4px solid ${selColor}">
      <div class="sec-head" style="margin:0 0 8px">
        <div>
          <div style="font-weight:800;font-size:15px">${esc(selected.title)}</div>
          <div class="mute" style="font-size:12px">${esc(selected.date)} · ${esc((TYPE_MAP[selected.type]?.label) || selected.type)}</div>
        </div>
        <button class="del-btn" data-delact="${selected.id}" title="Delete activity">${IC.trash}</button>
      </div>
      <div id="activityDetailMap" class="act-map-box act-map-sm"></div>
      <div class="act-metrics-grid" style="margin-top:10px;margin-bottom:0">
        <div class="act-metric"><small>Distance</small><b>${((selected.distance_m || 0) / 1000).toFixed(2)} km</b></div>
        <div class="act-metric"><small>Time</small><b>${fmtDuration(selected.duration_sec)}</b></div>
        <div class="act-metric"><small>${selected.type === 'ride' ? 'Speed' : 'Pace'}</small><b>${fmtPace(selected.avg_pace_sec_km, selected.type)}</b></div>
        <div class="act-metric"><small>Elev / Cal</small><b>+${selected.elevation_gain_m || 0}m · ${selected.calories || 0}</b></div>
      </div>
    </div>` : ''}

    <div class="sec-head">
      <h2>Activity History</h2>
      <div class="dp-pills">
        ${[['all', 'All'], ...TYPES.map(t => [t.id, t.label])].map(([id, lbl]) => `
          <button class="dp-pill ${S.activityFilter === id ? 'on' : ''}" data-actfilter="${id}">${lbl}</button>
        `).join('')}
      </div>
    </div>
    ${searchBarView('Search activities…')}

    <div class="list-stack">
      ${filtered.length ? filtered.map(a => {
        const meta = TYPE_MAP[a.type] || TYPES[0];
        const isSel = selected && selected.id === a.id;
        return `<div class="wo-card ${isSel ? 'act-selected' : ''}" data-selact="${a.id}" style="cursor:pointer;border-left:4px solid ${meta.color}">
          <div class="wo-badge" style="background:${meta.color}18;color:${meta.color}">${IC.route}</div>
          <div style="flex:1;min-width:0">
            <div class="wo-title">${esc(a.title)}</div>
            <div class="wo-meta">
              <span>${meta.label}</span><span>•</span>
              <span>${((a.distance_m || 0) / 1000).toFixed(2)} km</span><span>•</span>
              <span>${fmtDuration(a.duration_sec)}</span><span>•</span>
              <span>${fmtPace(a.avg_pace_sec_km, a.type)}</span>
            </div>
          </div>
          <button class="del-btn" data-delact="${a.id}" title="Delete">${IC.trash}</button>
        </div>`;
      }).join('') : '<div class="card mute" style="text-align:center;padding:22px">No GPS activities recorded yet. Start a run, walk, or ride above!</div>'}
    </div>`;
}

function updateLiveMetricsDOM() {
  const tr = S.tracker;
  const distEl = document.getElementById('actDist');
  const durEl = document.getElementById('actDur');
  const paceEl = document.getElementById('actPace');
  const kcalEl = document.getElementById('actKcal');
  const statusEl = document.getElementById('actGpsStatus');
  if (distEl) distEl.textContent = `${(tr.distanceM / 1000).toFixed(2)} km`;
  if (durEl) durEl.textContent = fmtDuration(tr.elapsedSec);
  if (paceEl) paceEl.textContent = fmtPace(livePaceSecKm(), tr.type);
  if (kcalEl) kcalEl.textContent = `${estCalories(tr.type, tr.elapsedSec)} kcal`;
  if (statusEl) statusEl.textContent = tr.gpsStatus;
  if (document.getElementById('activityLiveMap')) {
    renderLeafletRoute('activityLiveMap', tr.points, TYPE_MAP[tr.type]?.color || '#fc4c02', true);
  }
}

function pushPoint(pt) {
  const tr = S.tracker;
  const prev = tr.points[tr.points.length - 1];
  if (prev) {
    const d = haversineMeters(prev, pt);
    if (d < 2) return; // ignore GPS jitter < 2m
    tr.distanceM += d;
    if (pt.alt != null && prev.alt != null && pt.alt > prev.alt) {
      tr.elevationGainM += pt.alt - prev.alt;
    }
  }
  tr.points.push(pt);
  updateLiveMetricsDOM();
}

function stopWatchers() {
  const tr = S.tracker;
  if (tr.watchId != null && navigator.geolocation) {
    navigator.geolocation.clearWatch(tr.watchId);
    tr.watchId = null;
  }
  if (tr.timerId) { clearInterval(tr.timerId); tr.timerId = null; }
  if (tr.simId) { clearInterval(tr.simId); tr.simId = null; }
}

function startTimers(simulate = false) {
  const tr = S.tracker;
  stopWatchers();
  tr.timerId = setInterval(() => {
    if (tr.status === 'recording') {
      tr.elapsedSec += 1;
      updateLiveMetricsDOM();
    }
  }, 1000);

  if (simulate) {
    tr.simulating = true;
    let step = tr.points.length;
    const baseLat = 37.7749, baseLng = -122.4194;
    if (!tr.points.length) {
      pushPoint({ lat: baseLat, lng: baseLng, alt: 12, ts: Date.now() });
    }
    tr.gpsStatus = 'Simulated GPS active';
    tr.simId = setInterval(() => {
      if (tr.status !== 'recording') return;
      step += 1;
      const angle = step * 0.18;
      const lat = baseLat + Math.sin(angle) * 0.0022;
      const lng = baseLng + (1 - Math.cos(angle)) * 0.0028;
      const alt = 12 + Math.round(Math.sin(angle) * 6);
      pushPoint({ lat, lng, alt, ts: Date.now() });
    }, 1000);
    return;
  }

  tr.simulating = false;
  if (!navigator.geolocation) {
    tr.gpsStatus = 'Geolocation not supported in this browser — try Simulate Route';
    updateLiveMetricsDOM();
    return;
  }
  tr.gpsStatus = 'Acquiring GPS signal…';
  tr.watchId = navigator.geolocation.watchPosition(
    pos => {
      if (tr.status !== 'recording') return;
      tr.gpsStatus = `GPS locked (±${Math.round(pos.coords.accuracy || 10)}m)`;
      pushPoint({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        alt: pos.coords.altitude != null ? pos.coords.altitude : undefined,
        ts: pos.timestamp || Date.now(),
      });
    },
    err => {
      tr.gpsStatus = `GPS unavailable (${err.message}) — you can use Simulate Route`;
      updateLiveMetricsDOM();
    },
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
  );
}

export function bindActivity(render) {
  const tr = S.tracker;

  renderLeafletRoute('activityLiveMap', tr.points, TYPE_MAP[tr.type]?.color || '#fc4c02', true);

  const all = S.activities || [];
  const filtered = all.filter(a =>
    (S.activityFilter === 'all' || a.type === S.activityFilter) &&
    matchesSearch(`${a.title} ${a.type}`)
  );
  const selected = all.find(a => a.id === S.selectedActivityId) || filtered[0] || null;
  if (selected && document.getElementById('activityDetailMap')) {
    renderLeafletRoute('activityDetailMap', selected.points || [], TYPE_MAP[selected.type]?.color || '#fc4c02', false);
  }

  const titleIn = document.getElementById('actTitleIn');
  if (titleIn) titleIn.oninput = e => { tr.title = e.target.value; };

  document.querySelectorAll('[data-acttype]').forEach(b => b.onclick = () => {
    if (tr.status !== 'idle') return;
    tr.type = b.dataset.acttype;
    render();
  });

  document.querySelectorAll('[data-actfilter]').forEach(b => b.onclick = () => {
    S.activityFilter = b.dataset.actfilter;
    render();
  });

  document.querySelectorAll('[data-selact]').forEach(card => card.onclick = e => {
    if (e.target.closest('[data-delact]')) return;
    S.selectedActivityId = card.dataset.selact;
    render();
  });

  document.querySelectorAll('[data-delact]').forEach(btn => btn.onclick = async e => {
    e.stopPropagation();
    const id = btn.dataset.delact;
    await api(`/activities/${id}`, 'DELETE');
    if (S.selectedActivityId === id) S.selectedActivityId = null;
    await loadData();
    render();
  });

  const startBtn = document.getElementById('actStartBtn');
  if (startBtn) startBtn.onclick = () => {
    tr.status = 'recording';
    tr.points = [];
    tr.distanceM = 0;
    tr.elevationGainM = 0;
    tr.elapsedSec = 0;
    tr.startedAt = new Date().toISOString();
    startTimers(false);
    render();
  };

  const simBtn = document.getElementById('actSimBtn');
  if (simBtn) simBtn.onclick = () => {
    tr.status = 'recording';
    tr.points = [];
    tr.distanceM = 0;
    tr.elevationGainM = 0;
    tr.elapsedSec = 0;
    tr.startedAt = new Date().toISOString();
    startTimers(true);
    render();
  };

  const pauseBtn = document.getElementById('actPauseBtn');
  if (pauseBtn) pauseBtn.onclick = () => {
    if (tr.status === 'recording') {
      tr.status = 'paused';
      tr.gpsStatus = 'Paused';
    } else if (tr.status === 'paused') {
      tr.status = 'recording';
      tr.gpsStatus = tr.simulating ? 'Simulated GPS active' : 'Recording…';
    }
    render();
  };

  const discardBtn = document.getElementById('actDiscardBtn');
  if (discardBtn) discardBtn.onclick = () => {
    stopWatchers();
    tr.status = 'idle';
    tr.points = [];
    tr.distanceM = 0;
    tr.elevationGainM = 0;
    tr.elapsedSec = 0;
    tr.gpsStatus = 'Ready';
    render();
  };

  const finishBtn = document.getElementById('actFinishBtn');
  if (finishBtn) finishBtn.onclick = async () => {
    stopWatchers();
    const typeLabel = TYPE_MAP[tr.type]?.label || 'Run';
    const payload = {
      type: tr.type,
      title: (tr.title || '').trim() || `Outdoor ${typeLabel}`,
      date: localDate(),
      started_at: tr.startedAt || new Date().toISOString(),
      duration_sec: Math.max(1, tr.elapsedSec),
      distance_m: Math.round(tr.distanceM),
      elevation_gain_m: Math.round(tr.elevationGainM),
      calories: estCalories(tr.type, Math.max(1, tr.elapsedSec)),
      points: tr.points,
    };
    tr.status = 'idle';
    tr.points = [];
    tr.distanceM = 0;
    tr.elevationGainM = 0;
    tr.elapsedSec = 0;
    tr.title = '';
    tr.gpsStatus = 'Saved!';
    const saved = await api('/activities', 'POST', payload);
    S.selectedActivityId = saved.id;
    await loadData();
    render();
  };
}
