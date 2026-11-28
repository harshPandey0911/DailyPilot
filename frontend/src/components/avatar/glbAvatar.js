import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clamp } from "./geometry.js";
import { shapeFrom } from "./buildAvatar.js";

const TARGET_HEIGHT = 1.76; // scene units; the rest of the scene (camera, black hole) is built around this
const CC0_BASE = "/avatars/cc0";

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

/** True if the built-in CC0-1.0 modular character assets are present. */
export const cc0AvatarExists = () => glbExists(`${CC0_BASE}/base_body_anim.glb`);

function prepareModel(model, clip, { onMaterial } = {}) {
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
      if (m.alphaTest > 0) m.alphaToCoverage = true;
      onMaterial?.(m, textures);
      m.needsUpdate = true;
      for (const v of Object.values(m)) if (v && v.isTexture) textures.add(v);
    }
    if (o.morphTargetDictionary) morphs.push(o);
  });
  return { morphs, textures };
}

function fitModelToStage(model) {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const k = TARGET_HEIGHT / (size.y || 1);
  model.scale.setScalar(k);
  const fitted = new THREE.Box3().setFromObject(model);
  const centre = fitted.getCenter(new THREE.Vector3());
  model.position.set(-centre.x, -fitted.min.y, -centre.z);
  model.updateMatrixWorld(true);

  const root = new THREE.Group();  // height scale + black-hole rise
  const sizer = new THREE.Group(); // build (width/depth) scale
  sizer.add(model);
  root.add(sizer);
  return { root, sizer };
}

function createSkinMicroBump() {
  const s = 128;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(s, s);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 116 + Math.floor(Math.random() * 24);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.anisotropy = 4;
  return tex;
}

function createIdleAnimator(model, animations, reduceMotion) {
  if (!animations?.length || reduceMotion) return null;
  const mixer = new THREE.AnimationMixer(model);
  const clip =
    animations.find((a) => /^idle$/i.test(a.name)) ||
    animations.find((a) => /idle|stand|breath/i.test(a.name)) ||
    animations[0];
  mixer.clipAction(clip).play();
  mixer.update(0.05);
  return mixer;
}

function disposeLoaded(model, mixer, textures) {
  mixer?.stopAllAction();
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry.dispose();
    [].concat(o.material).forEach((m) => m.dispose());
  });
  textures.forEach((t) => t.dispose());
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
  const { morphs, textures } = prepareModel(model, clip);
  const mixer = createIdleAnimator(model, gltf.animations, reduceMotion);
  const { root, sizer } = fitModelToStage(model);

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
    dispose() { disposeLoaded(model, mixer, textures); },
  };
}

/** Applies base morph weights plus two-factor corrective morphs (corr_A__B) and facial blink/gaze. */
function applyCc0Morphs(morphs, state, blink) {
  // Note: height_tall / height_short are NOT set here because they shift mesh vertices away from
  // the unscaled skeleton joints; heightCm is applied cleanly via root.scale (heightScale).
  const values = {
    gender_female: state.female ? 1 : state.other ? 0.5 : 0,
    gender_male: state.female ? 0 : state.other ? 0.5 : 1,
    weight_max: clamp(state.fat * 0.55, 0, 0.55),
    weight_min: clamp(-state.fat * 0.8, 0, 0.45),
    muscle_max: clamp(state.muscle, 0, 0.6),
    proportions_ideal: 0.65,
    breast_cup_min: state.female ? 0.35 : 0,
  };

  for (const mesh of morphs) {
    const dict = mesh.morphTargetDictionary;
    const inf = mesh.morphTargetInfluences;
    if (!dict || !inf) continue;
    inf.fill(0);
    for (const [k, v] of Object.entries(values)) {
      if (dict[k] !== undefined) inf[dict[k]] = v;
    }
    for (const [name, i] of Object.entries(dict)) {
      if (!name.startsWith("corr_")) continue;
      const parts = name.slice(5).split("__");
      if (parts.length === 2) inf[i] = (values[parts[0]] || 0) * (values[parts[1]] || 0);
    }
    if (dict.blink_left !== undefined) inf[dict.blink_left] = blink;
    if (dict.blink_right !== undefined) inf[dict.blink_right] = blink;
  }
}

/**
 * Loads the built-in CC0-1.0 modular realistic character (base body + garments + hair)
 * and drives anatomical gender, BMI, muscle, height morph targets and natural blinking.
 */
