import * as THREE from 'three';
import { createVisibility } from './visibility.js';

export function createPolice(scene, player, vehicles, colliders, wanted, onBust) {
  const units = [];
  const visible = createVisibility(colliders);
  const roadClear = createVisibility(colliders.map(bounds => bounds.clone().expandByVector(new THREE.Vector3(1.2, 0, 1.2))));
  const nodes = [];
  for (let positionX = -144; positionX <= 144; positionX += 48) {
    for (let positionZ = -144; positionZ <= 144; positionZ += 48) nodes.push(new THREE.Vector3(positionX, 0.12, positionZ));
  }
  function route(from, to) {
    if (roadClear(from, to, 0.8)) return [to.clone()];
    const nearest = position => nodes.map((node, index) => ({ index, distance: node.distanceTo(position) }))
      .filter(item => roadClear(position, nodes[item.index], 0.8)).sort((first, second) => first.distance - second.distance)[0]?.index;
    const start = nearest(from);
    const end = nearest(to);
    if (start === undefined || end === undefined) return [];
    const queue = [start];
    const previous = new Map([[start, null]]);
    for (let cursor = 0; cursor < queue.length && !previous.has(end); cursor++) {
      const current = queue[cursor];
      nodes.forEach((node, index) => {
        if (!previous.has(index) && Math.abs(node.distanceTo(nodes[current]) - 48) < 0.1) {
          previous.set(index, current);
          queue.push(index);
        }
      });
    }
    const path = [to.clone()];
    for (let current = end; current !== null; current = previous.get(current)) path.unshift(nodes[current].clone());
    return path;
  }
  function spawn() {
    const candidates = nodes.filter(node => node.distanceTo(player.state.position) > 38 &&
      !vehicles.cars.some(car => car.position.distanceTo(node) < 7));
    candidates.sort((first, second) => first.distanceTo(player.state.position) - second.distanceTo(player.state.position));
    const position = candidates[0] || nodes[0];
    const car = vehicles.add(position.x, position.z, 0, 0x19394d, true);
    car.police = true;
    const lights = [];
    for (const side of [-1, 1]) {
      const light = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.24, 0.45), new THREE.MeshBasicMaterial({ color: side < 0 ? 0xff354c : 0x54baff }));
      light.position.set(side * 0.48, 2.05, 0);
      car.model.add(light);
      lights.push(light);
    }
    const label = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.08, 1.3), new THREE.MeshStandardMaterial({ color: 0xe9eee5 }));
    label.position.set(0, 1.1, -1.4);
    car.model.add(label);
    units.push({ car, lights, path: [], refresh: 0, ram: 0 });
  }
  let time = 0;
  let backup = 0;
  function update(delta) {
    time += delta;
    backup -= delta;
    if (player.state.wanted && units.length < Math.min(5, player.state.wanted + 1) && backup <= 0) { spawn(); backup = 3; }
    let seen = false;
    let arresting = false;
    for (const unit of units) {
      const { car } = unit;
      unit.ram = Math.max(0, unit.ram - delta);
      unit.lights.forEach((light, index) => { light.visible = !!player.state.wanted && Math.floor(time * 8) % 2 === index; });
      if (!player.state.wanted || player.state.recovery > 0) { car.speed = 0; continue; }
      const distance = car.position.distanceTo(player.state.position);
      const sight = distance < 68 && visible(car.position, player.state.position);
      seen ||= sight;
      unit.refresh -= delta;
      if (unit.refresh <= 0) {
        const destination = sight ? player.state.position : wanted.lastKnown;
        if (!unit.path.length || roadClear(car.position, destination, 0.8) || unit.path[unit.path.length - 1].distanceTo(destination) > 15) {
          unit.path = route(car.position, destination);
        }
        unit.refresh = 0.6;
      }
      while (unit.path.length && car.position.distanceTo(unit.path[0]) < 1.2) unit.path.shift();
      const destination = unit.path[0];
      if (destination && distance > 3) {
        const direction = destination.clone().sub(car.position).setY(0);
        const speed = 17 + player.state.wanted * 3;
        const travel = Math.min(direction.length(), speed * delta);
        direction.normalize();
        const next = car.position.clone().addScaledVector(direction, travel);
        const blocked = colliders.some(bounds => next.x > bounds.min.x - 1.1 && next.x < bounds.max.x + 1.1 && next.z > bounds.min.z - 1.1 && next.z < bounds.max.z + 1.1);
        const occupied = units.some(other => other !== unit && next.distanceTo(other.car.position) < 3);
        if (!blocked && !occupied) car.position.copy(next);
        if (blocked) { unit.path = []; unit.refresh = 0; }
        car.speed = blocked || occupied ? 0 : speed;
        car.yaw = Math.atan2(-direction.x, -direction.z);
        car.model.rotation.y = car.yaw;
        car.model.userData.wheels.forEach(wheel => { wheel.rotation.x += travel / 0.43; });
      } else car.speed = 0;
      if (sight && distance < 5.5 && unit.ram === 0) {
        unit.ram = 1.8;
        if (vehicles.current) {
          vehicles.current.speed *= -0.35;
          vehicles.current.yaw += 0.18;
          player.state.health = Math.max(0, player.state.health - 9);
          player.state.rams = (player.state.rams || 0) + 1;
        }
      }
      if (sight && distance < 7 && player.state.speed < 3) arresting = true;
    }
    wanted.update(delta, seen);
    player.state.bust = Math.max(0, Math.min(1, (player.state.bust || 0) + (arresting ? delta / 3 : -delta / 2)));
    player.state.police = units.map(unit => unit.car.position);
    if (player.state.bust >= 1) onBust();
  }
  function reset() {
    for (const unit of units) {
      scene.remove(unit.car.model);
      unit.car.model.traverse(object => { if (object.isMesh) { object.geometry.dispose(); object.material.dispose(); } });
      vehicles.cars.splice(vehicles.cars.indexOf(unit.car), 1);
    }
    units.length = 0;
    backup = 0;
  }
  return { units, update, reset, route };
}
