import { chromium } from 'playwright';

const SCREENSHOT_DIR = '/Users/andres/dev/platform/qa-screenshots/interiors/02-tavern-smarthome';
const URL = 'https://platform.thisisvillegas.com';
const PASS_CODE = '42424242';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  console.log('1. Navigating to', URL);
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(3000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/01-cinematic-loaded.png` });
  console.log('  Screenshot: 01-cinematic-loaded.png');

  // Click ENTER button on cinematic
  console.log('2. Looking for ENTER button on cinematic...');
  // Try clicking the canvas area or a button
  const enterBtn = await page.$('button');
  if (enterBtn) {
    console.log('  Found button, clicking...');
    await enterBtn.click();
  } else {
    // The cinematic is a Phaser canvas, try clicking center of the canvas
    console.log('  No button found, trying canvas click + Enter key...');
    const canvas = await page.$('canvas');
    if (canvas) {
      await canvas.click();
      await sleep(500);
    }
    await page.keyboard.press('Enter');
  }
  await sleep(3000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/02-after-enter-click.png` });
  console.log('  Screenshot: 02-after-enter-click.png');

  // Check if we're on door scene or need to navigate
  const currentUrl = page.url();
  console.log('  Current URL:', currentUrl);

  // If still on root, try navigating directly to door
  if (!currentUrl.includes('/door')) {
    console.log('  Navigating directly to /door...');
    await page.goto(`${URL}/door`, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(2000);
  }
  await page.screenshot({ path: `${SCREENSHOT_DIR}/03-door-scene.png` });
  console.log('  Screenshot: 03-door-scene.png');

  // Enter the pass code
  console.log('3. Entering pass code:', PASS_CODE);
  // Look for input field
  const input = await page.$('input');
  if (input) {
    await input.click();
    await input.type(PASS_CODE, { delay: 100 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-code-entered.png` });
    console.log('  Screenshot: 04-code-entered.png');

    // Click SUBMIT button
    const submitBtn = await page.$('button[type="submit"], button:has-text("SUBMIT"), button:has-text("Submit"), button:has-text("ENTER")');
    if (submitBtn) {
      await submitBtn.click();
    } else {
      // Try pressing Enter
      await page.keyboard.press('Enter');
    }
  } else {
    // Door scene might be Phaser canvas-based too
    console.log('  No input field found, this might be a Phaser-based door scene...');
    const canvas = await page.$('canvas');
    if (canvas) {
      // Type the code on the canvas
      await canvas.click();
      await sleep(500);
      for (const char of PASS_CODE) {
        await page.keyboard.press(`Digit${char}`);
        await sleep(200);
      }
      await page.screenshot({ path: `${SCREENSHOT_DIR}/04-code-entered.png` });
      console.log('  Screenshot: 04-code-entered.png');
      await page.keyboard.press('Enter');
    }
  }

  await sleep(5000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/05-overworld-loaded.png` });
  console.log('  Screenshot: 05-overworld-loaded.png');
  console.log('  Current URL:', page.url());

  // If not on /world, navigate directly
  if (!page.url().includes('/world')) {
    console.log('  Navigating directly to /world...');
    // Set guest token first
    await page.evaluate(() => {
      // Check if token exists
      const token = localStorage.getItem('guest_token');
      console.log('Guest token exists:', !!token);
    });
    await page.goto(`${URL}/world`, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(5000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05b-overworld-direct.png` });
    console.log('  Screenshot: 05b-overworld-direct.png');
  }

  // Now we should be in the overworld. Need to find the tavern.
  // Based on manifest, spawn is at x:496, y:304
  // The tavern is typically to the left/down in the village
  console.log('4. Looking for the Tavern building...');

  // Focus on canvas for keyboard input
  const canvas = await page.$('canvas');
  if (canvas) {
    await canvas.click();
    await sleep(500);
  }

  // Walk down for a bit to find buildings
  console.log('  Walking down...');
  for (let i = 0; i < 30; i++) {
    await page.keyboard.down('ArrowDown');
    await sleep(100);
  }
  await page.keyboard.up('ArrowDown');
  await sleep(500);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/06-walked-down.png` });
  console.log('  Screenshot: 06-walked-down.png');

  // Walk left to find tavern
  console.log('  Walking left...');
  for (let i = 0; i < 40; i++) {
    await page.keyboard.down('ArrowLeft');
    await sleep(100);
  }
  await page.keyboard.up('ArrowLeft');
  await sleep(500);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/07-walked-left.png` });
  console.log('  Screenshot: 07-walked-left.png');

  // Try entering a building (press Enter near doors)
  console.log('5. Attempting to enter building with ENTER key...');
  await page.keyboard.press('Enter');
  await sleep(2000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/08-first-enter-attempt.png` });
  console.log('  Screenshot: 08-first-enter-attempt.png');

  // If that didn't work, try walking around more and pressing Enter
  // Let's try a systematic approach - walk in a pattern and press Enter frequently

  // Walk up a bit
  console.log('  Walking up to find building doors...');
  for (let i = 0; i < 15; i++) {
    await page.keyboard.down('ArrowUp');
    await sleep(100);
  }
  await page.keyboard.up('ArrowUp');
  await sleep(300);
  await page.keyboard.press('Enter');
  await sleep(2000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/09-walk-up-enter.png` });
  console.log('  Screenshot: 09-walk-up-enter.png');

  // Walk right a bit
  for (let i = 0; i < 20; i++) {
    await page.keyboard.down('ArrowRight');
    await sleep(100);
  }
  await page.keyboard.up('ArrowRight');
  await sleep(300);
  await page.keyboard.press('Enter');
  await sleep(2000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/10-walk-right-enter.png` });
  console.log('  Screenshot: 10-walk-right-enter.png');

  // Try different directions to find a building
  // Walk down-left from spawn
  console.log('  Exploring for buildings...');
  for (let i = 0; i < 25; i++) {
    await page.keyboard.down('ArrowDown');
    await sleep(80);
  }
  await page.keyboard.up('ArrowDown');
  await sleep(200);

  for (let i = 0; i < 30; i++) {
    await page.keyboard.down('ArrowLeft');
    await sleep(80);
  }
  await page.keyboard.up('ArrowLeft');
  await sleep(300);
  await page.keyboard.press('Enter');
  await sleep(2000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/11-explore-enter.png` });
  console.log('  Screenshot: 11-explore-enter.png');

  // Let me try a more targeted approach - check the tilemap for building door positions
  // For now, let's try walking in a grid pattern pressing Enter at each spot
  console.log('6. Grid search for building doors...');

  // Reset to center-ish by going right and up
  for (let i = 0; i < 40; i++) {
    await page.keyboard.down('ArrowRight');
    await sleep(60);
  }
  await page.keyboard.up('ArrowRight');

  for (let i = 0; i < 30; i++) {
    await page.keyboard.down('ArrowUp');
    await sleep(60);
  }
  await page.keyboard.up('ArrowUp');
  await sleep(500);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/12-back-to-center.png` });
  console.log('  Screenshot: 12-back-to-center.png');

  // Walk down-left in steps, pressing Enter at each step
  for (let step = 0; step < 8; step++) {
    for (let i = 0; i < 8; i++) {
      await page.keyboard.down('ArrowDown');
      await sleep(60);
    }
    await page.keyboard.up('ArrowDown');
    await sleep(200);
    await page.keyboard.press('Enter');
    await sleep(1500);

    // Check if the scene changed (interior loaded)
    const screenshotName = `13-grid-step-${step}.png`;
    await page.screenshot({ path: `${SCREENSHOT_DIR}/${screenshotName}` });
    console.log(`  Screenshot: ${screenshotName}`);
  }

  console.log('7. Final state screenshot');
  await page.screenshot({ path: `${SCREENSHOT_DIR}/14-final-state.png` });
  console.log('  Screenshot: 14-final-state.png');

  await browser.close();
  console.log('\nDone! Check screenshots in:', SCREENSHOT_DIR);
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
