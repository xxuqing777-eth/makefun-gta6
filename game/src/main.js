import * as THREE from 'three';
import { createCity } from './city.js';
import { VIEW } from './config.js';
import { createPlayer } from './player.js';
import { createControls } from './controls.js';
import { createHud } from './hud.js';
import { createVehicles } from './vehicles.js';
import { createTraffic } from './traffic.js';
import { createPedestrians } from './pedestrians.js';
import { createWanted } from './wanted.js';
import { createPolice } from './police.js';
import { createCombat } from './combat.js';
import { createMissions } from './missions.js';
import { createSave } from './save.js';
import { createAudio } from './audio.js';
import { createMenus } from './menus.js';
import { poseShot } from './shots.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;

const scene = new THREE.Scene();
scene.background = new THREE.Color(VIEW.sky);
scene.fog = new THREE.Fog(VIEW.sky, 340, 1000);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1800);
camera.position.set(...VIEW.position);
camera.lookAt(...VIEW.target);
scene.add(new THREE.HemisphereLight(0xc8efff, 0xc7a477, 2.3));
const sunlight = new THREE.DirectionalLight(0xffdfab, 3.2);
sunlight.position.set(-100, 210, 110);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(2048, 2048);
Object.assign(sunlight.shadow.camera, { left: -230, right: 230, top: 230, bottom: -230, near: 1, far: 650 });
sunlight.shadow.normalBias = 0.5;
scene.add(sunlight);
const city = createCity();
scene.add(city);
const player = createPlayer(scene, camera, city.userData.colliders);
const vehicles = createVehicles(scene, camera, player, city.userData.colliders);
const traffic = createTraffic(vehicles);
const pedestrians = createPedestrians(scene, vehicles);
vehicles.onTheft = pedestrians.eject;
const wanted = createWanted(player.state);
vehicles.onCrime = wanted.crime;
const combat = createCombat(scene, player, vehicles, pedestrians, city.userData.colliders, wanted);
function recover(reason) {
  missions.fail();
  vehicles.release();
  wanted.clear();
  police.reset();
  player.keys.clear();
  player.state.position.set(144, 0.4, 80);
  player.state.health = 100;
  player.state.speed = 0;
  player.state.money = Math.max(0, player.state.money - 100);
  player.state.recovery = 4;
  player.state.outcome = `${reason} — Back on the coast. Up to $100 fee.`;
}
const police = createPolice(scene, player, vehicles, city.userData.colliders, wanted, () => recover('BUSTED'));
const missions = createMissions(scene, player, vehicles, wanted, combat);
const audio = createAudio();
const save = createSave(player, vehicles, wanted, police, missions);
const controls = createControls(canvas, player, vehicles, combat, missions, audio);
createMenus(save, audio, controls);
missions.onComplete = () => { save.write(); audio.blip(); };
if (new URLSearchParams(location.search).has('verify')) window.__simulation = { player, vehicles, wanted, police, combat, controls, missions, save, audio };
const objective = document.querySelector('#objective strong');
const mode = document.querySelector('#objective .eyebrow');
const movementHint = document.querySelector('#hints span');
const updateHud = createHud(city.userData.colliders);
const clock = new THREE.Clock();
const sun = new THREE.Mesh(new THREE.SphereGeometry(18, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffedbd, fog: false }));
sun.position.set(-390, 450, -650);
scene.add(sun);

function resize() {
  const width = window.innerWidth;
  const height = Math.max(1, window.innerHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', resize);
resize();
const posed = poseShot({ player, vehicles, wanted, police, missions, camera });
renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 0.05);
  if (controls.started && !posed) {
    if (controls.active) {
      player.state.recovery = Math.max(0, (player.state.recovery || 0) - delta);
      traffic.update(delta);
      pedestrians.update(delta);
      if (vehicles.current) vehicles.update(delta);
      else { player.update(delta, true); vehicles.update(delta); }
      combat.update(delta);
      for (const person of pedestrians.people) {
        if (vehicles.current && player.state.speed > 7 && person.health !== 0 && person.model.position.distanceTo(player.state.position) < 2.5) {
          person.health = 0;
          person.down = 20;
          person.model.rotation.z = Math.PI / 2;
          vehicles.current.speed *= 0.55;
          wanted.crime(1);
        }
      }
      police.update(delta);
      if (player.state.health <= 0) recover('KNOCKED OUT');
      missions.update(delta);
    } else if (!vehicles.current) player.update(delta, false);
  }
  if (!posed) audio.update(player.state, controls.active);
  objective.textContent = player.state.recovery ? player.state.outcome : missions.objective();
  mode.textContent = `STORY ${Math.min(4, missions.progress.index + 1)} / 4 · ${vehicles.current ? 'DRIVING' : 'ON FOOT'}`;
  document.getElementById('dialogue').textContent = missions.dialogue;
  document.getElementById('vehicle-hint').textContent = vehicles.hint();
  movementHint.textContent = vehicles.current ? 'WASD DRIVE · SPACE BRAKE · E EXIT' : 'WASD MOVE · SHIFT RUN · SPACE JUMP · E ENTER';
  updateHud(player.state);
  renderer.render(scene, camera);
  if (!window.__cityReady) {
    window.__cityReady = true;
    document.getElementById('status').textContent = 'Solmaris ready. Enter the city to play.';
    document.getElementById('start-button').disabled = false;
  }
});
