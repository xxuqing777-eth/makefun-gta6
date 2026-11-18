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
    await page.goto(`${process.env.GAME_URL || 'http://127.0.0.1:8901/'}?verify=1`);
    await page.waitForFunction(() => window.__cityReady);
    assert(await page.locator('#hud').isHidden());
    assert(await page.locator('#menu-title').evaluate(element => element.getBoundingClientRect().top >= 0));
    await page.screenshot({ path: '.verification/c-menu.png' });
    await page.locator('#start-button').click();
    await page.waitForFunction(() => !!document.pointerLockElement);
    await page.keyboard.press('KeyF');
    await page.keyboard.press('KeyE');
    await page.waitForFunction(() => window.__simulation.missions.progress.stage === 2);
    await page.keyboard.down('KeyW'); await page.waitForTimeout(250); await page.keyboard.up('KeyW');
    assert.equal(await page.evaluate(() => window.__simulation.audio.state), 'running');
    await page.evaluate(() => {
      const { player, vehicles } = window.__simulation;
      vehicles.current.position.set(96, 0.12, 96); vehicles.current.speed = 0; player.state.position.set(96, 0.4, 96);
    });
    await page.keyboard.press('KeyF');
    assert.equal(await page.evaluate(() => window.__simulation.player.state.money), 400);
    await page.evaluate(() => {
      const { player, vehicles, missions, wanted, combat } = window.__simulation;
      const go = (positionX, positionZ) => { player.state.position.set(positionX, 0.4, positionZ); if (vehicles.current) { vehicles.current.position.set(positionX, 0.12, positionZ); vehicles.current.speed = 0; } };
      go(144, 80); missions.interact();
      for (let frame = 0; frame < 1500; frame++) wanted.update(1 / 60, false);
      missions.update(0);
      missions.interact(); missions.interact(); go(96, 0); missions.interact(); vehicles.release(); combat.switchWeapon();
      for (const guard of combat.enemies.slice(0, 2)) {
        go(guard.model.position.x, guard.model.position.z + 4); player.state.yaw = 0;
        for (let shot = 0; shot < 3; shot++) { combat.attack(); combat.update(0.3); missions.update(0.3); }
      }
      go(144, 80); missions.interact(); go(-48, -48); missions.interact();
    });
    await page.mouse.click(640, 360);
    await page.waitForTimeout(250);
    await page.screenshot({ path: '.verification/c-finale.png' });
    await page.evaluate(() => {
      const { player, wanted, missions } = window.__simulation;
      for (let frame = 0; frame < 4000; frame++) wanted.update(1 / 60, false);
      player.state.position.set(144, 0.4, 96); missions.interact();
    });
    assert.equal(await page.evaluate(() => window.__simulation.missions.progress.index), 4);
    assert.equal(await page.evaluate(() => window.__simulation.player.state.xp), 1250);
    await page.keyboard.press('KeyM'); assert(await page.evaluate(() => window.__simulation.audio.muted));
    await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.pointerLockElement);
    await page.locator('#save-button').click();
    assert.match(await page.locator('#save-message').textContent(), /Saved/);
    await page.reload(); await page.waitForFunction(() => window.__cityReady);
    await page.locator('#load-button').click();
    assert.equal(await page.evaluate(() => window.__simulation.player.state.money), 4800);
    assert.equal(await page.evaluate(() => window.__simulation.missions.progress.index), 4);
    await page.locator('#new-button').click(); await page.locator('#new-button').click();
    assert.equal(await page.evaluate(() => window.__simulation.missions.progress.index), 0);
    await page.setViewportSize({ width: 800, height: 600 });
    assert(await page.locator('#menu-title').evaluate(element => element.getBoundingClientRect().top >= 0));
    assert.deepEqual(errors, []);
    console.log('PASS Phase C Chromium: four missions, rewards, real input/combat, audio running/mute, menu layout, pause/save/reload/load/new game, WebGL; zero console errors.');
  } finally { await browser.close(); }
}
verify().catch(error => { console.error(error); process.exitCode = 1; });
