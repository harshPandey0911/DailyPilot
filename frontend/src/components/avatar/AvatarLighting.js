import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/** Natural photographic portrait & studio rig: neutral reflections, key/fill/rim and soft floor shadow. */
export function createLighting(scene, renderer, { mobile }) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const env = pmrem.fromScene(room, 0.04);
  scene.environment = env.texture;
  scene.environmentIntensity = 0.42;

  const hemi = new THREE.HemisphereLight(0xfdfbf8, 0xd8cec4, 0.58);
  const key = new THREE.DirectionalLight(0xfff1e2, 2.05);
  key.position.set(2.1, 4.0, 3.2);
  key.castShadow = true;
  key.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2.2, bottom: -2, near: 0.5, far: 10 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 5;
  const fill = new THREE.DirectionalLight(0xeef3fc, 0.72);
  fill.position.set(-2.8, 1.9, 2.4);
  const rim = new THREE.DirectionalLight(0xf4f6fb, 0.78);
  rim.position.set(-1.4, 2.5, -3.0);
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
