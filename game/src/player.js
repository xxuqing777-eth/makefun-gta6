import * as THREE from 'three';

export function createPlayer(scene, camera, colliders) {
  const model = new THREE.Group();
  model.name = 'Jax Moreno';
  const position = new THREE.Vector3(144, 0.4, 80);
  const limbs = [];
  function part(color, size, offset) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshStandardMaterial({ color }));
    mesh.position.set(...offset);
    mesh.castShadow = true;
    model.add(mesh);
    return mesh;
  }
  part(0x236d70, [0.65, 0.7, 0.36], [0, 1.25, 0]);
  part(0xc48d64, [0.36, 0.4, 0.36], [0, 1.83, 0]);
  part(0x302a29, [0.39, 0.13, 0.38], [0, 2.02, 0]);
  for (const side of [-1, 1]) {
    limbs.push(part(0x243b48, [0.25, 0.75, 0.3], [side * 0.18, 0.48, 0]));
    limbs.push(part(0xc48d64, [0.19, 0.65, 0.22], [side * 0.44, 1.22, 0]));
    part(0xeee5d1, [0.27, 0.16, 0.42], [side * 0.18, 0.1, -0.06]);
  }
  scene.add(model);
  const keys = new Set();
  const state = { position, yaw: 0, pitch: 0.2, speed: 0, health: 100, money: 0, wanted: 0 };
  let verticalSpeed = 0;
  let stride = 0;
  const target = new THREE.Vector3();
  const desired = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const hit = new THREE.Vector3();
  const ray = new THREE.Ray();

  function blocked(positionX, positionZ) {
    return colliders.some(bounds => positionX > bounds.min.x - 0.4 && positionX < bounds.max.x + 0.4
      && positionZ > bounds.min.z - 0.4 && positionZ < bounds.max.z + 0.4);
  }
  function look(movementX, movementY) {
    state.yaw -= movementX * 0.0025;
    state.pitch = THREE.MathUtils.clamp(state.pitch + movementY * 0.0025, -0.2, 0.95);
  }
  function update(delta, active) {
    let forward = active ? Number(keys.has('KeyW')) - Number(keys.has('KeyS')) : 0;
    let sideways = active ? Number(keys.has('KeyD')) - Number(keys.has('KeyA')) : 0;
    const length = Math.hypot(forward, sideways);
    const pace = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 9 : 4.5;
    const previousX = position.x;
    const previousZ = position.z;
    if (length) {
      forward /= length;
      sideways /= length;
      const velocityX = (sideways * Math.cos(state.yaw) - forward * Math.sin(state.yaw)) * pace;
      const velocityZ = (-forward * Math.cos(state.yaw) - sideways * Math.sin(state.yaw)) * pace;
      const nextX = THREE.MathUtils.clamp(position.x + velocityX * delta, -174, 211);
      const nextZ = THREE.MathUtils.clamp(position.z + velocityZ * delta, -178, 178);
      if (!blocked(nextX, position.z)) position.x = nextX;
      if (!blocked(position.x, nextZ)) position.z = nextZ;
      model.rotation.y = Math.atan2(-velocityX, -velocityZ);
    }
    state.speed = delta ? Math.hypot(position.x - previousX, position.z - previousZ) / delta : 0;
    if (active) {
      if (keys.has('Space') && position.y <= 0.4) { verticalSpeed = 6; keys.delete('Space'); }
      verticalSpeed -= 18 * delta;
      position.y = Math.max(0.4, position.y + verticalSpeed * delta);
      if (position.y === 0.4) verticalSpeed = 0;
    }
    stride += state.speed * delta * 2;
    limbs.forEach((limb, index) => { limb.rotation.x = state.speed > 0.1 ? Math.sin(stride + (index < 2 ? 0 : Math.PI)) * (index % 2 ? -0.5 : 0.6) : 0; });
    model.position.copy(position);
    target.copy(position).add(new THREE.Vector3(0, 1.5, 0));
    desired.set(Math.sin(state.yaw) * Math.cos(state.pitch), Math.sin(state.pitch), Math.cos(state.yaw) * Math.cos(state.pitch));
    direction.copy(desired).normalize();
    ray.set(target, direction);
    let distance = 6;
    for (const bounds of colliders) {
      if (ray.intersectBox(bounds, hit)) distance = Math.min(distance, Math.max(0.5, target.distanceTo(hit) - 0.35));
    }
    camera.position.copy(target).addScaledVector(direction, distance);
    camera.lookAt(target);
    model.visible = distance > 1;
  }
  return { state, keys, look, update, blocked, model };
}
