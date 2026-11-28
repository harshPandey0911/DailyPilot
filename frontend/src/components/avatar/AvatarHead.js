import * as THREE from "three";
import { clamp, lerp, smoothstep, sampleRings, ringAt } from "./geometry.js";
import { SKIN_TONE } from "./AvatarMaterials.js";

const Y_MIN = 1.490;
const Y_MAX = 1.768;
const Y_SPAN = Y_MAX - Y_MIN;

const G = (dx, dy, sx, sy) => Math.exp(-((dx / sx) ** 2 + (dy / sy) ** 2));

/**
 * Shared 3D anatomical displacement (dx, dy, dz) in metres for any surface point (x, y, z) on the head.
 * Both the 3D vertex sculptor and the 2D UV texture painter evaluate the exact same coordinates.
 */
function faceSculptOffset(x, y, zNorm, female) {
  if (zNorm <= 0.05) return 0;
  const front = smoothstep(0.05, 0.45, zNorm);
  const ax = Math.abs(x);
  const m = female ? 0.65 : 1.0;

  let dz = 0;

  // Supraorbital brow ridge & glabella
  const browX = smoothstep(0.056, 0.015, ax);
  dz += (0.0055 * m + 0.0015) * browX * Math.exp(-(((y - 1.674) / 0.011) ** 2));
  dz -= 0.002 * G(x, y - 1.663, 0.012, 0.008); // nasion dip between brows

  // Deep orbital eye sockets + sculpted upper/lower eyelids
  const eyeX = ax - 0.0315;
  const eyeY = y - 1.653;
  dz -= 0.0145 * G(eyeX, eyeY, 0.0185, 0.0125);
  // Subtle upper & lower eyelid folds embracing the eyeball
  dz += 0.0046 * G(eyeX, y - 1.660, 0.0155, 0.0040);
  dz += 0.0032 * G(eyeX, y - 1.645, 0.0145, 0.0040);

  // Continuous sculpted nose (bridge -> tip -> alar wings -> nostril recesses)
  dz += 0.007 * G(x, y - 1.655, 0.007, 0.014);
  dz += 0.0145 * G(x, y - 1.636, 0.008, 0.019);
  dz += 0.021 * G(x, y - 1.618, 0.0095, 0.010);
  dz += 0.009 * G(ax - 0.0125, y - 1.616, 0.0062, 0.0065);
  dz -= 0.0055 * G(ax - 0.0065, y - 1.610, 0.0038, 0.0032); // nostril cavity

  // Cheekbones (zygomatic arch) & subtle buccal hollows
  dz += 0.0065 * G(ax - 0.046, y - 1.624, 0.018, 0.014);
  dz -= (female ? 0.0022 : 0.0038) * G(ax - 0.045, y - 1.588, 0.016, 0.016);

  // Nasolabial fold running from nostril wing toward mouth corner
  if (y > 1.576 && y < 1.616) {
    const foldX = 0.015 + (1.616 - y) * 0.34;
    dz -= 0.0022 * m * Math.exp(-(((ax - foldX) / 0.0045) ** 2)) * smoothstep(1.576, 1.59, y) * smoothstep(1.616, 1.605, y);
  }

  // Philtrum + Cupid's bow upper lip + recessed mouth line + lower lip
  dz -= 0.0022 * G(x, y - 1.597, 0.0042, 0.0085);
  dz += 0.0014 * G(ax - 0.0055, y - 1.596, 0.003, 0.0075);
  const bow = 1 + 0.16 * Math.cos((clamp(x / 0.0075, -1, 1)) * Math.PI);
  dz += 0.0058 * bow * G(x, y - 1.582, 0.020, 0.0045);
  dz -= 0.0058 * G(x, y - 1.5758, 0.021, 0.0022); // mouth parting
  dz += 0.0068 * G(x, y - 1.568, 0.018, 0.0052);
  dz -= 0.0042 * G(x, y - 1.555, 0.020, 0.005); // mentolabial sulcus

  // Sculpted chin & jaw angle
  dz += (0.0075 + 0.002 * m) * G(x, y - 1.540, female ? 0.018 : 0.023, 0.011);
  dz += 0.0042 * m * G(ax - 0.062, y - 1.574, 0.014, 0.014);

  // Subtle neck sternocleidomastoid tendons below jaw
  dz += 0.0025 * m * G(ax - 0.024, y - 1.512, 0.010, 0.022);

  return dz * front;
}

