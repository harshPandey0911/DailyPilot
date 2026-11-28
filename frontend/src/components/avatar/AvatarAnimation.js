import { P } from "./AvatarBody.js";

/** Natural athletic standing idle: relaxed shoulders, slight asymmetry, breathing and weight shift. */
export function createAnimation({ body, neck, root }, { reduceMotion }) {
  root.rotation.y = 0;
  neck.rotation.y = 0.03;
  neck.rotation.x = 0.015;
  body.arms.l.arm.rotation.z = 0.10;
  body.arms.r.arm.rotation.z = -0.11;
  body.arms.l.elbow.rotation.x = -0.16;
  body.arms.r.elbow.rotation.x = -0.14;
  body.legs.l.leg.rotation.x = -0.02;
  body.legs.r.leg.rotation.x = 0.02;

  return {
    update(t) {
      if (reduceMotion) return;
      const b = Math.sin(t * 1.65);
      const s = Math.sin(t * 0.45);
      body.torsoPivot.scale.set(1 + 0.008 * b, 1 + 0.006 * b, 1 + 0.015 * b);
      root.rotation.z = 0.008 + s * 0.006;
      root.position.x = s * 0.004;
      neck.rotation.y = 0.03 + Math.sin(t * 0.38) * 0.04;
      neck.rotation.x = 0.015 + Math.sin(t * 0.55) * 0.012;
      for (const [k, side, baseArm, baseElbow] of [["l", 1, 0.10, -0.16], ["r", -1, 0.11, -0.14]]) {
        const A = body.arms[k];
        A.arm.position.y = P.shoulder + 0.0016 * b;
        A.arm.rotation.z = side * (baseArm + Math.sin(t * 0.85 + side) * 0.008 + 0.004 * b);
        A.elbow.rotation.x = baseElbow + Math.sin(t * 0.7 + side) * 0.01;
        body.legs[k].leg.rotation.z = side * (0.032 + s * 0.004);
      }
    },
  };
}
