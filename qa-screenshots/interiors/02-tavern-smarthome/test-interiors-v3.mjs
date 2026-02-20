import { chromium } from 'playwright';

const SCREENSHOT_DIR = '/Users/andres/dev/platform/qa-screenshots/interiors/02-tavern-smarthome';
const URL = 'https://platform.thisisvillegas.com';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getActiveScene(page) {
  return page.evaluate(() => {
    // Phaser stores all game instances in Phaser.GAMES (if Phaser is loaded as global)
    // Or we can find it through the canvas
    const canvas = document.querySelector('canvas');
    if (!canvas) return { scenes: [], error: 'no canvas' };

    // Access the Phaser game via the canvas's internal reference
    // Phaser 3 stores the game as canvas.parentElement.__game or via a runtime reference
    const phaserModule = window['Phaser'];
    if (phaserModule && phaserModule.GAMES && phaserModule.GAMES.length > 0) {
      const game = phaserModule.GAMES[0];
      const active = game.scene.scenes.filter(s => s.scene.isActive());
      return {
        scenes: active.map(s => s.scene.key),
        total: game.scene.scenes.map(s => ({ key: s.scene.key, active: s.scene.isActive() }))
      };
    }

    return { scenes: [], error: 'Phaser.GAMES not found' };
  });
}

async function getPlayerPos(page) {
  return page.evaluate(() => {
    const phaserModule = window['Phaser'];
    if (!phaserModule || !phaserModule.GAMES || !phaserModule.GAMES.length) return null;
    const game = phaserModule.GAMES[0];
    for (const s of game.scene.scenes) {
      if (s.playerController && s.playerController.sprite) {
        return {
          x: Math.round(s.playerController.sprite.x),
          y: Math.round(s.playerController.sprite.y),
          scene: s.scene.key
        };
      }
    }
    return null;
  });
}

