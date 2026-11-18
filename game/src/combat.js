import * as THREE from 'three';
import { createVisibility } from './visibility.js';

export function createCombat(scene, player, vehicles, pedestrians, colliders, wanted) {
  const visible = createVisibility(colliders);
  const enemies = [];
  const effects = [];
  const state = player.state;
  Object.assign(state, { weapon: 'FISTS', ammo: 12, reserve: 60, reloading: 0 });
  let cooldown = 0;
  const pistol = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.55), new THREE.MeshStandardMaterial({ color: 0x28343e }));
  pistol.position.set(0.45, 1.35, -0.45);
  pistol.visible = false;
  player.model.add(pistol);
  for (const [positionX, positionZ] of [[138, 48], [138, 42], [90, -48]]) {
    const model = new THREE.Group();
    for (const [color, size, offset] of [[0x763960, [0.7, 0.85, 0.4], [0, 1.2, 0]], [0xc39875, [0.4, 0.4, 0.4], [0, 1.85, 0]], [0x293140, [0.6, 0.85, 0.35], [0, 0.4, 0]]]) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshStandardMaterial({ color }));
      mesh.position.set(...offset);
      mesh.castShadow = true;
      model.add(mesh);
    }
    model.position.set(positionX, 0.4, positionZ);
    model.name = 'Vultures lookout';
    scene.add(model);
    enemies.push({ model, health: 100, cooldown: 0, aggressive: false, home: model.position.clone(), down: 0 });
  }
  function flash(from, to, color) {
    const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color }));
    scene.add(line);
    effects.push({ model: line, life: 0.09 });
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 4), new THREE.MeshBasicMaterial({ color }));
    spark.position.copy(from);
    scene.add(spark);
    effects.push({ model: spark, life: 0.09 });
  }
  function switchWeapon() {
    if (vehicles.current || state.recovery > 0) return;
    state.weapon = state.weapon === 'FISTS' ? 'PISTOL' : 'FISTS';
    state.reloading = 0;
    pistol.visible = state.weapon === 'PISTOL';
  }
  function reload() {
    if (!vehicles.current && state.weapon === 'PISTOL' && state.ammo < 12 && state.reserve && !state.reloading) state.reloading = 1.3;
  }
  function attack() {
    if (vehicles.current || cooldown > 0 || state.reloading || state.recovery > 0) return false;
    const armed = state.weapon === 'PISTOL';
    if (armed && !state.ammo) { reload(); return false; }
    cooldown = armed ? 0.25 : 0.45;
    if (armed) { state.ammo--; wanted.crime(0.45); }
    const direction = new THREE.Vector3(-Math.sin(state.yaw), 0, -Math.cos(state.yaw));
    player.model.rotation.y = state.yaw;
    const targets = [...enemies, ...pedestrians.people].filter(target => (target.health ?? 100) > 0);
    let closest = null;
    let nearest = armed ? 45 : 2.4;
    for (const target of targets) {
      const offset = target.model.position.clone().sub(state.position).setY(0);
      const distance = offset.length();
      const alignment = offset.normalize().dot(direction);
      if (distance < nearest && alignment > (armed ? 0.985 : 0.4) && visible(state.position, target.model.position)) {
        nearest = distance;
        closest = target;
      }
    }
    const origin = state.position.clone().add(new THREE.Vector3(0, 1.4, 0));
    const end = origin.clone().addScaledVector(direction, nearest);
    if (armed) {
      const ray = new THREE.Ray(origin, direction);
      const hit = new THREE.Vector3();
      for (const bounds of colliders) {
        if (ray.intersectBox(bounds, hit) && origin.distanceTo(hit) < origin.distanceTo(end)) end.copy(hit);
      }
    }
    if (armed) flash(origin.clone().addScaledVector(direction, 0.6), end, 0xffdd83);
    else {
      player.model.children[4].rotation.x = -1.5;
      flash(origin.clone().addScaledVector(direction, 0.6), origin.clone().addScaledVector(direction, 1.2), 0xffffff);
    }
    if (closest) {
      closest.health = Math.max(0, (closest.health ?? 100) - (armed ? 40 : 25));
      closest.aggressive = true;
      wanted.crime(armed ? 0.55 : 0.6);
      if (!closest.health) { closest.model.rotation.z = Math.PI / 2; closest.down = 20; }
    }
    return true;
  }
  function update(delta) {
    cooldown = Math.max(0, cooldown - delta);
    if (state.reloading) {
      state.reloading = Math.max(0, state.reloading - delta);
      if (!state.reloading) {
        const rounds = Math.min(12 - state.ammo, state.reserve);
        state.ammo += rounds;
        state.reserve -= rounds;
      }
    }
    for (let index = effects.length - 1; index >= 0; index--) {
      const effect = effects[index];
      effect.life -= delta;
      if (effect.life <= 0) {
        scene.remove(effect.model);
        effect.model.geometry.dispose();
        effect.model.material.dispose();
        effects.splice(index, 1);
      }
    }
    for (const enemy of [...enemies, ...pedestrians.people]) {
      if (enemy.health === 0) {
        if (enemy.mission) continue;
        enemy.down -= delta;
        if (enemy.down <= 0) { enemy.health = 100; enemy.aggressive = false; enemy.model.rotation.z = 0; if (enemy.home) enemy.model.position.copy(enemy.home); }
        continue;
      }
      const distance = enemy.model.position.distanceTo(state.position);
      if (enemy.home && distance < 10 && visible(enemy.model.position, state.position)) enemy.aggressive = true;
      if (!enemy.aggressive || state.recovery > 0) continue;
      if (distance > 45) { enemy.aggressive = false; continue; }
      enemy.cooldown = Math.max(0, (enemy.cooldown || 0) - delta);
      if (!visible(enemy.model.position, state.position)) continue;
      const direction = state.position.clone().sub(enemy.model.position).setY(0).normalize();
      enemy.model.rotation.y = Math.atan2(-direction.x, -direction.z);
      if (distance > 1.8) {
        const next = enemy.model.position.clone().addScaledVector(direction, delta * 3);
        if (!player.blocked(next.x, next.z) && !vehicles.cars.some(car => car.position.distanceTo(next) < 2.5)) enemy.model.position.copy(next);
      }
      if (distance < 2.5 && !enemy.cooldown && !vehicles.current) {
        state.health = Math.max(0, state.health - 8);
        enemy.cooldown = 0.9;
        flash(enemy.model.position.clone().setY(1.5), state.position.clone().setY(1.5), 0xffcba5);
      }
    }
  }
  return { enemies, attack, reload, switchWeapon, update };
}
