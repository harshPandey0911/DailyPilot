import * as THREE from "three";

/** Small procedural canvas textures so we need no image assets. */
function canvasTexture(size, draw, repeat) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 4;
  return t;
}

const knitBump = () =>
  canvasTexture(64, (g, s) => {
    g.fillStyle = "#808080"; g.fillRect(0, 0, s, s);
    g.strokeStyle = "#b8b8b8"; g.lineWidth = 2;
    for (let i = -s; i < s * 2; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + s, s); g.stroke(); }
    g.strokeStyle = "#555"; g.lineWidth = 1;
    for (let i = -s; i < s * 2; i += 8) { g.beginPath(); g.moveTo(i + 4, s); g.lineTo(i + 4 + s, 0); g.stroke(); }
  }, [10, 8]);

const hairBump = () =>
  canvasTexture(128, (g, s) => {
    g.fillStyle = "#808080"; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 160; i++) {
      const v = 90 + Math.random() * 120;
      g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = 1 + Math.random();
      const x = Math.random() * s;
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (Math.random() - 0.5) * 6, s); g.stroke();
    }
  }, [3, 6]);

export const SKIN_TONE = "#dfa987";

/** All avatar materials. `clip` = planes that hide everything below the floor (black-hole emergence). */
export function createMaterials({ female, clip }) {
  const textures = [knitBump(), hairBump()];
  const [knit, hairTex] = textures;
  const base = { clippingPlanes: clip, clipShadows: true };

  const skin = new THREE.MeshPhysicalMaterial({ ...base, color: SKIN_TONE, roughness: 0.55, sheen: 0.25, sheenRoughness: 0.5, sheenColor: new THREE.Color("#ffb7a0") });
  const skinFace = skin.clone();
  skinFace.vertexColors = true;
  skinFace.clippingPlanes = clip;

  const fabric = (color, extra = {}) =>
    new THREE.MeshPhysicalMaterial({ ...base, color, roughness: 0.88, bumpMap: knit, bumpScale: 1.2, sheen: 0.18, sheenRoughness: 0.9, sheenColor: new THREE.Color("#8a8a8a"), ...extra });

  const mats = {
    skin,
    skinFace,
    top: fabric(female ? "#c8ea5e" : "#1b1e1c"),
    topRib: fabric(female ? "#a5cc32" : "#0e100f"),
    bottom: fabric(female ? "#16191a" : "#46563a"),
    bottomRib: fabric(female ? "#0c0e0f" : "#2f3b27"),
    hair: new THREE.MeshStandardMaterial({ ...base, color: female ? "#3b2417" : "#2a1b12", roughness: 0.5 }),
    brow: new THREE.MeshStandardMaterial({ ...base, color: "#2a1b12", roughness: 0.8 }),
    eyeWhite: new THREE.MeshStandardMaterial({ ...base, color: "#f4f1ec", roughness: 0.25 }),
    iris: new THREE.MeshStandardMaterial({ ...base, color: "#5a3a22", roughness: 0.3 }),
    pupil: new THREE.MeshStandardMaterial({ ...base, color: "#050505", roughness: 0.2 }),
    lip: new THREE.MeshStandardMaterial({ ...base, color: female ? "#c4646a" : "#b97370", roughness: 0.4 }),
    mouth: new THREE.MeshStandardMaterial({ ...base, color: "#5a2a28", roughness: 0.6 }),
    shoeUpper: new THREE.MeshStandardMaterial({ ...base, color: female ? "#f2f3ee" : "#f2f3ee", roughness: 0.6, bumpMap: knit, bumpScale: 0.6 }),
    shoeAccent: new THREE.MeshStandardMaterial({ ...base, color: "#c8ea5e", roughness: 0.5 }),
    sole: new THREE.MeshStandardMaterial({ ...base, color: "#ffffff", roughness: 0.35 }),
    strap: new THREE.MeshStandardMaterial({ ...base, color: "#111713", roughness: 0.6 }),
    watch: new THREE.MeshStandardMaterial({ ...base, color: "#c8ea5e", roughness: 0.2, metalness: 0.4 }),
  };

  mats.dispose = () => {
    textures.forEach((t) => t.dispose());
    Object.values(mats).forEach((m) => m?.isMaterial && m.dispose());
  };
  return mats;
}
