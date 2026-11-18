import * as THREE from 'three';

export function createVisibility(colliders) {
  const ray = new THREE.Ray();
  const origin = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const hit = new THREE.Vector3();
  return function visible(from, to, height = 1.2) {
    origin.copy(from).setY(height);
    direction.copy(to).setY(height).sub(origin);
    const distance = direction.length();
    ray.set(origin, direction.normalize());
    return !colliders.some(bounds => ray.intersectBox(bounds, hit) && origin.distanceTo(hit) < distance);
  };
}
