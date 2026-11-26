import * as THREE from "three";
import { loft, shell, between, swapGeometry, smoothstep, ringAt } from "./geometry.js";
import { P } from "./AvatarBody.js";

/** Evenly spaced rings between y0..y1, offset outward with a rounded bulge (for ribs / hems / cuffs). */
function band(src, y0, y1, base, bulge, count = 7) {
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    const r = ringAt(src, y0 + (y1 - y0) * t);
    const o = base + bulge * Math.sin(t * Math.PI);
    return { ...r, rx: r.rx + o, rz: r.rz + o };
  });
}

/**
 * Garments are real shells offset from the body surface (so they follow shape changes):
 * fitted tee/sports top, joggers or leggings, collar/hem/cuff ribs and a wristwatch.
 */
export function createClothing(mats, body, shape) {
  const mesh = (mat, parent) => {
    const m = new THREE.Mesh(new THREE.BufferGeometry(), mat);
    m.castShadow = true;
    parent.add(m);
    return m;
  };

  const shirt = mesh(mats.top, body.torsoPivot);
  const collar = mesh(mats.topRib, body.torsoPivot);
  const hem = mesh(mats.topRib, body.torsoPivot);
  [shirt, collar, hem].forEach((m) => (m.position.y = -P.chest));

  const sleeve = {}, sleeveHem = {};
  for (const k of ["l", "r"]) {
    sleeve[k] = mesh(mats.top, body.arms[k].arm);
    sleeveHem[k] = mesh(mats.topRib, body.arms[k].arm);
  }

  const capGeo = new THREE.SphereGeometry(1, 20, 16);
  const shoulderCap = {};
  for (const k of ["l", "r"]) {
    shoulderCap[k] = new THREE.Mesh(capGeo, mats.top);
    shoulderCap[k].castShadow = true;
    body.arms[k].arm.add(shoulderCap[k]);
  }

  const pelvis = mesh(mats.bottom, body.root);
  const waist = mesh(mats.bottomRib, body.root);
  const legShell = {}, cuff = {};
  for (const k of ["l", "r"]) {
    legShell[k] = mesh(mats.bottom, body.legs[k].leg);
    cuff[k] = mesh(mats.bottomRib, body.legs[k].leg);
  }

  // Wristwatch on the left forearm
  const watch = new THREE.Group();
  const strapGeo = new THREE.TorusGeometry(1, 0.17, 10, 28);
  const faceGeo = new THREE.CylinderGeometry(0.019, 0.019, 0.009, 24);
  const strap = new THREE.Mesh(strapGeo, mats.strap);
  strap.rotation.x = Math.PI / 2;
  const face = new THREE.Mesh(faceGeo, mats.watch);
  face.rotation.z = Math.PI / 2;
  watch.add(strap, face);
  body.arms.l.wrist.add(watch);

  function rebuild(s, a) {
    const F = s.female;
    // Layer order (outside → in): shirt > pants. Every inner layer stays smaller than the layer above it.
    const shirtOff = F ? 0.0065 : 0.014;
    const pantsOff = F ? 0.0035 : 0.008;

    // ---- top
    const fold = (amp) => (ang, ring) => {
      const near = smoothstep(1.2, 1.0, ring.y) * smoothstep(0.93, 1.0, ring.y); // drape at the waist
      return 1 + amp * near * Math.sin(ang * 5 + ring.y * 42) + amp * 0.35 * Math.sin(ang * 11 - ring.y * 70);
    };
    swapGeometry(shirt, loft(shell(between(a.torso, 0.945, 1.462), shirtOff), { seg: 48, radial: fold(F ? 0.0015 : 0.004) }));
    swapGeometry(hem, loft(band(a.torso, 0.93, 0.972, shirtOff, 0.003), { seg: 48 }));
    swapGeometry(collar, loft(band(a.torso, 1.444, 1.478, 0.004, 0.011), { seg: 44 }));

    const sleeveOff = F ? 0.0055 : 0.0085;
    const capR = ringAt(a.upper, 0).rx + sleeveOff + 0.001;
    for (const k of ["l", "r"]) {
      swapGeometry(sleeve[k], loft(shell(between(a.upper, -0.15, -0.005), sleeveOff), { seg: 28 }));
      swapGeometry(sleeveHem[k], loft(band(a.upper, -0.16, -0.122, sleeveOff, 0.0035), { seg: 28 }));
      shoulderCap[k].scale.set(capR, capR * (F ? 1.12 : 0.98), capR);
      shoulderCap[k].position.y = F ? 0.0 : -0.02;
      body.arms[k].arm.position.x = (k === "l" ? 1 : -1) * a.shoulderX;
    }

    // ---- bottom (joggers / leggings)
    swapGeometry(pelvis, loft(shell(between(a.torso, 0.775, 1.135), pantsOff), { seg: 48 }));
    swapGeometry(waist, loft(band(a.torso, 1.098, 1.138, pantsOff, F ? 0.0012 : 0.0028), { seg: 48 }));
    const legOff = (r) => (F ? 0.0035 : 0.008 + 0.0075 * smoothstep(0, -0.16, r.y) - 0.0072 * smoothstep(-0.25, -0.78, r.y));
    const leg = between(a.leg, -0.8, 0.03);
    for (const k of ["l", "r"]) {
      swapGeometry(legShell[k], loft(shell(leg, legOff), { seg: 32 }));
      swapGeometry(cuff[k], loft(band(a.leg, -0.832, -0.76, legOff({ y: -0.8 }), 0.004), { seg: 32 }));
    }

    // ---- watch sits on the forearm near the wrist
    const wr = ringAt(a.lower, -0.205);
    watch.position.y = 0.045;
    strap.scale.set(wr.rx + 0.008, wr.rz + 0.008, 0.08);
    face.position.set(wr.rx + 0.013, 0, 0);
  }

  rebuild(shape, body.anat);

  function dispose() {
    [shirt, collar, hem, pelvis, waist, ...Object.values(sleeve), ...Object.values(sleeveHem), ...Object.values(legShell), ...Object.values(cuff)].forEach((m) => m.geometry.dispose());
    strapGeo.dispose();
    capGeo.dispose();
    faceGeo.dispose();
  }
  return { rebuild, dispose };
}
