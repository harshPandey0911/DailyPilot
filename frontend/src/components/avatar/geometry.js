import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export { mergeGeometries };
export const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * Cross-section keys → dense rings.
 * key = [y, rx, rz, cx, cz, n]  (half-widths, centre offset, superellipse exponent; z+ is the front)
 */
export function sampleRings(keys, count) {
  const A = new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(k[0], k[1], k[2])));
  const B = new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(k[3], k[4], k[5])));
  const rings = [];
  const dir = Math.sign(keys[keys.length - 1][0] - keys[0][0]) || 1;
  let prevY = -Infinity * dir;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const a = A.getPoint(t);
    const b = B.getPoint(t);
    // spline overshoot must never fold the surface back on itself (that flips triangle winding)
    const y = dir > 0 ? Math.max(a.x, prevY) : Math.min(a.x, prevY);
    prevY = y;
    rings.push({ y, rx: Math.max(a.y, 0.0006), rz: Math.max(a.z, 0.0006), cx: b.x, cz: b.y, n: clamp(b.z, 1.6, 4) });
  }
  return rings;
}

/** Offset every ring: off may be a number or (ring) => number */
export const shell = (rings, off, offZ) =>
  rings.map((r) => {
    const ox = typeof off === "function" ? off(r) : off;
    const oz = offZ === undefined ? ox : typeof offZ === "function" ? offZ(r) : offZ;
    return { ...r, rx: r.rx + ox, rz: r.rz + oz };
  });

export const between = (rings, y0, y1) => rings.filter((r) => r.y >= Math.min(y0, y1) && r.y <= Math.max(y0, y1));

/** Interpolated ring at height y */
export function ringAt(rings, y) {
  const s = rings[0].y <= rings[rings.length - 1].y ? rings : [...rings].reverse();
  if (y <= s[0].y) return s[0];
  for (let i = 1; i < s.length; i++) {
    if (y <= s[i].y) {
      const a = s[i - 1], b = s[i], t = (y - a.y) / (b.y - a.y || 1);
      return { y, rx: lerp(a.rx, b.rx, t), rz: lerp(a.rz, b.rz, t), cx: lerp(a.cx, b.cx, t), cz: lerp(a.cz, b.cz, t), n: lerp(a.n, b.n, t) };
    }
  }
  return s[s.length - 1];
}

/** Front surface z at (x, y) for a ring set */
export function frontZ(rings, x, y) {
  const r = ringAt(rings, y);
  const u = Math.min(Math.abs(x - r.cx) / r.rx, 1);
  return r.cz + r.rz * Math.pow(1 - Math.pow(u, r.n), 1 / r.n);
}

/**
 * Smooth lofted surface through rings (axis = y).
 * radial(angle, ring, ringIndex) → radius multiplier (fabric folds, bust…)
 * keep(x, y, z) → false drops that quad (used to cut hairlines)
 * color(x, y, z) → [r, g, b] vertex tint
 */
export function loft(input, { seg = 40, radial = null, keep = null, color = null } = {}) {
  const rings = input[input.length - 1].y < input[0].y ? [...input].reverse() : input;
  const R = rings.length;
  const C = seg + 1;
  const pos = new Float32Array(R * C * 3);
  const uv = new Float32Array(R * C * 2);
  const col = color ? new Float32Array(R * C * 3) : null;

  for (let r = 0; r < R; r++) {
    const g = rings[r];
    const e = 2 / g.n;
    for (let i = 0; i < C; i++) {
      const a = (i / seg) * Math.PI * 2;
      const c = Math.cos(a), s = Math.sin(a);
      const k = radial ? radial(a, g, r) : 1;
      const x = g.cx + g.rx * k * Math.sign(c) * Math.abs(c) ** e;
      const z = g.cz + g.rz * k * Math.sign(s) * Math.abs(s) ** e;
      const o = (r * C + i) * 3;
      pos[o] = x; pos[o + 1] = g.y; pos[o + 2] = z;
      uv[(r * C + i) * 2] = i / seg;
      uv[(r * C + i) * 2 + 1] = g.y;
      if (col) { const t = color(x, g.y, z); col[o] = t[0]; col[o + 1] = t[1]; col[o + 2] = t[2]; }
    }
  }

  const idx = [];
  const kept = [];
  for (let r = 0; r < R - 1; r++) {
    for (let i = 0; i < seg; i++) {
      const a = r * C + i, b = a + 1, c = a + C, d = c + 1;
      idx.push(a, c, b, b, c, d);
      if (keep) {
        const cx = (pos[a * 3] + pos[b * 3] + pos[c * 3] + pos[d * 3]) / 4;
        const cy = (pos[a * 3 + 1] + pos[c * 3 + 1]) / 2;
        const cz = (pos[a * 3 + 2] + pos[b * 3 + 2] + pos[c * 3 + 2] + pos[d * 3 + 2]) / 4;
        if (!keep(cx, cy, cz)) continue;
      }
      kept.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  if (col) geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx); // normals come from the full surface so cut edges shade smoothly
  geo.computeVertexNormals();

  // remove the shading seam where the ring closes
  const n = geo.attributes.normal;
  for (let r = 0; r < R; r++) {
    const p = r * C, q = r * C + seg;
    const x = n.getX(p) + n.getX(q), y = n.getY(p) + n.getY(q), z = n.getZ(p) + n.getZ(q);
    const l = Math.hypot(x, y, z) || 1;
    n.setXYZ(p, x / l, y / l, z / l);
    n.setXYZ(q, x / l, y / l, z / l);
  }
  if (keep) geo.setIndex(kept);
  return geo;
}

/** Replace a mesh's geometry, disposing the previous one. */
export function swapGeometry(mesh, geo) {
  if (mesh.geometry && mesh.geometry.isBufferGeometry) mesh.geometry.dispose();
  mesh.geometry = geo;
}
