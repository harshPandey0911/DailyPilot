import * as THREE from "three";
import { loft, sampleRings, swapGeometry, mergeGeometries } from "./geometry.js";

/** Pivot heights (metres, feet at y = 0). */
export const P = { chest: 1.2, shoulder: 1.38, hip: 0.93, neck: 1.5 };

/**
 * Anatomy: smooth cross-section profiles for torso, arms and legs.
 * shape = { female, fat (-0.5..1), muscle (0..1) }
 * key = [y, rx, rz, cx, cz, superellipse n]
 */
export function anatomy({ female, fat: f, muscle: m }) {
  const F = female;
  const shK = 1 + m * 0.07 + Math.max(f, 0) * 0.04;
  const chestK = 1 + m * 0.06 + f * 0.16;
  const waistK = 1 + f * 0.34;
  const hipK = 1 + f * 0.26;
  const belly = Math.max(f, 0) * 0.03;
  const bust = F ? 0.016 : 0;
  const armK = (F ? 0.86 : 1) * (1 + f * 0.14);
  const thK = (F ? 1.06 : 1) * (1 + f * 0.34);
  const kneeK = 1 + f * 0.1;

  const torsoKeys = [
    [0.775, 0.03, 0.03, 0, 0, 2],                                   // closed pelvis floor
    [0.81, F ? 0.1 : 0.09, F ? 0.075 : 0.07, 0, 0, 2.2],
    [0.84, F ? 0.14 : 0.125, F ? 0.1 : 0.092, 0, 0, 2.3],
    [0.92, (F ? 0.172 : 0.162) * hipK, (F ? 0.108 : 0.104) * hipK, 0, -0.004, 2.3],
    [1.02, (F ? 0.158 : 0.154) * (1 + f * 0.22), (F ? 0.098 : 0.098) + belly, 0, belly * 0.8, 2.3],
    [1.12, (F ? 0.118 : 0.142) * waistK, (F ? 0.082 : 0.093) * waistK + belly, 0, belly, 2.2],
    [1.22, (F ? 0.134 : 0.156) * chestK, (F ? 0.092 : 0.104) * chestK, 0, 0.002 + bust * 0.5, 2.3],
    [1.32, (F ? 0.15 : 0.182) * chestK * (1 + m * 0.04), (F ? 0.102 : 0.112) * chestK, 0, 0.004 + bust, 2.45],
    [1.4, (F ? 0.158 : 0.19) * shK, F ? 0.092 : 0.1, 0, -0.004, 2.5],
    [1.428, (F ? 0.115 : 0.138) * shK, F ? 0.08 : 0.088, 0, -0.005, 2.3], // trapezius slope
    [1.455, F ? 0.07 : 0.088, F ? 0.058 : 0.066, 0, -0.006, 2.2],
    [1.5, F ? 0.039 : 0.05, F ? 0.038 : 0.048, 0, -0.003, 2],
    [1.56, F ? 0.038 : 0.047, F ? 0.037 : 0.046, 0, 0, 2],
  ];

  const upperKeys = [
    [0.035, 0.046 * armK, 0.046 * armK, 0, 0, 2],
    [0.0, 0.066 * armK * (1 + m * 0.1), 0.064 * armK, 0, 0, 2],
    [-0.09, 0.056 * armK * (1 + m * 0.12), 0.058 * armK * (1 + m * 0.1), 0, 0.004, 2],
    [-0.2, 0.046 * armK, 0.048 * armK, 0, 0, 2],
    [-0.29, 0.04 * armK, 0.042 * armK, 0, 0, 2],
  ];
  const lowerKeys = [
    [0.02, 0.04 * armK, 0.042 * armK, 0, 0, 2],
    [-0.05, 0.044 * armK * (1 + m * 0.08), 0.045 * armK, 0, 0, 2],
    [-0.15, 0.036 * armK, 0.034 * armK, 0, 0, 2],
    [-0.25, 0.026 * armK, 0.021 * armK, 0, 0, 2],
  ];
  const legKeys = [
    [0.06, 0.056 * thK, 0.07 * thK, 0, 0, 2.2],
    [0.0, 0.086 * thK, 0.094 * thK, 0, -0.002, 2.2],
    [-0.1, 0.088 * thK, 0.094 * thK, 0, 0, 2.2],
    [-0.26, 0.072 * thK, 0.077 * thK, 0, 0.002, 2.1],
    [-0.42, 0.054 * kneeK, 0.058 * kneeK, 0, 0.003, 2],
    [-0.53, 0.054 * kneeK, 0.062 * kneeK, 0, -0.008, 2],
    [-0.66, 0.043, 0.046, 0, -0.004, 2],
    [-0.83, 0.029, 0.032, 0, 0, 2],
  ];

  return {
    shoulderX: (F ? 0.168 : 0.205) * shK,
    hipX: F ? 0.088 : 0.084,
    torso: sampleRings(torsoKeys, 56),
    upper: sampleRings(upperKeys, 22),
    lower: sampleRings(lowerKeys, 18),
    leg: sampleRings(legKeys, 44),
    elbowY: -0.29,
    wristY: -0.25,
    ankleY: -0.83,
  };
}

