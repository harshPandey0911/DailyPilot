import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/** Bright studio rig for a light page: image-based reflections, key/fill/rim and a soft floor shadow. */
export function createLighting(scene, renderer, { mobile }) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const env = pmrem.fromScene(room, 0.04);
  scene.environment = env.texture;
  scene.environmentIntensity = 0.38;

  const hemi = new THREE.HemisphereLight(0xffffff, 0xcfd8c0, 0.45);
  const key = new THREE.DirectionalLight(0xfff1e0, 2.1);
  key.position.set(1.8, 5.2, 3.0);
  key.castShadow = true;
  key.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2.2, bottom: -2, near: 0.5, far: 10 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 5;
  const fill = new THREE.DirectionalLight(0xe6f0ff, 0.55);
  fill.position.set(-3, 1.8, 2.2);
  const rim = new THREE.DirectionalLight(0xdff5a0, 1.5);
  rim.position.set(-1.5, 2.6, -3.2);
  scene.add(hemi, key, fill, rim);

  // transparent floor that only shows the avatar's shadow
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ opacity: 0.2 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.0015;
  floor.receiveShadow = true;
  scene.add(floor);

  return {
    dispose() {
      floor.geometry.dispose(); floor.material.dispose();
      key.shadow.map?.dispose();
      env.dispose(); room.dispose(); pmrem.dispose();
    },
  };
}
