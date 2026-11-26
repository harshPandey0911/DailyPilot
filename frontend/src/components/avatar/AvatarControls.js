const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

/** Drag / touch to rotate 360°, pinch or wheel to zoom, auto-rotate when idle. */
export function createControls(dom, { reduceMotion }) {
  let yaw = 0, vel = 0, zoom = 1, zoomTarget = 1, idle = 0;
  let dragging = false, lastX = 0, pinchStart = 0, zoomStart = 1;
  const pointers = new Map();
  const dist = () => { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };

  const down = (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dom.setPointerCapture?.(e.pointerId);
    if (pointers.size === 1) { dragging = true; lastX = e.clientX; vel = 0; }
    else if (pointers.size === 2) { dragging = false; pinchStart = dist(); zoomStart = zoomTarget; }
  };
  const move = (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) zoomTarget = clamp(zoomStart * (pinchStart / dist()), 0.55, 1.5);
    else if (dragging) { const dx = e.clientX - lastX; lastX = e.clientX; yaw += dx * 0.012; vel = dx * 0.012; }
  };
  const up = (e) => {
    pointers.delete(e.pointerId);
    idle = 1.2;
    if (pointers.size === 1) { const p = [...pointers.values()][0]; lastX = p.x; dragging = true; }
    else dragging = false;
  };
  const wheel = (e) => { e.preventDefault(); zoomTarget = clamp(zoomTarget * (1 + e.deltaY * 0.0012), 0.55, 1.5); };

  dom.addEventListener("pointerdown", down);
  dom.addEventListener("pointermove", move);
  dom.addEventListener("pointerup", up);
  dom.addEventListener("pointercancel", up);
  dom.addEventListener("wheel", wheel, { passive: false });

  return {
    get yaw() { return yaw; },
    get zoom() { return zoom; },
    update(dt, canAuto) {
      zoom += (zoomTarget - zoom) * Math.min(1, dt * 8);
      if (pointers.size === 0) {
        yaw += vel;
        vel *= Math.pow(0.92, dt * 60);
        idle = Math.max(0, idle - dt);
        if (canAuto && !reduceMotion && idle === 0 && Math.abs(vel) < 0.003) yaw += dt * 0.6;
      }
    },
    dispose() {
      dom.removeEventListener("pointerdown", down);
      dom.removeEventListener("pointermove", move);
      dom.removeEventListener("pointerup", up);
      dom.removeEventListener("pointercancel", up);
      dom.removeEventListener("wheel", wheel);
    },
  };
}