/** A hand with palm, four fingers and a thumb, merged into one geometry. side: +1 | -1 */
function buildHand(side) {
  const parts = [];
  const mat = new THREE.Matrix4();
  const piece = (keys, count, m) => parts.push(loft(sampleRings(keys, count), { seg: 14 }).applyMatrix4(m));

  piece([[0, 0.019, 0.03, 0, 0, 2.3], [-0.035, 0.019, 0.04, 0, 0, 2.4], [-0.085, 0.017, 0.042, 0, 0.001, 2.6], [-0.097, 0.012, 0.036, 0, 0, 2.4]], 10, mat.identity());

  const fingers = [[-0.027, 0.066], [-0.009, 0.08], [0.009, 0.086], [0.027, 0.074]];
  for (const [z, len] of fingers) {
    const curl1 = -0.12 * side, curl2 = -0.5 * side;
    const base = new THREE.Matrix4().makeTranslation(0, -0.092, z).multiply(new THREE.Matrix4().makeRotationZ(curl1));
    const k1 = [[0, 0.0088, 0.0088, 0, 0, 2], [-len * 0.25, 0.0082, 0.0082, 0, 0, 2], [-len * 0.5, 0.0076, 0.0076, 0, 0, 2]];
    piece(k1, 5, base);
    const joint = base.clone().multiply(new THREE.Matrix4().makeTranslation(0, -len * 0.5, 0)).multiply(new THREE.Matrix4().makeRotationZ(curl2 - curl1));
    piece([[0, 0.0076, 0.0076, 0, 0, 2], [-len * 0.3, 0.0068, 0.0068, 0, 0, 2], [-len * 0.5, 0.0035, 0.0035, 0, 0, 2]], 5, joint);
  }
  const tBase = new THREE.Matrix4().makeTranslation(-side * 0.01, -0.035, 0.036)
    .multiply(new THREE.Matrix4().makeRotationX(-0.55)).multiply(new THREE.Matrix4().makeRotationZ(-0.25 * side));
  piece([[0, 0.012, 0.012, 0, 0, 2], [-0.03, 0.0105, 0.0105, 0, 0, 2], [-0.045, 0.0095, 0.0095, 0, 0, 2]], 5, tBase);
  piece([[0, 0.0095, 0.0095, 0, 0, 2], [-0.02, 0.0085, 0.0085, 0, 0, 2], [-0.034, 0.004, 0.004, 0, 0, 2]], 5,
    tBase.clone().multiply(new THREE.Matrix4().makeTranslation(0, -0.045, 0)).multiply(new THREE.Matrix4().makeRotationZ(-0.4 * side)));

  const merged = mergeGeometries(parts.map((g) => g.toNonIndexed()));
  parts.forEach((g) => g.dispose());
  merged.computeVertexNormals();
  return merged;
}

/**
 * Skin-level body: torso, arms (upper + forearm + hand), legs.
 * The torso sits in `torsoPivot` so breathing can scale it around the chest.
 */
export function createBody(mats, shape) {
  const root = new THREE.Group();
  const mesh = (mat) => {
    const m = new THREE.Mesh(new THREE.BufferGeometry(), mat);
    m.castShadow = true;
    return m;
  };

  const torsoPivot = new THREE.Group();
  torsoPivot.position.y = P.chest;
  const torso = mesh(mats.skin);
  torso.position.y = -P.chest;
  torsoPivot.add(torso);
  root.add(torsoPivot);

  const makeArm = (side) => {
    const arm = new THREE.Group();
    arm.rotation.z = side * 0.17; // relaxed A-pose: hands clear of the thighs
    const upper = mesh(mats.skin);
    const elbow = new THREE.Group();
    elbow.rotation.x = -0.12;
    const lower = mesh(mats.skin);
    const hand = mesh(mats.skin);
    hand.geometry = buildHand(side);
    const wrist = new THREE.Group();
    wrist.rotation.x = -0.1;
    wrist.add(hand);
    const deltoid = mesh(mats.skin);
    const elbowCap = mesh(mats.skin);
    deltoid.geometry = new THREE.SphereGeometry(1, 20, 16);
    elbowCap.geometry = new THREE.SphereGeometry(1, 16, 12);
    elbow.add(lower, wrist, elbowCap);
    arm.add(upper, deltoid, elbow);
    root.add(arm);
    return { arm, upper, elbow, lower, wrist, hand, deltoid, elbowCap };
  };
  const arms = { l: makeArm(1), r: makeArm(-1) };

  const makeLeg = () => {
    const leg = new THREE.Group();
    const skin = mesh(mats.skin);
    leg.add(skin);
    root.add(leg);
    return { leg, skin };
  };
  const legs = { l: makeLeg(), r: makeLeg() };

  const shared = []; // geometries shared by both sides

  function rebuild(s) {
    const a = anatomy(s);
    swapGeometry(torso, loft(a.torso, { seg: 44 }));

    const up = loft(a.upper, { seg: 24 });
    const lo = loft(a.lower, { seg: 24 });
    const lg = loft(a.leg, { seg: 32 });
    shared.splice(0).forEach((g) => g.dispose());
    shared.push(up, lo, lg);

    for (const side of [1, -1]) {
      const A = side === 1 ? arms.l : arms.r;
      const L = side === 1 ? legs.l : legs.r;
      A.arm.position.set(side * a.shoulderX, P.shoulder, 0);
      A.upper.geometry = up;
      A.elbow.position.y = a.elbowY;
      A.lower.geometry = lo;
      A.wrist.position.y = a.wristY;
      const r = a.upper[0].rx * 1.06;
      A.deltoid.scale.set(r, r * 1.05, r);
      const e = a.lower[0].rx * 1.04;
      A.elbowCap.scale.set(e, e, e);
      L.leg.position.set(side * a.hipX, P.hip, 0);
      L.skin.geometry = lg;
    }
    return a;
  }

  const anat = rebuild(shape);

  function dispose() {
    [torso, ...Object.values(arms).flatMap((A) => [A.deltoid, A.elbowCap, A.hand])].forEach((m) => m.geometry.dispose());
    torso.geometry.dispose();
    shared.splice(0).forEach((g) => g.dispose());
  }

  return { root, torsoPivot, torso, arms, legs, rebuild, dispose, anat };
}
