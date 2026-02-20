import { chromium } from 'playwright';
import { join } from 'path';

const DIR = '/Users/andres/dev/platform/qa-screenshots/interiors/05-about-esc-exit';
const URL = 'https://platform.thisisvillegas.com';

// Game data from code analysis:
// Player speed = 100 px/s
// Door interaction radius = 32 px
// Spawn point = (496, 304)
// Door coords from village.json:
//   tavern:     (144, 192) — diff from spawn: -352, -112
//   smart-home: (368, 192) — diff from spawn: -128, -112
//   about-house:(608, 800) — diff from spawn: +112, +496
// SUBMIT button position: (width/2, height/2+90) = canvas (640, 450)

const ss = (name) => join(DIR, `${name}.png`);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function holdKey(page, key, ms) {
  await page.keyboard.down(key);
  await sleep(ms);
  await page.keyboard.up(key);
  await sleep(150);
}

// Try entering a building: press Enter + Space, wiggle around, repeat
async function tryEnterDoor(page, attempts = 12) {
  for (let i = 0; i < attempts; i++) {
    await page.keyboard.press('Enter');
    await sleep(300);
    await page.keyboard.press('Space');
    await sleep(300);

    // Small wiggle to find door zone
    const dirs = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    await holdKey(page, dirs[i % 4], 150);
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  let step = 0;

  const log = (msg) => console.log(`[${++step}] ${msg}`);

  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon'))
      console.log(`  [PAGE] ${msg.text()}`);
  });

  // ──────────────────────────────────────────────
  // PHASE 1: Get to the overworld
  // ──────────────────────────────────────────────
  log('Navigate to site');
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(4000); // let cinematic typewriter run
  await page.screenshot({ path: ss('01-cinematic') });

  log('Click ENTER on cinematic (canvas center-bottom)');
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  // Click near bottom-center of canvas where ENTER button is
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.85);
  await sleep(2500);
  await page.screenshot({ path: ss('02-door-scene') });

  log('Type code 42424242');
  for (const d of '42424242') {
    await page.keyboard.press(`Digit${d}`);
    await sleep(80);
  }
  await sleep(300);
  await page.screenshot({ path: ss('03-code-entered') });

  log('Click SUBMIT button at (640, 450) on canvas');
  // SUBMIT button is at canvas center + 90px vertically
  // Canvas box gives us the offset. Button is at (width/2, height/2+90)
  const submitX = box.x + box.width / 2;
  const submitY = box.y + box.height / 2 + 90;
  await page.mouse.click(submitX, submitY);
  await sleep(1000);
  await page.screenshot({ path: ss('04-after-submit') });

  log('Wait for overworld to load (15s for assets)');
  // The LoadingScene can take a while with all assets
  await sleep(15000);
  await page.screenshot({ path: ss('05-overworld') });
  console.log(`  URL: ${page.url()}`);

  // Dismiss any tutorial/achievement toasts by pressing any key
  await page.keyboard.press('Space');
  await sleep(1000);

  // ──────────────────────────────────────────────
  // PHASE 2: Enter the first building (smart-home)
  // Target: (368, 192), spawn at (496, 304)
  // Delta: -128px left, -112px up
  // At 100px/s: 1.28s left, 1.12s up
  // ──────────────────────────────────────────────
  log('Walk to smart-home door: left 1.3s, up 1.2s');
  await holdKey(page, 'ArrowLeft', 1400);
  await holdKey(page, 'ArrowUp', 1200);
  await page.screenshot({ path: ss('06-near-smart-home') });

  log('Try entering smart-home');
  await tryEnterDoor(page, 16);
  await sleep(2000);
  await page.screenshot({ path: ss('07-smart-home-entry') });

  // Check if we see an interior (dark background with room)
  // If not, walk more precisely to the door
  log('Walk more precisely around the door area');
  // The door is on the south face of the building, walk up to align
  await holdKey(page, 'ArrowUp', 500);
  await page.keyboard.press('Enter');
  await sleep(1000);
  await holdKey(page, 'ArrowDown', 300);
  await page.keyboard.press('Enter');
  await sleep(1000);
  await holdKey(page, 'ArrowLeft', 200);
  await page.keyboard.press('Enter');
  await sleep(1000);
  await holdKey(page, 'ArrowRight', 400);
  await page.keyboard.press('Enter');
  await sleep(1000);
  await page.screenshot({ path: ss('08-after-door-search') });

  // ──────────────────────────────────────────────
  // PHASE 3: If still on overworld, try tavern
  // Tavern at (144, 192), smart-home was at (368, 192)
  // Delta from smart-home: -224px left, same y
  // ──────────────────────────────────────────────
  log('Try tavern: walk left 2.5s');
  await holdKey(page, 'ArrowLeft', 2500);
  // Walk down slightly to be at door level
  await holdKey(page, 'ArrowDown', 200);
  await page.screenshot({ path: ss('09-near-tavern') });

  log('Search for tavern door');
  await tryEnterDoor(page, 16);
  await sleep(2000);
  await page.screenshot({ path: ss('10-tavern-entry') });

  // ──────────────────────────────────────────────
  // PHASE 4: Try approaching from the south (doors face south)
  // Walk down past the building then up toward the door
  // ──────────────────────────────────────────────
  log('Approach door from south (below building)');
  await holdKey(page, 'ArrowDown', 1000);
  await holdKey(page, 'ArrowUp', 400);
  await page.keyboard.press('Enter');
  await sleep(1500);
  await page.screenshot({ path: ss('11-approach-south') });

  // Try another approach: walk right along the building row
  await holdKey(page, 'ArrowRight', 1000);
  await holdKey(page, 'ArrowUp', 300);
  await page.keyboard.press('Enter');
  await sleep(1500);
  await holdKey(page, 'ArrowDown', 200);
  await page.keyboard.press('Enter');
  await sleep(1500);
  await page.screenshot({ path: ss('12-another-attempt') });

  // Walk right more toward more buildings
  await holdKey(page, 'ArrowRight', 2000);
  await page.keyboard.press('Enter');
  await sleep(1500);
  await holdKey(page, 'ArrowUp', 300);
  await page.keyboard.press('Enter');
  await sleep(1500);
  await page.screenshot({ path: ss('13-exploring') });

  // ──────────────────────────────────────────────
  // PHASE 5: Systematic sweep — walk right slowly, pressing Enter at each step
  // This should definitely find a door
  // ──────────────────────────────────────────────
  log('Systematic sweep: walk right, pressing Enter at intervals');
  for (let i = 0; i < 30; i++) {
    await holdKey(page, 'ArrowRight', 200);
    await page.keyboard.press('Enter');
    await sleep(200);
  }
  await sleep(1000);
  await page.screenshot({ path: ss('14-sweep-right') });

  // Walk back and sweep upward
  log('Sweep up');
  for (let i = 0; i < 20; i++) {
    await holdKey(page, 'ArrowUp', 200);
    await page.keyboard.press('Enter');
    await sleep(200);
  }
  await sleep(1000);
  await page.screenshot({ path: ss('15-sweep-up') });

  // Walk left and sweep
  log('Sweep left along building row');
  for (let i = 0; i < 30; i++) {
    await holdKey(page, 'ArrowLeft', 200);
    await page.keyboard.press('Enter');
    await sleep(200);
  }
  await sleep(2000);
  await page.screenshot({ path: ss('16-sweep-left') });

  // At this point we should be inside a building or near one
  // Check what we see
  log('Interior state check');
  await page.screenshot({ path: ss('17-current-state') });

  // ──────────────────────────────────────────────
  // PHASE 6: Test ESC
  // ──────────────────────────────────────────────
  log('Press ESC');
  await page.keyboard.press('Escape');
  await sleep(2000);
  await page.screenshot({ path: ss('18-after-esc') });
  console.log(`  URL: ${page.url()}`);

  // ──────────────────────────────────────────────
  // PHASE 7: Walk to about-house (608, 800)
  // From wherever we are, go right and way down
  // ──────────────────────────────────────────────
  log('Navigate toward about-house (far south-east)');
  await holdKey(page, 'ArrowRight', 5000);
  await holdKey(page, 'ArrowDown', 8000);
  await page.screenshot({ path: ss('19-walking-south') });

  // Sweep for about-house door
  log('Sweep for about-house door');
  for (let i = 0; i < 20; i++) {
    await holdKey(page, 'ArrowLeft', 200);
    await page.keyboard.press('Enter');
    await sleep(200);
  }
  await sleep(1000);
  for (let i = 0; i < 20; i++) {
    await holdKey(page, 'ArrowUp', 200);
    await page.keyboard.press('Enter');
    await sleep(200);
  }
  await sleep(2000);
  await page.screenshot({ path: ss('20-about-house-area') });

  // ──────────────────────────────────────────────
  // PHASE 8: Test ESC from wherever we are
  // ──────────────────────────────────────────────
  log('ESC from current state');
  await page.keyboard.press('Escape');
  await sleep(2000);
  await page.screenshot({ path: ss('21-after-esc-2') });

  // ──────────────────────────────────────────────
  // PHASE 9: Walk down to exit (if in interior)
  // ──────────────────────────────────────────────
  log('Walk down to exit door');
  await holdKey(page, 'ArrowDown', 3000);
  await page.keyboard.press('Enter');
  await sleep(2000);
  await page.screenshot({ path: ss('22-exit-attempt') });

  // Final state
  await page.screenshot({ path: ss('23-final') });
  console.log(`  Final URL: ${page.url()}`);

  await browser.close();
  log('Done!');
})().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
