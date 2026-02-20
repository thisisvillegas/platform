import { chromium } from 'playwright';

const DIR = '/Users/andres/dev/platform/qa-screenshots/interiors/02-tavern-smarthome';
const URL = 'https://platform.thisisvillegas.com';

// Spawn: (496, 304), Speed: 80px/sec
// Tavern door: (144, 192) → left 352px (4.4s), up 112px (1.4s)
// Smart Home door: (368, 192) → left 128px (1.6s), up 112px (1.4s)

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function screenshot(page, name) {
  const path = `${DIR}/${name}.png`;
  await page.screenshot({ path });
  console.log(`  [SS] ${name}.png`);
  return path;
}

async function walk(page, dir, ms) {
  await page.keyboard.down(`Arrow${dir}`);
  await sleep(ms);
  await page.keyboard.up(`Arrow${dir}`);
  await sleep(200);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();

  // === LOAD WORLD ===
  console.log('1. Loading world...');
  await page.goto(`${URL}/world`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(8000); // Wait for LoadingScene + OverworldScene
  await screenshot(page, '01-overworld');

  // Dismiss tutorial prompts
  console.log('2. Dismissing prompts...');
  await page.keyboard.press('Space');
  await sleep(800);
  await page.keyboard.press('Space');
  await sleep(800);
  await page.keyboard.press('Space');
  await sleep(800);
  await page.keyboard.press('Space');
  await sleep(1000);
  await screenshot(page, '02-prompts-dismissed');

  // Focus canvas
  const canvas = await page.$('canvas');
  if (canvas) await canvas.click();
  await sleep(300);

  // === WALK TO TAVERN ===
  // From spawn (496, 304) to tavern door (144, 192)
  // Need: up 112px, left 352px
  console.log('3. Walking to Tavern...');

  // Walk UP first (112px at 80px/s = 1.4s, add buffer)
  console.log('  Up 1.5s...');
  await walk(page, 'Up', 1500);

  // Walk LEFT (352px at 80px/s = 4.4s, add buffer)
  console.log('  Left 4.6s...');
  await walk(page, 'Left', 4600);

  await screenshot(page, '03-near-tavern');

  // The door might be slightly offset. Try pressing Enter
  console.log('4. Pressing ENTER at tavern...');
  await page.keyboard.press('Enter');
  await sleep(3000);
  await screenshot(page, '04-tavern-enter-1');

  // Walk up/down slightly and try again if still overworld
  // Try walking up a bit to align with door
  console.log('  Adjusting up...');
  await walk(page, 'Up', 300);
  await page.keyboard.press('Enter');
  await sleep(2000);
  await screenshot(page, '05-tavern-enter-2');

  // Try walking down a bit
  console.log('  Adjusting down...');
  await walk(page, 'Down', 600);
  await page.keyboard.press('Enter');
  await sleep(2000);
  await screenshot(page, '06-tavern-enter-3');

  // Try walking right a tiny bit (align with door center)
  console.log('  Adjusting right...');
  await walk(page, 'Right', 300);
  await page.keyboard.press('Enter');
  await sleep(2000);
  await screenshot(page, '07-tavern-enter-4');

  // Walk left a bit
  await walk(page, 'Left', 300);
  await walk(page, 'Up', 300);
  await page.keyboard.press('Enter');
  await sleep(2000);
  await screenshot(page, '08-tavern-enter-5');

  // Try different approach: walk in a small grid near expected door position
  console.log('5. Grid search near tavern door...');
  for (let i = 0; i < 6; i++) {
    // Move in small increments
    await walk(page, i % 2 === 0 ? 'Right' : 'Left', 200);
    await page.keyboard.press('Enter');
    await sleep(1500);

    // Check if we entered by looking at the page
    // We can check if the background color changed (interior is dark)
    const bgColor = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return null;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      const pixel = ctx.getImageData(canvas.width/2, canvas.height/2, 1, 1).data;
      return { r: pixel[0], g: pixel[1], b: pixel[2] };
    });
    console.log(`  Pixel check (${i}):`, JSON.stringify(bgColor));

    // If we see a very dark pixel in center, we might be in interior
    if (bgColor && bgColor.r < 20 && bgColor.g < 20 && bgColor.b < 30) {
      console.log('  Looks like interior scene!');
      await screenshot(page, '09-tavern-interior-detected');
      break;
    }
  }

  // Try another approach: walk down to the door from above
  console.log('6. Approaching door from different angle...');
  await walk(page, 'Up', 1000);
  await walk(page, 'Down', 200);
  await page.keyboard.press('Enter');
  await sleep(2000);
  await screenshot(page, '10-approach-from-above');

  // One more try — the InteractionSystem uses PROXIMITY_RADIUS=32px
  // So we need to be within 32px of the door zone
  // Door zone is at tile (144, 192) with width/height 16
  // Center of door is at (144+8, 192+8) = (152, 200)

  // Let's try walking to specific positions around the door center
  // Walk up a lot to get above the building, then down to the door
  console.log('7. Resetting position — walking far up then down to door...');
  await walk(page, 'Up', 3000); // Go way up
  await walk(page, 'Right', 500); // Align with tavern-ish x

  // Now walk down slowly, pressing Enter every step
  for (let step = 0; step < 20; step++) {
    await walk(page, 'Down', 200);
    await page.keyboard.press('Enter');
    await sleep(500);
  }
  await screenshot(page, '11-grid-down-search');

  // Take a bigger screenshot to see where we are
  await screenshot(page, '12-current-position');

  // Let me try SPACE instead of ENTER (InteractionSystem uses both)
  console.log('8. Trying SPACE key instead...');
  for (let step = 0; step < 10; step++) {
    await walk(page, 'Up', 150);
    await page.keyboard.press('Space');
    await sleep(500);
    await page.keyboard.press('Enter');
    await sleep(500);
  }
  await screenshot(page, '13-space-attempts');

  // Final comprehensive approach: navigate back to spawn, walk precisely
  console.log('9. Final approach — refresh and precise walk...');
  await page.goto(`${URL}/world`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(8000);

  // Dismiss all prompts
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Space');
    await sleep(600);
  }
  await sleep(1000);

  // Focus canvas
  const canvas2 = await page.$('canvas');
  if (canvas2) await canvas2.click();
  await sleep(500);

  // First, walk to the nearest building door
  // Looking at the overworld image, the player spawns in the center plaza area
  // There are buildings with brown doors visible
  // The tavern (brown/red building with red roof) should be upper-left

  // Walk UP (toward the row of buildings at y≈192)
  console.log('  Walking UP to building row...');
  await walk(page, 'Up', 1600); // ~128px
  await screenshot(page, '14-walked-up');

  // Walk LEFT to the tavern (leftmost building in top row)
  console.log('  Walking LEFT to tavern...');
  await walk(page, 'Left', 4800); // ~384px
  await screenshot(page, '15-walked-left');

  // Now try micro-adjustments with Enter at each step
  console.log('  Micro-adjust and Enter...');
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Enter');
    await sleep(1000);

    // Quick check if we see "Enter" prompt text appearing near doors
    // The InteractionSystem shows "Enter [BuildingName]" text
    await walk(page, 'Down', 100);
    await page.keyboard.press('Enter');
    await sleep(1000);
    await walk(page, 'Up', 100);
    await walk(page, 'Right', 100);
  }
  await screenshot(page, '16-micro-adjust-result');

  // Look at what's on screen — take a clear screenshot
  await screenshot(page, '17-final-state');

  console.log('\nDone. Check screenshots.');
  await browser.close();
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