export async function loadCc0Avatar(profile, { clip, reduceMotion }) {
  const loader = new GLTFLoader();
  const isFem = profile.gender === "female";
  const topFile = isFem ? "clothing_tshirt.glb" : "clothing_shirt.glb";
  const hairFile = isFem ? "hair_long01.glb" : "hair_short02.glb";

  const [bodyGltf, topGltf, jeansGltf, shoesGltf, hairGltf] = await Promise.all([
    loader.loadAsync(`${CC0_BASE}/base_body_anim.glb`),
    loader.loadAsync(`${CC0_BASE}/${topFile}`),
    loader.loadAsync(`${CC0_BASE}/clothing_jeans.glb`),
    loader.loadAsync(`${CC0_BASE}/clothing_shoes.glb`),
    loader.loadAsync(`${CC0_BASE}/${hairFile}`),
  ]);

  const model = bodyGltf.scene;
  let bodySkel = null;
  let bodyParent = model;
  model.traverse((o) => {
    if (o.isSkinnedMesh && !bodySkel) {
      bodySkel = o.skeleton;
      bodyParent = o.parent;
    }
  });
  const boneByName = new Map((bodySkel?.bones || []).map((b) => [b.name, b]));

  for (const part of [topGltf, jeansGltf, shoesGltf, hairGltf]) {
    const meshes = [];
    part.scene.traverse((o) => { if (o.isMesh) meshes.push(o); });
    for (const o of meshes) {
      if (o.isSkinnedMesh && o.skeleton && bodySkel) {
        const bones = o.skeleton.bones.map((b) => boneByName.get(b.name) || b);
        o.bind(new THREE.Skeleton(bones, bodySkel.boneInverses), o.bindMatrix);
      }
      bodyParent.add(o);
    }
  }

  const skinBump = createSkinMicroBump();
  const { morphs, textures } = prepareModel(model, clip, {
    onMaterial(m, texSet) {
      if (m.name === "Skin") {
        m.roughness = 0.54;
        m.bumpMap = skinBump;
        m.bumpScale = 0.0008;
      } else if (m.name === "Cloth_shirt") {
        m.color.set("#d8dcda");
        m.roughness = 0.86;
      } else if (m.name === "Cloth_tshirt") {
        if (m.map) texSet.add(m.map);
        m.map = null;
        m.color.set("#28302b");
        m.roughness = 0.88;
        m.polygonOffset = true;
        m.polygonOffsetFactor = -1;
        m.polygonOffsetUnits = -1;
      } else if (m.name === "Cloth_jeans") {
        m.color.set("#425461");
        m.roughness = 0.85;
      } else if (m.name === "Cloth_shoes") {
        m.color.set("#dcded9");
        m.roughness = 0.62;
      } else if ((m.name || "").startsWith("Hair_")) {
        m.color.set("#261911");
        m.roughness = 0.52;
      }
    },
  });
  textures.add(skinBump);

  const toState = (p) => ({ ...shapeFrom(p), other: p.gender === "other" });
  const target = toState(profile);
  const cur = { ...target };
  applyCc0Morphs(morphs, cur, 0);

  const mixer = createIdleAnimator(model, bodyGltf.animations, reduceMotion);
  const { root, sizer } = fitModelToStage(model);

  function applyScale() {
    const w = clamp(1 + cur.fat * 0.06, 0.94, 1.09);
    sizer.scale.set(w, 1, 1 + (w - 1) * 0.5);
    root.scale.setScalar(cur.heightScale);
  }
  applyScale();

  return {
    root,
    setProfile(p) { Object.assign(target, toState(p)); },
    update(t, dt) {
      const e = Math.min(1, dt * 5);
      cur.fat += (target.fat - cur.fat) * e;
      cur.muscle += (target.muscle - cur.muscle) * e;
      cur.heightScale += (target.heightScale - cur.heightScale) * e;

      let blink = 0;
      if (!reduceMotion) {
        const cycle = t % 4.2;
        if (cycle > 3.9 && cycle < 4.08) blink = Math.sin(((cycle - 3.9) / 0.18) * Math.PI);
      }
      applyCc0Morphs(morphs, cur, blink);
      applyScale();
      mixer?.update(dt);
    },
    get heightScale() { return cur.heightScale; },
    dispose() { disposeLoaded(model, mixer, textures); },
  };
}
