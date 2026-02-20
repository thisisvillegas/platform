import { chromium } from 'playwright';
import { join } from 'path';

const SCREENSHOT_DIR = '/Users/andres/dev/platform/qa-screenshots/interiors/05-about-esc-exit';
const URL = 'https://platform.thisisvillegas.com';

// Map data from village.json
// Spawn point: (496, 304)
// About-house door: (608, 800) - need to go right+down
// Tavern door: (144, 192) - need to go left+up
// Smart-home door: (368, 192) - need to go left+up
// Tile size: 16px

function ss(name) {
  return join(SCREENSHOT_DIR, `${name}.png`);
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function holdKey(page, key, duration) {
  await page.keyboard.down(key);
  await sleep(duration);
  await page.keyboard.up(key);
  await sleep(100);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error' && !text.includes('favicon')) {
      console.log(`  [PAGE ERROR] ${text}`);
    }
  });

  // ===== STEP 1: Navigate to the site =====
  console.log('STEP 1: Navigate to site');
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(3000); // Let cinematic load
  await page.screenshot({ path: ss('01-cinematic'), fullPage: false });
  console.log('  Screenshot: 01-cinematic');

  // ===== STEP 2: Click ENTER button (mouse click on the canvas) =====
  console.log('STEP 2: Click ENTER button on cinematic');
  // The cinematic is rendered in a Phaser canvas. The ENTER button should be clickable.
  // Try to find a clickable element or click the canvas at a reasonable position
  try {
    // Try clicking an HTML button first
    const enterBtn = page.locator('button').filter({ hasText: /enter/i }).first();
    await enterBtn.click({ timeout: 3000 });
    console.log('  Clicked HTML ENTER button');
  } catch (e) {
    // It's a Phaser scene - click the center-bottom area of the canvas where ENTER typically is
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (box) {
      // The ENTER button in CinematicScene is typically near the bottom center
      await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.85);
      console.log('  Clicked canvas at ENTER button position');
    }
  }
  await sleep(2000);
  await page.screenshot({ path: ss('02-after-enter-click'), fullPage: false });
  console.log('  Screenshot: 02-after-enter-click');
  console.log(`  URL: ${page.url()}`);

  // ===== STEP 3: Enter code 42424242 =====
  console.log('STEP 3: Enter access code');
  await sleep(1000);

  // Check if we're on the door scene (still on canvas) or if there's an input field
  const currentUrl = page.url();
  console.log(`  Current URL: ${currentUrl}`);

  // DoorScene is a Phaser scene - type digits directly via keyboard
  // The DoorScene listens for keyboard digit input
  for (const digit of '42424242') {
    await page.keyboard.press(`Digit${digit}`);
    await sleep(100);
  }
  await sleep(500);
  await page.screenshot({ path: ss('03-code-entered'), fullPage: false });
  console.log('  Screenshot: 03-code-entered');

  // ===== STEP 4: Click SUBMIT =====
  console.log('STEP 4: Click SUBMIT');
  // DoorScene has a submit button rendered in Phaser canvas
  // Try clicking where the SUBMIT button would be
  const canvas2 = page.locator('canvas').first();
  const box2 = await canvas2.boundingBox();
  if (box2) {
    // The submit button is typically below the code display, center of the door
    await page.mouse.click(box2.x + box2.width / 2, box2.y + box2.height / 2 + 80);
    console.log('  Clicked SUBMIT area on canvas');
  }
  await sleep(1000);
  await page.screenshot({ path: ss('04-after-submit-click'), fullPage: false });
  console.log('  Screenshot: 04-after-submit-click');

  // ===== STEP 5: Wait for overworld to load =====
  console.log('STEP 5: Waiting for overworld...');
  await sleep(5000);
  await page.screenshot({ path: ss('05-overworld-loaded'), fullPage: false });
  console.log('  Screenshot: 05-overworld-loaded');
  console.log(`  URL: ${page.url()}`);

  // ===== STEP 6: Navigate to a building =====
  // Player spawns at (496, 304). Tavern door is at (144, 192).
  // That's about 22 tiles left, 7 tiles up. With 16px tiles at walk speed, we need to hold keys.
  // Let's first try going to the tavern (closest building going left+up)
  console.log('STEP 6: Walk toward tavern (left + up from spawn)');

  // Walk left for a while (spawn at x=496, tavern at x=144, diff=352px)
  await holdKey(page, 'ArrowLeft', 4000);
  await page.screenshot({ path: ss('06-walking-left'), fullPage: false });

  // Walk up (spawn at y=304, tavern at y=192, diff=112px)
  await holdKey(page, 'ArrowUp', 2000);
  await sleep(500);
  await page.screenshot({ path: ss('07-near-building'), fullPage: false });
  console.log('  Screenshot: 07-near-building');

  // ===== STEP 7: Enter the building =====
  console.log('STEP 7: Enter building (press Enter)');
  await page.keyboard.press('Enter');
  await sleep(3000);
  await page.screenshot({ path: ss('08-interior-first-building'), fullPage: false });
  console.log('  Screenshot: 08-interior-first-building');
  console.log(`  URL: ${page.url()}`);

  // If we didn't enter, try adjusting position
  // Try moving around near the door and pressing Enter
  if (!page.url().includes('interior') && !page.url().includes('building')) {
    console.log('  Not in interior yet, adjusting position...');
    // Try different positions near the door
    for (let attempt = 0; attempt < 8; attempt++) {
      const directions = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft',
                          'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'];
      await holdKey(page, directions[attempt], 400);
      await page.keyboard.press('Enter');
      await sleep(1000);
      // Take a screenshot to see if something changed visually
    }
    await page.screenshot({ path: ss('08b-after-adjustment'), fullPage: false });
    console.log('  Screenshot: 08b-after-adjustment');
  }

  // ===== STEP 8: Test ESC exit =====
  console.log('STEP 8: Test ESC exit from interior');
  await sleep(500);
  await page.keyboard.press('Escape');
  await sleep(2000);
  await page.screenshot({ path: ss('09-after-esc-exit'), fullPage: false });
  console.log('  Screenshot: 09-after-esc-exit');
  console.log(`  URL after ESC: ${page.url()}`);

  // ===== STEP 9: Enter another building =====
  // Walk to smart-home (x=368, y=192)
  console.log('STEP 9: Walk to another building');
  // From tavern area, walk right to smart-home
  await holdKey(page, 'ArrowRight', 3000);
  await holdKey(page, 'ArrowUp', 1000);
  await page.screenshot({ path: ss('10-walking-to-second-building'), fullPage: false });

  // Try to enter
  await page.keyboard.press('Enter');
  await sleep(2000);
  await page.screenshot({ path: ss('11-second-building-interior'), fullPage: false });
  console.log('  Screenshot: 11-second-building-interior');

  // If didn't enter, adjust
  for (let attempt = 0; attempt < 6; attempt++) {
    const directions = ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowUp'];
    await holdKey(page, directions[attempt], 300);
    await page.keyboard.press('Enter');
    await sleep(800);
  }
  await page.screenshot({ path: ss('11b-second-attempt'), fullPage: false });

  // ===== STEP 10: Test walking to exit door =====
  console.log('STEP 10: Walk DOWN to exit door');
  // In interior, exit door is at the bottom center
  await holdKey(page, 'ArrowDown', 3000);
  await sleep(500);
  await page.screenshot({ path: ss('12-walking-to-exit'), fullPage: false });
  console.log('  Screenshot: 12-walking-to-exit (should show exit prompt)');

  // Press Enter to exit via door
  await page.keyboard.press('Enter');
  await sleep(2000);
  await page.screenshot({ path: ss('13-after-door-exit'), fullPage: false });
  console.log('  Screenshot: 13-after-door-exit');
  console.log(`  URL after door exit: ${page.url()}`);

  // ===== STEP 11: Navigate to about-house =====
  // About-house is at (608, 800) - need to go right and far down from spawn (496, 304)
  console.log('STEP 11: Navigate to about-house');
  // First go right
  await holdKey(page, 'ArrowRight', 2000);
  // Then go far down (496px down)
  await holdKey(page, 'ArrowDown', 6000);
  await page.screenshot({ path: ss('14-walking-to-about-house'), fullPage: false });

  // More down
  await holdKey(page, 'ArrowDown', 3000);
  await holdKey(page, 'ArrowRight', 1000);
  await page.screenshot({ path: ss('15-near-about-house'), fullPage: false });

  // Try entering
  await page.keyboard.press('Enter');
  await sleep(2000);
  await page.screenshot({ path: ss('16-about-house-interior'), fullPage: false });
  console.log('  Screenshot: 16-about-house-interior');

  // Adjust position if needed
  for (let attempt = 0; attempt < 8; attempt++) {
    const directions = ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight',
                        'ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];
    await holdKey(page, directions[attempt], 400);
    await page.keyboard.press('Enter');
    await sleep(800);
  }
  await page.screenshot({ path: ss('16b-about-house-attempt'), fullPage: false });

  // ===== STEP 12: ESC from about-house =====
  console.log('STEP 12: ESC from about-house');
  await page.keyboard.press('Escape');
  await sleep(2000);
  await page.screenshot({ path: ss('17-esc-from-about-house'), fullPage: false });
  console.log('  Screenshot: 17-esc-from-about-house');
  console.log(`  URL after ESC from about-house: ${page.url()}`);

  // ===== STEP 13: Enter a third building (theater or different one) =====
  console.log('STEP 13: Find a third building');
  // Walk back up and left toward other buildings
  await holdKey(page, 'ArrowUp', 4000);
  await holdKey(page, 'ArrowLeft', 2000);
  await page.screenshot({ path: ss('18-walking-to-third-building'), fullPage: false });

  await page.keyboard.press('Enter');
  await sleep(2000);
  await page.screenshot({ path: ss('19-third-building-attempt'), fullPage: false });

  // Walk more to find a door
  await holdKey(page, 'ArrowLeft', 2000);
  await holdKey(page, 'ArrowUp', 2000);
  await page.screenshot({ path: ss('20-exploring'), fullPage: false });

  await page.keyboard.press('Enter');
  await sleep(2000);
  await page.screenshot({ path: ss('21-third-building-interior'), fullPage: false });
  console.log('  Screenshot: 21-third-building-interior');

  // Final state
  await page.screenshot({ path: ss('22-final-state'), fullPage: false });
  console.log(`  Final URL: ${page.url()}`);

  await browser.close();
  console.log('\nDone! All screenshots saved to:', SCREENSHOT_DIR);
})().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
