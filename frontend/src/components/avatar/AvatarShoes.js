import * as THREE from "three";
import { loft, sampleRings, shell, between, ringAt } from "./geometry.js";
import { P } from "./AvatarBody.js";

/** Sneakers: lofted sole + upper, lime toe cap, collar, heel tab and laces. Built once (shape independent). */
export function createShoes(mats, body) {
  // Built along +y (length) then rotated so length → +z. Height axis: cz = -(centre height).
  const soleRings = sampleRings([
    [0.0, 0.032, 0.011, 0, -0.011, 2.6], [0.07, 0.036, 0.011, 0, -0.011, 2.6], [0.19, 0.043, 0.011, 0, -0.011, 2.6],
    [0.27, 0.037, 0.011, 0, -0.011, 2.6], [0.296, 0.016, 0.008, 0, -0.011, 2.4],
  ], 20);
  const upperRings = sampleRings([
    [0.004, 0.028, 0.028, 0, -0.05, 2.1], [0.05, 0.033, 0.04, 0, -0.062, 2.1], [0.12, 0.04, 0.034, 0, -0.056, 2.2],
    [0.2, 0.041, 0.026, 0, -0.048, 2.3], [0.262, 0.032, 0.019, 0, -0.041, 2.3], [0.292, 0.014, 0.01, 0, -0.032, 2.2],
  ], 24);

  const flip = new THREE.Matrix4().makeRotationX(Math.PI / 2);
  const sole = loft(soleRings, { seg: 28 }).applyMatrix4(flip);
  const upper = loft(upperRings, { seg: 28 }).applyMatrix4(flip);
  const toe = loft(shell(between(upperRings, 0.21, 0.292), 0.0012), { seg: 28 }).applyMatrix4(flip);
  const collarGeo = new THREE.TorusGeometry(1, 0.17, 10, 28);
  const tabGeo = new THREE.BoxGeometry(0.014, 0.04, 0.01);
  const lace = new THREE.CapsuleGeometry(0.0034, 0.05, 3, 6);

  const geos = [sole, upper, toe, collarGeo, tabGeo, lace];
  const shoes = [];

  for (const k of ["l", "r"]) {
    const g = new THREE.Group();
    const add = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; g.add(m); return m; };
    add(sole, mats.sole);
    add(upper, mats.shoeUpper);
    add(toe, mats.shoeAccent);
    const collar = add(collarGeo, mats.shoeUpper);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.098, 0.058);
    collar.scale.set(0.034, 0.04, 0.04);
    add(tabGeo, mats.shoeAccent).position.set(0, 0.075, 0.003);
    for (let i = 0; i < 5; i++) {
      const L = 0.1 + i * 0.022;
      const r = ringAt(upperRings, L);
      const m = add(lace, mats.shoeUpper);
      m.rotation.z = Math.PI / 2;
      m.position.set(0, -r.cz + r.rz * 0.97, L);
    }
    g.position.set(0, -P.hip, -0.058);
    g.rotation.y = (k === "l" ? 1 : -1) * 0.12;
    body.legs[k].leg.add(g);
    shoes.push(g);
  }
  return { dispose: () => geos.forEach((x) => x.dispose()) };
}
