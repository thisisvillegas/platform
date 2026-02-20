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
  await sleep(100);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  let n = 0;
  const log = (msg) => console.log(`[${++n}] ${msg}`);

  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon'))
      console.log(`  [PAGE] ${msg.text()}`);
  });

  // ─── PHASE 1: Get guest token via API, then navigate to /world ───
  log('Validate pass code via API to get guest token');
  const resp = await page.request.post(`https://api-pi.thisisvillegas.com/api/passes/validate`, {
    data: { code: '42424242' },
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await resp.json();
  console.log(`  API response status: ${resp.status()}`);
  if (data.token) {
    console.log(`  Got guest token: ${data.token.substring(0, 20)}...`);
  } else {
    console.log(`  API response: ${JSON.stringify(data)}`);
  }

  log('Navigate to /world with token in localStorage');
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  // Set token in localStorage before navigating to /world
  if (data.token) {
    await page.evaluate((token) => {
      localStorage.setItem('guest_token', token);
    }, data.token);
  }
  await page.goto(`${BASE}/world`, { waitUntil: 'domcontentloaded', timeout: 15000 });

  log('Wait for overworld assets to load (20s)');
  await sleep(20000);
  await page.screenshot({ path: ss('01-overworld-loaded') });
  console.log(`  URL: ${page.url()}`);

  // Dismiss tutorial by pressing any key
  await page.keyboard.press('Space');
  await sleep(500);
  await page.keyboard.press('Space');
  await sleep(1000);
  await page.screenshot({ path: ss('02-overworld-ready') });

  // ─── PHASE 2: Navigate to a building door ───
  // Spawn: (496, 304). Player speed: 100 px/s.
  // The door interaction zone has 32px radius.
  //
  // Strategy: walk toward a known door then do a spiral search.
  // Smart-home door: (368, 192) — left 128px (1.28s), up 112px (1.12s)

  log('Walk toward smart-home door: left 1.3s then up 1.1s');
  await holdKey(page, 'ArrowLeft', 1300);
  await holdKey(page, 'ArrowUp', 1100);
  await page.screenshot({ path: ss('03-near-smart-home') });

  // Spiral search: walk in expanding squares pressing Enter
  log('Spiral search for door');
  let entered = false;
  const steps = [
    // inner ring
    ['ArrowUp', 200], ['Enter', 0],
    ['ArrowRight', 200], ['Enter', 0],
    ['ArrowDown', 400], ['Enter', 0],
    ['ArrowLeft', 400], ['Enter', 0],
    ['ArrowUp', 400], ['Enter', 0],
    ['ArrowRight', 200], ['Enter', 0],
    // outer ring
    ['ArrowUp', 400], ['Enter', 0],
    ['ArrowRight', 400], ['Enter', 0],
    ['ArrowDown', 600], ['Enter', 0],
    ['ArrowLeft', 600], ['Enter', 0],
    ['ArrowUp', 600], ['Enter', 0],
    ['ArrowRight', 400], ['Enter', 0],
  ];

  for (const [key, dur] of steps) {
    if (key === 'Enter') {
      await page.keyboard.press('Enter');
      await sleep(800);
    } else {
      await holdKey(page, key, dur);
    }
  }
  await sleep(2000);
  await page.screenshot({ path: ss('04-after-spiral-search') });

  // ─── PHASE 3: If still on overworld, try using the CinematicScene approach ───
  // Let's check if the scene changed by taking a screenshot comparison
  // For reliability, try a completely different building: about-house at (608, 800)
  // From spawn (496, 304): right 112px (1.12s), down 496px (4.96s)

  log('Navigate to about-house: right and far south');
  // First return to approximate spawn by undoing previous movement
  await holdKey(page, 'ArrowRight', 1300); // undo the left
  await holdKey(page, 'ArrowDown', 1100);  // undo the up
  await sleep(500);

  // Now go to about-house
  await holdKey(page, 'ArrowRight', 1200); // +112px
  await holdKey(page, 'ArrowDown', 5000);  // +496px
  await page.screenshot({ path: ss('05-near-about-house') });

  // Spiral at about-house
  log('Spiral search at about-house');
  for (const [key, dur] of steps) {
    if (key === 'Enter') {
      await page.keyboard.press('Enter');
      await sleep(800);
    } else {
      await holdKey(page, key, dur);
    }
  }
  await sleep(2000);
  await page.screenshot({ path: ss('06-about-house-spiral') });

  // ─── PHASE 4: Try walking DIRECTLY onto doors from the south ───
  // Buildings have doors on their south wall. Walk up to the building from below.
  // Tavern door is at (144, 192). From wherever we are, go there directly.

  log('Trying direct: navigate to tavern area');
  // Go to approximate center first
  await page.goto(`${BASE}/world`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await sleep(15000); // wait for reload
  await page.keyboard.press('Space');
  await sleep(500);
  await page.screenshot({ path: ss('07-fresh-overworld') });

  // From spawn (496, 304), tavern door at (144, 192)
  // Walk left 352px (3.52s), up 112px (1.12s)
  log('Walk to tavern: left 3.5s, up 1.1s');
  await holdKey(page, 'ArrowLeft', 3500);
  await holdKey(page, 'ArrowUp', 1100);
  await page.screenshot({ path: ss('08-near-tavern') });

  // Now try entering with a more thorough local search
  // Walk down 50px to be below the door, then up slowly pressing Enter every 20px
  log('Approach tavern door from below');
  await holdKey(page, 'ArrowDown', 500); // go south of door

  // Now walk up in small increments pressing Enter
  for (let i = 0; i < 15; i++) {
    await holdKey(page, 'ArrowUp', 100); // ~10px per step
    await page.keyboard.press('Enter');
    await sleep(400);
  }
  await page.screenshot({ path: ss('09-tavern-approach') });

  // Try walking right a bit and up (door might be slightly offset)
  for (let offset = 0; offset < 5; offset++) {
    await holdKey(page, 'ArrowRight', 200);
    await holdKey(page, 'ArrowDown', 300);
    for (let i = 0; i < 10; i++) {
      await holdKey(page, 'ArrowUp', 80);
      await page.keyboard.press('Enter');
      await sleep(300);
    }
  }
  await sleep(2000);
  await page.screenshot({ path: ss('10-tavern-thorough') });

  // ─── PHASE 5: Screenshot and ESC test from whatever state we're in ───
  log('Test ESC key');
  await page.keyboard.press('Escape');
  await sleep(2000);
  await page.screenshot({ path: ss('11-after-esc') });
  console.log(`  URL: ${page.url()}`);

  // Walk to exit door (down direction in interior)
  log('Walk down to exit');
  await holdKey(page, 'ArrowDown', 3000);
  await page.keyboard.press('Enter');
  await sleep(2000);
  await page.screenshot({ path: ss('12-exit-attempt') });

  // ─── PHASE 6: Check all remaining screenshots ───
  log('Final state screenshot');
  await page.screenshot({ path: ss('13-final') });
  console.log(`  Final URL: ${page.url()}`);

  await browser.close();
  log('Complete!');
})().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
