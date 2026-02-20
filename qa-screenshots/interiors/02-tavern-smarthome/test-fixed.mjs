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

async function holdKey(page, key, ms) {
  await page.keyboard.down(key);
  await sleep(ms);
  await page.keyboard.up(key);
  await sleep(100);
}

// Dismiss any collectible modal, dialogue, or collectibles panel
async function dismissModal(page) {
  await page.keyboard.press('Escape');
  await sleep(500);
  await page.keyboard.press('Escape');
  await sleep(300);
}

// Walk and dismiss any modals that may appear from collectibles
async function safeWalk(page, key, ms) {
  // Walk in short segments, dismissing modals between each
  const segmentMs = 500; // Walk in 500ms segments
  let remaining = ms;

  while (remaining > 0) {
    const walkTime = Math.min(remaining, segmentMs);
    await holdKey(page, key, walkTime);
    remaining -= walkTime;

    // Quick ESC to dismiss any modal that appeared from collectible pickup
    await page.keyboard.press('Escape');
    await sleep(200);
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();

  // === LOAD WORLD ===
  console.log('=== LOADING WORLD ===');
  await page.goto(`${URL}/world`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(10000);
  await ss(page, 'overworld-loaded');

  // === DISMISS TUTORIAL PROMPTS ===
  // Prompts respond to "any key" including Space
  console.log('=== DISMISSING PROMPTS ===');
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Space');
    await sleep(600);
  }
  // Also dismiss any collectible modal that may have appeared
  await dismissModal(page);
  await sleep(500);
  await ss(page, 'prompts-cleared');

  // === FOCUS CANVAS ===
  const canvas = await page.$('canvas');
  if (canvas) await canvas.click({ position: { x: 640, y: 360 } });
  await sleep(300);

  // ╔══════════════════════════════════════════════════╗
  // ║ TAVERN: door at (144, 192), spawn at (496, 304) ║
  // ║ Speed 100px/s, go left 352px, up 112px          ║
  // ╚══════════════════════════════════════════════════╝
  console.log('\n=== WALKING TO TAVERN ===');

  // Walk LEFT 352px in safe segments (avoids getting stuck on collectible modals)
  console.log('  Safe-walking LEFT ~3.5s...');
  await safeWalk(page, 'ArrowLeft', 3600);
  await dismissModal(page);
  await ss(page, 'walked-left-to-tavern');

  // Walk UP 112px
  console.log('  Safe-walking UP ~1.2s...');
  await safeWalk(page, 'ArrowUp', 1200);
  await dismissModal(page);
  await ss(page, 'near-tavern-door');

  // === ENTER TAVERN ===
  console.log('  Pressing ENTER at tavern door...');
  await page.keyboard.press('Enter');
  await sleep(3000);
  await ss(page, 'tavern-enter-attempt-1');

  // Check if we're looking at an interior (dark bg with room) or still overworld
  // If still overworld, try micro-adjustments
  // The Enter key in the InteractionSystem uses edge detection (wasDown tracking)
  // So we need clean presses

  // Try right a bit (door center is at x=152, we may be at x=144)
  await holdKey(page, 'ArrowRight', 100);
  await dismissModal(page);
  await page.keyboard.press('Enter');
  await sleep(2000);
  await ss(page, 'tavern-enter-attempt-2');

  // Try up a bit
  await holdKey(page, 'ArrowUp', 150);
  await dismissModal(page);
  await page.keyboard.press('Enter');
  await sleep(2000);
  await ss(page, 'tavern-enter-attempt-3');

  // Try down a bit (maybe overshot)
  await holdKey(page, 'ArrowDown', 200);
  await dismissModal(page);
  await page.keyboard.press('Enter');
  await sleep(2000);
  await ss(page, 'tavern-enter-attempt-4');

  // More systematic: walk a small pattern pressing Enter frequently
  console.log('  Grid search around door...');
  const directions = [
    'ArrowUp', 'ArrowRight', 'ArrowRight',
    'ArrowDown', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowLeft', 'ArrowLeft',
    'ArrowUp', 'ArrowUp',
  ];
  for (const dir of directions) {
    await holdKey(page, dir, 150);
    await dismissModal(page);
    await page.keyboard.press('Enter');
    await sleep(1000);
  }
  await ss(page, 'tavern-grid-search');

  // At this point, let's take stock - screenshot whatever state we're in
  await ss(page, 'tavern-state-check');

  // Let me also try Space (InteractionSystem supports both Enter and Space)
  console.log('  Trying Space key...');
  await holdKey(page, 'ArrowUp', 200);
  await dismissModal(page);
  await page.keyboard.press('Space');
  await sleep(2000);
  await ss(page, 'tavern-space-attempt');

  // === IF WE'RE IN INTERIOR ===
  // Take interior screenshots
  console.log('\n=== TESTING INTERIOR (if entered) ===');
  await ss(page, 'interior-check');

  // Walk left toward NPC
  console.log('  Walking LEFT toward NPC...');
  await holdKey(page, 'ArrowLeft', 2000);
  await sleep(500);
  await ss(page, 'interior-npc-area');

  // Talk to NPC with SPACE
  console.log('  SPACE to talk...');
  await page.keyboard.press('Space');
  await sleep(2500);
  await ss(page, 'interior-dialogue');

  // Advance dialogue
  await page.keyboard.press('Space');
  await sleep(1500);
  await ss(page, 'interior-dialogue-2');

  // Close dialogue
  await page.keyboard.press('Escape');
  await sleep(1000);

  // Walk right toward portal
  console.log('  Walking RIGHT toward portal...');
  await holdKey(page, 'ArrowRight', 3500);
  await sleep(500);
  await ss(page, 'interior-portal');

  // Exit interior
  console.log('  ESC to exit...');
  await page.keyboard.press('Escape');
  await sleep(3000);
  await ss(page, 'back-to-overworld');

  // ╔══════════════════════════════════════════════════════╗
  // ║ SMART HOME: door at (368, 192)                       ║
  // ║ From tavern area: RIGHT ~224px, same Y row           ║
  // ╚══════════════════════════════════════════════════════╝
  console.log('\n=== WALKING TO SMART HOME ===');
  await safeWalk(page, 'ArrowRight', 2400);
  await dismissModal(page);
  await ss(page, 'near-smarthome');

  // Enter
  console.log('  Pressing ENTER...');
  await page.keyboard.press('Enter');
  await sleep(3000);
  await ss(page, 'smarthome-enter-1');

  // Micro adjust and try
  await holdKey(page, 'ArrowUp', 200);
  await dismissModal(page);
  await page.keyboard.press('Enter');
  await sleep(2000);

  await holdKey(page, 'ArrowDown', 300);
  await dismissModal(page);
  await page.keyboard.press('Enter');
  await sleep(2000);

  await holdKey(page, 'ArrowRight', 150);
  await dismissModal(page);
  await page.keyboard.press('Enter');
  await sleep(2000);
  await ss(page, 'smarthome-enter-tries');

  // Grid search
  for (const dir of directions) {
    await holdKey(page, dir, 150);
    await dismissModal(page);
    await page.keyboard.press('Enter');
    await sleep(800);
  }
  await ss(page, 'smarthome-grid-search');

  // Interior testing
  console.log('\n=== SMART HOME INTERIOR (if entered) ===');
  await ss(page, 'smarthome-interior-check');

  await holdKey(page, 'ArrowLeft', 2000);
  await sleep(500);
  await ss(page, 'smarthome-npc');

  await page.keyboard.press('Space');
  await sleep(2500);
  await ss(page, 'smarthome-dialogue');

  await page.keyboard.press('Escape');
  await sleep(1000);

  await holdKey(page, 'ArrowRight', 3500);
  await sleep(500);
  await ss(page, 'smarthome-portal');

  await page.keyboard.press('Escape');
  await sleep(3000);
  await ss(page, 'final-state');

  console.log('\n=== DONE ===');
  await browser.close();
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
