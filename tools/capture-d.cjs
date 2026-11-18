const assert = require('node:assert/strict');
const { readFileSync, mkdirSync } = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

async function capture() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    headless: true,
    args: ['--headless=new', '--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1280,720']
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    const base = process.env.GAME_URL || 'http://127.0.0.1:8901/';
    await page.goto(base);
    await page.waitForFunction(() => window.__cityReady);
    assert(await page.locator('.menu-card').evaluate(element => {
      const bounds = element.getBoundingClientRect();
      return bounds.top >= 0 && bounds.bottom <= innerHeight;
    }), 'Entire start menu must fit at 720px');
    assert(await page.locator('#game').evaluate(element => {
      const bounds = element.getBoundingClientRect();
      return bounds.top === 0 && bounds.bottom === innerHeight && bounds.width === innerWidth;
    }), '3D canvas must fill the viewport');
    mkdirSync('screenshots', { recursive: true });
    for (const shot of JSON.parse(readFileSync('shots.json', 'utf8'))) {
      await page.goto(base + shot.query);
      await page.waitForFunction(() => window.__cityReady);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert(await page.locator('#hud').isVisible());
      assert(await page.locator('#start-screen').isHidden());
      assert((await page.locator('#objective strong').textContent()).length > 0);
      if (shot.name === '1-cover.jpg') assert.match(await page.locator('#wanted').textContent(), /★★★/);
      const first = await page.screenshot({ type: 'jpeg', quality: 85 });
      await page.waitForTimeout(150);
      assert(first.equals(await page.screenshot({ type: 'jpeg', quality: 85 })), 'Shot must remain deterministic');
      let image;
      for (const quality of [85, 75, 65, 55]) {
        image = await page.screenshot({ path: `screenshots/${shot.name}`, type: 'jpeg', quality });
        if (image.length <= 262144) break;
      }
      assert(image.length <= 262144, 'JPEG exceeds 256 KiB');
      console.log(`${shot.name}: 1280×720, ${image.length} bytes`);
    }
    assert.deepEqual(errors, []);
    console.log('PASS: full-height canvas, start menu, four deterministic real renders, zero console errors.');
  } finally {
    await browser.close();
  }
}

capture().catch(error => { console.error(error); process.exitCode = 1; });
