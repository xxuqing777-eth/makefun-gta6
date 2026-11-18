import * as THREE from 'three';

export const STORIES = [
  { name: 'First Wheels', money: 400, xp: 100 },
  { name: 'Hot Pursuit', money: 700, xp: 200 },
  { name: 'The Pickup', money: 1200, xp: 350 },
  { name: 'Downtown Payday', money: 2500, xp: 600 }
];

export function createMissions(scene, player, vehicles, wanted, combat) {
  const state = player.state;
  state.xp = 0;
  let progress = { index: 0, stage: 0 };
  let stolenAtStart = 0;
  let guards = [];
  let dialogue = 'Lena Cruz: Welcome home, Jax. Meet me by the gold beacon. Press F.';
  const marker = new THREE.Mesh(new THREE.TorusGeometry(3, 0.13, 8, 40), new THREE.MeshBasicMaterial({ color: 0xffdf8b }));
  marker.rotation.x = Math.PI / 2;
  scene.add(marker);
  const lena = new THREE.Group();
  for (const [size, height, color] of [[[0.65, 1.3, 0.4], 1, 0xf4d178], [[0.4, 0.4, 0.4], 1.85, 0xb97855]]) {
    const part = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshStandardMaterial({ color }));
    part.position.y = height;
    lena.add(part);
  }
  scene.add(lena);
  function target() {
    if (progress.index === 4) return null;
    if (!progress.stage) return [144, 80];
    if (progress.index === 0) return progress.stage === 1 ? [147, 80] : [96, 96];
    if (progress.index === 1) return null;
    if (progress.index === 2) return progress.stage === 1 ? [144, 80] : [96, 0];
    return progress.stage === 1 ? [-48, -48] : [144, 96];
  }
  function refresh() {
    const destination = target();
    state.missionMarker = destination ? { x: destination[0], z: destination[1] } : null;
    marker.visible = !!destination;
    if (destination) marker.position.set(destination[0], 0.65, destination[1]);
    lena.visible = progress.index < 4 && (!progress.stage || progress.index === 2);
    lena.position.set(141, 0.4, 80);
    if (progress.index === 2 && progress.stage >= 2) {
      if (vehicles.current && progress.stage === 2) lena.position.copy(vehicles.current.position).add(new THREE.Vector3(0.65, 0.6, 0));
      else lena.position.set(99, 0.4, 0);
    }
  }
  function complete() {
    const story = STORIES[progress.index];
    state.money += story.money;
    state.xp += story.xp;
    dialogue = `Lena: ${story.name} complete. +$${story.money} / +${story.xp} XP. ${progress.index === 3 ? 'Solmaris is ours to explore. You earned your second chance.' : 'Come back to the coast for the next job.'}`;
    progress = { index: progress.index + 1, stage: 0 };
    guards.forEach(guard => { guard.mission = false; });
    guards = [];
    refresh();
    api.onComplete?.();
  }
  function begin() {
    progress.stage = 1;
    stolenAtStart = state.carsStolen || 0;
    if (progress.index === 0 && !vehicles.cars.some(car => !car.stolen && Math.hypot(car.position.x - 147, car.position.z - 80) < 6)) {
      vehicles.add(147, 80, 0, 0xe6af54);
    }
    if (progress.index === 0) dialogue = 'Lena: Take a fresh ride with E. Deliver it to the gold beacon at the east garage. Stop and press F.';
    if (progress.index === 1) {
      wanted.clear(); wanted.crime(2);
      dialogue = 'Lena: The PD flagged your plate. Lose both stars. Break sight behind blocks and keep moving.';
    }
    if (progress.index === 2) dialogue = 'Lena: Bring a car here and press F. I need a driver to the meet on Central Avenue.';
    if (progress.index === 3) dialogue = 'Lena: The Vultures left our cash downtown. Go on foot to the beacon and press F. Then get back to the coast clean.';
  }
  function interact() {
    if (progress.index >= 4) return;
    const destination = target();
    if (destination && Math.hypot(state.position.x - destination[0], state.position.z - destination[1]) > 8) return;
    if (vehicles.current && Math.abs(vehicles.current.speed) > 2) { dialogue = 'Lena: Stop the car first.'; return; }
    if (!progress.stage) begin();
    else if (progress.index === 0 && progress.stage === 2 && vehicles.current) complete();
    else if (progress.index === 2 && progress.stage === 1 && vehicles.current) {
      progress.stage = 2;
      dialogue = 'Jax: Buckle up, Lena. Next stop: Central Avenue. Stop at the beacon and press F.';
    } else if (progress.index === 2 && progress.stage === 2 && vehicles.current) {
      progress.stage = 3;
      state.ammo = 12; state.reserve = Math.max(state.reserve, 36);
      guards = combat.enemies.slice(0, 2);
      guards.forEach((guard, index) => {
        guard.model.position.set(96, 0.4, -8 - index * 4);
        guard.health = 100; guard.down = 0; guard.aggressive = true; guard.mission = true; guard.model.rotation.z = 0;
      });
      dialogue = 'Lena: Vultures! Get out with E. Protect me: Q equips your pistol, aim with the mouse, click to fire.';
    } else if (progress.index === 3 && progress.stage === 1 && !vehicles.current) {
      progress.stage = 2; wanted.clear(); wanted.crime(3);
      dialogue = 'Jax: Cash secured. Lena: Lose the PD, then bring it to the coast. F at the beacon when clear.';
    } else if (progress.index === 3 && progress.stage === 2 && state.wanted === 0) complete();
    refresh();
  }
  function update(delta) {
    if (progress.index === 0 && progress.stage === 1 && vehicles.current && (state.carsStolen || 0) > stolenAtStart) progress.stage = 2;
    if (progress.index === 1 && progress.stage === 1 && !state.wanted) complete();
    if (progress.index === 2 && progress.stage === 3) {
      if (guards.every(guard => guard.health === 0)) complete();
      else if (state.position.distanceTo(lena.position) > 45) fail();
    }
    marker.rotation.z += delta;
    refresh();
  }
  function fail() {
    if (!progress.stage) return;
    guards.forEach(guard => { guard.mission = false; guard.aggressive = false; guard.model.position.copy(guard.home); });
    guards = [];
    progress.stage = 0;
    dialogue = 'Lena: Job interrupted. No reward lost or paid. Meet me on the coast to retry.';
    refresh();
  }
  function objective() {
    if (progress.index === 4) return 'Story complete — enjoy Solmaris';
    if (!progress.stage) return `F — Meet Lena on the coast: ${STORIES[progress.index].name}`;
    return [
      ['E — Steal a fresh car', 'Deliver car to east garage · stop + F'],
      ['Lose the two-star wanted level'],
      ['Bring a car to Lena · F to board', 'Drive Lena to Central Avenue · stop + F', 'Exit car · protect Lena from both Vultures'],
      ['Downtown cash · exit car + F to collect', 'Lose cops · return to coast + F']
    ][progress.index][progress.stage - 1];
  }
  const api = { interact, update, fail, objective, get dialogue() { return dialogue; }, get progress() { return { ...progress }; },
    restore(saved) { fail(); progress = { index: saved.index, stage: 0 }; dialogue = 'Lena: Welcome back. Completed jobs are safe; meet me to restart your current job.'; refresh(); } };
  refresh();
  return api;
}
