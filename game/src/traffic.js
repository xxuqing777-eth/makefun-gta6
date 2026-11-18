import * as THREE from 'three';

export function createTraffic(vehicles) {
  const colors = [0x688baf, 0xe3dfcb, 0xd27564, 0x448d81, 0x8b7498];
  for (let index = 0; index < 18; index++) {
    const left = -144 + (index % 6) * 48;
    const top = -144 + (Math.floor(index / 6) * 2) * 48;
    const route = [[left + 3, top + 3], [left + 45, top + 3], [left + 45, top + 45], [left + 3, top + 45]];
    const waypoint = index % 4;
    const start = route[waypoint];
    const next = route[(waypoint + 1) % 4];
    const car = vehicles.add(start[0], start[1], Math.atan2(start[0] - next[0], start[1] - next[1]), colors[index % colors.length], true);
    Object.assign(car, { traffic: true, route, waypoint: (waypoint + 1) % 4, cruise: 7 + index % 4 });
  }
  function update(delta) {
    for (const car of vehicles.cars) {
      if (!car.traffic) continue;
      const destination = car.route[car.waypoint];
      const differenceX = destination[0] - car.position.x;
      const differenceZ = destination[1] - car.position.z;
      const distance = Math.hypot(differenceX, differenceZ);
      if (distance < 0.25) { car.waypoint = (car.waypoint + 1) % 4; continue; }
      const directionX = differenceX / distance;
      const directionZ = differenceZ / distance;
      const obstruction = vehicles.cars.some(other => {
        if (other === car) return false;
        const offsetX = other.position.x - car.position.x;
        const offsetZ = other.position.z - car.position.z;
        const ahead = offsetX * directionX + offsetZ * directionZ;
        return ahead > 0 && ahead < 7 + car.speed * 0.3 && Math.abs(offsetX * directionZ - offsetZ * directionX) < 2.8;
      });
      car.speed = THREE.MathUtils.damp(car.speed, obstruction ? 0 : distance < 6 ? 4 : car.cruise, obstruction ? 8 : 2, delta);
      const travel = Math.min(distance, car.speed * delta);
      car.position.x += directionX * travel;
      car.position.z += directionZ * travel;
      car.yaw = Math.atan2(-directionX, -directionZ);
      car.model.rotation.y = car.yaw;
      car.model.userData.wheels.forEach(wheel => { wheel.rotation.x += travel / 0.43; });
    }
  }
  return { update };
}
