export function poseShot({ player, vehicles, wanted, police, missions, camera }) {
  const name = new URLSearchParams(location.search).get('shot');
  if (!['cover', 'street', 'drive', 'mission'].includes(name)) return false;
  const state = player.state;
  const move = (positionX, positionZ) => {
    state.position.set(positionX, 0.4, positionZ);
    if (vehicles.current) vehicles.current.position.set(positionX, 0.12, positionZ);
  };
  state.money = 1100;
  state.xp = 300;
  if (name === 'street') {
    move(138, 68);
    player.model.position.copy(state.position);
    player.model.rotation.y = -0.35;
    camera.position.set(143, 5.6, 77);
    camera.lookAt(138, 2, 58);
  } else {
    missions.restore({ index: name === 'cover' ? 3 : name === 'mission' ? 2 : 0 });
    move(144, 80);
    missions.interact();
    vehicles.interact();
    wanted.clear();
    if (name === 'mission') missions.interact();
    if (name === 'cover') {
      vehicles.release();
      move(-48, -48);
      missions.interact();
      move(147, 80);
      vehicles.interact();
    }
    move(99, name === 'mission' ? 20 : 48);
    const car = vehicles.current;
    car.yaw = 0;
    car.model.rotation.y = 0;
    car.speed = name === 'cover' ? 27 : 15;
    state.speed = car.speed;
    state.yaw = 0;
    missions.update(0);
    if (name === 'cover') {
      for (let index = 0; index < 3; index++) police.update(3.1);
      police.units.forEach((unit, index) => {
        unit.car.position.set(index % 2 ? 93 : 99, 0.12, 59 + index * 8);
        unit.car.yaw = 0;
        unit.car.model.rotation.y = 0;
        unit.lights.forEach(light => { light.visible = true; });
      });
      state.health = 84;
      state.speed = car.speed = 27;
      camera.position.set(99, 7, 88);
      camera.lookAt(99, 1.5, 45);
    } else {
      vehicles.cars.filter(vehicle => vehicle.traffic).slice(0, 3).forEach((vehicle, index) => {
        vehicle.position.set(index % 2 ? 93 : 99, 0.12, state.position.z - 16 - index * 12);
        vehicle.model.rotation.y = index % 2 ? Math.PI : 0;
      });
      camera.position.set(106, 5.8, state.position.z + 12);
      camera.lookAt(96, 1.3, state.position.z - 14);
    }
  }
  document.getElementById('start-screen').hidden = true;
  document.getElementById('hud').hidden = false;
  return true;
}
