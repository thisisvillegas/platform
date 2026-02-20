import { chromium } from 'playwright';
import { join } from 'path';

const DIR = '/Users/andres/dev/platform/qa-screenshots/interiors/05-about-esc-exit';
const BASE = 'https://platform.thisisvillegas.com';

const ss = (name) => join(DIR, `${name}.png`);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function holdKey(page, key, ms) {
  await page.keyboard.down(key);
  await sleep(ms);
  await page.keyboard.up(key);
  await sleep(80);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  let n = 0;
  const log = (msg) => console.log(`\n[${++n}] ${msg}`);

  // ─── PHASE 1: Get to overworld ───
  log('Navigate to /world');
  await page.goto(`${BASE}/world`, { waitUntil: 'domcontentloaded' });
  await sleep(20000);
  await page.keyboard.press('Escape');
  await sleep(200);
  await page.screenshot({ path: ss('v5-01-spawn') });

  // ─── PHASE 2: Enter Smart Home again to test exit-door behavior ───
  // From v4, the sweep-left worked. Spawn at (496, 304).
  // Walk left and up to building row, then sweep left pressing ESC+Enter
  log('Walk to smart-home door: left 1.3s, up 1.1s');
  await holdKey(page, 'ArrowLeft', 1300);
  await page.keyboard.press('Escape');
  await sleep(200);
  await holdKey(page, 'ArrowUp', 1100);
  await page.keyboard.press('Escape');
  await sleep(200);

  // Sweep left to find door (same pattern that worked in v4)
  log('Sweep left for door');
  for (let i = 0; i < 30; i++) {
    await holdKey(page, 'ArrowLeft', 100);
    await page.keyboard.press('Escape');
    await sleep(100);
    await page.keyboard.press('Enter');
    await sleep(200);
  }
  await sleep(3000);
  await page.screenshot({ path: ss('v5-02-interior-1') });

  // ─── PHASE 3: Test walking to exit door ───
  // Exit door is at the bottom center of the interior room.
  // Walk DOWN to reach it.
  log('Walk DOWN to exit door area');
  await holdKey(page, 'ArrowDown', 2500);
  await sleep(1000);
  await page.screenshot({ path: ss('v5-03-near-exit') });

  // The exit should show a prompt. Press Enter to leave.
  log('Press Enter at exit door');
  await page.keyboard.press('Enter');
  await sleep(3000);
  await page.screenshot({ path: ss('v5-04-after-exit-door') });
  console.log(`  URL: ${page.url()}`);

  // ─── PHASE 4: Enter tavern (different building) ───
  // Tavern at (144, 192). From wherever we are (near smart-home exit),
  // walk LEFT to reach tavern.
  log('Walk to tavern: far left');
  await holdKey(page, 'ArrowLeft', 2500);
  await page.keyboard.press('Escape');
  await sleep(200);

  // Sweep up/down to find tavern door
  log('Sweep for tavern door');
  for (let i = 0; i < 15; i++) {
    await holdKey(page, 'ArrowUp', 100);
    await page.keyboard.press('Escape');
    await sleep(100);
    await page.keyboard.press('Enter');
    await sleep(300);
  }
  for (let i = 0; i < 15; i++) {
    await holdKey(page, 'ArrowDown', 100);
    await page.keyboard.press('Escape');
    await sleep(100);
    await page.keyboard.press('Enter');
    await sleep(300);
  }
  // Try left a bit more
  for (let i = 0; i < 15; i++) {
    await holdKey(page, 'ArrowLeft', 100);
    await page.keyboard.press('Escape');
    await sleep(100);
    await page.keyboard.press('Enter');
    await sleep(300);
  }
  await sleep(3000);
  await page.screenshot({ path: ss('v5-05-tavern-interior') });

  // ─── PHASE 5: ESC exit from tavern ───
  log('ESC from tavern');
  await page.keyboard.press('Escape');
  await sleep(2000);
  await page.screenshot({ path: ss('v5-06-after-esc-tavern') });

  // ─── PHASE 6: Navigate to about-house ───
  // about-house at (608, 800). From tavern area (~144, 192):
  // Right 464px (4.64s), Down 608px (6.08s)
  log('Walk to about-house: right 4.6s, down 6s');
  await holdKey(page, 'ArrowRight', 4600);
  await page.keyboard.press('Escape');
  await sleep(200);
  await holdKey(page, 'ArrowDown', 6000);
  await page.keyboard.press('Escape');
  await sleep(200);
  await page.screenshot({ path: ss('v5-07-near-about') });

  // Sweep for about-house door
  log('Sweep for about-house door');
  for (let i = 0; i < 20; i++) {
    await holdKey(page, 'ArrowUp', 100);
    await page.keyboard.press('Escape');
    await sleep(100);
    await page.keyboard.press('Enter');
    await sleep(300);
  }
  for (let i = 0; i < 15; i++) {
    await holdKey(page, 'ArrowRight', 100);
    await page.keyboard.press('Escape');
    await sleep(100);
    await page.keyboard.press('Enter');
    await sleep(300);
  }
  for (let i = 0; i < 15; i++) {
    await holdKey(page, 'ArrowDown', 100);
    await page.keyboard.press('Escape');
    await sleep(100);
    await page.keyboard.press('Enter');
    await sleep(300);
  }
  for (let i = 0; i < 15; i++) {
    await holdKey(page, 'ArrowLeft', 100);
    await page.keyboard.press('Escape');
    await sleep(100);
    await page.keyboard.press('Enter');
    await sleep(300);
  }
  await sleep(3000);
  await page.screenshot({ path: ss('v5-08-about-interior') });

  // ESC from about-house
  log('ESC from about-house');
  await page.keyboard.press('Escape');
  await sleep(2000);
  await page.screenshot({ path: ss('v5-09-after-esc-about') });

  // ─── PHASE 7: Enter one more different building (try war-room at 592,192) ───
  // From about-house area (608, 800), go UP to building row: up 608px (6.08s)
  log('Walk north to building row for a third building');
  await holdKey(page, 'ArrowUp', 6000);
  await page.keyboard.press('Escape');
  await sleep(200);

  // Sweep right to find a door
  log('Sweep right for third building');
  for (let i = 0; i < 30; i++) {
    await holdKey(page, 'ArrowRight', 100);
    await page.keyboard.press('Escape');
    await sleep(100);
    await page.keyboard.press('Enter');
    await sleep(200);
  }
  await sleep(3000);
  await page.screenshot({ path: ss('v5-10-third-building') });

  // ESC
  await page.keyboard.press('Escape');
  await sleep(2000);
  await page.screenshot({ path: ss('v5-11-final') });
  console.log(`  Final URL: ${page.url()}`);

  await browser.close();
  log('Complete!');
})().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
