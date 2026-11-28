import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { buildAvatar } from "./buildAvatar.js";
import { cc0AvatarExists, glbExists, loadCc0Avatar, loadGlbAvatar } from "./glbAvatar.js";
import { buildBlackHole } from "./buildBlackHole.js";
import { createLighting } from "./AvatarLighting.js";
import { createControls } from "./AvatarControls.js";

// Timeline (seconds)
const HOLE_IN = 1.1;
const RISE_START = 0.9;
const RISE_END = 3.6;
const SPINS = 2;
const START_Y = -1.95;
const FOV = 30;
const FILL = 0.76; // the figure occupies ~76% of the preview height

const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const easeInOut = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
const clamp01 = (n) => Math.min(1, Math.max(0, n));

/**
 * 3D avatar rising out of a black hole, then a 360° viewer (drag / pinch / auto-rotate).
 * Props: gender ("male" | "female" | "other"), heightCm, weightKg, pose, captureRef.
 */
export default function Avatar3D({ gender, heightCm, weightKg, pose = "relaxed", captureRef }) {
  const mountRef = useRef(null);
  const avatarRef = useRef(null);
  const profileRef = useRef({ gender, heightCm, weightKg });
  const poseRef = useRef(pose);
  const [failed, setFailed] = useState(false);

  // Weight / height edits ease the existing avatar instead of rebuilding the scene.
  useEffect(() => {
    profileRef.current = { gender, heightCm, weightKg };
    avatarRef.current?.setProfile(profileRef.current);
  }, [gender, heightCm, weightKg]);

  useEffect(() => {
    poseRef.current = pose;
    avatarRef.current?.setPose?.(pose);
  }, [pose]);

  useEffect(() => {
    const mount = mountRef.current;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const mobile = window.matchMedia?.("(max-width: 767px)").matches ?? false;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setFailed(true);
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.localClippingEnabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = "avatar-canvas";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 60);
    const lighting = createLighting(scene, renderer, { mobile });

    const floorClip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // hides everything under the floor
    const stage = new THREE.Group();
    scene.add(stage);

    // Prefer custom override (public/avatars/male.glb | female.glb), then built-in CC0 character, then procedural fallback.
    let avatar = null;
    let riseStart = null;
    let riseEnd = Infinity;
    let cancelled = false;
    (async () => {
      const opts = { clip: [floorClip], reduceMotion, pose: poseRef.current };
      const url = `/avatars/${profileRef.current.gender === "female" ? "female" : "male"}.glb`;
      let built = null;
      try {
        if (await glbExists(url)) built = await loadGlbAvatar(url, profileRef.current, opts);
        else if (await cc0AvatarExists()) built = await loadCc0Avatar(profileRef.current, opts);
      } catch (err) {
        console.warn("Could not load 3D avatar model - using the built-in avatar.", err);
      }
      if (!built) built = buildAvatar(profileRef.current, opts);
      if (cancelled) { built.dispose(); return; }
      built.setPose?.(poseRef.current);
      avatar = built;
      avatarRef.current = built;
      stage.add(built.root);
      // the rise starts once the model is ready (never before the black hole has opened a little)
      riseStart = reduceMotion ? -100 : Math.max(elapsed, RISE_START);
      riseEnd = riseStart + (RISE_END - RISE_START);
    })();

    const hole = buildBlackHole();
    scene.add(hole.group);

    const controls = createControls(renderer.domElement, { reduceMotion });

    let holeMax = 1;
    function resize() {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      // the black hole must fit the width at its widest
      holeMax = Math.min(1, (0.94 * (1.76 / FILL) * camera.aspect) / 2.9);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    let raf;
    let last = performance.now();
    let elapsed = reduceMotion ? RISE_END + 0.6 : 0;

    function frame(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += dt;

      const open = easeOutCubic(clamp01(elapsed / HOLE_IN));
      const settle = easeInOut(clamp01((elapsed - riseEnd) / 1.2));
      hole.group.scale.setScalar((0.05 + open * 0.95) * holeMax * (1 - settle * 0.4));
      hole.update(elapsed, dt, open * (1 - settle * 0.3));

      const rise = riseStart === null ? 0 : clamp01((elapsed - riseStart) / (RISE_END - RISE_START));
      const k = easeOutCubic(rise);
      if (avatar) {
        avatar.root.position.y = START_Y * (1 - k);
        avatar.update(elapsed, dt);
      }

      controls.update(dt, rise >= 1);
      stage.rotation.y = Math.PI * 2 * SPINS * (1 - k) + controls.yaw;

      // frame the full body; zoom scales the camera distance
      const hs = avatar ? avatar.heightScale : 1;
      const visibleH = (1.76 * hs) / FILL;
      const dist = (visibleH / (2 * Math.tan((FOV * Math.PI) / 360))) * controls.zoom;
      const focus = Math.min(1, Math.max(0, (0.9 - controls.zoom) / 0.3)); // zooming in glides up to the face
      const lookY = (0.88 + focus * 0.7) * hs;
      camera.position.set(0, lookY + 0.18, dist);
      camera.lookAt(0, lookY, 0);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    if (captureRef) {
      captureRef.current = () => {
        renderer.render(scene, camera);
        const src = renderer.domElement;
        const maxH = 768;
        const scale = src.height > maxH ? maxH / src.height : 1;
        const out = document.createElement("canvas");
        out.width = Math.max(1, Math.round(src.width * scale));
        out.height = Math.max(1, Math.round(src.height * scale));
        const ctx = out.getContext("2d");
        ctx.fillStyle = "#f7f9f5";
        ctx.fillRect(0, 0, out.width, out.height);
        ctx.drawImage(src, 0, 0, out.width, out.height);
        return out.toDataURL("image/jpeg", 0.9);
      };
    }

    return () => {
      if (captureRef) captureRef.current = null;
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      cancelled = true;
      avatarRef.current = null;
      avatar?.dispose();
      hole.dispose();
      lighting.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  if (failed) {
    return <div className="avatar-fallback" role="img" aria-label="Avatar preview unavailable on this device">3D preview isn&apos;t supported on this device.</div>;
  }
  return <div ref={mountRef} className="avatar-mount" role="img" aria-label={`3D ${gender} avatar. Drag to rotate, pinch to zoom.`} />;
}
