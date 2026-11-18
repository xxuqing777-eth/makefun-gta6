import * as THREE from 'three';
import { CITY } from './config.js';

export function createCity() {
  const city = new THREE.Group();
  city.name = 'Solmaris';
  city.userData.colliders = [];
  function obstacle(positionX, positionZ, width, depth, height) {
    city.userData.colliders.push(new THREE.Box3(
      new THREE.Vector3(positionX - width / 2, 0, positionZ - depth / 2),
      new THREE.Vector3(positionX + width / 2, height, positionZ + depth / 2)));
  }
  const batches = new Map();
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const trunkGeometry = new THREE.CylinderGeometry(0.65, 1, 1, 7);
  const leafGeometry = new THREE.SphereGeometry(1, 7, 4);
  const umbrellaGeometry = new THREE.ConeGeometry(1, 0.42, 10);
  let seed = CITY.seed;

  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  function place(geometry, color, position, scale, rotation = [0, 0, 0]) {
    const key = `${geometry.uuid}:${color}`;
    if (!batches.has(key)) batches.set(key, { geometry, color, transforms: [] });
    const transform = new THREE.Object3D();
    transform.position.set(...position);
    transform.scale.set(...scale);
    transform.rotation.set(...rotation);
    transform.updateMatrix();
    batches.get(key).transforms.push(transform.matrix.clone());
  }

  function box(color, position, scale, rotation) {
    place(boxGeometry, color, position, scale, rotation);
  }

  function palm(positionX, positionZ, height = 11) {
    obstacle(positionX, positionZ, 1, 1, height);
    place(trunkGeometry, 0x937459, [positionX, height / 2, positionZ], [0.48, height, 0.48], [0, 0, -0.07]);
    for (let leaf = 0; leaf < 7; leaf++) {
      const angle = leaf * Math.PI * 2 / 7;
      place(leafGeometry, leaf % 2 ? 0x397f54 : 0x528f52,
        [positionX + Math.sin(angle) * 2, height, positionZ + Math.cos(angle) * 2],
        [0.75, 0.22, 3.8], [0.2, angle, 0]);
    }
  }

  box(0x8baf80, [-11, -0.7, 0], [350, 1, 370]);
  box(0xe6d19c, [189, -0.45, 0], [58, 0.6, 1000]);
  box(0x37aebb, [616, -0.7, 0], [800, 0.3, 1800]);
  box(0x75cfd0, [222, -0.48, 0], [15, 0.12, 1000]);
  box(0xd2e7d3, [215, -0.35, 0], [2, 0.1, 1000]);
  box(0xe9cda5, [164, 0.12, 0], [12, 0.5, 346]);
  box(0xf5e4bb, [171, 0.6, 0], [1, 1.4, 346]);
  obstacle(171, 0, 1, 346, 1.4);

  for (let road = CITY.min; road <= CITY.max; road += CITY.blockSize) {
    box(0x555d60, [road, 0.02, 0], [CITY.roadWidth, 0.12, 300]);
    box(0x555d60, [0, 0.025, road], [300, 0.12, CITY.roadWidth]);
    for (let stripe = -140; stripe < 144; stripe += 8) {
      if (Math.abs(stripe - Math.round(stripe / 48) * 48) < 9) continue;
      box(0xf1d18a, [road, 0.1, stripe], [0.3, 0.025, 3.5]);
      box(0xf1d18a, [stripe, 0.105, road], [3.5, 0.025, 0.3]);
    }
    for (let cross = CITY.min; cross <= CITY.max; cross += CITY.blockSize) {
      for (let stripe = -4; stripe <= 4; stripe += 2) {
        box(0xe6e2cb, [road + stripe, 0.11, cross + 9], [1, 0.025, 3]);
        box(0xe6e2cb, [road + 9, 0.11, cross + stripe], [3, 0.025, 1]);
      }
    }
  }

  const facades = [0xf0d9b5, 0xe9b9a6, 0x96bfc0, 0xe6d5c1, 0xf1c782, 0xd7e3d5];
  for (let blockX = -120; blockX <= 120; blockX += CITY.blockSize) {
    for (let blockZ = -120; blockZ <= 120; blockZ += CITY.blockSize) {
      box(0xc9c6b6, [blockX, 0.2, blockZ], [36, 0.4, 36]);
      if (blockX === 72 && blockZ === 24) {
        box(0x6d9c68, [blockX, 0.45, blockZ], [30, 0.1, 30]);
        box(0xdfd0b0, [blockX, 0.55, blockZ], [4, 0.1, 30]);
        box(0xe8ddc7, [blockX, 0.7, blockZ], [12, 0.5, 9]);
        box(0x56b8c3, [blockX, 1, blockZ], [10, 0.2, 7]);
        obstacle(blockX, blockZ, 12, 9, 1.1);
        for (const offset of [-11, 11]) for (const depth of [-11, 11]) palm(blockX + offset, blockZ + depth);
        continue;
      }
      for (const offsetX of [-8.5, 8.5]) {
        for (const offsetZ of [-8.5, 8.5]) {
          const positionX = blockX + offsetX;
          const positionZ = blockZ + offsetZ;
          const downtown = blockX < 35 && blockX > -90 && blockZ < 25 && blockZ > -100;
          const height = downtown ? 30 + random() * 57 : 7 + random() * (blockX > 60 ? 12 : 22);
          const width = 12 + random() * 2;
          const depth = 12 + random() * 2;
          const facade = facades[Math.floor(random() * facades.length)];
          obstacle(positionX, positionZ, width + 0.8, depth + 0.8, height + 1);
          box(facade, [positionX, height / 2 + 0.4, positionZ], [width, height, depth]);
          box(0xf2e4cb, [positionX, height + 0.6, positionZ], [width + 0.8, 0.5, depth + 0.8]);
          box(0x858e8c, [positionX + 2, height + 1.3, positionZ], [3.5, 1.2, 3]);
          for (let floor = 3; floor < height - 1; floor += 3.8) {
            box(0x477784, [positionX, floor, positionZ + depth / 2 + 0.02], [width - 2, 1.6, 0.08]);
            box(0x3c6d7b, [positionX + width / 2 + 0.02, floor, positionZ], [0.08, 1.6, depth - 2]);
            box(0x527b85, [positionX, floor, positionZ - depth / 2 - 0.02], [width - 2, 1.6, 0.08]);
          }
          if (!downtown) box(0xda886e, [positionX, 3, positionZ + depth / 2 + 0.9], [width, 0.25, 2.4], [0.14, 0, 0]);
        }
      }
      palm(blockX + 15, blockZ + 15, 9 + random() * 3);
      box(0x354c50, [blockX - 15, 3.9, blockZ + 16], [0.24, 7, 0.24]);
      box(0xfbe5a8, [blockX - 14, 7.4, blockZ + 16], [2.4, 0.3, 0.9]);
      box(0x825c43, [blockX + 4, 0.9, blockZ + 16], [3, 0.3, 0.9]);
      obstacle(blockX + 4, blockZ + 16, 3, 1.2, 1.8);
      box(0x825c43, [blockX + 4, 1.4, blockZ + 16.5], [3, 0.8, 0.2]);
      box(0x376f69, [blockX - 4, 0.9, blockZ + 16], [0.9, 1.4, 0.9]);
    }
  }

  for (let depth = -155; depth <= 160; depth += 18) {
    palm(165, depth, 12 + random() * 2);
    box(0xeee4ca, [170, 1.45, depth], [0.3, 1.8, 0.3]);
    const beachX = 188 + random() * 10;
    place(umbrellaGeometry, depth % 36 === 7 ? 0xe98370 : 0xf4e5b5, [beachX, 3.1, depth], [3.2, 3.2, 3.2]);
    box(0xa18463, [beachX, 1.4, depth], [0.12, 2.8, 0.12]);
    box(0xf5eee0, [beachX + 2.5, 0.3, depth + 2], [1.2, 0.25, 3]);
  }

  box(0xaf8b65, [207, 1, -90], [74, 1, 8]);
  for (let support = 178; support < 245; support += 10) {
    box(0x6e6654, [support, 0, -93], [0.7, 4, 0.7]);
    box(0x6e6654, [support, 0, -87], [0.7, 4, 0.7]);
    box(0xf2dfbe, [support, 2, -93.5], [0.2, 2, 0.2]);
    box(0xf2dfbe, [support, 2, -86.5], [0.2, 2, 0.2]);
  }
  box(0xf2dfbe, [207, 3, -93.5], [74, 0.18, 0.18]);
  box(0xf2dfbe, [207, 3, -86.5], [74, 0.18, 0.18]);

  for (const { geometry, color, transforms } of batches.values()) {
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.86 });
    const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
    transforms.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    city.add(mesh);
  }
  return city;
}
