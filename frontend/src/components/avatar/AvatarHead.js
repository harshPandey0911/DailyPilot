import * as THREE from "three";
import { loft, sampleRings, frontZ, shell, smoothstep } from "./geometry.js";

/** Head, face features and hair. Built in absolute body coordinates; the caller pivots it at the neck. */
export function createHead(mats, { female }) {
  const g = new THREE.Group();
  const geos = [];
  const add = (geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => {
    geos.push(geo);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    g.add(m);
    return m;
  };

  const w = female ? 0.93 : 1;
  const keys = [
    [1.764, 0.03, 0.034, 0, -0.006, 2],
    [1.752, 0.066 * w, 0.076, 0, -0.01, 2],
    [1.722, 0.088 * w, 0.097, 0, -0.012, 2.1],
    [1.682, 0.0955 * w, 0.105, 0, -0.012, 2.1],
    [1.642, 0.094 * w, 0.104, 0, -0.008, 2.15],
    [1.602, 0.088 * w, 0.098, 0, 0.0, 2.2],
    [1.572, 0.077 * w, 0.087, 0, 0.007, female ? 2.2 : 2.5],
    [1.543, 0.06 * w, 0.071, 0, 0.015, female ? 2.1 : 2.4],
    [1.522, 0.04 * w, 0.05, 0, 0.023, 2.1],
    [1.505, 0.022, 0.03, 0, 0.026, 2],
  ];
  const rings = sampleRings(keys, 48);
  const cheek = new THREE.Color("#dfa987");
  const rosy = new THREE.Color("#e3958a");
  const headGeo = loft(rings, {
    seg: 48,
    color: (x, y, z) => {
      // warm cheeks / nose, slightly lighter forehead
      const front = smoothstep(0.0, 0.08, z);
      const ch = smoothstep(0.045, 0.07, Math.abs(x)) * (1 - smoothstep(0.012, 0.03, Math.abs(y - 1.6))) * front;
      const c = cheek.clone().lerp(rosy, ch * 0.45);
      const k = 1 + smoothstep(1.7, 1.74, y) * 0.04;
      return [(c.r * k) / cheek.r, (c.g * k) / cheek.g, (c.b * k) / cheek.b];
    },
  });
  geos.push(headGeo);
  const head = new THREE.Mesh(headGeo, mats.skinFace);
  head.castShadow = true;
  g.add(head);

  const fz = (x, y) => frontZ(rings, x, y);

  // Eyes
  const eyeY = 1.655;
  for (const s of [-1, 1]) {
    const x = s * 0.034;
    const z = fz(x, eyeY) - 0.0035;
    add(new THREE.SphereGeometry(0.0125, 20, 16), mats.eyeWhite, x, eyeY, z, 1, 0.82, 0.62);
    add(new THREE.SphereGeometry(0.0074, 16, 12), mats.iris, x, eyeY, z + 0.0066, 1, 1, 0.4);
    add(new THREE.SphereGeometry(0.0036, 12, 10), mats.pupil, x, eyeY, z + 0.0092, 1, 1, 0.3);
    // eyelids
    const lid = add(new THREE.SphereGeometry(0.0134, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.36), mats.skin, x, eyeY + 0.0008, z + 0.0006, 1, 0.84, 0.66);
    lid.rotation.x = 0.1;
    const lower = add(new THREE.SphereGeometry(0.0132, 20, 8, 0, Math.PI * 2, Math.PI * 0.82, Math.PI * 0.18), mats.skin, x, eyeY - 0.0008, z + 0.0005, 1, 0.84, 0.66);
    lower.rotation.x = -0.05;

    // eyebrow
    const bx = (t) => s * (0.017 + t * 0.04);
    const by = (t) => 1.686 + Math.sin(t * Math.PI) * 0.007 - t * 0.003;
    const pts = [0, 0.33, 0.66, 1].map((t) => new THREE.Vector3(bx(t), by(t), fz(bx(t), by(t)) + 0.0015));
    const browGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, female ? 0.0036 : 0.0048, 8, false);
    add(browGeo, mats.brow);

    // ear
    const ear = add(new THREE.SphereGeometry(0.02, 16, 12), mats.skin, s * 0.0965 * w, 1.632, -0.006, 0.32, 1, 0.7);
    ear.rotation.z = s * -0.12;
  }

  // Nose: bridge, tip, nostril wings
  add(new THREE.SphereGeometry(0.0125, 16, 12), mats.skin, 0, 1.64, fz(0, 1.645) + 0.004, 0.5, 2.7, 0.95);
  add(new THREE.SphereGeometry(0.0145, 18, 14), mats.skin, 0, 1.617, fz(0, 1.617) + 0.0095, 1, 0.9, 1);
  for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.0085, 12, 10), mats.skin, s * 0.0125, 1.612, fz(s * 0.0125, 1.612) + 0.0035, 1, 0.9, 0.9);

  // Lips + mouth line
  const lipCurve = (y0, dip, amp) => {
    const p = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6, x = (t - 0.5) * 0.054;
      const y = y0 + dip * Math.sin(t * Math.PI) - amp * Math.abs(t - 0.5);
      p.push(new THREE.Vector3(x, y, fz(x, y) + 0.0025));
    }
    return new THREE.CatmullRomCurve3(p);
  };
  add(new THREE.TubeGeometry(lipCurve(1.5775, 0.0008, 0.004), 18, 0.0052, 8, false), mats.lip, 0, 0, 0, 1, 1, 0.8);
  add(new THREE.TubeGeometry(lipCurve(1.5655, 0.0032, 0.0), 18, 0.0062, 8, false), mats.lip, 0, 0, 0, 1, 1, 0.8);
  add(new THREE.TubeGeometry(lipCurve(1.5715, 0.0004, 0.002), 18, 0.0016, 6, false), mats.mouth, 0, 0, 0.0012);

  // Hair
  const fine = sampleRings(keys, 160);
  const hairRings = shell(fine.filter((r) => r.y > 1.585), (r) => 0.0008 + 0.0078 * smoothstep(1.585, 1.65, r.y)); // fades into the skin at the nape
  if (!female) {
    const hairline = (x) => 1.718 - 0.012 * Math.min((x / 0.09) ** 2, 1.6);
    const hair = loft(hairRings.map((r) => ({ ...r, cz: r.cz - 0.003 })), {
      seg: 120,
      keep: (x, y, z) => {
        if (z > 0.015 && y < hairline(x)) return false;           // forehead
        if (Math.abs(x) > 0.065 && z > -0.01 && y < 1.668) return false; // keep ears/temples clear
        if (z > -0.03 && y < 1.63) return false;
        return true;
      },
    });
    geos.push(hair);
    const hm = new THREE.Mesh(hair, mats.hair); hm.castShadow = true; g.add(hm);
    add(new THREE.SphereGeometry(0.062, 24, 16), mats.hair, 0, 1.742, 0.026, 1.25, 0.5, 1.18).rotation.x = -0.28; // quiff
  } else {
    const long = sampleRings([
      ...keys.slice(0, 5).map((k) => [k[0], k[1] + 0.009, k[2] + 0.009, k[3], k[4] - 0.003, k[5]]),
      [1.6, 0.11 * w, 0.11, 0, -0.016, 2.1],
      [1.54, 0.118 * w, 0.108, 0, -0.045, 2.1],
      [1.42, 0.118 * w, 0.092, 0, -0.065, 2.1],
      [1.3, 0.104 * w, 0.07, 0, -0.075, 2.1],
      [1.22, 0.07, 0.04, 0, -0.075, 2],
    ], 110);
    const hairline = (x) => 1.712 - 0.02 * Math.min((x / 0.09) ** 2, 1.4) + 0.006 * Math.cos((x / 0.09) * 5);
    const hair = loft(long, {
      seg: 120,
      keep: (x, y, z) => {
        if (y > 1.6) return !(z > 0.012 && y < hairline(x));
        return z < -0.012 || (Math.abs(x) > 0.088 && y > 1.43 && z > -0.04);
      },
    });
    geos.push(hair);
    const hm = new THREE.Mesh(hair, mats.hair); hm.castShadow = true; g.add(hm);
  }

  return { group: g, dispose: () => geos.forEach((x) => x.dispose()) };
}
