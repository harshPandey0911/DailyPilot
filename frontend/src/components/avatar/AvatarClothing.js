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

  const pelvis = mesh(mats.bottom, body.root);
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
    const shirtOff = F ? 0.0085 : 0.015;
    const pantsOff = F ? 0.0045 : 0.009;

    // ---- top (clean fitted tee with gentle waist flare so pants never poke through)
    const fold = (amp) => (ang, ring) => {
      const near = smoothstep(1.25, 0.95, ring.y);
      return 1 + amp * near * Math.sin(ang * 5 + ring.y * 38) + amp * 0.35 * Math.sin(ang * 11 - ring.y * 65);
    };
    const shirtShell = shell(between(a.torso, 0.945, 1.462), (r) => shirtOff + 0.004 * smoothstep(1.06, 0.945, r.y));
    swapGeometry(shirt, loft(shirtShell, { seg: 48, radial: fold(F ? 0.0022 : 0.0045) }));
    swapGeometry(hem, loft(band(a.torso, 0.935, 0.968, shirtOff + 0.004, 0.0018), { seg: 48 }));
    swapGeometry(collar, loft(band(a.torso, 1.446, 1.480, 0.004, 0.0085), { seg: 44 }));

    const sleeveOff = F ? 0.0055 : 0.009;
    // Smooth anatomical shoulder-hugging sleeves (cover upper arm cleanly with zero skin gap)
    for (const k of ["l", "r"]) {
      const side = k === "l" ? 1 : -1;
      const sleeveRings = between(a.upper, -0.185, 0.022).map((r) => {
        const off = sleeveOff * (1 - 0.18 * smoothstep(0.0, 0.022, r.y));
        const taper = 1 - 0.12 * smoothstep(0.0, 0.022, r.y);
        return {
          ...r,
          rx: r.rx * taper + off,
          rz: r.rz * taper + off,
          cx: r.cx - side * 0.01 * smoothstep(-0.02, 0.022, r.y),
        };
      });
      swapGeometry(sleeve[k], loft(sleeveRings, { seg: 28 }));
      swapGeometry(sleeveHem[k], loft(band(a.upper, -0.195, -0.172, sleeveOff, 0.0022), { seg: 28 }));
      body.arms[k].arm.position.x = side * a.shoulderX;
    }

    // ---- bottom (tailored pants ending cleanly under the untucked tee—no belt across stomach)
    const pelvisShell = shell(between(a.torso, 0.775, 1.03), (r) => pantsOff + 0.003 * smoothstep(0.92, 0.775, r.y));
    swapGeometry(pelvis, loft(pelvisShell, { seg: 48 }));

    const legOff = (r) => (F ? 0.0045 : 0.009 + 0.005 * smoothstep(0, -0.18, r.y) - 0.003 * smoothstep(-0.25, -0.78, r.y));
    const leg = between(a.leg, -0.82, 0.01);
    for (const k of ["l", "r"]) {
      swapGeometry(legShell[k], loft(shell(leg, legOff), { seg: 32 }));
      swapGeometry(cuff[k], loft(band(a.leg, -0.835, -0.78, legOff({ y: -0.8 }), 0.003), { seg: 32 }));
    }

    // ---- watch sits on the forearm near the wrist
    const wr = ringAt(a.lower, -0.205);
    watch.position.y = 0.045;
    strap.scale.set(wr.rx + 0.008, wr.rz + 0.008, 0.08);
    face.position.set(wr.rx + 0.013, 0, 0);
  }

  rebuild(shape, body.anat);

  function dispose() {
    [
      shirt, collar, hem, pelvis,
      ...Object.values(sleeve), ...Object.values(sleeveHem),
      ...Object.values(legShell), ...Object.values(cuff),
    ].forEach((m) => m.geometry.dispose());
    strapGeo.dispose();
    faceGeo.dispose();
  }
  return { rebuild, dispose };
}
