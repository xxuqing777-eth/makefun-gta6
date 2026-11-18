const assert = require('node:assert/strict');
const { mkdirSync } = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

async function verify() {
  mkdirSync('.verification', { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    headless: true,
    args: ['--headless=new', '--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1280,720'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:8901/');
    await page.waitForFunction(() => window.__cityReady);
    await page.screenshot({ path: '.verification/start.png' });
    assert(await page.locator('#start-screen').isVisible());
    await page.locator('#start-button').click();
    await page.waitForFunction(() => document.pointerLockElement?.id === 'game');
    assert(await page.locator('#start-screen').isHidden());
    const mapImage = () => page.locator('#minimap').evaluate(canvas => canvas.toDataURL());
    const initialMap = await mapImage();
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(900);
    assert.notEqual(await mapImage(), initialMap, 'W moves the map');
    assert.notEqual(await page.locator('#speed').textContent(), '0 KM/H');
    await page.keyboard.down('Shift');
    await page.waitForTimeout(400);
    assert.equal(await page.locator('#speed').textContent(), '32 KM/H');
    await page.keyboard.up('Shift');
    await page.keyboard.up('KeyW');
    for (const key of ['KeyA', 'KeyS', 'KeyD']) {
      const before = await mapImage();
      await page.keyboard.down(key);
      await page.waitForTimeout(300);
      await page.keyboard.up(key);
      assert.notEqual(await mapImage(), before, `${key} moves`);
    }
    const beforeLook = await mapImage();
    await page.mouse.move(850, 390);
    await page.waitForTimeout(200);
    assert.notEqual(await mapImage(), beforeLook, 'Mouse changes heading');
    await page.keyboard.press('Space');
    await page.waitForTimeout(150);
    await page.screenshot({ path: '.verification/street.png' });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.pointerLockElement);
    assert(await page.locator('#start-screen').isVisible());
    const pausedMap = await mapImage();
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(300);
    await page.keyboard.up('KeyW');
    assert.equal(await mapImage(), pausedMap, 'Paused movement stays frozen');
    await page.locator('#start-button').click();
    await page.waitForFunction(() => document.pointerLockElement?.id === 'game');
    await page.waitForTimeout(500);
    assert.equal(await page.locator('#speed').textContent(), '0 KM/H', 'No stuck input on resume');
    const physics = await page.evaluate(async () => {
      const THREE = await import('three');
      const { createPlayer } = await import('./src/player.js');
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera();
      const bounds = new THREE.Box3(new THREE.Vector3(140, 0, 70), new THREE.Vector3(148, 10, 75));
      const player = createPlayer(scene, camera, [bounds]);
      player.keys.add('KeyW');
      for (let frame = 0; frame < 180; frame++) player.update(1 / 60, true);
      const stoppedAt = player.state.position.z;
      player.keys.clear();
      player.keys.add('Space');
      player.update(1 / 60, true);
      const jumped = player.state.position.y > 0.4;
      for (let frame = 0; frame < 90; frame++) player.update(1 / 60, true);
      player.look(100, 100000);
      return { stoppedAt, jumped, landed: player.state.position.y, pitch: player.state.pitch };
    });
    assert(physics.stoppedAt >= 75.4 && physics.stoppedAt < 76);
    assert(physics.jumped);
    assert.equal(physics.landed, 0.4);
    assert.equal(physics.pitch, 0.95);
    assert.deepEqual(errors, [], 'No browser errors');
    console.log('PASS: start, pointer lock, WASD, run, mouse camera, jump, collisions, minimap, pause/resume; zero browser errors.');
  } finally { await browser.close(); }
}
verify().catch(error => { console.error(error); process.exitCode = 1; });
