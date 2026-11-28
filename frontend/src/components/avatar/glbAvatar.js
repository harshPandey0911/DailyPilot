import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clamp, smoothstep } from "./geometry.js";
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

function createHairNormalMap() {
  const S = 256;
  const h = new Float32Array(S * S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      h[y * S + x] = Math.sin(x * 0.85 + Math.sin(y * 0.06) * 1.4) * 0.45 + (Math.random() - 0.5) * 0.25;
    }
  }
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (h[y * S + ((x + 1) % S)] - h[y * S + ((x - 1 + S) % S)]) * 1.1;
      const dy = (h[((y + 1) % S) * S + x] - h[((y - 1 + S) % S) * S + x]) * 1.1;
      const len = Math.hypot(-dx, dy, 1) || 1;
      const idx = (y * S + x) * 4;
      img.data[idx] = Math.round(((-dx / len) * 0.5 + 0.5) * 255);
      img.data[idx + 1] = Math.round(((dy / len) * 0.5 + 0.5) * 255);
      img.data[idx + 2] = Math.round(((1 / len) * 0.5 + 0.5) * 255);
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(36, 8);
  tex.anisotropy = 4;
  return tex;
}

const hash2 = (x, y) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
};

/** Amplifies sparse hair-stroke alpha on MakeHuman eyebrow/eyelash PNGs so brows don't look washed out. */
function boostAlphaTexture(srcTex, mult) {
  const img = srcTex?.image;
  if (!img) return srcTex;
  const w = img.width || 512, h = img.height || 512;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const d = data.data;
  for (let i = 3; i < d.length; i += 4) {
    d[i] = Math.min(255, Math.round(d[i] * mult));
  }
  ctx.putImageData(data, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Generates high-resolution 2048×2048 facial skin maps (albedo, pore/stubble normal, and T-zone roughness)
 * aligned directly to the MakeHuman face UV island (u: 0.74..0.97 top-to-chin, v: 0.33..0.70 left-to-right).
 */
function createEnhancedSkinMaps(albedoTex, normalTex, isFemale) {
  const S = 2048;
  const colC = document.createElement("canvas");
  const normC = document.createElement("canvas");
  const roughC = document.createElement("canvas");
  colC.width = normC.width = roughC.width = S;
  colC.height = normC.height = roughC.height = S;

  const colCtx = colC.getContext("2d");
  const normCtx = normC.getContext("2d");
  const roughCtx = roughC.getContext("2d");

  if (albedoTex?.image) colCtx.drawImage(albedoTex.image, 0, 0, S, S);
  else { colCtx.fillStyle = "#e2ddd5"; colCtx.fillRect(0, 0, S, S); }

  if (normalTex?.image) normCtx.drawImage(normalTex.image, 0, 0, S, S);
  else { normCtx.fillStyle = "rgb(128,128,255)"; normCtx.fillRect(0, 0, S, S); }

  // Base matte-satin skin roughness
  roughCtx.fillStyle = "rgb(142,142,142)"; // ~0.56
  roughCtx.fillRect(0, 0, S, S);

  // UV helper: in glTF (flipY=false), canvas x = u*S (vertical head axis), y = v*S (lateral axis)
  const fx = (u) => u * S;
  const fy = (v) => v * S;

  // 1. Subtle organic warmth + facial depth on the face island
  const addSoftZone = (ctx, u, v, ru, rv, color) => {
    const cx = fx(u), cy = fy(v), rx = ru * S, ry = rv * S;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ry / (rx || 1));
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    grad.addColorStop(0, color);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Warm capillary tone on cheeks, nose bridge/tip, and ears
  addSoftZone(colCtx, 0.870, 0.517, 0.028, 0.022, "rgba(185, 108, 86, 0.14)");
  addSoftZone(colCtx, 0.872, 0.445, 0.032, 0.038, "rgba(188, 114, 92, 0.10)");
  addSoftZone(colCtx, 0.872, 0.589, 0.032, 0.038, "rgba(188, 114, 92, 0.10)");
  addSoftZone(colCtx, 0.855, 0.340, 0.025, 0.025, "rgba(180, 106, 86, 0.12)");
  addSoftZone(colCtx, 0.855, 0.694, 0.025, 0.025, "rgba(180, 106, 86, 0.12)");

  // Eye socket, upper eyelid crease, nostril & under-jaw ambient occlusion
  addSoftZone(colCtx, 0.836, 0.474, 0.018, 0.026, "rgba(110, 68, 52, 0.14)");
  addSoftZone(colCtx, 0.836, 0.560, 0.018, 0.026, "rgba(110, 68, 52, 0.14)");
  addSoftZone(colCtx, 0.878, 0.506, 0.008, 0.008, "rgba(80, 44, 34, 0.25)");
  addSoftZone(colCtx, 0.878, 0.528, 0.008, 0.008, "rgba(80, 44, 34, 0.25)");
  addSoftZone(colCtx, 0.958, 0.517, 0.025, 0.090, "rgba(95, 62, 48, 0.12)");

  // Crisp natural lip definition & mouth parting shadow
  addSoftZone(colCtx, 0.907, 0.517, 0.012, 0.024, "rgba(162, 82, 80, 0.18)");
  colCtx.strokeStyle = "rgba(74, 34, 32, 0.34)";
  colCtx.lineWidth = 2.2;
  colCtx.beginPath();
  colCtx.moveTo(fx(0.907), fy(0.495));
  colCtx.quadraticCurveTo(fx(0.905), fy(0.517), fx(0.907), fy(0.539));
  colCtx.stroke();

  // Specular T-zone roughness map (natural skin sheen on forehead, nose, cheekbones, lower lip without sweaty glare)
  addSoftZone(roughCtx, 0.800, 0.517, 0.032, 0.055, "rgb(118, 118, 118)");
  addSoftZone(roughCtx, 0.864, 0.517, 0.030, 0.018, "rgb(104, 104, 104)");
  addSoftZone(roughCtx, 0.866, 0.445, 0.024, 0.028, "rgb(114, 114, 114)");
  addSoftZone(roughCtx, 0.866, 0.589, 0.024, 0.028, "rgb(114, 114, 114)");
  addSoftZone(roughCtx, 0.913, 0.517, 0.008, 0.020, "rgb(98, 98, 98)");

  // 2. High-frequency skin pores, micro-freckles & male stubble directly in face UV space
  const x0 = Math.floor(0.75 * S), x1 = Math.floor(0.97 * S);
  const y0 = Math.floor(0.34 * S), y1 = Math.floor(0.69 * S);
  const colData = colCtx.getImageData(x0, y0, x1 - x0, y1 - y0);
  const normData = normCtx.getImageData(x0, y0, x1 - x0, y1 - y0);
  const roughData = roughCtx.getImageData(x0, y0, x1 - x0, y1 - y0);
  const w = x1 - x0, h = y1 - y0;

  for (let py = 0; py < h; py++) {
    const v = (y0 + py) / S;
    const dv = Math.abs(v - 0.517);
    for (let px = 0; px < w; px++) {
      const u = (x0 + px) / S;
      const idx = (py * w + px) * 4;

      // Subtle micro-pores & melanin flecks across face
      const n1 = hash2(px * 0.55, py * 0.55);
      const n2 = hash2(px * 0.19, py * 0.19);
      const pore = n1 > 0.78 ? (n1 - 0.78) * 4.5 : 0;
      const freckle = n2 > 0.985 && u > 0.84 && u < 0.90 && dv < 0.09 ? 1 : 0;

      if (pore > 0) {
        colData.data[idx] = Math.max(0, colData.data[idx] - pore * 8);
        colData.data[idx + 1] = Math.max(0, colData.data[idx + 1] - pore * 9);
        colData.data[idx + 2] = Math.max(0, colData.data[idx + 2] - pore * 9);
        normData.data[idx] = Math.min(255, Math.max(0, normData.data[idx] + (hash2(px, py) - 0.5) * 26));
        normData.data[idx + 1] = Math.min(255, Math.max(0, normData.data[idx + 1] + (hash2(py, px) - 0.5) * 26));
      }
      if (freckle) {
        colData.data[idx] = Math.max(0, colData.data[idx] - 12);
        colData.data[idx + 1] = Math.max(0, colData.data[idx + 1] - 18);
        colData.data[idx + 2] = Math.max(0, colData.data[idx + 2] - 20);
      }

      // Smooth natural 5-o'clock stubble for male (elliptical falloff around mouth/nose; zero boxy cutouts)
      if (!isFemale) {
        const lipEll = ((u - 0.907) / 0.014) ** 2 + (dv / 0.028) ** 2;
        const noseEll = ((u - 0.873) / 0.014) ** 2 + (dv / 0.024) ** 2;
        const mouthClear = smoothstep(0.95, 1.85, lipEll) * smoothstep(0.85, 1.75, noseEll);

        // Organic beard boundary curving smoothly from sideburns down along jaw and chin
        const jawTop = 0.892 + dv * 0.14;
        const jawMask = smoothstep(jawTop - 0.012, jawTop + 0.016, u) *
          smoothstep(0.962, 0.942, u) *
          smoothstep(0.155, 0.105, dv);
        // Subtle mustache shadow tapering smoothly from philtrum toward mouth corners
        const stacheMask = Math.exp(-(((u - 0.890) / 0.0065) ** 2)) * smoothstep(0.034, 0.012, dv);
        const beard = Math.min(1, (jawMask + stacheMask * 0.85) * mouthClear);

        if (beard > 0.02) {
          // Soft cool-taupe razor shadow undertone
          const tone = 1 - beard * 0.075;
          colData.data[idx] *= tone;
          colData.data[idx + 1] *= tone * 0.99;
          colData.data[idx + 2] *= tone * 0.995;

          // Delicate 1px micro-follicles (no blocky 2x2 pepper dots)
          const hVal = hash2(px * 1.13, py * 1.13);
          if (hVal > 0.76) {
            const sStr = beard * (0.09 + (hVal - 0.76) * 0.32);
            colData.data[idx] = Math.round(colData.data[idx] * (1 - sStr) + 46 * sStr);
            colData.data[idx + 1] = Math.round(colData.data[idx + 1] * (1 - sStr) + 34 * sStr);
            colData.data[idx + 2] = Math.round(colData.data[idx + 2] * (1 - sStr) + 29 * sStr);
            normData.data[idx] = Math.min(255, normData.data[idx] + 16);
            normData.data[idx + 1] = Math.max(0, normData.data[idx + 1] - 14);
            roughData.data[idx] = roughData.data[idx + 1] = roughData.data[idx + 2] = Math.round(142 + beard * 40);
          }
        }
      }
    }
  }

  colCtx.putImageData(colData, x0, y0);
  normCtx.putImageData(normData, x0, y0);
  roughCtx.putImageData(roughData, x0, y0);

  const map = new THREE.CanvasTexture(colC);
  map.flipY = false;
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;

  const normalMap = new THREE.CanvasTexture(normC);
  normalMap.flipY = false;
  normalMap.colorSpace = THREE.NoColorSpace;
  normalMap.anisotropy = 8;

  const roughnessMap = new THREE.CanvasTexture(roughC);
  roughnessMap.flipY = false;
  roughnessMap.colorSpace = THREE.NoColorSpace;
  roughnessMap.anisotropy = 4;

  return { map, normalMap, roughnessMap };
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
 * Loads an artist-made rigged character (.glb) and exposes the same interface as the procedural avatar.
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

/** Applies base morph weights, facial bone-structure morphs, and two-factor corrective morphs. */
function applyCc0Morphs(morphs, state, blink) {
  const isFem = state.female;
  const values = {
    gender_female: isFem ? 1 : state.other ? 0.5 : 0,
    gender_male: isFem ? 0 : state.other ? 0.5 : 1,
    weight_max: clamp(state.fat * 0.55, 0, 0.55),
    weight_min: clamp(-state.fat * 0.8, 0, 0.45),
    muscle_max: clamp(state.muscle * 0.4, 0, 0.24),
    proportions_ideal: 0.25,
    breast_cup_min: isFem ? 0.35 : 0,
    // Sculpted anatomical facial proportions (sharper cheekbones, jaw, nose, gaze)
    face_cheekbones_incr: isFem ? 0.28 : 0.42,
    face_jaw_width_incr: isFem ? 0.0 : 0.28,
    face_chin_incr: isFem ? 0.08 : 0.24,
    face_nose_height_incr: isFem ? 0.12 : 0.22,
    face_nose_width_decr: isFem ? 0.18 : 0.12,
    face_lips_decr: isFem ? 0.0 : 0.22,
    face_lips_incr: isFem ? 0.10 : 0.0,
    face_eye_tilt_incr: isFem ? 0.18 : 0.20,
    face_eye_size_decr: isFem ? 0.0 : 0.10,
    look_up: 0.14,
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

/** Safely loads an embedded normal-map image (index 0 in MakeHuman CC0 GLBs) as linear data. */
async function loadEmbeddedNormal(gltf) {
  try {
    const tex = await gltf.parser.loadTexture(0);
    if (tex) tex.colorSpace = THREE.NoColorSpace;
    return tex;
  } catch {
    return null;
  }
}

/**
 * Loads the built-in CC0-1.0 modular realistic character with 2048px enhanced facial PBR maps,
 * crisp eyebrows/eyelashes, two-pass feathered hair, glossy eye corneas, and live BMI/height morphing.
 */
export async function loadCc0Avatar(profile, { clip, reduceMotion }) {
  const loader = new GLTFLoader();
  const isFem = profile.gender === "female";
  const garmentFiles = isFem
    ? ["clothing_tshirt.glb", "clothing_jeans.glb", "clothing_shoes.glb", "hair_long01.glb"]
    : ["clothing_tshirt.glb", "clothing_jacket.glb", "clothing_jeans.glb", "clothing_shoes.glb", "hair_short02.glb"];

  const [bodyGltf, ...partGltfs] = await Promise.all([
    loader.loadAsync(`${CC0_BASE}/base_body_anim.glb`),
    ...garmentFiles.map((f) => loader.loadAsync(`${CC0_BASE}/${f}`)),
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

  const normalMapByMat = {};
  const skinNormal = await loadEmbeddedNormal(bodyGltf);
  await Promise.all(partGltfs.map(async (part, i) => {
    const fn = garmentFiles[i];
    if (fn === "clothing_tshirt.glb") normalMapByMat.Cloth_tshirt = await loadEmbeddedNormal(part);
    if (fn === "clothing_jacket.glb") normalMapByMat.Cloth_jacket = await loadEmbeddedNormal(part);
    if (fn === "clothing_jeans.glb") normalMapByMat.Cloth_jeans = await loadEmbeddedNormal(part);
    if (fn === "clothing_shoes.glb") normalMapByMat.Cloth_shoes = await loadEmbeddedNormal(part);

    const meshes = [];
    part.scene.traverse((o) => { if (o.isMesh) meshes.push(o); });
    for (const o of meshes) {
      if (o.isSkinnedMesh && o.skeleton && bodySkel) {
        const bones = o.skeleton.bones.map((b) => boneByName.get(b.name) || b);
        o.bind(new THREE.Skeleton(bones, bodySkel.boneInverses), o.bindMatrix);
      }
      bodyParent.add(o);
    }
  }));

  const hairNormal = createHairNormalMap();
  const hairMeshesToLayer = [];
  const { morphs, textures } = prepareModel(model, clip, {
    onMaterial(m, texSet) {
      if (m.name === "Eyebrow" || m.name === "Eyelash") {
        if (m.map) {
          texSet.add(m.map);
          const mult = m.name === "Eyebrow" ? (isFem ? 2.0 : 2.3) : 1.9;
          m.map = boostAlphaTexture(m.map, mult);
        }
        m.color.set(m.name === "Eyebrow" ? "#2e1e14" : "#160e0a");
        m.transparent = true;
        m.alphaTest = 0.02;
        m.alphaToCoverage = false;
        m.depthWrite = false;
        m.roughness = 0.78;
      } else if (m.name === "Eye") {
        m.color.set("#f7f2ec");
        m.roughness = 0.14;
      } else if (m.name === "Iris") {
        m.color.set("#7a4d2b");
        m.roughness = 0.12;
      } else if (m.name === "Cloth_tshirt") {
        if (m.map) texSet.add(m.map);
        m.map = null;
        m.color.set(isFem ? "#28302b" : "#e3e5e2");
        if (normalMapByMat.Cloth_tshirt) {
          m.normalMap = normalMapByMat.Cloth_tshirt;
          m.normalScale = new THREE.Vector2(0.8, 0.8);
        }
        m.roughness = 0.9;
        m.polygonOffset = true;
        m.polygonOffsetFactor = -1;
        m.polygonOffsetUnits = -1;
      } else if (m.name === "Cloth_jacket") {
        if (normalMapByMat.Cloth_jacket) {
          m.normalMap = normalMapByMat.Cloth_jacket;
          m.normalScale = new THREE.Vector2(1.0, 1.0);
        }
        m.roughness = 0.72;
      } else if (m.name === "Cloth_jeans") {
        if (normalMapByMat.Cloth_jeans) {
          m.normalMap = normalMapByMat.Cloth_jeans;
          m.normalScale = new THREE.Vector2(1.0, 1.0);
        }
        m.color.set("#445868");
        m.roughness = 0.86;
      } else if (m.name === "Cloth_shoes") {
        if (normalMapByMat.Cloth_shoes) {
          m.normalMap = normalMapByMat.Cloth_shoes;
          m.normalScale = new THREE.Vector2(0.9, 0.9);
        }
        m.color.set("#cfcdc6");
        m.roughness = 0.62;
      }
    },
  });

  // Two-pass hair rendering (opaque scalp core + soft translucent feathered strands, revealing natural espresso strands)
  model.traverse((o) => {
    if (!o.isMesh) return;
    if (o.material?.name === "Cornea") {
      const old = o.material;
      o.material = new THREE.MeshPhysicalMaterial({
        name: "Cornea",
        clippingPlanes: clip,
        clipShadows: true,
        color: "#ffffff",
        transparent: true,
        opacity: 0.12,
        roughness: 0.015,
        clearcoat: 1.0,
        clearcoatRoughness: 0.015,
        envMapIntensity: 2.2,
        depthWrite: false,
        side: old.side,
      });
      old.dispose();
    } else if ((o.material?.name || "").startsWith("Hair_")) {
      hairMeshesToLayer.push(o);
    } else if (o.material?.name === "Skin") {
      const old = o.material;
      if (old.map) textures.add(old.map);
      const enhanced = createEnhancedSkinMaps(old.map, skinNormal, isFem);
      textures.add(enhanced.map);
      textures.add(enhanced.normalMap);
      textures.add(enhanced.roughnessMap);

      o.material = new THREE.MeshPhysicalMaterial({
        name: "Skin",
        clippingPlanes: clip,
        clipShadows: true,
        map: enhanced.map,
        color: old.color.clone().multiply(new THREE.Color("#fff5ee")),
        normalMap: enhanced.normalMap,
        normalScale: new THREE.Vector2(0.95, 0.95),
        roughnessMap: enhanced.roughnessMap,
        roughness: 1.0,
        sheen: 0.26,
        sheenRoughness: 0.58,
        sheenColor: new THREE.Color("#de7a5c"),
        clearcoat: 0.05,
        clearcoatRoughness: 0.42,
        side: old.side,
      });
      old.dispose();
    }
  });

  for (const hairMesh of hairMeshesToLayer) {
    const old = hairMesh.material;
    if (old.map) textures.add(old.map);
    const coreMat = new THREE.MeshPhysicalMaterial({
      name: `${old.name}_core`,
      clippingPlanes: clip,
      clipShadows: true,
      map: old.map,
      color: new THREE.Color("#5a4130"),
      normalMap: hairNormal,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughness: 0.64,
      sheen: 0.35,
      sheenRoughness: 0.38,
      sheenColor: new THREE.Color("#8d6e58"),
      alphaTest: 0.45,
      transparent: false,
      depthWrite: true,
      side: THREE.DoubleSide,
    });
    const fringeMat = coreMat.clone();
    fringeMat.name = `${old.name}_fringe`;
    fringeMat.alphaTest = 0.01;
    fringeMat.transparent = true;
    fringeMat.depthWrite = false;

    hairMesh.material = coreMat;
    hairMesh.renderOrder = 1;

    const fringe = new THREE.SkinnedMesh(hairMesh.geometry, fringeMat);
    fringe.name = `${hairMesh.name}_fringe`;
    fringe.castShadow = false;
    fringe.frustumCulled = false;
    fringe.renderOrder = 2;
    if (hairMesh.skeleton) fringe.bind(hairMesh.skeleton, hairMesh.bindMatrix);
    fringe.morphTargetDictionary = hairMesh.morphTargetDictionary;
    fringe.morphTargetInfluences = hairMesh.morphTargetInfluences;
    hairMesh.parent?.add(fringe);
    morphs.push(fringe);
    old.dispose();
  }

  if (skinNormal) textures.add(skinNormal);
  textures.add(hairNormal);

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
