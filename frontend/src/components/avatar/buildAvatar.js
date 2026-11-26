import * as THREE from "three";
import { clamp } from "./geometry.js";
import { createMaterials } from "./AvatarMaterials.js";
import { createBody, P } from "./AvatarBody.js";
import { createHead } from "./AvatarHead.js";
import { createClothing } from "./AvatarClothing.js";
import { createShoes } from "./AvatarShoes.js";
import { createAnimation } from "./AvatarAnimation.js";

/** Profile → body shape. Changes are deliberately gentle. */
export function shapeFrom({ gender, heightCm = 170, weightKg = 65 }) {
  const h = clamp(Number(heightCm) || 170, 120, 210);
  const bmi = (Number(weightKg) || 65) / (h / 100) ** 2;
  return {
    female: gender === "female",
    fat: clamp((bmi - 22.5) / 9, -0.5, 1),
    muscle: gender === "female" ? 0.2 : gender === "male" ? 0.4 : 0.3,
    heightScale: clamp(h / 172, 0.85, 1.15),
  };
}

/**
 * Assembles the avatar from modules: body, head, clothing, shoes, animation.
 * `setProfile` eases the body toward a new shape; clothing is rebuilt from the same
 * profiles every step so it always fits.
 */
export function buildAvatar(profile, { clip, reduceMotion }) {
  const target = shapeFrom(profile);
  const cur = { ...target };
  const mats = createMaterials({ female: target.female, clip });

  const root = new THREE.Group();
  const body = createBody(mats, cur);
  root.add(body.root);
  const clothing = createClothing(mats, body, cur);
  const shoes = createShoes(mats, body);

  const head = createHead(mats, { female: target.female });
  const neck = new THREE.Group();
  neck.position.y = P.neck;
  head.group.position.y = -P.neck;
  neck.add(head.group);
  body.root.add(neck);

  root.scale.setScalar(cur.heightScale);
  const anim = createAnimation({ body, neck, root: body.root }, { reduceMotion });
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  return {
    root,
    setProfile(p) { Object.assign(target, shapeFrom(p)); },
    update(t, dt) {
      const k = Math.min(1, dt * 5);
      const df = target.fat - cur.fat;
      const dm = target.muscle - cur.muscle;
      if (Math.abs(df) > 0.002 || Math.abs(dm) > 0.002) {
        cur.fat += df * k;
        cur.muscle += dm * k;
        clothing.rebuild(cur, body.rebuild(cur));
      }
      cur.heightScale += (target.heightScale - cur.heightScale) * k;
      root.scale.setScalar(cur.heightScale);
      anim.update(t);
    },
    get heightScale() { return cur.heightScale; },
    dispose() {
      body.dispose(); clothing.dispose(); shoes.dispose(); head.dispose(); mats.dispose();
    },
  };
}
