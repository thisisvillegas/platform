import { chromium } from 'playwright';

const DIR = '/Users/andres/dev/platform/qa-screenshots/interiors/02-tavern-smarthome';
const URL = 'https://platform.thisisvillegas.com';

// Player speed: 100px/sec, Camera zoom: 1x
// Spawn: (496, 304)
// Tavern door: (144, 192) → left 352px (3.52s), up 112px (1.12s)
// Smart Home door: (368, 192) → from tavern: right 224px (2.24s), same y

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function ss(page, name) {
  await page.screenshot({ path: `${DIR}/${name}.png` });
  console.log(`  [SS] ${name}`);
}

async function holdKey(page, key, ms) {
  await page.keyboard.down(key);
  await sleep(ms);
  await page.keyboard.up(key);
  await sleep(150); // small settle time
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();

  // === LOAD ===
  console.log('=== LOADING WORLD ===');
  await page.goto(`${URL}/world`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(10000); // generous wait for loading + overworld init
  await ss(page, '01-overworld-loaded');

  // === DISMISS TUTORIAL PROMPTS ===
  // There are several tutorial tips. Each needs a keypress to dismiss.
  // Use a key that WON'T trigger movement (like Escape or specific keys)
  // Actually, the tutorial says "press any key to continue" so any key works.
  // The prompts appear sequentially. Let's press a neutral key multiple times.
  console.log('=== DISMISSING PROMPTS ===');
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('KeyX'); // neutral key
    await sleep(800);
  }
  await sleep(1000);
  await ss(page, '02-prompts-cleared');

  // === ENSURE CANVAS FOCUS ===
  const canvas = await page.$('canvas');
  if (canvas) {
    await canvas.click({ position: { x: 640, y: 360 } });
    await sleep(500);
  }

  // ╔══════════════════════════════════════════╗
  // ║         TAVERN (door at 144, 192)        ║
  // ╚══════════════════════════════════════════╝
  console.log('\n=== WALKING TO TAVERN ===');
  console.log('  From spawn (496, 304) to tavern door (144, 192)');
  console.log('  Step 1: Walk LEFT 352px @ 100px/s = 3.52s');

  // Walk LEFT at spawn Y (road is clear)
  await holdKey(page, 'ArrowLeft', 3600);
  await ss(page, '03-walked-left');

  console.log('  Step 2: Walk UP 112px @ 100px/s = 1.12s');
  // Walk UP to door
  await holdKey(page, 'ArrowUp', 1200);
  await ss(page, '04-near-tavern-door');

  // Press ENTER to enter building
  console.log('  Pressing ENTER at door...');
  await page.keyboard.press('Enter');
  await sleep(3000);
  await ss(page, '05-tavern-entry-1');

  // If not entered, try micro-adjustments
  // Walk right a tiny bit (the door center is at x=152, we might have overshot left)
  console.log('  Micro-adjust: right 100ms...');
  await holdKey(page, 'ArrowRight', 100);
  await page.keyboard.press('Enter');
  await sleep(2000);
  await ss(page, '06-tavern-entry-2');

  // Try up a bit more
  console.log('  Micro-adjust: up 100ms...');
  await holdKey(page, 'ArrowUp', 100);
  await page.keyboard.press('Enter');
  await sleep(2000);
  await ss(page, '07-tavern-entry-3');

  // Try down a bit
  console.log('  Micro-adjust: down 150ms...');
  await holdKey(page, 'ArrowDown', 150);
  await page.keyboard.press('Enter');
  await sleep(2000);
  await ss(page, '08-tavern-entry-4');

  // Check if we're in an interior by sampling pixels
  // Interior has dark background (#050508), overworld has green grass
  let isInterior = await checkInterior(page);
  console.log('  Interior detected:', isInterior);

  if (!isInterior) {
    // More aggressive search: walk in a small square pattern pressing Enter at each step
    console.log('  Searching near door with step-Enter pattern...');
    const moves = [
      ['ArrowUp', 200], ['Enter', 0],
      ['ArrowRight', 200], ['Enter', 0],
      ['ArrowRight', 200], ['Enter', 0],
      ['ArrowDown', 200], ['Enter', 0],
      ['ArrowDown', 200], ['Enter', 0],
      ['ArrowLeft', 200], ['Enter', 0],
      ['ArrowLeft', 200], ['Enter', 0],
      ['ArrowUp', 200], ['Enter', 0],
      ['ArrowUp', 200], ['Enter', 0],
      ['ArrowLeft', 300], ['Enter', 0],
      ['ArrowDown', 300], ['Enter', 0],
      ['ArrowRight', 400], ['Enter', 0],
    ];

    for (const [key, duration] of moves) {
      if (key === 'Enter') {
        await page.keyboard.press('Enter');
        await sleep(1500);
        isInterior = await checkInterior(page);
        if (isInterior) {
          console.log('  Found interior!');
          break;
        }
      } else {
        await holdKey(page, key, duration);
      }
    }
  }

  if (!isInterior) {
    await ss(page, '09-tavern-FAILED');
    console.log('  WARNING: Could not enter tavern. Continuing...');
  }

  // === TAVERN INTERIOR TESTING ===
  if (isInterior) {
    console.log('\n=== TAVERN INTERIOR ===');
    await ss(page, '10-tavern-interior');

    // Walk toward NPC (left side, NPC at tileX=3 → roughly left portion of room)
    console.log('  Walking LEFT toward NPC...');
    await holdKey(page, 'ArrowLeft', 2000);
    await sleep(500);
    await ss(page, '11-tavern-near-npc');

    // Press SPACE to talk
    console.log('  Pressing SPACE to talk...');
    await page.keyboard.press('Space');
    await sleep(2500);
    await ss(page, '12-tavern-dialogue');

    // Advance dialogue with Space
    await page.keyboard.press('Space');
    await sleep(1500);
    await ss(page, '13-tavern-dialogue-2');

    // Close dialogue with ESC
    await page.keyboard.press('Escape');
    await sleep(1000);

    // Walk toward portal (right side, portal at tileX=9)
    console.log('  Walking RIGHT toward portal...');
    await holdKey(page, 'ArrowRight', 3500);
    await sleep(500);
    await ss(page, '14-tavern-portal');

    // Exit via ESC
    console.log('  ESC to exit tavern...');
    await page.keyboard.press('Escape');
    await sleep(3000);
    await ss(page, '15-back-to-overworld');
  }

  // ╔══════════════════════════════════════════╗
  // ║     SMART HOME (door at 368, 192)        ║
  // ╚══════════════════════════════════════════╝
  console.log('\n=== WALKING TO SMART HOME ===');

  // From current position (near tavern ~144, 192ish) to smart home (368, 192)
  // Right 224px @ 100px/s = 2.24s
  // But if we returned to overworld near tavern, we might be at return position

  // Walk RIGHT to smart home
  console.log('  Walking RIGHT 224px to Smart Home...');
  await holdKey(page, 'ArrowRight', 2400);
  await ss(page, '16-near-smarthome');

  // Press ENTER
  console.log('  Pressing ENTER...');
  await page.keyboard.press('Enter');
  await sleep(3000);

  isInterior = await checkInterior(page);
  console.log('  Interior detected:', isInterior);

  if (!isInterior) {
    // Walk up to be at door height
    await holdKey(page, 'ArrowUp', 500);
    await page.keyboard.press('Enter');
    await sleep(2000);
    isInterior = await checkInterior(page);

    if (!isInterior) {
      // Step-Enter search
      console.log('  Searching near Smart Home door...');
      const smMoves = [
        ['ArrowDown', 200], ['Enter', 0],
        ['ArrowRight', 200], ['Enter', 0],
        ['ArrowUp', 300], ['Enter', 0],
        ['ArrowLeft', 300], ['Enter', 0],
        ['ArrowUp', 200], ['Enter', 0],
        ['ArrowRight', 200], ['Enter', 0],
        ['ArrowDown', 200], ['Enter', 0],
      ];

      for (const [key, duration] of smMoves) {
        if (key === 'Enter') {
          await page.keyboard.press('Enter');
          await sleep(1500);
          isInterior = await checkInterior(page);
          if (isInterior) {
            console.log('  Found interior!');
            break;
          }
        } else {
          await holdKey(page, key, duration);
        }
      }
    }
  }

  if (isInterior) {
    console.log('\n=== SMART HOME INTERIOR ===');
    await ss(page, '17-smarthome-interior');

    // Walk left toward NPC
    console.log('  Walking LEFT toward NPC...');
    await holdKey(page, 'ArrowLeft', 2000);
    await sleep(500);
    await ss(page, '18-smarthome-near-npc');

    // Talk
    console.log('  Pressing SPACE to talk...');
    await page.keyboard.press('Space');
    await sleep(2500);
    await ss(page, '19-smarthome-dialogue');

    // Advance
    await page.keyboard.press('Space');
    await sleep(1500);
    await ss(page, '20-smarthome-dialogue-2');

    // Close
    await page.keyboard.press('Escape');
    await sleep(1000);

    // Walk toward portal
    console.log('  Walking RIGHT toward portal...');
    await holdKey(page, 'ArrowRight', 3500);
    await sleep(500);
    await ss(page, '21-smarthome-portal');

    // Exit
    console.log('  ESC to exit...');
    await page.keyboard.press('Escape');
    await sleep(3000);
    await ss(page, '22-final');
  } else {
    await ss(page, '17-smarthome-FAILED');
    console.log('  WARNING: Could not enter Smart Home');
  }

  console.log('\n=== DONE ===');
  await browser.close();
}

async function checkInterior(page) {
  // Interior scenes have dark background (#050508 = r:5, g:5, b:8)
  // Overworld has green grass (~r:100, g:150, b:70)
  // Sample several points to determine
  const result = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return { isInterior: false, reason: 'no canvas' };

    // Try WebGL first, then 2D
    let gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (gl) {
      // Read pixels from center of canvas
      const pixels = new Uint8Array(4);
      gl.readPixels(
        Math.floor(canvas.width / 2),
        Math.floor(canvas.height / 2),
        1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels
      );
      return {
        isInterior: pixels[0] < 30 && pixels[1] < 30 && pixels[2] < 30,
        pixel: { r: pixels[0], g: pixels[1], b: pixels[2] },
        method: 'webgl'
      };
    }

    const ctx = canvas.getContext('2d');
    if (ctx) {
      const pixel = ctx.getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data;
      return {
        isInterior: pixel[0] < 30 && pixel[1] < 30 && pixel[2] < 30,
        pixel: { r: pixel[0], g: pixel[1], b: pixel[2] },
        method: '2d'
      };
    }

    return { isInterior: false, reason: 'no context' };
  });
  console.log(`    pixel check: ${JSON.stringify(result)}`);
  return result.isInterior;
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
