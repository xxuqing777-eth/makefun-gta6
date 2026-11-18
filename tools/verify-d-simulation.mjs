import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier === 'three' ? new URL('../game/vendor/three.module.min.js', import.meta.url).href : specifier, context);
} });
const THREE = await import('three');
const { createCity } = await import('../game/src/city.js');
const { createPlayer } = await import('../game/src/player.js');
const { createVehicles } = await import('../game/src/vehicles.js');
const { createTraffic } = await import('../game/src/traffic.js');
const { createWanted } = await import('../game/src/wanted.js');
const { createPolice } = await import('../game/src/police.js');
const { createCombat } = await import('../game/src/combat.js');
const { createMissions } = await import('../game/src/missions.js');
const { poseShot } = await import('../game/src/shots.js');
globalThis.document = { getElementById: () => ({ hidden: false }) };
for (const name of ['cover', 'street', 'drive', 'mission', 'unknown']) {
  globalThis.location = { search: `?shot=${name}` };
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  const colliders = createCity().userData.colliders;
  const player = createPlayer(scene, camera, colliders);
  const vehicles = createVehicles(scene, camera, player, colliders);
  createTraffic(vehicles);
  const wanted = createWanted(player.state);
  vehicles.onCrime = wanted.crime;
  const police = createPolice(scene, player, vehicles, colliders, wanted, () => assert.fail('Unexpected arrest'));
  const combat = createCombat(scene, player, vehicles, { people: [] }, colliders, wanted);
  const missions = createMissions(scene, player, vehicles, wanted, combat);
  assert.equal(poseShot({ player, vehicles, wanted, police, missions, camera }), name !== 'unknown');
  if (name === 'cover') {
    assert.equal(player.state.wanted, 3);
    assert.equal(police.units.length, 3);
    assert.equal(missions.progress.index, 3);
    assert.equal(missions.progress.stage, 2);
    assert(player.state.missionMarker);
  }
  if (name === 'mission') assert.deepEqual(missions.progress, { index: 2, stage: 2 });
  if (name === 'drive') assert.equal(missions.progress.stage, 2);
  if (['cover', 'drive', 'mission'].includes(name)) assert(vehicles.current);
  else assert.equal(vehicles.current, null);
  assert(camera.position.toArray().every(Number.isFinite));
}
console.log('PASS: all four shot poses use real mission, vehicle and police state; unknown shots leave gameplay unchanged.');