/** Head base cross-section keys (before 3D facial sculpting). */
function headRings(female) {
  const w = female ? 0.93 : 1.0;
  const keys = [
    [1.490, 0.048, 0.049, 0, -0.004, 2.0],
    [1.515, 0.049, 0.050, 0, -0.003, 2.05],
    [1.530, 0.053 * w, 0.058, 0, 0.002, 2.1],
    [1.544, 0.061 * w, 0.072, 0, 0.008, female ? 2.1 : 2.35],
    [1.572, 0.075 * w, 0.085, 0, 0.003, female ? 2.15 : 2.45],
    [1.608, 0.084 * w, 0.092, 0, -0.004, 2.25],
    [1.648, 0.087 * w, 0.096, 0, -0.008, 2.2],
    [1.688, 0.090 * w, 0.101, 0, -0.011, 2.15],
    [1.728, 0.080 * w, 0.091, 0, -0.012, 2.1],
    [1.754, 0.052 * w, 0.060, 0, -0.008, 2.0],
    [1.768, 0.005, 0.005, 0, -0.005, 2.0],
  ];
  return sampleRings(keys, 128);
}

/**
 * Builds a 128×128 high-resolution sculpted anatomical head mesh.
 * Seam is at u = 0/1 (back of skull, z < 0), with u = 0.5 dead-center on the front face.
 */
