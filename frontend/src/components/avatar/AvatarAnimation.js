import { P } from "./AvatarBody.js";

/** Subtle idle: breathing, weight shift, arm and head micro-movement. */
export function createAnimation({ body, neck, root }, { reduceMotion }) {
  return {
    update(t) {
      if (reduceMotion) return;
      const b = Math.sin(t * 1.7);        // breath
      const s = Math.sin(t * 0.5);        // slow sway
      body.torsoPivot.scale.set(1 + 0.008 * b, 1 + 0.006 * b, 1 + 0.015 * b);
      root.rotation.z = s * 0.006;
      root.position.x = s * 0.004;
      neck.rotation.y = Math.sin(t * 0.4) * 0.05;
      neck.rotation.x = Math.sin(t * 0.6) * 0.012;
      for (const [k, side] of [["l", 1], ["r", -1]]) {
        const A = body.arms[k];
        A.arm.position.y = P.shoulder + 0.0016 * b;
        A.arm.rotation.z = side * (0.17 + Math.sin(t * 0.9 + side) * 0.008 + 0.004 * b);
        A.elbow.rotation.x = -0.12 + Math.sin(t * 0.7 + side) * 0.008;
        body.legs[k].leg.rotation.z = side * s * 0.004;
      }
    },
  };
}
