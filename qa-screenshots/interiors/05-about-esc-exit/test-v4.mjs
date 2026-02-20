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

// Clear any collectible modal or panel overlay, then try Enter for door
async function clearAndEnter(page) {
  await page.keyboard.press('Escape');
  await sleep(300);
  await page.keyboard.press('Escape');
  await sleep(300);
  await page.keyboard.press('Enter');
  await sleep(500);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  let n = 0;
  const log = (msg) => console.log(`\n[${++n}] ${msg}`);

  // ─── Get to overworld directly ───
  log('Navigate to /world');
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  // Set a dummy guest token so the game loads
  await page.evaluate(() => {
    // Check if there's already a token; if not, the game should still load for /world
    if (!localStorage.getItem('guest_token')) {
      // Navigate without token - the overworld route should load
    }
  });
  await page.goto(`${BASE}/world`, { waitUntil: 'domcontentloaded' });

  log('Wait for assets to load (25s)');
  await sleep(25000);
  await page.screenshot({ path: ss('v4-01-overworld') });
  console.log(`  URL: ${page.url()}`);

  // Clear tutorial overlay
  await page.keyboard.press('Escape');
  await sleep(300);
  await page.keyboard.press('Space');
  await sleep(500);
  await page.keyboard.press('Escape');
  await sleep(500);

  // ─── Strategy: Use exact door coordinates ───
  // Game: 800x600, Spawn: (496, 304)
  // Player speed: 100 px/s in game coordinates
  //
  // Door positions:
  //   tavern:      x=144, y=192
  //   smart-home:  x=368, y=192
  //   war-room:    x=592, y=192
  //   greenhouse:  x=816, y=192  (wait, that's outside 800 width?)
  //
  // Actually the map is 80x60 tiles * 16px = 1280x960 game pixels.
  // Camera follows the player. So game coordinates can be up to 1280x960.
  //
  // From spawn (496, 304) to tavern (144, 192):
  //   left 352px (3.52s), up 112px (1.12s)
  //
  // From spawn (496, 304) to about-house (608, 800):
  //   right 112px (1.12s), down 496px (4.96s)

  // ─── BUILDING 1: Try the closest buildings ───
  // The stone building visible in screenshot is at the spawn position center.
  // Looking at the map, the large stone building is the "war-room" or "plaza"
  // which appears to be right near spawn.

  // Let's try the simplest approach: walk straight UP from spawn
  // Several buildings are directly north of spawn
  log('Walk up from spawn toward buildings');
  await holdKey(page, 'ArrowUp', 1200);
  // Clear any collectible pickup
  await page.keyboard.press('Escape');
  await sleep(300);
  await page.keyboard.press('Escape');
  await sleep(300);
  await page.screenshot({ path: ss('v4-02-walked-up') });

  // Now try Enter
  await page.keyboard.press('Enter');
  await sleep(2000);
  await page.screenshot({ path: ss('v4-03-after-enter') });

  // Hmm, might be blocked by the building wall.
  // Walk down to the door level (doors are on south face)
  log('Walk back down to door level');
  await holdKey(page, 'ArrowDown', 400);
  await page.keyboard.press('Escape'); // clear popups
  await sleep(200);

  // Walk left to align with a door
  await holdKey(page, 'ArrowLeft', 500);
  await page.keyboard.press('Escape');
  await sleep(200);
  await page.keyboard.press('Enter');
  await sleep(2000);
  await page.screenshot({ path: ss('v4-04-try-door') });

  // ─── BUILDING 2: Walk to smart-home ───
  // From spawn: left 128px (1.28s), up 112px (1.12s)
  log('Reset to spawn area and walk to smart-home');
  // Navigate back to spawn area
  await page.goto(`${BASE}/world`, { waitUntil: 'domcontentloaded' });
  await sleep(18000);
  // Clear overlays
  await page.keyboard.press('Escape');
  await sleep(300);
  await page.keyboard.press('Space');
  await sleep(300);
  await page.keyboard.press('Escape');
  await sleep(300);

  await page.screenshot({ path: ss('v4-05-fresh-spawn') });

  // Walk to smart-home: left 1.3s, up 1.1s
  log('Walk to smart-home door: LEFT 1.3s, UP 1.1s');
  await holdKey(page, 'ArrowLeft', 1300);
  await page.keyboard.press('Escape'); // clear any collectible
  await sleep(200);
  await holdKey(page, 'ArrowUp', 1100);
  await page.keyboard.press('Escape'); // clear any collectible
  await sleep(200);
  await page.screenshot({ path: ss('v4-06-at-smart-home') });

  // Now enter
  await page.keyboard.press('Enter');
  await sleep(3000);
  await page.screenshot({ path: ss('v4-07-enter-smart-home') });

  // If we picked up a collectible, close it and try again
  await page.keyboard.press('Escape');
  await sleep(500);

  // Micro-adjustments near the door
  log('Micro-adjust around smart-home door');
  const microDirs = [
    'ArrowDown', 'ArrowDown', 'ArrowUp',
    'ArrowRight', 'ArrowLeft', 'ArrowUp',
    'ArrowDown', 'ArrowRight', 'ArrowUp',
    'ArrowLeft', 'ArrowDown', 'ArrowUp',
  ];
  for (const dir of microDirs) {
    await holdKey(page, dir, 150);
    await page.keyboard.press('Escape'); // clear collectible
    await sleep(100);
    await page.keyboard.press('Enter');
    await sleep(500);
  }
  await page.screenshot({ path: ss('v4-08-micro-adjust') });

  // ─── Try a different strategy: Walk along the road and approach doors systematically ───
  // Reload to reset position
  log('Fresh start: walk along top road');
  await page.goto(`${BASE}/world`, { waitUntil: 'domcontentloaded' });
  await sleep(18000);
  await page.keyboard.press('Escape');
  await sleep(200);
  await page.keyboard.press('Space');
  await sleep(200);
  await page.keyboard.press('Escape');
  await sleep(200);

  // From spawn (496, 304), walk UP to the road (y ~ 192 area)
  // Up 112px = 1.12s
  await holdKey(page, 'ArrowUp', 1100);
  await page.keyboard.press('Escape');
  await sleep(200);

  // Now walk LEFT along the road, pressing ESC+Enter every 0.3s (30px = 0.3s)
  log('Sweep LEFT along building row, trying doors');
  for (let i = 0; i < 40; i++) {
    await holdKey(page, 'ArrowLeft', 100);
    await page.keyboard.press('Escape');
    await sleep(100);
    await page.keyboard.press('Enter');
    await sleep(200);
  }
  await page.screenshot({ path: ss('v4-09-sweep-left') });

  // Walk back right and sweep the other direction
  log('Sweep RIGHT along building row');
  for (let i = 0; i < 60; i++) {
    await holdKey(page, 'ArrowRight', 100);
    await page.keyboard.press('Escape');
    await sleep(100);
    await page.keyboard.press('Enter');
    await sleep(200);
  }
  await sleep(2000);
  await page.screenshot({ path: ss('v4-10-sweep-right') });

  // Check state
  log('ESC test');
  await page.keyboard.press('Escape');
  await sleep(2000);
  await page.screenshot({ path: ss('v4-11-esc-test') });

  // ─── Try about-house (south of map) ───
  log('Navigate to about-house area (south)');
  // From wherever we are, go back to center and walk far down
  await page.goto(`${BASE}/world`, { waitUntil: 'domcontentloaded' });
  await sleep(18000);
  await page.keyboard.press('Escape');
  await sleep(200);
  await page.keyboard.press('Space');
  await sleep(200);
  await page.keyboard.press('Escape');
  await sleep(200);

  // About-house at (608, 800). From spawn (496, 304): right 112px, down 496px
  await holdKey(page, 'ArrowRight', 1200);
  await page.keyboard.press('Escape');
  await sleep(200);
  await holdKey(page, 'ArrowDown', 5000);
  await page.keyboard.press('Escape');
  await sleep(200);
  await page.screenshot({ path: ss('v4-12-about-area') });

  // Sweep up-down near about-house
  log('Search for about-house door');
  for (let i = 0; i < 20; i++) {
    await holdKey(page, 'ArrowUp', 100);
    await page.keyboard.press('Escape');
    await sleep(100);
    await page.keyboard.press('Enter');
    await sleep(200);
  }
  // Walk left a bit and down
  await holdKey(page, 'ArrowLeft', 500);
  for (let i = 0; i < 20; i++) {
    await holdKey(page, 'ArrowDown', 100);
    await page.keyboard.press('Escape');
    await sleep(100);
    await page.keyboard.press('Enter');
    await sleep(200);
  }
  await sleep(2000);
  await page.screenshot({ path: ss('v4-13-about-search') });

  // ESC + final check
  log('Final ESC and state');
  await page.keyboard.press('Escape');
  await sleep(2000);
  await page.screenshot({ path: ss('v4-14-final') });
  console.log(`  Final URL: ${page.url()}`);

  await browser.close();
  log('Done!');
})().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