function buildSculptedHeadGeometry(rings, female) {
  const R = rings.length;
  const seg = 128;
  const C = seg + 1;
  const pos = new Float32Array(R * C * 3);
  const uv = new Float32Array(R * C * 2);

  for (let r = 0; r < R; r++) {
    const g = rings[r];
    const e = 2 / g.n;
    const v = clamp((g.y - Y_MIN) / Y_SPAN, 0, 1);
    for (let i = 0; i < C; i++) {
      const u = i / seg;
      const ang = (u - 0.5) * Math.PI * 2;
      const s = Math.sin(ang);
      const c = Math.cos(ang);
      const x0 = g.cx - g.rx * Math.sign(s) * Math.abs(s) ** e;
      const z0 = g.cz + g.rz * Math.sign(c) * Math.abs(c) ** e;
      const dz = faceSculptOffset(x0, g.y, c, female);
      const o = (r * C + i) * 3;
      pos[o] = x0;
      pos[o + 1] = g.y;
      pos[o + 2] = z0 + dz;
      uv[(r * C + i) * 2] = u;
      uv[(r * C + i) * 2 + 1] = v;
    }
  }

  const idx = [];
  for (let r = 0; r < R - 1; r++) {
    for (let i = 0; i < seg; i++) {
      const a = r * C + i, b = a + 1, c = a + C, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  // Weld shading across the back-of-head UV seam
  const n = geo.attributes.normal;
  for (let r = 0; r < R; r++) {
    const p = r * C, q = r * C + seg;
    const nx = n.getX(p) + n.getX(q), ny = n.getY(p) + n.getY(q), nz = n.getZ(p) + n.getZ(q);
    const l = Math.hypot(nx, ny, nz) || 1;
    n.setXYZ(p, nx / l, ny / l, nz / l);
    n.setXYZ(q, nx / l, ny / l, nz / l);
  }
  return geo;
}

/** Deterministic pseudo-noise for organic pores, stubble, and skin variation. */
function hash2(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

/**
 * Generates pixel-aligned 1024×512 procedural face Albedo, Tangent Normal, and Roughness textures
 * using the exact (u, v) coordinate mapping of buildSculptedHeadGeometry.
 */
function createFaceTextures(rings, female) {
  const W = 1024, H = 512;
  const colCanvas = document.createElement("canvas");
  const normCanvas = document.createElement("canvas");
  const roughCanvas = document.createElement("canvas");
  colCanvas.width = normCanvas.width = roughCanvas.width = W;
  colCanvas.height = normCanvas.height = roughCanvas.height = H;

  const colCtx = colCanvas.getContext("2d");
  const normCtx = normCanvas.getContext("2d");
  const roughCtx = roughCanvas.getContext("2d");

  const colImg = colCtx.createImageData(W, H);
  const roughImg = roughCtx.createImageData(W, H);
  const hMap = new Float32Array(W * H);

  const base = new THREE.Color(SKIN_TONE);
  const srgb = new THREE.Color();
  base.getRGB(srgb, THREE.SRGBColorSpace);
  const baseR = srgb.r * 255, baseG = srgb.g * 255, baseB = srgb.b * 255;

  for (let py = 0; py < H; py++) {
    const v = 1 - py / (H - 1);
    const y = Y_MIN + v * Y_SPAN;
    const ring = ringAt(rings, y);
    const e = 2 / ring.n;

    for (let px = 0; px < W; px++) {
      const u = px / (W - 1);
      const ang = (u - 0.5) * Math.PI * 2;
      const s = Math.sin(ang);
      const c = Math.cos(ang);
      const x = ring.cx - ring.rx * Math.sign(s) * Math.abs(s) ** e;
      const ax = Math.abs(x);
      const front = smoothstep(0.05, 0.55, c);

      let r = baseR, g = baseG, b = baseB;
      let rough = 0.56;
      let height = 0.5;

      // Micro-skin tonal variation & pores
      const pore = hash2(px * 0.7, py * 0.7) * 0.6 + hash2(px * 0.25, py * 0.25) * 0.4;
      const toneShift = (pore - 0.5) * 7;
      r += toneShift; g += toneShift * 0.85; b += toneShift * 0.75;
      height += (pore - 0.5) * 0.08 * (0.5 + 0.5 * front);

      if (front > 0) {
        // Warm vascular flush on nose, upper cheeks, and ears (very natural, never clown-pink)
        const cheek = G(ax - 0.044, y - 1.616, 0.026, 0.022) * front;
        const noseWarm = G(x, y - 1.622, 0.016, 0.020) * front;
        const warm = Math.min(1, cheek * 0.42 + noseWarm * 0.55);
        r += warm * 14; g -= warm * 4; b -= warm * 7;

        // Ambient occlusion in eye sockets, under brows, alar creases, mouth & under chin
        const eyeDist = G(ax - 0.0315, y - 1.653, 0.017, 0.0115) * front;
        const lidCrease = Math.exp(-(((y - 1.660) / 0.0022) ** 2)) * smoothstep(0.016, 0.005, Math.abs(ax - 0.0315)) * front;
        const upperLash = Math.exp(-(((y - 1.6565) / 0.0014) ** 2)) * smoothstep(0.013, 0.004, Math.abs(ax - 0.0315)) * front;
        const nostrilAO = G(ax - 0.0065, y - 1.610, 0.0042, 0.0035) * front;
        const alarCrease = G(ax - 0.0145, y - 1.616, 0.0032, 0.006) * front;
        const underNose = G(x, y - 1.608, 0.011, 0.004) * front;
        const underJaw = smoothstep(1.542, 1.515, y) * smoothstep(0.085, 0.01, ax) * smoothstep(0.2, 0.7, c);

        const ao = Math.min(0.68, eyeDist * 0.22 + lidCrease * 0.25 + upperLash * 0.52 + nostrilAO * 0.65 + alarCrease * 0.16 + underNose * 0.22 + underJaw * 0.26);
        r *= 1 - ao * 0.55;
        g *= 1 - ao * 0.62;
        b *= 1 - ao * 0.65;

        // Natural lip pigment & vertical micro-lines
        const lipSpan = smoothstep(0.024, 0.015, ax);
        const upperLip = Math.exp(-(((y - (1.582 + 0.002 * Math.cos(clamp(x / 0.007, -1, 1) * Math.PI))) / 0.0048) ** 2)) * lipSpan * front;
        const lowerLip = Math.exp(-(((y - 1.568) / 0.0056) ** 2)) * smoothstep(0.021, 0.012, ax) * front;
        const lipMask = Math.min(1, upperLip + lowerLip);
        if (lipMask > 0.02) {
          const lipR = female ? 174 : 162, lipG = female ? 96 : 104, lipB = female ? 96 : 98;
          r = lerp(r, lipR, lipMask * 0.62);
          g = lerp(g, lipG, lipMask * 0.62);
          b = lerp(b, lipB, lipMask * 0.62);
          rough = lerp(rough, 0.36, lipMask * 0.7);
          height += Math.sin(x * 750) * 0.035 * lipMask;
        }
        // Darkened mouth seam
        const seam = Math.exp(-(((y - 1.5758) / 0.0014) ** 2)) * smoothstep(0.022, 0.014, ax) * front;
        r *= 1 - seam * 0.62; g *= 1 - seam * 0.68; b *= 1 - seam * 0.7;

        // Subtle skin oil specular zones (nose bridge/tip, forehead, cheekbones)
        const tZone = (G(x, y - 1.635, 0.010, 0.024) + G(x, y - 1.70, 0.034, 0.018) * 0.7 + cheek * 0.6) * front;
        rough = lerp(rough, 0.38, Math.min(1, tZone));

        // Layered natural eyebrow hairs painted directly onto the brow ridge
        const browPathY = 1.675 + 0.004 * Math.sin(clamp((ax - 0.013) / 0.036, 0, 1) * Math.PI) - 0.003 * clamp((ax - 0.013) / 0.036, 0, 1);
        if (ax > 0.011 && ax < 0.052 && Math.abs(y - browPathY) < 0.009) {
          const browMask = smoothstep(0.011, 0.017, ax) * smoothstep(0.052, 0.042, ax) * Math.exp(-(((y - browPathY) / (female ? 0.0030 : 0.0042)) ** 2)) * front;
          const hairStrands = 0.55 + 0.45 * Math.sin(px * 1.9 + py * 0.8 + hash2(px, py) * 2.0);
          const bAlpha = clamp(browMask * hairStrands * (female ? 0.78 : 0.88), 0, 0.9);
          r = lerp(r, 38, bAlpha); g = lerp(g, 25, bAlpha); b = lerp(b, 18, bAlpha);
          height += bAlpha * 0.14;
          rough = lerp(rough, 0.75, bAlpha);
        }

        // Subtle male facial stubble shadow along jaw, chin, and upper lip (massive realism boost)
        if (!female) {
          const jawZone = smoothstep(1.608, 1.585, y) * smoothstep(1.526, 1.545, y) * smoothstep(0.072, 0.045, ax) * (1 - G(x, y - 1.576, 0.026, 0.014));
          const stacheZone = G(x, y - 1.592, 0.020, 0.007) * (1 - G(x, y - 1.582, 0.022, 0.005));
          const beardMask = Math.min(1, (jawZone + stacheZone * 0.8) * front);
          if (beardMask > 0.05) {
            const follicle = hash2(px * 1.15, py * 1.15) > 0.62 ? 1 : 0.3;
            const stubble = beardMask * follicle * 0.24;
            r = lerp(r, 58, stubble); g = lerp(g, 46, stubble); b = lerp(b, 42, stubble);
            height += stubble * 0.12;
            rough = lerp(rough, 0.72, stubble);
          }
        }
      }

      // Soft scalp darkening under hairline so hair transition has zero hard seam
      const hairlineY = 1.698 - 0.012 * Math.min((ax / 0.082) ** 2, 1.5);
      const scalpFade = (c > 0.05 ? smoothstep(hairlineY - 0.006, hairlineY + 0.016, y) : smoothstep(1.585, 1.62, y));
      if (scalpFade > 0) {
        const sAlpha = scalpFade * 0.65;
        r = lerp(r, 42, sAlpha); g = lerp(g, 28, sAlpha); b = lerp(b, 20, sAlpha);
      }

      const idx = (py * W + px) * 4;
      colImg.data[idx] = clamp(Math.round(r), 0, 255);
      colImg.data[idx + 1] = clamp(Math.round(g), 0, 255);
      colImg.data[idx + 2] = clamp(Math.round(b), 0, 255);
      colImg.data[idx + 3] = 255;

      const rv = clamp(Math.round(rough * 255), 0, 255);
      roughImg.data[idx] = roughImg.data[idx + 1] = roughImg.data[idx + 2] = rv;
      roughImg.data[idx + 3] = 255;

      hMap[py * W + px] = height;
    }
  }

  colCtx.putImageData(colImg, 0, 0);
  roughCtx.putImageData(roughImg, 0, 0);

  // Sobel filter on hMap -> tangent-space Normal Map
  const normImg = normCtx.createImageData(W, H);
  const strength = 2.4;
  for (let py = 0; py < H; py++) {
    const ym = Math.max(0, py - 1), yp = Math.min(H - 1, py + 1);
    for (let px = 0; px < W; px++) {
      const xm = (px - 1 + W) % W, xp = (px + 1) % W;
      const dx = (hMap[py * W + xp] - hMap[py * W + xm]) * strength;
      const dy = (hMap[yp * W + px] - hMap[ym * W + px]) * strength;
      const len = Math.hypot(-dx, dy, 1) || 1;
      const idx = (py * W + px) * 4;
      normImg.data[idx] = clamp(Math.round(((-dx / len) * 0.5 + 0.5) * 255), 0, 255);
      normImg.data[idx + 1] = clamp(Math.round(((dy / len) * 0.5 + 0.5) * 255), 0, 255);
      normImg.data[idx + 2] = clamp(Math.round(((1 / len) * 0.5 + 0.5) * 255), 0, 255);
      normImg.data[idx + 3] = 255;
    }
  }
  normCtx.putImageData(normImg, 0, 0);

  const map = new THREE.CanvasTexture(colCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const normalMap = new THREE.CanvasTexture(normCanvas);
  normalMap.anisotropy = 4;
  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.anisotropy = 4;
  return { map, normalMap, roughnessMap };
}

/**
 * Generates a realistic radial-fiber iris + warm AO-shaded sclera texture
 * mapped around the front pole (+Z) of an eyeball sphere.
 */
function createEyeTexture() {
  const S = 512;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d");

  // Warm off-white sclera with edge shadow (never flat cartoon white)
  const bg = g.createRadialGradient(S / 2, S / 2, S * 0.14, S / 2, S / 2, S * 0.5);
  bg.addColorStop(0, "#f2ede6");
  bg.addColorStop(0.55, "#e6ddd3");
  bg.addColorStop(0.85, "#cdb9ad");
  bg.addColorStop(1, "#a78577");
  g.fillStyle = bg;
  g.fillRect(0, 0, S, S);

  // Subtle sclera veins near periphery
  g.strokeStyle = "rgba(180, 95, 90, 0.18)";
  g.lineWidth = 1.2;
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + hash2(i, 3) * 0.3;
    const r0 = S * 0.25, r1 = S * 0.45;
    g.beginPath();
    g.moveTo(S / 2 + Math.cos(a) * r0, S / 2 + Math.sin(a) * r0);
    g.quadraticCurveTo(
      S / 2 + Math.cos(a + 0.12) * (r0 + r1) * 0.5,
      S / 2 + Math.sin(a + 0.12) * (r0 + r1) * 0.5,
      S / 2 + Math.cos(a - 0.05) * r1,
      S / 2 + Math.sin(a - 0.05) * r1
    );
    g.stroke();
  }

  // Iris base + limbal ring
  const irisR = S * 0.205;
  const irisGrad = g.createRadialGradient(S / 2, S / 2, S * 0.06, S / 2, S / 2, irisR);
  irisGrad.addColorStop(0, "#754c29");
  irisGrad.addColorStop(0.45, "#59371c");
  irisGrad.addColorStop(0.84, "#3b2312");
  irisGrad.addColorStop(1, "#1e120a");
  g.fillStyle = irisGrad;
  g.beginPath();
  g.arc(S / 2, S / 2, irisR, 0, Math.PI * 2);
  g.fill();

  // Radial iris fibers
  for (let i = 0; i < 240; i++) {
    const a = (i / 240) * Math.PI * 2;
    const bright = hash2(i, 11) > 0.5;
    g.strokeStyle = bright ? "rgba(175, 125, 72, 0.28)" : "rgba(32, 18, 9, 0.32)";
    g.lineWidth = 1.1;
    g.beginPath();
    g.moveTo(S / 2 + Math.cos(a) * (S * 0.078), S / 2 + Math.sin(a) * (S * 0.078));
    g.lineTo(S / 2 + Math.cos(a) * (irisR * 0.94), S / 2 + Math.sin(a) * (irisR * 0.94));
    g.stroke();
  }

  // Crisp dark pupil
  g.fillStyle = "#08080a";
  g.beginPath();
  g.arc(S / 2, S / 2, S * 0.078, 0, Math.PI * 2);
  g.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Planar-UV sphere projecting the eye texture straight onto the +Z pole of the eyeball. */
function buildFrontProjectedEyeGeo(radius) {
  const geo = new THREE.SphereGeometry(radius, 28, 22);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const u = 0.5 + (x / (radius * 1.35)) * 0.5;
    const v = 0.5 + (y / (radius * 1.35)) * 0.5;
    uv.setXY(i, z >= -radius * 0.2 ? clamp(u, 0.02, 0.98) : 0.05, z >= -radius * 0.2 ? clamp(v, 0.02, 0.98) : 0.05);
  }
  return geo;
}

/** Alpha mask for smooth feathered hairline around forehead, temples, and nape (no jagged quad holes). */
function createHairAlphaTexture(rings, female) {
  const W = 512, H = 256;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(W, H);

  for (let py = 0; py < H; py++) {
    const v = 1 - py / (H - 1);
    const y = Y_MIN + v * Y_SPAN;
    const ring = ringAt(rings, y);
    const e = 2 / ring.n;
    for (let px = 0; px < W; px++) {
      const u = px / (W - 1);
      const ang = (u - 0.5) * Math.PI * 2;
      const s = Math.sin(ang), cos = Math.cos(ang);
      const x = ring.cx - ring.rx * Math.sign(s) * Math.abs(s) ** e;
      const ax = Math.abs(x);

      let alpha = 1;
      if (!female) {
        const hairlineY = 1.698 - 0.014 * Math.min((ax / 0.08) ** 2, 1.4);
        const templeCut = cos > -0.15 ? smoothstep(1.622, 1.652, y) : smoothstep(1.585, 1.615, y);
        const frontCut = cos > 0.12 ? smoothstep(hairlineY - 0.005, hairlineY + 0.009, y) : 1;
        const earCut = ax > 0.072 && cos > -0.18 && cos < 0.22 ? smoothstep(1.648, 1.668, y) : 1;
        const strandJitter = 0.8 + 0.2 * Math.sin(px * 2.2 + hash2(px, py) * 1.5);
        alpha = frontCut * templeCut * earCut * strandJitter;
      } else {
        const hairlineY = 1.710 - 0.018 * Math.min((ax / 0.088) ** 2, 1.3);
        const frontCut = cos > 0.1 ? smoothstep(hairlineY - 0.005, hairlineY + 0.01, y) : 1;
        alpha = frontCut;
      }
      const val = clamp(Math.round(alpha * 255), 0, 255);
      const idx = (py * W + px) * 4;
      img.data[idx] = img.data[idx + 1] = img.data[idx + 2] = val;
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}

/** Sculpted anatomical head, eyes, ears, and hair. Built in body coordinates; caller pivots at neck. */
export function createHead(mats, { female }) {
  const g = new THREE.Group();
  const geos = [];
  const localMats = [];
  const textures = [];
  const clip = mats.skin.clippingPlanes;

  const rings = headRings(female);
  const headGeo = buildSculptedHeadGeometry(rings, female);
  geos.push(headGeo);

  const faceMaps = createFaceTextures(rings, female);
  textures.push(faceMaps.map, faceMaps.normalMap, faceMaps.roughnessMap);

  const headMat = new THREE.MeshPhysicalMaterial({
    clippingPlanes: clip,
    clipShadows: true,
    map: faceMaps.map,
    normalMap: faceMaps.normalMap,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughnessMap: faceMaps.roughnessMap,
    roughness: 1.0,
    sheen: 0.18,
    sheenRoughness: 0.65,
    sheenColor: new THREE.Color("#f0b09a"),
    clearcoat: 0.05,
    clearcoatRoughness: 0.48,
  });
  localMats.push(headMat);

  const headMesh = new THREE.Mesh(headGeo, headMat);
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  g.add(headMesh);

  // Photorealistic eyeballs nestled inside the sculpted orbital sockets
  const eyeTex = createEyeTexture();
  textures.push(eyeTex);
  const eyeMat = new THREE.MeshPhysicalMaterial({
    clippingPlanes: clip,
    clipShadows: true,
    map: eyeTex,
    roughness: 0.18,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
  });
  localMats.push(eyeMat);

  const eyeGeo = buildFrontProjectedEyeGeo(0.0114);
  geos.push(eyeGeo);
  const eyeRing = ringAt(rings, 1.653);
  for (const s of [-1, 1]) {
    const x = s * 0.0315;
    const u = clamp(x / eyeRing.rx, -1, 1);
    const baseZ = eyeRing.cz + eyeRing.rz * Math.pow(1 - Math.pow(Math.abs(u), eyeRing.n), 1 / eyeRing.n);
    const eyeZ = baseZ - 0.0160; // recessed inside socket so eyelids wrap naturally around eye
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(x, 1.653, eyeZ);
    eye.scale.set(1.0, 0.92, 0.88);
    g.add(eye);
  }

  // Sculpted ears (outer helix rim + concha hollow + lobe)
  const w = female ? 0.93 : 1.0;
  const earBackMat = new THREE.MeshStandardMaterial({
    clippingPlanes: clip,
    clipShadows: true,
    color: "#9a664c",
    roughness: 0.72,
  });
  localMats.push(earBackMat);

  for (const s of [-1, 1]) {
    const earGroup = new THREE.Group();
    const helixCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.008, 0.008),
      new THREE.Vector3(s * 0.004, 0.022, 0.003),
      new THREE.Vector3(s * 0.006, 0.018, -0.011),
      new THREE.Vector3(s * 0.004, -0.004, -0.013),
      new THREE.Vector3(s * 0.002, -0.020, -0.006),
      new THREE.Vector3(0, -0.016, 0.004),
    ]);
    const helixGeo = new THREE.TubeGeometry(helixCurve, 20, 0.0038, 10, false);
    const lobeGeo = new THREE.SphereGeometry(0.014, 16, 12);
    const conchaGeo = new THREE.SphereGeometry(0.010, 12, 10);
    geos.push(helixGeo, lobeGeo, conchaGeo);

    const helix = new THREE.Mesh(helixGeo, mats.skin);
    const lobe = new THREE.Mesh(lobeGeo, mats.skin);
    lobe.scale.set(0.28, 1.15, 0.72);
    lobe.position.set(s * 0.001, -0.001, -0.002);
    const concha = new THREE.Mesh(conchaGeo, earBackMat);
    concha.scale.set(0.22, 0.85, 0.65);
    concha.position.set(s * 0.0025, 0.001, -0.003);

    [helix, lobe, concha].forEach((m) => { m.castShadow = true; earGroup.add(m); });
    earGroup.position.set(s * 0.088 * w, 1.635, -0.012);
    earGroup.rotation.y = s * -0.24;
    earGroup.rotation.z = s * -0.10;
    g.add(earGroup);
  }

  // Natural feathered hair cap + sculpted layered top hair strands (no Lego gap)
  const hairAlpha = createHairAlphaTexture(rings, female);
  textures.push(hairAlpha);
  const hairShellMat = new THREE.MeshPhysicalMaterial({
    clippingPlanes: clip,
    clipShadows: true,
    color: female ? "#331e13" : "#22160f",
    roughness: 0.48,
    alphaMap: hairAlpha,
    transparent: true,
    alphaTest: 0.25,
    bumpMap: mats.hair.bumpMap,
    bumpScale: 0.004,
    sheen: 0.25,
    sheenRoughness: 0.45,
    sheenColor: new THREE.Color("#6a5244"),
  });
  localMats.push(hairShellMat);

  const hairCapRings = rings
    .filter((r) => r.y > 1.582)
    .map((r) => {
      const thick = 0.0025 + 0.0075 * smoothstep(1.582, 1.68, r.y);
      return { ...r, rx: r.rx + thick, rz: r.rz + thick };
    });
  const hairGeo = buildSculptedHeadGeometry(hairCapRings, female);
  geos.push(hairGeo);
  const hairMesh = new THREE.Mesh(hairGeo, hairShellMat);
  hairMesh.castShadow = true;
  g.add(hairMesh);

  if (!female) {
    // Soft sculpted top locks for natural hairline volume (no spherical ball)
    for (let i = -3; i <= 3; i++) {
      const t = i / 3;
      const x = t * 0.056;
      const z0 = 0.048 - Math.abs(t) * 0.025;
      const lockCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x * 0.7, 1.758 - Math.abs(t) * 0.012, -0.045),
        new THREE.Vector3(x * 0.9, 1.766 - Math.abs(t) * 0.014, 0.008),
        new THREE.Vector3(x * 0.95 + 0.008, 1.740 - Math.abs(t) * 0.012, z0 + 0.022),
      ]);
      const lockGeo = new THREE.TubeGeometry(lockCurve, 18, 0.016 - Math.abs(t) * 0.003, 10, false);
      lockGeo.scale(1.15, 0.55, 1.0);
      geos.push(lockGeo);
      const lockMesh = new THREE.Mesh(lockGeo, mats.hair);
      lockMesh.castShadow = true;
      g.add(lockMesh);
    }
  } else {
    const longRings = sampleRings([
      [1.22, 0.068, 0.038, 0, -0.076, 2],
      [1.34, 0.104 * w, 0.068, 0, -0.072, 2.1],
      [1.48, 0.114 * w, 0.088, 0, -0.052, 2.1],
      [1.59, 0.108 * w, 0.098, 0, -0.026, 2.1],
      [1.68, 0.098 * w, 0.106, 0, -0.012, 2.15],
      [1.75, 0.068 * w, 0.078, 0, -0.008, 2.1],
    ], 48);
    // Keep long hair behind the face using back-half sweep
    const longGeo = buildSculptedHeadGeometry(longRings, female);
    const pos = longGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getZ(i) > 0.005 && pos.getY(i) < 1.71) {
        pos.setZ(i, 0.005 - Math.abs(pos.getX(i)) * 0.25);
      }
    }
    longGeo.computeVertexNormals();
    geos.push(longGeo);
    const longMesh = new THREE.Mesh(longGeo, mats.hair);
    longMesh.castShadow = true;
    g.add(longMesh);
  }

  return {
    group: g,
    dispose() {
      geos.forEach((x) => x.dispose());
      localMats.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
