import * as THREE from "three";

/** Small procedural canvas textures so we need no image assets. */
function canvasTexture(size, draw, repeat, srgb = false) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Fine twill/cotton weave bump texture. */
const twillBump = () =>
  canvasTexture(128, (g, s) => {
    g.fillStyle = "#808080";
    g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 2) {
      for (let x = 0; x < s; x += 2) {
        const diag = ((x + y) % 8) < 4 ? 14 : -14;
        const noise = (Math.random() - 0.5) * 14;
        const v = Math.max(40, Math.min(215, 128 + diag + noise));
        g.fillStyle = `rgb(${v},${v},${v})`;
        g.fillRect(x, y, 2, 2);
      }
    }
  }, [18, 18]);

/** Fine woven cotton/twill fabric albedo + bump without circular blotches. */
const wovenFabricAlbedo = (r0, g0, b0, contrast, repeat) =>
  canvasTexture(256, (g, s) => {
    const img = g.createImageData(s, s);
    const d = img.data;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const warp = ((x % 4) < 2 ? 1 : -1) * contrast;
        const weft = ((y % 4) < 2 ? 1 : -1) * contrast * 0.7;
        const twill = (((x + y) % 8) < 4 ? 1 : -1) * contrast * 0.8;
        const slub = (Math.sin(x * 0.17 + y * 0.05) + Math.sin(y * 0.23 - x * 0.04)) * contrast * 0.5;
        const grain = (Math.random() - 0.5) * contrast * 1.4;
        const delta = warp + weft + twill + slub + grain;
        const i = (y * s + x) * 4;
        d[i] = Math.max(0, Math.min(255, r0 + delta));
        d[i + 1] = Math.max(0, Math.min(255, g0 + delta));
        d[i + 2] = Math.max(0, Math.min(255, b0 + delta));
        d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  }, repeat, true);

/** Subtle skin micro-grain so body skin doesn't look like smooth plastic under studio lighting. */
const skinBump = () =>
  canvasTexture(256, (g, s) => {
    const img = g.createImageData(s, s);
    const d = img.data;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const pore = ((x * 13 + y * 29) % 17 === 0) ? -14 : 0;
        const v = 128 + pore + (Math.random() - 0.5) * 18;
        const i = (y * s + x) * 4;
        d[i] = d[i + 1] = d[i + 2] = Math.max(0, Math.min(255, v));
        d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  }, [6, 6]);

const hairBump = () =>
  canvasTexture(256, (g, s) => {
    g.fillStyle = "#808080"; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 420; i++) {
      const v = 70 + Math.random() * 145;
      g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = 0.8 + Math.random() * 1.2;
      const x = Math.random() * s;
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (Math.random() - 0.5) * 4, s); g.stroke();
    }
  }, [5, 8]);

export const SKIN_TONE = "#cc9472";

/** All avatar materials. `clip` = planes that hide everything below the floor (black-hole emergence). */
export function createMaterials({ female, clip }) {
  const shirtMap = wovenFabricAlbedo(female ? 196 : 228, female ? 220 : 230, female ? 110 : 228, 4, [6, 6]);
  const pantsMap = wovenFabricAlbedo(female ? 38 : 54, female ? 42 : 68, female ? 46 : 82, 6, [7, 10]);
  const twill = twillBump();
  const skinTex = skinBump();
  const hairTex = hairBump();
  const textures = [shirtMap, pantsMap, twill, skinTex, hairTex];
  const base = { clippingPlanes: clip, clipShadows: true };

  const skin = new THREE.MeshPhysicalMaterial({
    ...base,
    color: SKIN_TONE,
    roughness: 0.56,
    bumpMap: skinTex,
    bumpScale: 0.0014,
    sheen: 0.18,
    sheenRoughness: 0.65,
    sheenColor: new THREE.Color("#f0b09a"),
    clearcoat: 0.04,
    clearcoatRoughness: 0.5,
  });

  const fabric = (color, extra = {}) =>
    new THREE.MeshPhysicalMaterial({
      ...base,
      color,
      roughness: 0.9,
      bumpMap: twill,
      bumpScale: 0.0022,
      sheen: 0.15,
      sheenRoughness: 0.9,
      sheenColor: new THREE.Color("#888888"),
      ...extra,
    });

  const mats = {
    skin,
    top: fabric("#ffffff", { map: shirtMap }),
    topRib: fabric(female ? "#aec45a" : "#cfd3d1"),
    bottom: fabric("#ffffff", { map: pantsMap }),
    bottomRib: fabric(female ? "#1b1e21" : "#2b3743"),
    hair: new THREE.MeshPhysicalMaterial({
      ...base,
      color: female ? "#331e13" : "#22160f",
      roughness: 0.48,
      bumpMap: hairTex,
      bumpScale: 0.004,
      sheen: 0.25,
      sheenRoughness: 0.45,
      sheenColor: new THREE.Color("#6a5244"),
    }),
    shoeUpper: new THREE.MeshStandardMaterial({ ...base, color: "#dcded8", roughness: 0.68, bumpMap: twill, bumpScale: 0.0018 }),
    shoeAccent: new THREE.MeshStandardMaterial({ ...base, color: "#3b4248", roughness: 0.6 }),
    sole: new THREE.MeshStandardMaterial({ ...base, color: "#f4f4f0", roughness: 0.42 }),
    strap: new THREE.MeshStandardMaterial({ ...base, color: "#141816", roughness: 0.55 }),
    watch: new THREE.MeshStandardMaterial({ ...base, color: "#2d3330", roughness: 0.25, metalness: 0.65 }),
  };

  mats.dispose = () => {
    textures.forEach((t) => t.dispose());
    Object.values(mats).forEach((m) => m?.isMaterial && m.dispose());
  };
  return mats;
}
