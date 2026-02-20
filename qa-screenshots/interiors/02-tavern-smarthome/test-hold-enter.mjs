import { chromium } from 'playwright';

const DIR = '/Users/andres/dev/platform/qa-screenshots/interiors/02-tavern-smarthome';
const URL = 'https://platform.thisisvillegas.com';

const sleep = ms => new Promise(r => setTimeout(r, ms));
let ssCount = 0;

async function ss(page, name) {
  ssCount++;
  const num = String(ssCount).padStart(2, '0');
  await page.screenshot({ path: `${DIR}/${num}-${name}.png` });
  console.log(`  [SS] ${num}-${name}`);
}

// Hold a key for a duration to ensure the game frame sees it
async function holdKey(page, key, ms) {
  await page.keyboard.down(key);
  await sleep(ms);
  await page.keyboard.up(key);
  await sleep(50);
}

// Press a key and HOLD it long enough for the game frame to detect it
// This is critical for the InteractionSystem's edge detection
async function gamePress(page, key) {
  await page.keyboard.down(key);
  await sleep(100); // hold for ~6 game frames
  await page.keyboard.up(key);
  await sleep(100); // wait for next frame to process
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();

  // === LOAD ===
  console.log('=== LOADING WORLD ===');
  await page.goto(`${URL}/world`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(10000);
  await ss(page, 'overworld');

  // === DISMISS PROMPTS ===
  console.log('=== DISMISSING PROMPTS ===');
  // Use gamePress to ensure prompts are properly dismissed
  for (let i = 0; i < 5; i++) {
    await gamePress(page, 'Space');
    await sleep(400);
  }
  await sleep(500);
  await ss(page, 'cleared');

  // Focus canvas
  const canvas = await page.$('canvas');
  if (canvas) await canvas.click({ position: { x: 640, y: 360 } });
  await sleep(300);

  // ╔═══════════════════════════════════════════╗
  // ║     TAVERN (door at tile 9,11 = 144,176)  ║
  // ║     Spawn at 496,304                       ║
  // ║     Need: LEFT 352px, UP 128px             ║
  // ╚═══════════════════════════════════════════╝
  // Note: the door OBJECT is at (144,192) but the gap in collision
  // is at row 11 (y=176). The interactable is registered at (144,192).
  // Player needs to be within 32px of (144,192).

  console.log('\n=== WALKING TO TAVERN ===');

  // Walk LEFT 352px at 100px/s = 3.52s
  // Walk continuously (no segments) to avoid modal ESC issues
  console.log('  Walking LEFT 3.6s...');
  await holdKey(page, 'ArrowLeft', 3600);

  // Dismiss any collectible modal that may have appeared
  console.log('  Dismissing any modal...');
  await gamePress(page, 'Escape');
  await sleep(300);
  await gamePress(page, 'Escape');
  await sleep(300);

  // Walk UP 112px at 100px/s = 1.12s
  console.log('  Walking UP 1.2s...');
  await holdKey(page, 'ArrowUp', 1200);

  // Dismiss again
  await gamePress(page, 'Escape');
  await sleep(300);

  await ss(page, 'near-tavern');

  // === TRY TO ENTER ===
  console.log('  Trying ENTER (held)...');
  await gamePress(page, 'Enter');
  await sleep(2000);
  await ss(page, 'enter-1');

  // Check the screenshot visually - if still overworld, try adjustments
  // Walk right a bit (door is at x=144, player might be slightly left)
  console.log('  Adjusting RIGHT 200ms...');
  await holdKey(page, 'ArrowRight', 200);
  await gamePress(page, 'Enter');
  await sleep(2000);
  await ss(page, 'enter-2');

  // Walk up 200ms
  console.log('  Adjusting UP 200ms...');
  await holdKey(page, 'ArrowUp', 200);
  await gamePress(page, 'Enter');
  await sleep(2000);
  await ss(page, 'enter-3');

  // Walk down 300ms
  console.log('  Adjusting DOWN 300ms...');
  await holdKey(page, 'ArrowDown', 300);
  await gamePress(page, 'Enter');
  await sleep(2000);
  await ss(page, 'enter-4');

  // Grid search: 15px steps (150ms at 100px/s), HOLD enter at each point
  console.log('  Grid search with held Enter...');
  const searchPattern = [
    // Row 1: walk right pressing enter
    ['ArrowRight', 150], ['ENTER'], ['ArrowRight', 150], ['ENTER'],
    ['ArrowRight', 150], ['ENTER'], ['ArrowRight', 150], ['ENTER'],
    // Move down
    ['ArrowDown', 150], ['ENTER'],
    // Row 2: walk left pressing enter
    ['ArrowLeft', 150], ['ENTER'], ['ArrowLeft', 150], ['ENTER'],
    ['ArrowLeft', 150], ['ENTER'], ['ArrowLeft', 150], ['ENTER'],
    // Move down
    ['ArrowDown', 150], ['ENTER'],
    // Row 3: walk right
    ['ArrowRight', 150], ['ENTER'], ['ArrowRight', 150], ['ENTER'],
    ['ArrowRight', 150], ['ENTER'], ['ArrowRight', 150], ['ENTER'],
    // Move up 2
    ['ArrowUp', 300], ['ENTER'],
    // Row 4: walk left
    ['ArrowLeft', 150], ['ENTER'], ['ArrowLeft', 150], ['ENTER'],
  ];

  for (const step of searchPattern) {
    if (step[0] === 'ENTER') {
      await gamePress(page, 'Enter');
      await sleep(800);
      // Quick check: also try Space
      await gamePress(page, 'Space');
      await sleep(500);
    } else {
      await holdKey(page, step[0], step[1]);
    }
  }
  await ss(page, 'grid-result');

  // Take stock of current state
  await ss(page, 'current-state');

  // === INTERIOR TESTING ===
  // If we entered an interior, test it
  console.log('\n=== INTERIOR TESTS ===');
  // Walk left toward NPC
  await holdKey(page, 'ArrowLeft', 2000);
  await sleep(300);
  await ss(page, 'walk-left-interior');

  // Talk to NPC
  await gamePress(page, 'Space');
  await sleep(2500);
  await ss(page, 'dialogue');

  // Advance dialogue
  await gamePress(page, 'Space');
  await sleep(1500);
  await ss(page, 'dialogue-2');

  // Close dialogue
  await gamePress(page, 'Escape');
  await sleep(1000);

  // Walk right toward portal
  await holdKey(page, 'ArrowRight', 3500);
  await sleep(300);
  await ss(page, 'portal-area');

  // Exit
  await gamePress(page, 'Escape');
  await sleep(3000);
  await ss(page, 'after-exit');

  // === SMART HOME ===
  console.log('\n=== SMART HOME ===');
  // From current position, walk right to smart home
  await holdKey(page, 'ArrowRight', 2500);
  await gamePress(page, 'Escape');
  await sleep(300);

  // Try to enter
  await gamePress(page, 'Enter');
  await sleep(2000);
  await ss(page, 'smarthome-enter-1');

  // Micro-adjustments
  await holdKey(page, 'ArrowUp', 200);
  await gamePress(page, 'Enter');
  await sleep(2000);

  await holdKey(page, 'ArrowDown', 300);
  await gamePress(page, 'Enter');
  await sleep(2000);

  await holdKey(page, 'ArrowRight', 200);
  await gamePress(page, 'Enter');
  await sleep(2000);

  await holdKey(page, 'ArrowLeft', 200);
  await gamePress(page, 'Enter');
  await sleep(2000);
  await ss(page, 'smarthome-tries');

  // Grid search for smart home
  for (const step of searchPattern) {
    if (step[0] === 'ENTER') {
      await gamePress(page, 'Enter');
      await sleep(500);
    } else {
      await holdKey(page, step[0], step[1]);
    }
  }
  await ss(page, 'smarthome-grid');

  // Interior tests for smart home
  await holdKey(page, 'ArrowLeft', 2000);
  await ss(page, 'smarthome-npc-area');
  await gamePress(page, 'Space');
  await sleep(2500);
  await ss(page, 'smarthome-dialogue');
  await gamePress(page, 'Escape');
  await sleep(1000);
  await holdKey(page, 'ArrowRight', 3500);
  await ss(page, 'smarthome-portal');
  await gamePress(page, 'Escape');
  await sleep(3000);
  await ss(page, 'final');

  console.log('\n=== DONE ===');
  await browser.close();
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
