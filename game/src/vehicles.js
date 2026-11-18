import * as THREE from 'three';
import { createCarModel } from './car-model.js';

export function createVehicles(scene, camera, player, colliders) {
  const cars = [];
  let current = null;
  let view = 1;
  let message = '';
  let messageTime = 0;
  const target = new THREE.Vector3();
  const desired = new THREE.Vector3();
  const ray = new THREE.Ray();
  const hit = new THREE.Vector3();
  function add(positionX, positionZ, yaw, color, occupied = false) {
    const model = createCarModel(color, cars.length % 3 === 1);
    model.position.set(positionX, 0.12, positionZ);
    model.rotation.y = yaw;
    scene.add(model);
    const car = { model, position: model.position, yaw, speed: 0, occupied, stolen: false, traffic: false };
    cars.push(car);
    return car;
  }
  add(147, 80, 0, 0xe6af54);
  add(141, 61, Math.PI, 0x39a6a2, true);
  add(99, 24, 0, 0xde7067);
  add(51, -65, 0, 0xeee3ca);
  function blocked(positionX, positionZ, ignore = null, radius = 2.25) {
    return Math.abs(positionX) > 149 || Math.abs(positionZ) > 149 || colliders.some(bounds =>
      positionX > bounds.min.x - radius && positionX < bounds.max.x + radius &&
      positionZ > bounds.min.z - radius && positionZ < bounds.max.z + radius) ||
      cars.some(car => car !== ignore && Math.hypot(positionX - car.position.x, positionZ - car.position.z) < radius + 1.8);
  }
  function nearest() {
    return cars.filter(car => car.position.distanceTo(player.state.position) < 4.8)
      .sort((first, second) => first.position.distanceTo(player.state.position) - second.position.distanceTo(player.state.position))[0];
  }
  function notify(text) { message = text; messageTime = 3; }
  function interact() {
    if (current) {
      if (Math.abs(current.speed) > 2) { notify('Slow down before exiting.'); return; }
      for (const side of [-1, 1]) {
        const positionX = current.position.x + Math.cos(current.yaw) * side * 3;
        const positionZ = current.position.z - Math.sin(current.yaw) * side * 3;
        if (blocked(positionX, positionZ, current, 0.45)) continue;
        player.state.position.set(positionX, 0.4, positionZ);
        player.state.yaw = current.yaw;
        current.speed = 0;
        current.occupied = false;
        current = null;
        player.state.vehicle = null;
        player.model.visible = true;
        return;
      }
      notify('Exit blocked. Move to an open stretch.');
      return;
    }
    const car = nearest();
    if (!car) return;
    if (car.police) { notify('Police vehicle locked. Keep moving.'); return; }
    if (Math.abs(car.speed) > 5) { notify('Wait for the car to slow down.'); return; }
    if (!car.stolen) {
      if (car.occupied) api.onTheft?.(car);
      notify(car.occupied ? 'Driver ejected. Vehicle stolen.' : 'Vehicle taken. Make it yours.');
      car.stolen = true;
      api.onCrime?.(1);
      player.state.carsStolen = (player.state.carsStolen || 0) + 1;
    }
    car.traffic = false;
    car.occupied = true;
    current = car;
    player.state.vehicle = car;
    player.state.yaw = car.yaw;
    player.model.visible = false;
  }
  function update(delta) {
    messageTime = Math.max(0, messageTime - delta);
    if (!current) return;
    const keys = player.keys;
    for (const choice of [1, 2, 3]) if (keys.has(`Digit${choice}`)) view = choice;
    const throttle = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
    const braking = throttle && Math.sign(throttle) !== Math.sign(current.speed) && Math.abs(current.speed) > 0.5;
    current.speed += throttle * (braking ? 30 : 15) * delta;
    current.speed *= Math.exp(-(keys.has('Space') ? 5 : throttle ? 0.16 : 0.8) * delta);
    current.speed = THREE.MathUtils.clamp(current.speed, -11, 38);
    const steering = Number(keys.has('KeyA')) - Number(keys.has('KeyD'));
    const oldYaw = current.yaw;
    current.yaw += steering * Math.sign(current.speed) * Math.min(Math.abs(current.speed) / 7, 1) * (keys.has('Space') ? 2.4 : 1.45) * delta;
    const positionX = current.position.x - Math.sin(current.yaw) * current.speed * delta;
    const positionZ = current.position.z - Math.cos(current.yaw) * current.speed * delta;
    if (blocked(positionX, positionZ, current)) {
      if (Math.abs(current.speed) > 8 && cars.some(car => car !== current && Math.hypot(positionX - car.position.x, positionZ - car.position.z) < 4.5)) api.onCrime?.(0.6);
      current.speed *= -0.2;
      current.yaw = oldYaw;
    } else current.position.set(positionX, 0.12, positionZ);
    current.model.rotation.y = current.yaw;
    current.model.userData.wheels.forEach(wheel => { wheel.rotation.x += current.speed * delta / 0.43; });
    player.state.position.copy(current.position);
    player.state.speed = Math.abs(current.speed);
    player.state.yaw = current.yaw;
    const distance = view === 2 ? 17 : view === 3 ? 0 : 9;
    target.copy(current.position).add(new THREE.Vector3(0, view === 3 ? 2.1 : 1.5, 0));
    desired.set(Math.sin(current.yaw) * distance, view === 2 ? 10 : view === 3 ? 0 : 4, Math.cos(current.yaw) * distance).add(target);
    if (view === 3) {
      camera.position.copy(desired);
      target.x -= Math.sin(current.yaw) * 15;
      target.z -= Math.cos(current.yaw) * 15;
    } else {
      ray.set(target, desired.clone().sub(target).normalize());
      for (const bounds of colliders) if (ray.intersectBox(bounds, hit) && hit.distanceTo(target) < desired.distanceTo(target)) desired.copy(hit).addScaledVector(ray.direction, -0.4);
      camera.position.lerp(desired, 1 - Math.exp(-9 * delta));
    }
    camera.lookAt(target);
  }
  function hint() {
    if (messageTime) return message;
    if (current) return 'W / S accelerate & brake · A / D steer · SPACE handbrake · E exit · 1 / 2 / 3 cameras';
    const car = nearest();
    return car ? (car.occupied ? 'E — Steal vehicle' : 'E — Enter vehicle') : 'Explore the streets. Find a car to take a drive.';
  }
  const api = { cars, add, blocked, interact, update, hint, get current() { return current; } };
  api.release = () => {
    if (current) { current.speed = 0; current.occupied = false; }
    current = null;
    player.state.vehicle = null;
    player.model.visible = true;
  };
  return api;
}
