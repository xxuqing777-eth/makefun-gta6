import * as THREE from 'three';

export function createCarModel(color, wagon = false) {
  const model = new THREE.Group();
  const wheels = [];
  function box(tint, size, offset) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshStandardMaterial({ color: tint, roughness: 0.4 }));
    mesh.position.set(...offset);
    mesh.castShadow = true;
    model.add(mesh);
  }
  box(color, [2, 0.65, 4.3], [0, 0.85, 0]);
  box(0x203d49, [1.72, 0.65, wagon ? 2.7 : 2.1], [0, 1.48, 0.25]);
  box(color, [1.8, 0.16, wagon ? 2.85 : 2.25], [0, 1.86, 0.25]);
  box(color, [0.13, 0.72, 2.2], [0, 1.48, 0.25]);
  for (const side of [-1, 1]) {
    box(0xffedb0, [0.5, 0.23, 0.08], [side * 0.65, 0.94, -2.18]);
    box(0xd34745, [0.5, 0.23, 0.08], [side * 0.65, 0.94, 2.18]);
    box(0x24333b, [0.25, 0.2, 0.35], [side * 1.1, 1.4, -0.5]);
    for (const depth of [-1.35, 1.35]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.24, 12), new THREE.MeshStandardMaterial({ color: 0x20272c }));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * 1.03, 0.48, depth);
      model.add(wheel);
      wheels.push(wheel);
    }
  }
  box(0xb8c9cb, [1.9, 0.17, 0.12], [0, 0.6, -2.2]);
  box(0xb8c9cb, [1.9, 0.17, 0.12], [0, 0.6, 2.2]);
  model.userData.wheels = wheels;
  return model;
}
