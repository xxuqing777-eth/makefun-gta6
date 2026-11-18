const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

async function verify() {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true,
    args: ['--headless=new', '--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1280,720'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:8901/');
    await page.waitForFunction(() => window.__cityReady);
    await page.locator('#start-button').click();
    await page.waitForFunction(() => document.pointerLockElement?.id === 'game');
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(200);
    assert.match(await page.locator('#objective .eyebrow').textContent(), /DRIVING/);
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(1000);
    assert(parseInt(await page.locator('#speed').textContent()) > 10);
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(100);
    assert.match(await page.locator('#objective strong').textContent(), /Slow down/);
    await page.keyboard.up('KeyW');
    await page.keyboard.down('KeyA');
    await page.waitForTimeout(250);
    await page.keyboard.up('KeyA');
    for (const choice of ['Digit2', 'Digit3', 'Digit1']) { await page.keyboard.press(choice); await page.waitForTimeout(100); }
    await page.screenshot({ path: '.verification/a2-drive.png' });
    await page.keyboard.down('Space');
    await page.waitForTimeout(900);
    await page.keyboard.up('Space');
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(100);
    assert.match(await page.locator('#objective .eyebrow').textContent(), /ON FOOT/);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.pointerLockElement);
    const paused = await page.locator('#minimap').evaluate(canvas => canvas.toDataURL());
    await page.waitForTimeout(250);
    assert.equal(await page.locator('#minimap').evaluate(canvas => canvas.toDataURL()), paused);
    const result = await page.evaluate(async () => {
      const THREE = await import('three');
      const { createPlayer } = await import('./src/player.js');
      const { createVehicles } = await import('./src/vehicles.js');
      const { createTraffic } = await import('./src/traffic.js');
      const { createPedestrians } = await import('./src/pedestrians.js');
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera();
      const player = createPlayer(scene, camera, []);
      const vehicles = createVehicles(scene, camera, player, []);
      const traffic = createTraffic(vehicles);
      const pedestrians = createPedestrians(scene, vehicles);
      vehicles.onTheft = pedestrians.eject;
      const initial = vehicles.cars.filter(car => car.traffic).map(car => car.position.clone());
      const walkers = pedestrians.people.map(person => person.model.position.clone());
      for (let frame = 0; frame < 600; frame++) { traffic.update(1 / 60); pedestrians.update(1 / 60); }
      const movedCars = vehicles.cars.filter(car => car.traffic).filter((car, index) => car.position.distanceTo(initial[index]) > 1).length;
      const movedPeople = pedestrians.people.filter((person, index) => person.model.position.distanceTo(walkers[index]) > 1).length;
      player.state.position.set(138, 0.4, 61);
      vehicles.interact();
      const stolen = vehicles.current?.stolen && player.state.carsStolen === 1 && pedestrians.people.length === 49;
      const stolenCar = vehicles.current;
      vehicles.interact();
      const exited = !vehicles.current && player.model.visible;
      player.state.position.copy(stolenCar.position);
      vehicles.interact();
      player.keys.add('KeyW');
      for (let frame = 0; frame < 60; frame++) vehicles.update(1 / 60);
      const accelerated = stolenCar.speed > 10;
      stolenCar.position.set(0, 0.12, 0);
      stolenCar.speed = 0;
      player.keys.clear();
      player.keys.add('KeyS');
      for (let frame = 0; frame < 60; frame++) vehicles.update(1 / 60);
      const reversed = stolenCar.speed < -1;
      player.keys.clear();
      player.keys.add('KeyA');
      const yaw = stolenCar.yaw;
      vehicles.update(0.05);
      const steered = stolenCar.yaw !== yaw;
      player.keys.clear();
      player.keys.add('Space');
      for (let frame = 0; frame < 120; frame++) vehicles.update(1 / 60);
      const stopped = Math.abs(stolenCar.speed) < 0.1;
      const movingCar = vehicles.cars.find(car => car.traffic);
      vehicles.interact();
      movingCar.speed = 0;
      player.state.position.copy(movingCar.position);
      vehicles.interact();
      const hijackedTraffic = vehicles.current === movingCar && !movingCar.traffic;
      return { movedCars, movedPeople, stolen, exited, accelerated, reversed, steered, stopped, hijackedTraffic,
        boundary: vehicles.blocked(160, 0, stolenCar), carCollision: vehicles.blocked(147, 80, stolenCar) };
    });
    assert(result.movedCars >= 15, JSON.stringify(result));
    assert(result.movedPeople >= 40, JSON.stringify(result));
    for (const [name, value] of Object.entries(result)) assert(value, name);
    assert.deepEqual(errors, []);
    console.log('PASS A2: real keyboard entry/driving/exit/cameras/pause, theft + driver ejection, traffic hijack, acceleration/reverse/steering/braking, traffic and pedestrians, collision limits; zero console errors.', result);
  } finally { await browser.close(); }
}
verify().catch(error => { console.error(error); process.exitCode = 1; });
