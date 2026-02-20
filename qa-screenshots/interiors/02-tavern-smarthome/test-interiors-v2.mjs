import { chromium } from 'playwright';

const SCREENSHOT_DIR = '/Users/andres/dev/platform/qa-screenshots/interiors/02-tavern-smarthome';
const URL = 'https://platform.thisisvillegas.com';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Door positions from tilemap
const TAVERN_DOOR = { x: 144, y: 192 };
const SMART_HOME_DOOR = { x: 368, y: 192 };
const PLAYER_SPAWN = { x: 496, y: 304 };

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  // Collect console logs for debugging
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('InteriorScene') || msg.text().includes('building')) {
      console.log(`  [CONSOLE ${msg.type()}]: ${msg.text()}`);
    }
  });

  // === STEP 1: Navigate directly to /world ===
  console.log('1. Navigating directly to /world...');
  await page.goto(`${URL}/world`, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(6000); // Wait for loading scene + overworld
  await page.screenshot({ path: `${SCREENSHOT_DIR}/01-overworld.png` });
  console.log('  Screenshot: 01-overworld.png');

  // Dismiss any initial prompt by pressing a key
  await page.keyboard.press('Space');
  await sleep(1000);

  // === STEP 2: Teleport player to tavern door using game console ===
  console.log('2. Teleporting player near tavern door (144, 192)...');

  // Use Phaser's game object to move the player
  await page.evaluate(() => {
    // Access Phaser game instance
    const game = window.game || document.querySelector('canvas')?.__phaser_game;
    if (!game) {
      console.log('No Phaser game instance found, trying alternative...');
      return false;
    }
    const scene = game.scene.scenes.find(s => s.scene.key === 'OverworldScene' && s.scene.isActive());
    if (scene && scene.playerController) {
      scene.playerController.sprite.setPosition(144, 192);
      console.log('Player teleported to tavern door!');
      return true;
    }
    return false;
  });

  await sleep(1000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/02-near-tavern.png` });
  console.log('  Screenshot: 02-near-tavern.png');

  // Alternative approach: walk the player using arrow keys
  // Spawn is at (496, 304), Tavern door is at (144, 192)
  // Need to go left (496-144=352px) and up (304-192=112px)
  // At ~80 speed with 16ms frames, each key press moves roughly 1.3px/frame

  console.log('3. Walking to tavern via arrow keys...');
  const canvas = await page.$('canvas');
  if (canvas) {
    await canvas.click();
    await sleep(300);
  }

  // Walk UP first (112px ≈ 7 tiles)
  console.log('  Walking up...');
  await page.keyboard.down('ArrowUp');
  await sleep(2000); // ~160px at 80px/sec
  await page.keyboard.up('ArrowUp');
  await sleep(200);

  // Walk LEFT (352px ≈ 22 tiles)
  console.log('  Walking left...');
  await page.keyboard.down('ArrowLeft');
  await sleep(5000); // ~400px at 80px/sec
  await page.keyboard.up('ArrowLeft');
  await sleep(500);

  await page.screenshot({ path: `${SCREENSHOT_DIR}/03-near-tavern-walk.png` });
  console.log('  Screenshot: 03-near-tavern-walk.png');

  // Try pressing ENTER to enter the building
  console.log('4. Pressing ENTER to enter tavern...');
  await page.keyboard.press('Enter');
  await sleep(3000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/04-tavern-enter-attempt.png` });
  console.log('  Screenshot: 04-tavern-enter-attempt.png');

  // Fine-tune: walk up a bit more and try again
  console.log('  Fine-tuning position...');
  await page.keyboard.down('ArrowUp');
  await sleep(500);
  await page.keyboard.up('ArrowUp');
  await sleep(200);
  await page.keyboard.press('Enter');
  await sleep(3000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/05-tavern-enter-attempt2.png` });
  console.log('  Screenshot: 05-tavern-enter-attempt2.png');

  // Walk down a bit and try
  await page.keyboard.down('ArrowDown');
  await sleep(300);
  await page.keyboard.up('ArrowDown');
  await sleep(200);
  await page.keyboard.press('Enter');
  await sleep(3000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/06-tavern-enter-attempt3.png` });
  console.log('  Screenshot: 06-tavern-enter-attempt3.png');

  // Walk right a tiny bit and try
  await page.keyboard.down('ArrowRight');
  await sleep(200);
  await page.keyboard.up('ArrowRight');
  await sleep(200);
  await page.keyboard.press('Enter');
  await sleep(3000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/07-tavern-enter-attempt4.png` });
  console.log('  Screenshot: 07-tavern-enter-attempt4.png');

  // Check current scene via console
  const sceneInfo = await page.evaluate(() => {
    const canvases = document.querySelectorAll('canvas');
    // Try to find game instance
    for (const key of Object.keys(window)) {
      const val = window[key];
      if (val && val.scene && val.scene.scenes) {
        const active = val.scene.scenes.filter(s => s.scene.isActive());
        return active.map(s => s.scene.key);
      }
    }
    return 'Could not find game instance';
  });
  console.log('  Active scenes:', JSON.stringify(sceneInfo));

  // Try using evaluate to directly access game and find player position
  const playerPos = await page.evaluate(() => {
    for (const key of Object.keys(window)) {
      const val = window[key];
      if (val && val.scene && val.scene.scenes) {
        for (const s of val.scene.scenes) {
          if (s.playerController && s.playerController.sprite) {
            return {
              x: s.playerController.sprite.x,
              y: s.playerController.sprite.y,
              scene: s.scene.key
            };
          }
        }
      }
    }
    return null;
  });
  console.log('  Player position:', JSON.stringify(playerPos));

  // If we couldn't enter the tavern with walking, try direct manipulation
  console.log('5. Trying direct scene transition via evaluate...');

  // First, let's try to get position closer
  if (playerPos) {
    const dx = TAVERN_DOOR.x - playerPos.x;
    const dy = TAVERN_DOOR.y - playerPos.y;
    console.log(`  Player is at (${playerPos.x}, ${playerPos.y}), tavern door at (${TAVERN_DOOR.x}, ${TAVERN_DOOR.y})`);
    console.log(`  Need to move: dx=${dx}, dy=${dy}`);

    // Walk in the needed direction
    if (dy < -5) {
      const upTime = Math.abs(dy) / 80 * 1000;
      console.log(`  Walking up for ${upTime}ms`);
      await page.keyboard.down('ArrowUp');
      await sleep(upTime);
      await page.keyboard.up('ArrowUp');
      await sleep(200);
    } else if (dy > 5) {
      const downTime = Math.abs(dy) / 80 * 1000;
      console.log(`  Walking down for ${downTime}ms`);
      await page.keyboard.down('ArrowDown');
      await sleep(downTime);
      await page.keyboard.up('ArrowDown');
      await sleep(200);
    }

    if (dx < -5) {
      const leftTime = Math.abs(dx) / 80 * 1000;
      console.log(`  Walking left for ${leftTime}ms`);
      await page.keyboard.down('ArrowLeft');
      await sleep(leftTime);
      await page.keyboard.up('ArrowLeft');
      await sleep(200);
    } else if (dx > 5) {
      const rightTime = Math.abs(dx) / 80 * 1000;
      console.log(`  Walking right for ${rightTime}ms`);
      await page.keyboard.down('ArrowRight');
      await sleep(rightTime);
      await page.keyboard.up('ArrowRight');
      await sleep(200);
    }

    await sleep(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/08-near-tavern-adjusted.png` });
    console.log('  Screenshot: 08-near-tavern-adjusted.png');

    // Check position again
    const newPos = await page.evaluate(() => {
      for (const key of Object.keys(window)) {
        const val = window[key];
        if (val && val.scene && val.scene.scenes) {
          for (const s of val.scene.scenes) {
            if (s.playerController && s.playerController.sprite) {
              return {
                x: Math.round(s.playerController.sprite.x),
                y: Math.round(s.playerController.sprite.y),
                scene: s.scene.key
              };
            }
          }
        }
      }
      return null;
    });
    console.log('  New player position:', JSON.stringify(newPos));

    // Now press Enter
    console.log('  Pressing ENTER...');
    await page.keyboard.press('Enter');
    await sleep(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/09-tavern-final-enter.png` });
    console.log('  Screenshot: 09-tavern-final-enter.png');
  }

  // Check if we're in interior scene now
  const currentScene = await page.evaluate(() => {
    for (const key of Object.keys(window)) {
      const val = window[key];
      if (val && val.scene && val.scene.scenes) {
        const active = val.scene.scenes.filter(s => s.scene.isActive());
        return active.map(s => s.scene.key);
      }
    }
    return [];
  });
  console.log('  Current active scenes:', JSON.stringify(currentScene));

  // If still in overworld, teleport the player directly
  if (Array.isArray(currentScene) && currentScene.includes('OverworldScene')) {
    console.log('6. Direct teleport to tavern door position...');
    await page.evaluate(() => {
      for (const key of Object.keys(window)) {
        const val = window[key];
        if (val && val.scene && val.scene.scenes) {
          for (const s of val.scene.scenes) {
            if (s.playerController && s.playerController.sprite && s.scene.key === 'OverworldScene') {
              s.playerController.sprite.setPosition(152, 200);
              console.log('Teleported player to (152, 200) near tavern door');
              return true;
            }
          }
        }
      }
      return false;
    });
    await sleep(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/10-teleported-to-tavern.png` });
    console.log('  Screenshot: 10-teleported-to-tavern.png');

    // Press Enter to trigger building entry
    await page.keyboard.press('Enter');
    await sleep(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/11-tavern-interior.png` });
    console.log('  Screenshot: 11-tavern-interior.png');
  }

  // === TAVERN INTERIOR TESTING ===
  const inInterior = await page.evaluate(() => {
    for (const key of Object.keys(window)) {
      const val = window[key];
      if (val && val.scene && val.scene.scenes) {
        const active = val.scene.scenes.filter(s => s.scene.isActive());
        return active.map(s => s.scene.key);
      }
    }
    return [];
  });
  console.log('  Active scenes after entry attempt:', JSON.stringify(inInterior));

  if (Array.isArray(inInterior) && inInterior.includes('InteriorScene')) {
    console.log('=== TAVERN INTERIOR ===');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/12-tavern-interior-full.png` });
    console.log('  Screenshot: 12-tavern-interior-full.png');

    // Walk toward NPC (left side of room)
    console.log('  Walking toward NPC...');
    await page.keyboard.down('ArrowLeft');
    await sleep(1500);
    await page.keyboard.up('ArrowLeft');
    await sleep(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/13-tavern-near-npc.png` });
    console.log('  Screenshot: 13-tavern-near-npc.png');

    // Press SPACE to talk to NPC
    console.log('  Pressing SPACE to talk...');
    await page.keyboard.press('Space');
    await sleep(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/14-tavern-dialogue.png` });
    console.log('  Screenshot: 14-tavern-dialogue.png');

    // Press ESC or Space to close dialogue
    await page.keyboard.press('Escape');
    await sleep(1000);

    // Walk toward portal (right side)
    console.log('  Walking toward portal...');
    await page.keyboard.down('ArrowRight');
    await sleep(3000);
    await page.keyboard.up('ArrowRight');
    await sleep(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/15-tavern-near-portal.png` });
    console.log('  Screenshot: 15-tavern-near-portal.png');

    // Exit back to overworld
    console.log('  Pressing ESC to exit...');
    await page.keyboard.press('Escape');
    await sleep(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/16-back-to-overworld.png` });
    console.log('  Screenshot: 16-back-to-overworld.png');
  } else {
    console.log('WARNING: Could not enter tavern interior');
  }

  // === SMART HOME TESTING ===
  console.log('\n=== SMART HOME ===');

  // Check if we're back in overworld
  const afterTavern = await page.evaluate(() => {
    for (const key of Object.keys(window)) {
      const val = window[key];
      if (val && val.scene && val.scene.scenes) {
        const active = val.scene.scenes.filter(s => s.scene.isActive());
        return active.map(s => s.scene.key);
      }
    }
    return [];
  });
  console.log('  Active scenes:', JSON.stringify(afterTavern));

  if (Array.isArray(afterTavern) && afterTavern.includes('OverworldScene')) {
    // Teleport to smart home door
    console.log('  Teleporting to smart home door (368, 192)...');
    await page.evaluate(() => {
      for (const key of Object.keys(window)) {
        const val = window[key];
        if (val && val.scene && val.scene.scenes) {
          for (const s of val.scene.scenes) {
            if (s.playerController && s.playerController.sprite && s.scene.key === 'OverworldScene') {
              s.playerController.sprite.setPosition(376, 200);
              return true;
            }
          }
        }
      }
      return false;
    });
    await sleep(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/17-near-smarthome.png` });
    console.log('  Screenshot: 17-near-smarthome.png');

    await page.keyboard.press('Enter');
    await sleep(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/18-smarthome-interior.png` });
    console.log('  Screenshot: 18-smarthome-interior.png');

    // Check if in interior
    const inSH = await page.evaluate(() => {
      for (const key of Object.keys(window)) {
        const val = window[key];
        if (val && val.scene && val.scene.scenes) {
          const active = val.scene.scenes.filter(s => s.scene.isActive());
          return active.map(s => s.scene.key);
        }
      }
      return [];
    });

    if (Array.isArray(inSH) && inSH.includes('InteriorScene')) {
      console.log('  In Smart Home interior!');

      // Walk toward NPC
      console.log('  Walking toward NPC...');
      await page.keyboard.down('ArrowLeft');
      await sleep(1500);
      await page.keyboard.up('ArrowLeft');
      await sleep(500);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/19-smarthome-near-npc.png` });
      console.log('  Screenshot: 19-smarthome-near-npc.png');

      // Talk to NPC
      console.log('  Pressing SPACE to talk...');
      await page.keyboard.press('Space');
      await sleep(2000);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/20-smarthome-dialogue.png` });
      console.log('  Screenshot: 20-smarthome-dialogue.png');

      // Close dialogue and exit
      await page.keyboard.press('Escape');
      await sleep(1000);

      // Walk toward portal
      console.log('  Walking toward portal...');
      await page.keyboard.down('ArrowRight');
      await sleep(3000);
      await page.keyboard.up('ArrowRight');
      await sleep(500);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/21-smarthome-near-portal.png` });
      console.log('  Screenshot: 21-smarthome-near-portal.png');

      // Exit
      console.log('  Pressing ESC to exit...');
      await page.keyboard.press('Escape');
      await sleep(3000);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/22-back-to-overworld-final.png` });
      console.log('  Screenshot: 22-back-to-overworld-final.png');
    } else {
      console.log('WARNING: Could not enter smart home interior');
    }
  }

  console.log('\nDone! All screenshots saved.');
  await browser.close();
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