async function teleportPlayer(page, x, y) {
  return page.evaluate(({x, y}) => {
    const phaserModule = window['Phaser'];
    if (!phaserModule || !phaserModule.GAMES || !phaserModule.GAMES.length) return false;
    const game = phaserModule.GAMES[0];
    for (const s of game.scene.scenes) {
      if (s.playerController && s.playerController.sprite && s.scene.key === 'OverworldScene') {
        s.playerController.sprite.setPosition(x, y);
        return true;
      }
    }
    return false;
  }, {x, y});
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Interior') || text.includes('building') || text.includes('teleport') || msg.type() === 'error') {
      console.log(`  [CONSOLE ${msg.type()}]: ${text}`);
    }
  });

  // === STEP 1: Load the world ===
  console.log('1. Navigating to /world...');
  await page.goto(`${URL}/world`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(7000);

  let sceneInfo = await getActiveScene(page);
  console.log('  Scenes:', JSON.stringify(sceneInfo));

  // If loading scene, wait more
  if (sceneInfo.scenes?.includes('LoadingScene')) {
    console.log('  Still loading, waiting...');
    await sleep(5000);
    sceneInfo = await getActiveScene(page);
    console.log('  Scenes after wait:', JSON.stringify(sceneInfo));
  }

  await page.screenshot({ path: `${SCREENSHOT_DIR}/01-overworld.png` });
  console.log('  Screenshot: 01-overworld.png');

  // Dismiss any prompt
  await page.keyboard.press('Space');
  await sleep(1000);

  let playerPos = await getPlayerPos(page);
  console.log('  Player pos:', JSON.stringify(playerPos));

  // === STEP 2: Go to Tavern ===
  console.log('\n2. Navigating to Tavern door (144, 192)...');

  // Try teleport first
  let teleported = await teleportPlayer(page, 152, 198);
  console.log('  Teleport result:', teleported);
  await sleep(500);

  playerPos = await getPlayerPos(page);
  console.log('  Player pos after teleport:', JSON.stringify(playerPos));

  if (!teleported || !playerPos) {
    // Fall back to walking
    console.log('  Teleport failed, walking instead...');
    const canvas = await page.$('canvas');
    if (canvas) await canvas.click();
    await sleep(300);

    // Walk UP
    await page.keyboard.down('ArrowUp');
    await sleep(1500);
    await page.keyboard.up('ArrowUp');

    // Walk LEFT a lot
    await page.keyboard.down('ArrowLeft');
    await sleep(5000);
    await page.keyboard.up('ArrowLeft');
    await sleep(500);

    playerPos = await getPlayerPos(page);
    console.log('  Player pos after walk:', JSON.stringify(playerPos));
  }

  await page.screenshot({ path: `${SCREENSHOT_DIR}/02-near-tavern.png` });
  console.log('  Screenshot: 02-near-tavern.png');

  // Press ENTER to enter tavern
  console.log('  Pressing ENTER...');
  await page.keyboard.press('Enter');
  await sleep(3000);

  sceneInfo = await getActiveScene(page);
  console.log('  Scenes after ENTER:', JSON.stringify(sceneInfo));
  await page.screenshot({ path: `${SCREENSHOT_DIR}/03-after-tavern-enter.png` });
  console.log('  Screenshot: 03-after-tavern-enter.png');

  // If not in interior, try nudging position
  if (!sceneInfo.scenes?.includes('InteriorScene')) {
    console.log('  Not in interior, trying different positions around door...');

    // Try multiple positions near the tavern door (144, 192)
    const positions = [
      [144, 192], [152, 192], [144, 200], [152, 200],
      [144, 196], [148, 196], [150, 192], [146, 190]
    ];

    for (const [px, py] of positions) {
      await teleportPlayer(page, px, py);
      await sleep(300);
      await page.keyboard.press('Enter');
      await sleep(1500);

      sceneInfo = await getActiveScene(page);
      if (sceneInfo.scenes?.includes('InteriorScene')) {
        console.log(`  Entered interior from position (${px}, ${py})!`);
        break;
      }
    }
  }

  // If still not in interior, check what scene we're in
  sceneInfo = await getActiveScene(page);
  console.log('  Final scene check:', JSON.stringify(sceneInfo));

  // === TAVERN INTERIOR ===
  if (sceneInfo.scenes?.includes('InteriorScene')) {
    console.log('\n=== TAVERN INTERIOR ===');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-tavern-interior.png` });
    console.log('  Screenshot: 04-tavern-interior.png');

    // Walk left toward NPC
    console.log('  Walking toward NPC (left side)...');
    await page.keyboard.down('ArrowLeft');
    await sleep(2000);
    await page.keyboard.up('ArrowLeft');
    await sleep(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-tavern-near-npc.png` });
    console.log('  Screenshot: 05-tavern-near-npc.png');

    // Press SPACE to talk to NPC
    console.log('  Pressing SPACE to talk to NPC...');
    await page.keyboard.press('Space');
    await sleep(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-tavern-npc-dialogue.png` });
    console.log('  Screenshot: 06-tavern-npc-dialogue.png');

    // Advance dialogue
    await page.keyboard.press('Space');
    await sleep(1000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/07-tavern-dialogue-2.png` });
    console.log('  Screenshot: 07-tavern-dialogue-2.png');

    // Close dialogue with ESC
    await page.keyboard.press('Escape');
    await sleep(1000);

    // Walk right toward portal
    console.log('  Walking toward portal (right side)...');
    await page.keyboard.down('ArrowRight');
    await sleep(3000);
    await page.keyboard.up('ArrowRight');
    await sleep(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/08-tavern-portal.png` });
    console.log('  Screenshot: 08-tavern-portal.png');

    // ESC back to overworld
    console.log('  ESC to exit tavern...');
    await page.keyboard.press('Escape');
    await sleep(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/09-back-overworld.png` });
    console.log('  Screenshot: 09-back-overworld.png');
  } else {
    console.log('\nWARNING: Could not enter Tavern interior!');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-tavern-FAILED.png` });
  }

  // === SMART HOME ===
  console.log('\n=== SMART HOME ===');
  sceneInfo = await getActiveScene(page);
  console.log('  Current scenes:', JSON.stringify(sceneInfo));

  if (sceneInfo.scenes?.includes('OverworldScene')) {
    console.log('  Teleporting to Smart Home door (368, 192)...');
    await teleportPlayer(page, 376, 198);
    await sleep(500);

    playerPos = await getPlayerPos(page);
    console.log('  Player pos:', JSON.stringify(playerPos));
    await page.screenshot({ path: `${SCREENSHOT_DIR}/10-near-smarthome.png` });
    console.log('  Screenshot: 10-near-smarthome.png');

    // Enter smart home
    await page.keyboard.press('Enter');
    await sleep(3000);

    sceneInfo = await getActiveScene(page);
    console.log('  Scenes after ENTER:', JSON.stringify(sceneInfo));

    if (!sceneInfo.scenes?.includes('InteriorScene')) {
      // Try different positions
      const positions = [
        [368, 192], [376, 192], [368, 200], [376, 200],
        [370, 196], [374, 196], [372, 192], [368, 198]
      ];
      for (const [px, py] of positions) {
        await teleportPlayer(page, px, py);
        await sleep(300);
        await page.keyboard.press('Enter');
        await sleep(1500);

        sceneInfo = await getActiveScene(page);
        if (sceneInfo.scenes?.includes('InteriorScene')) {
          console.log(`  Entered interior from position (${px}, ${py})!`);
          break;
        }
      }
    }

    sceneInfo = await getActiveScene(page);
    if (sceneInfo.scenes?.includes('InteriorScene')) {
      console.log('\n=== SMART HOME INTERIOR ===');
      await page.screenshot({ path: `${SCREENSHOT_DIR}/11-smarthome-interior.png` });
      console.log('  Screenshot: 11-smarthome-interior.png');

      // Walk left toward NPC
      console.log('  Walking toward NPC...');
      await page.keyboard.down('ArrowLeft');
      await sleep(2000);
      await page.keyboard.up('ArrowLeft');
      await sleep(500);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/12-smarthome-near-npc.png` });
      console.log('  Screenshot: 12-smarthome-near-npc.png');

      // Talk to NPC
      console.log('  Pressing SPACE to talk...');
      await page.keyboard.press('Space');
      await sleep(2000);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/13-smarthome-dialogue.png` });
      console.log('  Screenshot: 13-smarthome-dialogue.png');

      // Close
      await page.keyboard.press('Escape');
      await sleep(1000);

      // Walk toward portal
      console.log('  Walking toward portal...');
      await page.keyboard.down('ArrowRight');
      await sleep(3000);
      await page.keyboard.up('ArrowRight');
      await sleep(500);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/14-smarthome-portal.png` });
      console.log('  Screenshot: 14-smarthome-portal.png');

      // Exit
      console.log('  ESC to exit...');
      await page.keyboard.press('Escape');
      await sleep(3000);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/15-back-overworld-final.png` });
      console.log('  Screenshot: 15-back-overworld-final.png');
    } else {
      console.log('WARNING: Could not enter Smart Home interior!');
      await page.screenshot({ path: `${SCREENSHOT_DIR}/11-smarthome-FAILED.png` });
    }
  }

  console.log('\nDone! All screenshots saved to', SCREENSHOT_DIR);
  await browser.close();
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
