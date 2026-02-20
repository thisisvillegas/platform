import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import path from 'path';

const SCREENSHOT_DIR = '/Users/andres/dev/platform/qa-screenshots/interiors/03-warroom-greenhouse';
mkdirSync(SCREENSHOT_DIR, { recursive: true });

let shotNum = 0;
const screenshot = async (page, name) => {
  shotNum++;
  const prefix = String(shotNum).padStart(2, '0');
  const filePath = path.join(SCREENSHOT_DIR, `${prefix}-${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`  [${prefix}] ${name}.png`);
  return filePath;
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const holdKey = async (page, key, durationMs) => {
  await page.keyboard.down(key);
  await sleep(durationMs);
  await page.keyboard.up(key);
  await sleep(300);
};

// Teleport the player to exact coordinates by injecting into Phaser
const teleportPlayer = async (page, x, y) => {
  await page.evaluate(({ x, y }) => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    // Access the Phaser game instance via the global scope
    // Phaser stores the game on the parent element or as a global
    const game = (window).__PHASER_GAME__ ||
                 Array.from(document.querySelectorAll('canvas'))
                   .map(c => c['__phaser'] || (c.parentElement && c.parentElement['__phaser']))
                   .find(Boolean);
    if (game) {
      const scene = game.scene.getScene('OverworldScene');
      if (scene) {
        const player = scene.playerController?.sprite;
        if (player) {
          player.setPosition(x, y);
        }
      }
    }
  }, { x, y });
};

// Force a scene transition using page.evaluate
const forceEnterBuilding = async (page, buildingId) => {
  return page.evaluate((bid) => {
    // Find the Phaser game instance
    const canvases = document.querySelectorAll('canvas');
    for (const canvas of canvases) {
      const game = canvas.closest('[id]');
      if (game) {
        // Try to access Phaser game through various paths
        break;
      }
    }

    // Alternative: dispatch a custom event that the game can listen to
    // Or access via Angular's component reference
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) return 'no game-container';

    return 'attempted';
  }, buildingId);
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  page.on('pageerror', (err) => console.log(`  PAGE ERROR: ${err.message}`));

  try {
    // ═══════════════════════════════════════
    //  STEP 1: Auth + Navigate to /world
    // ═══════════════════════════════════════
    console.log('\n=== STEP 1: Auth + Load World ===');

    await page.goto('https://platform.thisisvillegas.com/projects', {
      waitUntil: 'networkidle', timeout: 30000
    });

    const response = await page.evaluate(async () => {
      const res = await fetch('https://api-pi.thisisvillegas.com/api/passes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: '42424242' })
      });
      return res.json();
    });

    if (response.token) {
      console.log('  JWT acquired');
      await page.evaluate((t) => localStorage.setItem('guest_token', t), response.token);
    }

    // Expose Phaser game before navigating
    await page.addInitScript(() => {
      // Hook into Phaser.Game constructor to capture the instance
      const origDefineProperty = Object.defineProperty;
      Object.defineProperty = function(obj, prop, desc) {
        const result = origDefineProperty.call(this, obj, prop, desc);
        if (prop === 'game' && desc?.value?.scene?.getScenes) {
          (window).__PHASER_GAME__ = desc.value;
        }
        return result;
      };
    });

    await page.goto('https://platform.thisisvillegas.com/world', {
      waitUntil: 'networkidle', timeout: 30000
    });
    await sleep(8000);
    await screenshot(page, 'overworld-loaded');

    // Click canvas to focus
    await page.mouse.click(640, 360);
    await sleep(500);

    // Dismiss onboarding tooltip if showing (press any key)
    await page.keyboard.press('Space');
    await sleep(500);
    await page.keyboard.press('Space');
    await sleep(500);
    await page.keyboard.press('Space');
    await sleep(1000);

    // ═══════════════════════════════════════
    //  STEP 2: Walk to War Room door
    // ═══════════════════════════════════════
    // Spawn: (480, 320). War Room door: (608, 192)
    // Distance: right 128px, up 128px. Speed: 100px/s
    // Time: 1.28s each direction. Add extra buffer.
    console.log('\n=== STEP 2: Walk to War Room ===');

    // Walk right: 128px at 100px/s = 1.28s
    console.log('  Walking RIGHT (1.5s)...');
    await holdKey(page, 'ArrowRight', 1500);
    await screenshot(page, 'walk-right');

    // Walk up: 128px at 100px/s = 1.28s
    console.log('  Walking UP (1.5s)...');
    await holdKey(page, 'ArrowUp', 1500);
    await screenshot(page, 'near-war-room');

    // Now we should be close to (608, 192). Try Enter.
    console.log('  Pressing Enter...');
    await page.keyboard.press('Enter');
    await sleep(2500);
    await screenshot(page, 'war-room-try-1');

    // If not entered, do a scanning pattern around the door
    // Walk slowly in small increments, trying Enter at each stop
    console.log('  Scanning for door...');
    const dirs = [
      ['ArrowUp', 200], ['ArrowUp', 200], ['ArrowUp', 200],
      ['ArrowDown', 100], ['ArrowLeft', 200],
      ['ArrowLeft', 200], ['ArrowLeft', 200],
      ['ArrowRight', 100], ['ArrowDown', 200],
      ['ArrowRight', 200], ['ArrowRight', 200],
      ['ArrowRight', 200], ['ArrowRight', 200],
    ];
    for (const [dir, ms] of dirs) {
      await holdKey(page, dir, ms);
      await page.keyboard.press('Enter');
      await sleep(800);
    }
    await screenshot(page, 'war-room-scan');

    // Check if we're in an interior by looking for interior indicators
    const checkInterior = async () => {
      // In interior, there would be "ESC to exit" text or different background
      const pageContent = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        return canvas ? 'canvas present' : 'no canvas';
      });
      return pageContent;
    };

    // More aggressive scanning - try walking directly to the door coords
    // The door is at the bottom of the building, so walk up to the building wall
    console.log('  Trying longer walk UP to building wall...');
    await holdKey(page, 'ArrowUp', 800);
    await page.keyboard.press('Enter');
    await sleep(1500);
    await screenshot(page, 'war-room-try-2');

    // Walk down slightly (door is at bottom of building)
    await holdKey(page, 'ArrowDown', 300);
    await page.keyboard.press('Enter');
    await sleep(1500);
    await screenshot(page, 'war-room-try-3');

    // Try pressing Space instead (InteractionSystem accepts both Enter and Space)
    console.log('  Trying SPACE key...');
    await page.keyboard.press('Space');
    await sleep(1500);
    await screenshot(page, 'war-room-try-space');

    // ═══════════════════════════════════════
    //  STEP 3: Try direct scene injection
    // ═══════════════════════════════════════
    console.log('\n=== STEP 3: Direct scene transition ===');

    // Try accessing Phaser game through Angular's zone
    const sceneResult = await page.evaluate(() => {
      // Method 1: Search for Phaser game on window
      if ((window).__PHASER_GAME__) return 'found via hook';

      // Method 2: Search canvas for Phaser reference
      const canvas = document.querySelector('canvas');
      if (!canvas) return 'no canvas';

      // Method 3: Look in Angular component
      const gameContainer = document.getElementById('game-container');
      if (!gameContainer) return 'no game-container';

      // Method 4: Iterate window properties
      for (const key of Object.keys(window)) {
        const val = (window)[key];
        if (val && typeof val === 'object' && val.scene && typeof val.scene.getScenes === 'function') {
          (window).__PHASER_GAME__ = val;
          return 'found via window scan';
        }
      }

      return 'not found';
    });
    console.log(`  Phaser game: ${sceneResult}`);

    // Try to force the scene transition
    const transitionResult = await page.evaluate(() => {
      const game = (window).__PHASER_GAME__;
      if (!game) {
        // Last resort: try to find game in Angular component tree
        const ng = (window).ng;
        if (ng) {
          const gameContainer = document.getElementById('game-container');
          if (gameContainer) {
            try {
              const component = ng.getComponent(gameContainer.parentElement);
              if (component?.game) {
                (window).__PHASER_GAME__ = component.game;
                return 'found via Angular';
              }
            } catch(e) {}
          }
        }
        return 'no game instance';
      }

      try {
        const overworldScene = game.scene.getScene('OverworldScene');
        if (!overworldScene || !overworldScene.scene.isActive()) {
          return 'OverworldScene not active';
        }

        // Get player position
        const allScenes = game.scene.getScenes(true);
        const sceneKeys = allScenes.map(s => s.scene.key);

        return `Active scenes: ${sceneKeys.join(', ')}`;
      } catch (e) {
        return `error: ${e.message}`;
      }
    });
    console.log(`  Scene status: ${transitionResult}`);

    // Direct approach: start InteriorScene with war-room data
    const enterResult = await page.evaluate(() => {
      const game = (window).__PHASER_GAME__;
      if (!game) return 'no game';

      try {
        const overworldScene = game.scene.getScene('OverworldScene');
        if (!overworldScene) return 'no overworld';

        // Start InteriorScene directly
        game.scene.start('InteriorScene', {
          buildingId: 'war-room',
          buildingName: 'The War Room',
          buildingType: 'app',
          appRoute: '/tactiqal',
          requiresAuth: true,
          description: 'Tactical planning tool',
          returnX: 608,
          returnY: 200
        });
        return 'started InteriorScene';
      } catch (e) {
        return `error: ${e.message}`;
      }
    });
    console.log(`  Enter result: ${enterResult}`);
    await sleep(2000);
    await screenshot(page, 'war-room-forced');

    // ═══════════════════════════════════════
    //  STEP 4: War Room Interior Testing
    // ═══════════════════════════════════════
    console.log('\n=== STEP 4: War Room Interior ===');

    // Click canvas to ensure focus
    await page.mouse.click(640, 360);
    await sleep(500);

    // Walk left to NPC
    console.log('  Walking LEFT to NPC...');
    await holdKey(page, 'ArrowLeft', 1200);
    await holdKey(page, 'ArrowDown', 400);
    await screenshot(page, 'war-room-npc-approach');

    // Talk to NPC
    console.log('  Pressing SPACE to talk...');
    await page.keyboard.press('Space');
    await sleep(1500);
    await screenshot(page, 'war-room-dialogue-1');

    // Advance dialogue
    for (let i = 2; i <= 4; i++) {
      await page.keyboard.press('Space');
      await sleep(1000);
      await screenshot(page, `war-room-dialogue-${i}`);
    }

    // Walk right to portal
    console.log('  Walking RIGHT to portal...');
    await holdKey(page, 'ArrowRight', 2000);
    await holdKey(page, 'ArrowUp', 300);
    await screenshot(page, 'war-room-portal');
    await sleep(500);
    await screenshot(page, 'war-room-portal-prompt');

    // ═══════════════════════════════════════
    //  STEP 5: Exit + Enter Greenhouse
    // ═══════════════════════════════════════
    console.log('\n=== STEP 5: Exit + Enter Greenhouse ===');
    await page.keyboard.press('Escape');
    await sleep(2000);
    await screenshot(page, 'back-to-overworld');

    // Click canvas for focus
    await page.mouse.click(640, 360);
    await sleep(500);

    // Enter greenhouse directly
    const enterGreenhouse = await page.evaluate(() => {
      const game = (window).__PHASER_GAME__;
      if (!game) return 'no game';

      try {
        game.scene.start('InteriorScene', {
          buildingId: 'greenhouse',
          buildingName: 'The Greenhouse',
          buildingType: 'app',
          appRoute: '/rootine',
          requiresAuth: true,
          description: 'Routine & habit tracking',
          returnX: 880,
          returnY: 200
        });
        return 'started InteriorScene';
      } catch (e) {
        return `error: ${e.message}`;
      }
    });
    console.log(`  Greenhouse enter: ${enterGreenhouse}`);
    await sleep(2000);
    await screenshot(page, 'greenhouse-interior');

    // ═══════════════════════════════════════
    //  STEP 6: Greenhouse Interior Testing
    // ═══════════════════════════════════════
    console.log('\n=== STEP 6: Greenhouse Interior ===');

    await page.mouse.click(640, 360);
    await sleep(500);

    // Walk left to NPC
    console.log('  Walking LEFT to NPC...');
    await holdKey(page, 'ArrowLeft', 1200);
    await holdKey(page, 'ArrowDown', 400);
    await screenshot(page, 'greenhouse-npc-approach');

    // Talk to NPC
    console.log('  Pressing SPACE to talk...');
    await page.keyboard.press('Space');
    await sleep(1500);
    await screenshot(page, 'greenhouse-dialogue-1');

    // Advance dialogue
    for (let i = 2; i <= 4; i++) {
      await page.keyboard.press('Space');
      await sleep(1000);
      await screenshot(page, `greenhouse-dialogue-${i}`);
    }

    // Walk right to portal
    console.log('  Walking RIGHT to portal...');
    await holdKey(page, 'ArrowRight', 2000);
    await holdKey(page, 'ArrowUp', 300);
    await screenshot(page, 'greenhouse-portal');
    await sleep(500);
    await screenshot(page, 'greenhouse-portal-prompt');

    // ═══════════════════════════════════════
    //  STEP 7: Exit
    // ═══════════════════════════════════════
    console.log('\n=== STEP 7: Exit ===');
    await page.keyboard.press('Escape');
    await sleep(2000);
    await screenshot(page, 'final-overworld');

    console.log('\n=== TEST COMPLETE ===');

  } catch (err) {
    console.error(`\nERROR: ${err.message}`);
    await screenshot(page, 'error-state');
  } finally {
    await browser.close();
  }
})();
