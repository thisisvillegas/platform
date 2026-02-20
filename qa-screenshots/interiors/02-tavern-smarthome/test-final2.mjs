import { chromium } from 'playwright';

const DIR = '/Users/andres/dev/platform/qa-screenshots/interiors/02-tavern-smarthome';
const URL = 'https://platform.thisisvillegas.com';

const sleep = ms => new Promise(r => setTimeout(r, ms));
let ssCount = 0;

async function ss(page, name) {
  ssCount++;
  const num = String(ssCount).padStart(2, '0');
  const path = `${DIR}/${num}-${name}.png`;
  await page.screenshot({ path });
  console.log(`  [SS] ${num}-${name}`);
  return path;
}

// Hold key for duration (walking)
async function hold(page, key, ms) {
  await page.keyboard.down(key);
  await sleep(ms);
  await page.keyboard.up(key);
  await sleep(50);
}

// Press key and HOLD long enough for Phaser edge detection (100ms > 1 game frame)
async function press(page, key) {
  await page.keyboard.down(key);
  await sleep(100);
  await page.keyboard.up(key);
  await sleep(150);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();

  // ════════════════════════════════════════
  // LOAD WORLD
  // ════════════════════════════════════════
  console.log('1. Loading /world...');
  await page.goto(`${URL}/world`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(12000); // Generous wait for loading scene
  await ss(page, 'loaded');

  // ════════════════════════════════════════
  // DISMISS ALL TUTORIAL PROMPTS WITH SPACE
  // No ESC! ESC might cause scene issues.
  // ════════════════════════════════════════
  console.log('2. Dismissing tutorial prompts (Space only)...');
  for (let i = 0; i < 8; i++) {
    await press(page, 'Space');
    await sleep(500);
  }
  await sleep(1000);
  await ss(page, 'ready');

  // Focus canvas
  const canvas = await page.$('canvas');
  if (canvas) await canvas.click({ position: { x: 640, y: 360 } });
  await sleep(300);

  // ════════════════════════════════════════
  // WALK TO TAVERN
  // Spawn (496, 304) → Tavern door (144, 192)
  // LEFT 352px @ 100px/s = 3.52s
  // UP 112px @ 100px/s = 1.12s
  // ════════════════════════════════════════
  console.log('3. Walking to TAVERN...');

  // Walk LEFT continuously (no interruptions!)
  console.log('  LEFT 3.5s...');
  await hold(page, 'ArrowLeft', 3500);

  // If we hit a collectible, dismiss with Space (NOT Escape!)
  await press(page, 'Space');
  await sleep(300);
  await press(page, 'Space');
  await sleep(300);

  // Walk UP
  console.log('  UP 1.2s...');
  await hold(page, 'ArrowUp', 1200);

  // Dismiss any collectible modal again
  await press(page, 'Space');
  await sleep(300);
  await press(page, 'Space');
  await sleep(300);

  await ss(page, 'near-tavern');

  // ════════════════════════════════════════
  // ENTER TAVERN - use held Enter (100ms)
  // ════════════════════════════════════════
  console.log('4. Entering tavern...');
  await press(page, 'Enter');
  await sleep(2500);
  await ss(page, 'try1');

  // If still overworld, nudge right (door is at x=144, we might be at x=144 or less)
  await hold(page, 'ArrowRight', 150);
  await press(page, 'Enter');
  await sleep(2000);
  await ss(page, 'try2');

  // Nudge up
  await hold(page, 'ArrowUp', 150);
  await press(page, 'Enter');
  await sleep(2000);
  await ss(page, 'try3');

  // Nudge down
  await hold(page, 'ArrowDown', 250);
  await press(page, 'Enter');
  await sleep(2000);
  await ss(page, 'try4');

  // Try Space instead of Enter
  await hold(page, 'ArrowUp', 100);
  await press(page, 'Space');
  await sleep(2000);
  await ss(page, 'try5-space');

  // Extended grid search — 5x5 grid, 15px per step
  console.log('5. Extended grid search...');
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      if (row % 2 === 0) {
        await hold(page, 'ArrowRight', 150);
      } else {
        await hold(page, 'ArrowLeft', 150);
      }
      await press(page, 'Enter');
      await sleep(300);
      // Dismiss any potential collectible modal
      await press(page, 'Space');
      await sleep(200);
    }
    await hold(page, 'ArrowDown', 150);
  }
  await ss(page, 'grid-done');

  // Go back up 5 rows
  await hold(page, 'ArrowUp', 750);

  // Extended grid search part 2 — go left more
  console.log('  Left offset grid...');
  await hold(page, 'ArrowLeft', 600);
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      if (row % 2 === 0) {
        await hold(page, 'ArrowRight', 150);
      } else {
        await hold(page, 'ArrowLeft', 150);
      }
      await press(page, 'Enter');
      await sleep(300);
      await press(page, 'Space');
      await sleep(200);
    }
    await hold(page, 'ArrowDown', 150);
  }
  await ss(page, 'grid2-done');

  // Take stock
  await ss(page, 'state-check');

  // ════════════════════════════════════════
  // TEST WHATEVER SCENE WE'RE IN
  // ════════════════════════════════════════
  console.log('6. Testing current state...');

  // Walk left
  await hold(page, 'ArrowLeft', 2000);
  await ss(page, 'walk-left');

  // Talk to NPC
  await press(page, 'Space');
  await sleep(2500);
  await ss(page, 'space-interact');

  // Advance
  await press(page, 'Space');
  await sleep(1500);
  await ss(page, 'space2');

  // Walk right
  await hold(page, 'ArrowRight', 3500);
  await ss(page, 'walk-right');

  // ════════════════════════════════════════
  // TRY SMART HOME
  // ════════════════════════════════════════
  console.log('\n7. Trying Smart Home...');
  // Reload and try smart home (closer to spawn)
  await page.goto(`${URL}/world`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(12000);

  // Dismiss prompts
  for (let i = 0; i < 8; i++) {
    await press(page, 'Space');
    await sleep(400);
  }
  await sleep(500);

  const canvas2 = await page.$('canvas');
  if (canvas2) await canvas2.click({ position: { x: 640, y: 360 } });
  await sleep(300);

  // Smart Home door at (368, 192) — FROM spawn (496, 304)
  // LEFT 128px @ 100px/s = 1.28s
  // UP 112px @ 100px/s = 1.12s
  console.log('  LEFT 1.3s...');
  await hold(page, 'ArrowLeft', 1300);
  await press(page, 'Space');
  await sleep(300);
  await press(page, 'Space');
  await sleep(300);

  console.log('  UP 1.2s...');
  await hold(page, 'ArrowUp', 1200);
  await press(page, 'Space');
  await sleep(300);
  await press(page, 'Space');
  await sleep(300);

  await ss(page, 'near-smarthome');

  // Enter
  console.log('  Enter Smart Home...');
  await press(page, 'Enter');
  await sleep(2500);
  await ss(page, 'sh-try1');

  // Micro-adjustments
  for (let i = 0; i < 4; i++) {
    const dirs = ['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown'];
    await hold(page, dirs[i], 150);
    await press(page, 'Space');
    await sleep(200);
    await press(page, 'Enter');
    await sleep(1500);
  }
  await ss(page, 'sh-micro');

  // Grid search
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      if (row % 2 === 0) {
        await hold(page, 'ArrowRight', 150);
      } else {
        await hold(page, 'ArrowLeft', 150);
      }
      await press(page, 'Enter');
      await sleep(250);
      await press(page, 'Space');
      await sleep(150);
    }
    await hold(page, 'ArrowDown', 150);
  }
  await ss(page, 'sh-grid');

  // Interior testing
  await hold(page, 'ArrowLeft', 2000);
  await ss(page, 'sh-interior-left');
  await press(page, 'Space');
  await sleep(2500);
  await ss(page, 'sh-dialogue');
  await hold(page, 'ArrowRight', 3500);
  await ss(page, 'sh-portal');
  await ss(page, 'final');

  console.log('\nDONE');
  await browser.close();
}

run().catch(e => { console.error(e.message); process.exit(1); });
