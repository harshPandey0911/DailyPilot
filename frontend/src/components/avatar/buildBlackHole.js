import * as THREE from "three";

/**
 * A soft, light black hole for a white background: translucent charcoal core,
 * swirling lime/olive accretion ring and a few orbiting specks (normal blending, not additive).
 */
const vertex = /* glsl */ `
  varying vec2 vP;
  void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const fragment = /* glsl */ `
  uniform float uTime; uniform float uOpacity; uniform float uInner; uniform float uOuter;
  varying vec2 vP;
  void main() {
    float r = length(vP);
    float t = clamp((r - uInner) / (uOuter - uInner), 0.0, 1.0);
    float a = atan(vP.y, vP.x);
    float swirl = 0.5 + 0.5 * sin(a * 3.0 - uTime * 2.2 + t * 14.0);
    float swirl2 = 0.5 + 0.5 * sin(a * 7.0 + uTime * 1.3 - t * 22.0);
    vec3 lime = vec3(0.784, 0.918, 0.369);
    vec3 deep = vec3(0.30, 0.42, 0.13);
    vec3 col = mix(lime, deep, swirl2 * (1.0 - t) * 0.85);
    float alpha = smoothstep(0.0, 0.12, t) * pow(1.0 - t, 1.5) * (0.28 + 0.6 * swirl) * uOpacity;
    gl_FragColor = vec4(col, alpha);
  }
`;

function coreTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(16,21,18,0.92)");
  grad.addColorStop(0.62, "rgba(16,21,18,0.86)");
  grad.addColorStop(1, "rgba(16,21,18,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export function buildBlackHole() {
  const group = new THREE.Group();
  const inner = 0.46;
  const outer = 1.45;

  const coreTex = coreTexture();
  const coreMat = new THREE.MeshBasicMaterial({ map: coreTex, transparent: true, depthWrite: false });
  const core = new THREE.Mesh(new THREE.CircleGeometry(inner + 0.3, 64), coreMat);
  core.rotation.x = -Math.PI / 2;
  core.position.y = 0.002;

  const diskMat = new THREE.ShaderMaterial({
    vertexShader: vertex, fragmentShader: fragment, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 }, uInner: { value: inner }, uOuter: { value: outer } },
  });
  const disk = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 96, 1), diskMat);
  disk.rotation.x = -Math.PI / 2;
  disk.position.y = 0.003;

  const N = 200;
  const pos = new Float32Array(N * 3);
  const state = Array.from({ length: N }, () => ({ a: Math.random() * Math.PI * 2, r: inner + Math.random() * (outer + 0.3 - inner), s: 0.4 + Math.random() * 0.8 }));
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pMat = new THREE.PointsMaterial({ color: 0x7a9e26, size: 0.03, transparent: true, opacity: 0.7, depthWrite: false });
  group.add(core, disk, new THREE.Points(pGeo, pMat));

  function update(time, dt, opacity) {
    diskMat.uniforms.uTime.value = time;
    diskMat.uniforms.uOpacity.value = opacity;
    coreMat.opacity = opacity;
    pMat.opacity = 0.7 * opacity;
    for (let i = 0; i < N; i++) {
      const p = state[i];
      p.a += (dt * p.s * 1.6) / Math.max(p.r, 0.4);
      p.r -= dt * 0.16 * p.s;
      if (p.r < inner) { p.r = outer + 0.3; p.a = Math.random() * Math.PI * 2; }
      pos[i * 3] = Math.cos(p.a) * p.r;
      pos[i * 3 + 1] = 0.02 + Math.sin(time * 2 + i) * 0.012;
      pos[i * 3 + 2] = Math.sin(p.a) * p.r;
    }
    pGeo.attributes.position.needsUpdate = true;
  }

  return {
    group, update,
    dispose() {
      core.geometry.dispose(); coreMat.dispose(); coreTex.dispose();
      disk.geometry.dispose(); diskMat.dispose(); pGeo.dispose(); pMat.dispose();
    },
  };
}
