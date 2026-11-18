import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === 'three') return nextResolve(new URL('../game/vendor/three.module.min.js', import.meta.url).href, context);
  return nextResolve(specifier, context);
} });
const browserTest = readFileSync(new URL('./verify-a2.cjs', import.meta.url), 'utf8');
const body = browserTest.split('const result = await page.evaluate(async () => {')[1].split('\n    });')[0]
  .replaceAll("'./src/", "'../game/src/");
const run = new Function(`return async function() {${body}}`)();
const result = await run();
assert(result.movedCars >= 15, JSON.stringify(result));
assert(result.movedPeople >= 40, JSON.stringify(result));
for (const [name, value] of Object.entries(result)) assert(value, name);
console.log('PASS deterministic A2 simulation', result);
const THREE = await import('three');
const { createCity } = await import('../game/src/city.js');
const { createPlayer } = await import('../game/src/player.js');
const { createVehicles } = await import('../game/src/vehicles.js');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera();
const city = createCity();
const player = createPlayer(scene, camera, city.userData.colliders);
const vehicles = createVehicles(scene, camera, player, city.userData.colliders);
vehicles.interact();
assert(vehicles.current, 'Spawn car accessible');
player.keys.add('KeyW');
for (let frame = 0; frame < 120; frame++) vehicles.update(1 / 60);
assert(vehicles.current.speed > 20, 'Spawn road drivable with real city colliders');
assert(vehicles.blocked(-128, -128, vehicles.current), 'Buildings block cars');
player.keys.clear();
player.keys.add('Space');
for (let frame = 0; frame < 120; frame++) vehicles.update(1 / 60);
vehicles.interact();
assert(!vehicles.current, 'Safe exit beside real sidewalks');
console.log('PASS real city spawn, road clearance, building collision, safe exit');
