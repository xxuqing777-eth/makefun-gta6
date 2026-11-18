import * as THREE from 'three';

export function createPedestrians(scene, vehicles) {
  const people = [];
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const colors = [0xd88770, 0xf0ce73, 0x5f949f, 0xd9e4cc, 0x9a7396];
  function add(blockX, blockZ, phase = 0, origin = null) {
    const model = new THREE.Group();
    const limbs = [];
    function part(color, size, offset, limb = false) {
      const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color }));
      mesh.scale.set(...size);
      mesh.position.set(...offset);
      mesh.castShadow = true;
      model.add(mesh);
      if (limb) limbs.push(mesh);
    }
    part(colors[people.length % colors.length], [0.6, 0.7, 0.35], [0, 1.2, 0]);
    part(0xbd8a68, [0.35, 0.4, 0.35], [0, 1.78, 0]);
    for (const side of [-1, 1]) {
      part(0x344854, [0.22, 0.72, 0.26], [side * 0.18, 0.45, 0], true);
      part(0xbd8a68, [0.18, 0.65, 0.22], [side * 0.4, 1.2, 0], true);
    }
    const edge = 17.5;
    const route = [[blockX - edge, blockZ - edge], [blockX + edge, blockZ - edge], [blockX + edge, blockZ + edge], [blockX - edge, blockZ + edge]];
    model.position.set(route[phase][0], 0.4, route[phase][1]);
    if (origin) model.position.copy(origin).setY(0.4);
    scene.add(model);
    people.push({ model, limbs, route, waypoint: (phase + 1) % 4, stride: phase, pace: 1 + (people.length % 4) * 0.15 });
  }
  for (let index = 0; index < 48; index++) add(-120 + index % 6 * 48, -120 + Math.floor(index / 8) * 48, index % 4);
  function eject(car) {
    const blockX = THREE.MathUtils.clamp(Math.round((car.position.x - 24) / 48) * 48 + 24, -120, 120);
    const blockZ = THREE.MathUtils.clamp(Math.round((car.position.z - 24) / 48) * 48 + 24, -120, 120);
    const origin = car.position.clone();
    origin.x = blockX + (car.position.x > blockX ? 17.5 : -17.5);
    origin.z = THREE.MathUtils.clamp(origin.z, blockZ - 17.5, blockZ + 17.5);
    add(blockX, blockZ, 0, origin);
    const person = people[people.length - 1];
    person.waypoint = car.position.x > blockX ? 2 : 0;
  }
  function update(delta) {
    for (const person of people) {
      if (person.health === 0 || person.aggressive) continue;
      const destination = person.route[person.waypoint];
      const differenceX = destination[0] - person.model.position.x;
      const differenceZ = destination[1] - person.model.position.z;
      const distance = Math.hypot(differenceX, differenceZ);
      if (distance < 0.1) { person.waypoint = (person.waypoint + 1) % person.route.length; continue; }
      const danger = vehicles.cars.some(car => car.position.distanceTo(person.model.position) < 4);
      const travel = danger ? 0 : Math.min(distance, person.pace * delta);
      person.model.position.x += differenceX / distance * travel;
      person.model.position.z += differenceZ / distance * travel;
      person.model.rotation.y = Math.atan2(-differenceX, -differenceZ);
      person.stride += travel * 5;
      person.limbs.forEach((limb, index) => { limb.rotation.x = travel ? Math.sin(person.stride + (index < 2 ? 0 : Math.PI)) * 0.45 : 0; });
    }
  }
  return { people, update, eject };
}
