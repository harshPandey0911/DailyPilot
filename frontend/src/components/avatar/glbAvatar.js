import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clamp } from "./geometry.js";
import { shapeFrom } from "./buildAvatar.js";

const TARGET_HEIGHT = 1.76; // scene units; the rest of the scene (camera, black hole) is built around this

/** True only if the URL really serves a file (dev servers often answer 200 with index.html for missing paths). */
export async function glbExists(url) {
  try {
    const res = await fetch(url, { method: "HEAD" });
    const type = res.headers.get("content-type") || "";
    return res.ok && !type.includes("text/html");
  } catch {
    return false;
  }
}

/**
 * Loads an artist-made rigged character (.glb) and exposes the same interface as the procedural avatar:
 * { root, setProfile, update, heightScale, dispose }.
 *  - feet are placed on y = 0 and the model is scaled to TARGET_HEIGHT
 *  - the model's own outfit / textures are used as-is
 *  - if it ships an idle/stand animation it is played
 *  - height scales the whole model; weight gently widens it (and drives "weight/fat/slim" morph targets if present)
 */
export async function loadGlbAvatar(url, profile, { clip, reduceMotion }) {
  const gltf = await new GLTFLoader().loadAsync(url);
  const model = gltf.scene;

  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const k = TARGET_HEIGHT / (size.y || 1);
  model.scale.setScalar(k);
  const fitted = new THREE.Box3().setFromObject(model);
  const centre = fitted.getCenter(new THREE.Vector3());
  model.position.set(-centre.x, -fitted.min.y, -centre.z);

  const root = new THREE.Group();   // height scale + black-hole rise
  const sizer = new THREE.Group();  // build (width/depth) scale
  sizer.add(model);
  root.add(sizer);

  const morphs = [];
  const textures = new Set();
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    o.frustumCulled = false; // skinned meshes can be culled wrongly while animating
    for (const m of [].concat(o.material)) {
      m.clippingPlanes = clip;
      m.clipShadows = true;
      m.needsUpdate = true;
      for (const v of Object.values(m)) if (v && v.isTexture) textures.add(v);
    }
    if (o.morphTargetDictionary) morphs.push(o);
  });

  let mixer = null;
  if (gltf.animations?.length && !reduceMotion) {
    mixer = new THREE.AnimationMixer(model);
    const idle = gltf.animations.find((a) => /idle|stand|breath/i.test(a.name)) || gltf.animations[0];
    mixer.clipAction(idle).play();
  }

  const target = shapeFrom(profile);
  const cur = { ...target };

  function applyBuild() {
    const w = clamp(1 + cur.fat * 0.12, 0.92, 1.16);
    sizer.scale.set(w, 1, 1 + (w - 1) * 0.6);
    for (const mesh of morphs) {
      for (const [name, i] of Object.entries(mesh.morphTargetDictionary)) {
        if (/weight|fat|heavy|belly|chubby/i.test(name)) mesh.morphTargetInfluences[i] = clamp(cur.fat, 0, 1);
        else if (/thin|slim|skinny/i.test(name)) mesh.morphTargetInfluences[i] = clamp(-cur.fat, 0, 1);
      }
    }
  }
  applyBuild();
  root.scale.setScalar(cur.heightScale);

  return {
    root,
    setProfile(p) { Object.assign(target, shapeFrom(p)); },
    update(_t, dt) {
      const e = Math.min(1, dt * 5);
      cur.fat += (target.fat - cur.fat) * e;
      cur.heightScale += (target.heightScale - cur.heightScale) * e;
      applyBuild();
      root.scale.setScalar(cur.heightScale);
      mixer?.update(dt);
    },
    get heightScale() { return cur.heightScale; },
    dispose() {
      mixer?.stopAllAction();
      model.traverse((o) => {
        if (!o.isMesh) return;
        o.geometry.dispose();
        [].concat(o.material).forEach((m) => m.dispose());
      });
      textures.forEach((t) => t.dispose());
    },
  };
}
