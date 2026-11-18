const assert = require('node:assert/strict');
const { mkdirSync } = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

async function verify() {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true,
    args: ['--headless=new', '--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1280,720'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(`${process.env.GAME_URL || 'http://127.0.0.1:8901/'}?verify=1`);
    await page.waitForFunction(() => window.__cityReady);
    await page.locator('#start-button').click();
    await page.waitForFunction(() => !!document.pointerLockElement);
    await page.keyboard.press('KeyQ');
    await page.mouse.click(640, 360);
    await page.waitForTimeout(150);
    assert.match(await page.locator('#weapon').textContent(), /PISTOL 11/);
    assert.match(await page.locator('#wanted').getAttribute('aria-label'), /level 1/);
    await page.keyboard.press('KeyR');
    await page.waitForFunction(() => window.__simulation.player.state.ammo === 12);
    assert.match(await page.locator('#weapon').textContent(), /PISTOL 12/);
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(100);
    assert.match(await page.locator('#objective .eyebrow').textContent(), /DRIVING/);
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(700);
    await page.keyboard.up('KeyW');
    assert(await page.evaluate(() => window.__simulation.police.units.length > 0));
    mkdirSync('.verification', { recursive: true });
    await page.screenshot({ path: '.verification/b-chase.png' });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.pointerLockElement);
    const snapshot = () => page.evaluate(() => {
      const { player, police } = window.__simulation;
      return JSON.stringify({ position: player.state.position, wanted: player.state.wanted, health: player.state.health, police: police.units.map(unit => unit.car.position) });
    });
    const paused = await snapshot();
    await page.waitForTimeout(300);
    assert.equal(await snapshot(), paused, 'Pause freezes pursuit');
    await page.evaluate(() => {
      const { player, vehicles, police, wanted } = window.__simulation;
      vehicles.release();
      player.state.position.set(144, 0.4, 80);
      player.state.speed = 0;
      wanted.crime(1);
      for (const unit of police.units) unit.car.position.copy(player.state.position).add({ x: 0, y: 0, z: -3 });
    });
    await page.locator('#start-button').click();
    await page.waitForFunction(() => window.__simulation.player.state.outcome?.startsWith('BUSTED'), { timeout: 20000 });
    assert(await page.evaluate(() => window.__simulation.player.state.outcome?.startsWith('BUSTED')));
    await page.screenshot({ path: '.verification/b-busted.png' });
    assert.deepEqual(errors, []);
    console.log('PASS Phase B Chromium: pistol input, ammo/reload, crime stars, vehicle theft, live police chase, pause, bust recovery, WebGL render; zero console errors.');
  } finally { await browser.close(); }
}
verify().catch(error => { console.error(error); process.exitCode = 1; });
