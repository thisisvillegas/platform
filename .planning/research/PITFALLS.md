# Pitfalls Research

**Domain:** Phaser 3 + Angular 19 pixel-art game portfolio on Raspberry Pi 4
**Researched:** 2026-02-14
**Confidence:** MEDIUM-HIGH (verified via Phaser docs, official template, GitHub issues, community forums)

## Critical Pitfalls

### Pitfall 1: Phaser Game Instance Leaks on Angular Route Changes

**What goes wrong:**
When the user navigates away from the game route (e.g., to a real Angular app page), the Phaser game instance keeps running in the background -- its `requestAnimationFrame` loop, WebGL context, textures, and audio all persist. Navigating back creates a second canvas element. After a few round-trips, the Pi's 8GB RAM is consumed and the tab crashes.

**Why it happens:**
Phaser's `game.destroy()` is asynchronous -- it flags the game for destruction on the *next frame*, not immediately. Angular's `ngOnDestroy` fires and returns before Phaser has actually torn down. Developers assume calling `destroy()` is sufficient and don't verify cleanup. Additionally, `EventBus` listeners registered in Phaser scenes survive the Angular component destruction if not explicitly removed.

**How to avoid:**
1. In `ngOnDestroy()`, call `this.game.destroy(true, false)` -- the first `true` removes the canvas from the DOM. Pass `false` for `noReturn` since you may re-enter the game route.
2. Before destroying, explicitly call `EventBus.removeAllListeners()` to prevent orphaned listeners.
3. Store the game instance reference in the component, not a global/service variable.
4. Add a guard: check if a canvas with Phaser's ID already exists before creating a new game instance.
5. Use the official Phaser Angular template's `PhaserGame` component pattern as the reference implementation (Phaser 3.90.0 + Angular 19.2.0).

**Warning signs:**
- Browser DevTools shows multiple `<canvas>` elements after navigating away and back.
- Memory in Performance Monitor climbs on each route change without dropping.
- Console warnings about WebGL context lost.

**Phase to address:**
Phase 1 (Foundation) -- this must be solved in the initial Phaser-Angular bridge setup, not retrofitted.

---

### Pitfall 2: Blurry Pixel Art from Missing Rendering Configuration

**What goes wrong:**
16x16 pixel art tiles render blurry or anti-aliased instead of crisp. The game looks like a smeared watercolor painting instead of a retro pixel-art world. This is especially bad on Retina/HiDPI displays where sub-pixel rendering compounds the issue.

**Why it happens:**
Phaser defaults to bilinear texture filtering (smooth scaling). Without explicit configuration, WebGL interpolates pixel colors when scaling up, creating blur. Additionally, sprites positioned at sub-pixel coordinates (e.g., `x: 100.3`) cause individual pixels to blend. CSS on the canvas element may also add its own smoothing.

**How to avoid:**
Set all four of these in the Phaser game config -- missing any one causes blur:
```typescript
const config: Phaser.Types.Core.GameConfig = {
  pixelArt: true,        // nearest-neighbor filtering on textures
  antialias: false,       // disable anti-aliasing
  roundPixels: true,      // snap sprite positions to integer pixels
  scale: {
    zoom: 1,              // or integer multiples only (2, 3, 4)
    autoRound: true
  },
  render: {
    pixelArt: true        // redundant but explicit for WebGL pipeline
  }
};
```
Also add CSS on the canvas container:
```css
canvas {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
```
For HiDPI displays, use integer zoom values only (e.g., `zoom: 2` or `zoom: 3`). Non-integer zoom causes sub-pixel tile positions.

**Warning signs:**
- Tiles look "soft" at any zoom level.
- Tile edges blend into adjacent tiles.
- Artwork looks different in the game vs. in an image viewer at the same zoom.

**Phase to address:**
Phase 1 (Foundation) -- game config is the first thing created. Getting this wrong taints every visual test afterward.

---

### Pitfall 3: Tilemap Tile Bleeding (Gap Lines Between Tiles)

**What goes wrong:**
Single-pixel lines appear between tiles during camera movement or at certain zoom levels. You see the background color peeking through tile seams. The effect is intermittent -- it appears during scrolling and disappears when the camera stops.

**Why it happens:**
WebGL samples texture pixels using floating-point coordinates. When the camera moves at sub-pixel speeds, texture sampling can grab a pixel from an adjacent tile in the tileset image. This is a fundamental WebGL texture atlas problem, not a Phaser bug. It is dramatically worse with non-integer camera zoom values.

**How to avoid:**
1. **Extrude your tilesets** using `tile-extruder` (npm package or web app at tile-extruder.vercel.app). This adds 1px padding around each tile by duplicating edge pixels.
2. After extrusion, load in Phaser with the correct margin/spacing: a tileset with no original margin extruded by 1px needs `margin: 1, spacing: 2`.
3. Set `camera.roundPixels = true` in your scene's `create()`.
4. Avoid non-integer camera zoom. If you need 1.5x zoom, redesign at a higher base resolution instead.
5. In Tiled, do NOT set margin/spacing on the extruded tileset -- handle it on the Phaser side only.

**Warning signs:**
- Flickering lines visible during camera panning, especially diagonal movement.
- Lines appear at specific scroll positions but not others.
- Problem vanishes in Canvas mode but appears in WebGL.

**Phase to address:**
Phase 2 (Tilemap/World) -- this must be solved when first importing tilesets. Run `tile-extruder` as a build step before any tileset is added to the project.

---

### Pitfall 4: Scene State Not Resetting on Scene Restart

**What goes wrong:**
Player re-enters a game area (scene restart via `scene.start()`) and NPCs are in wrong positions, dialogue flags are stale, items already collected reappear, or the game crashes with "Cannot read property of null" on destroyed game objects.

**Why it happens:**
Phaser scenes persist in memory after `stop()`. Class-level variables (declared in the constructor or as class fields) are NOT reset when `create()` runs again -- only local variables inside `create()` reset. Arrays holding references to game objects that were destroyed during shutdown still contain those dead references. The official Phaser docs explicitly warn: "Variables declared outside callbacks retain old values across restarts."

**How to avoid:**
1. Initialize ALL mutable state in `init()`, not in the constructor or as class field defaults.
2. Listen to the scene's `shutdown` event and clear all arrays, maps, and references:
```typescript
this.events.on('shutdown', () => {
  this.npcs = [];
  this.dialogueState = {};
  this.collectedItems.clear();
});
```
3. Never store references to game objects outside the scene that creates them.
4. For the world pack system (swappable data folders), load NPC positions and dialogue flags fresh from JSON on every `init()`, not cached in a service.

**Warning signs:**
- Bugs that only appear on the second visit to a scene, never the first.
- "Cannot read properties of undefined/null" errors after scene transitions.
- NPCs appear duplicated (old ones + new ones).

**Phase to address:**
Phase 2 (Tilemap/World) and Phase 3 (NPCs/Dialogue) -- establish the pattern in Phase 2, enforce it when adding NPCs.

---

### Pitfall 5: Day/Night Cycle via Light Pipeline Requires Normal Maps for Every Sprite

**What goes wrong:**
Developer enables Phaser's `Light2D` pipeline for a day/night cycle. The tilemap and player sprite disappear or turn solid black because they don't have normal maps. Only sprites WITH normal maps render correctly. The developer now faces creating normal maps for every single tile and sprite in the game -- a massive art pipeline burden for a pixel-art portfolio site.

**Why it happens:**
Phaser's `Light2D` (ForwardDiffuseLightPipeline) requires normal maps for every object it illuminates. Without a normal map, the pipeline has no surface direction data, so it renders black. This is by design for realistic 2D lighting, but it's completely impractical for a portfolio project using purchased itch.io tilesets that don't include normal maps.

**How to avoid:**
Do NOT use Phaser's Light2D pipeline. Instead, implement day/night as a visual overlay:

1. **Approach A (recommended):** Create a full-screen Rectangle or Graphics object at `depth: 999` with a dark blue fill and alpha 0.0-0.6, tweened over your day/night cycle timer. Simple, performant, no normal maps needed.
2. **Approach B:** Tint individual game objects using `setTint()` with a color that shifts from white (day) to dark blue (night). More granular but more code.
3. **Approach C:** Use a dark overlay with "holes" cut via `BlendMode.ERASE` for light sources (lanterns, windows).
4. Do NOT use `camera.setTint()` -- it is documented as non-functional (GitHub issue #5327).

**Warning signs:**
- Any tutorial suggesting "just enable Light2D" for a day/night cycle -- this advice ignores the normal map requirement.
- Sprites disappearing when `setPipeline('Light2D')` is called.
- Researching normal map generation tools (SpriteIlluminator, Laigter) for every tileset -- a sign you're going down the wrong path.

**Phase to address:**
Phase 4 (Theme Engine) -- but the decision to NOT use Light2D should be documented in Phase 1 architecture notes.

---

### Pitfall 6: Raspberry Pi 4 Memory Exhaustion from Concurrent PM2 Processes

**What goes wrong:**
The Pi already runs 7+ PM2 processes (platform-frontend, platform-api, gif-gallery-api, gif-gallery-client, homecontrol, rootine, tactiqal). Adding a Phaser game doesn't add a new server process -- it's served as static files from the existing Angular build. However, the Angular build process itself (`ng build`) on the Pi consumes 1-2GB RAM, and running it while all PM2 processes are active can cause OOM kills, taking down other apps.

**Why it happens:**
Angular's AOT compiler and Webpack/esbuild are memory-intensive. The Pi has 8GB RAM, but with 7+ Node.js processes each consuming 100-300MB, available RAM during build may be only 2-4GB. Adding Phaser (700KB+ gzipped) to the Angular bundle increases build memory requirements.

**How to avoid:**
1. Build locally on your Mac, then `scp` the `dist/` folder to the Pi. Never run `ng build` on the Pi if avoidable.
2. If you must build on the Pi, temporarily stop non-essential PM2 processes: `pm2 stop gif-gallery-api gif-gallery-client homecontrol rootine tactiqal` before building.
3. Set Node.js memory limit for builds: `NODE_OPTIONS="--max-old-space-size=2048" npx ng build`.
4. Keep Phaser assets (tilesets, spritesheets) small: target under 5MB total as already planned. Larger assets increase build time and memory.
5. Use tree-shaking: import only the Phaser modules you need, not the entire library.

**Warning signs:**
- `ng build` exits with signal 9 (SIGKILL/OOM).
- Other PM2 processes restart unexpectedly during builds.
- `dmesg | grep -i oom` shows out-of-memory killer entries.

**Phase to address:**
Phase 1 (Foundation) -- establish the local-build-then-deploy workflow from day one.

---

## Moderate Pitfalls

### Pitfall 7: Y-Depth Sorting Breaks with Mixed Tile Layers and Sprites

**What goes wrong:**
Player walks behind a tree but renders in front of it, or walks in front of a fence but renders behind it. The depth sorting is inconsistent and flickery.

**Why it happens:**
Tilemap layers have a fixed depth. Sprites have a separate depth. Setting `sprite.depth = sprite.y` only sorts sprites against other sprites, not against tile layers. You need the "above" tile layer (tree tops, roof overhangs) on a layer with higher depth than any sprite, and the "below" tile layer (ground, paths) with lower depth.

**How to avoid:**
Structure your Tiled map with explicit layers for depth:
- Layer `ground` (depth 0) -- terrain, paths
- Layer `ground-detail` (depth 1) -- flowers, puddles
- Sprites are dynamically sorted (depth = `sprite.y + sprite.height * 0.5`)
- Layer `above-player` (depth 1000) -- tree canopies, roof overhangs, bridge railings

In Phaser, after creating layers:
```typescript
groundLayer.setDepth(0);
abovePlayerLayer.setDepth(1000);
// In update():
this.player.setDepth(this.player.y + this.player.height * 0.5);
npcs.forEach(npc => npc.setDepth(npc.y + npc.height * 0.5));
```

**Warning signs:**
- Player "pops" in front of objects they should be behind.
- Depth looks correct when standing still but breaks during movement.

**Phase to address:**
Phase 2 (Tilemap/World) -- layer naming conventions must be established when designing the first map in Tiled.

---

### Pitfall 8: Dialogue System Blocks Game Loop or Leaks Input Events

**What goes wrong:**
Opening a dialogue box freezes the game, or the player continues moving while reading dialogue, or pressing Space to advance dialogue also triggers jump/interact, or closing dialogue leaves input handlers active that conflict with normal gameplay.

**Why it happens:**
Developers implement dialogue as a synchronous sequence (async/await in update loop) which blocks the game, or they add keyboard listeners in the dialogue system without removing the player movement listeners, creating input conflicts.

**How to avoid:**
1. Implement dialogue as a separate scene running in parallel (via `scene.launch('DialogueScene')`) with its own input handling, rendered above the game scene.
2. When dialogue opens, pause the game scene's input: `this.scene.pause('GameScene')`.
3. When dialogue closes, resume: `this.scene.resume('GameScene')`.
4. The dialogue scene handles its own Space/Enter/Click input for text advancement.
5. Pre-written JSON dialogue structure should include metadata:
```json
{
  "npc_id": "blacksmith",
  "pages": [
    { "speaker": "Blacksmith", "text": "Welcome to my forge!" },
    { "speaker": "Blacksmith", "text": "I craft the finest tools." }
  ]
}
```
6. For typewriter effect, use a timed event (`this.time.addEvent`) not `setTimeout` -- Phaser's timer respects scene pause state.

**Warning signs:**
- Player can walk away during dialogue.
- Pressing interact key advances dialogue AND triggers another action.
- Dialogue text appears instantly instead of typewriter-style on second viewing (timer not reset).

**Phase to address:**
Phase 3 (NPCs/Dialogue) -- design the dialogue scene architecture before implementing the first NPC.

---

### Pitfall 9: Building-to-App Navigation Breaks Phaser State

**What goes wrong:**
Player enters a building in the game world that navigates to a real Angular route (e.g., `/projects`). When they return to the game, either: (a) the game reloads from scratch (losing position), (b) the game is in a broken state, or (c) the Angular route renders inside/behind the game canvas.

**Why it happens:**
Angular routing and Phaser game state are fundamentally separate systems. `router.navigate()` destroys the Angular component hosting the Phaser game (triggering ngOnDestroy and game.destroy). There's no built-in way to "pause" a Phaser game, navigate to a different Angular route, and come back.

**How to avoid:**
Design two distinct navigation patterns:
1. **Angular overlay navigation (recommended for portfolio apps):** Don't use Angular Router to leave the game. Instead, open Angular components as overlays/modals on top of the game canvas. The game pauses (`scene.sleep()`) but isn't destroyed. The Angular component renders in a container above the canvas with `position: absolute; z-index: 10`.
2. **Full route navigation with state save:** If you must use Angular routing, save game state (player position, current map, dialogue progress) to a service or localStorage before navigating. On return, restore from saved state in `init()`.
3. **External app links (gif gallery, homecontrol):** These open in new tabs via `window.open()`, not in-app navigation. The game stays alive in the background.

**Warning signs:**
- Planning to use `router.navigate()` from within a Phaser scene.
- No state persistence mechanism designed for the game.
- Game component is a routed component rather than a persistent layout component.

**Phase to address:**
Phase 1 (Foundation) -- the component architecture (game as persistent layout vs. routed component) must be decided before any game code is written.

---

### Pitfall 10: Tilemap Layer Count Tanks Frame Rate

**What goes wrong:**
The game runs at 30-40 FPS instead of 60 FPS on lower-end visitor devices (phones, old laptops). The Pi serves it fine (it's static files), but visitors' browsers choke.

**Why it happens:**
Each tilemap layer is a separate draw call in WebGL. Benchmarks show: 1 layer = 62 FPS, 4 layers = 52 FPS, 6 layers = 42 FPS, 8 layers = 34 FPS. Complex maps in Tiled easily accumulate 6-10 layers (ground, paths, grass-detail, walls, wall-tops, furniture, decorations, roof, above-player, collision-markers).

**How to avoid:**
1. Cap at 4-5 visible tilemap layers maximum per scene.
2. Merge decorative layers in Tiled: combine `grass-detail` into `ground`, combine `furniture` into `walls`.
3. Use the `above-player` layer only for tiles that actually need depth sorting (tree canopies, not solid walls).
4. Convert purely decorative layers to static images where possible.
5. Use Tiled's "Flatten" feature for layers that don't need independent manipulation at runtime.

**Warning signs:**
- Tiled map has more than 5 layers.
- FPS drops during camera panning (draw calls scale with visible tiles per layer).
- Adding a "just one more layer" for visual polish.

**Phase to address:**
Phase 2 (Tilemap/World) -- establish the layer naming convention and max-layer budget before designing maps.

---

### Pitfall 11: Cloudflare Tunnel Adds Latency to Asset Loading

**What goes wrong:**
Game assets load slowly (2-5 seconds for a 2MB tileset). The loading screen feels sluggish for first-time visitors. Cloudflare's cache purging after low-traffic periods causes cache misses.

**Why it happens:**
The request path is: Visitor -> Cloudflare CDN -> Cloudflare Tunnel -> Pi (home internet). The Pi's upload speed (typically 10-30 Mbps residential) is the bottleneck. Cloudflare caches static assets, but cache entries expire after low-traffic periods, and the first visitor after a gap hits the Pi directly.

**How to avoid:**
1. Set aggressive cache headers for game assets: `Cache-Control: public, max-age=31536000, immutable` for hashed filenames (Angular's default for production builds).
2. Keep total game assets under 5MB as planned -- ideally under 2MB for the initial load.
3. Use texture atlases instead of individual sprite files to reduce HTTP request count.
4. Implement a Phaser preload scene with a progress bar so users see loading progress rather than a blank screen.
5. Consider hosting tileset images on Cloudflare R2 (S3-compatible object storage, free egress) to bypass the tunnel entirely for large assets.
6. Use Cloudflare Page Rules to set long cache TTLs for `/assets/game/*` paths.

**Warning signs:**
- Loading time exceeds 3 seconds for returning visitors (cache miss).
- Pi's `iftop` shows spikes during game loads.
- Users on mobile connections (3G/4G) experience 5-10 second loads.

**Phase to address:**
Phase 1 (Foundation) -- cache headers and asset optimization pipeline should be established with the first deployed build.

---

## Minor Pitfalls

### Pitfall 12: Phaser's Scale Manager Fights Angular's Layout

**What goes wrong:**
The game canvas doesn't resize when the browser window changes, or it resizes but breaks the pixel-perfect rendering, or it overflows its Angular container element.

**Prevention:**
Use `Phaser.Scale.FIT` with a fixed game resolution (e.g., 480x270 for 16:9 at 16px tiles = 30x17 tiles visible). Let Phaser handle scaling within its container div. Set the container div's size via Angular/CSS, and let Phaser's `Scale.FIT` fill it while maintaining aspect ratio. Do NOT use `Phaser.Scale.RESIZE` for pixel art -- it creates non-integer scaling.

---

### Pitfall 13: EventBus Cross-Communication Memory Leaks

**What goes wrong:**
Phaser scenes register EventBus listeners in `create()` but don't remove them in `shutdown`. After scene restarts, duplicate listeners fire, causing double-processing or errors.

**Prevention:**
Always pair EventBus registrations with cleanup:
```typescript
create() {
  EventBus.on('some-event', this.handleEvent, this);
  this.events.on('shutdown', () => {
    EventBus.off('some-event', this.handleEvent, this);
  });
}
```
Use the context parameter (third arg) so `off()` only removes YOUR handler.

---

### Pitfall 14: Arcade Physics Tile Collision Edge Snagging

**What goes wrong:**
Player gets "stuck" on edges between two adjacent collision tiles while walking along a wall. Movement feels janky and frustrating.

**Prevention:**
Set the player's physics body smaller than the sprite: `this.player.body.setSize(12, 12).setOffset(2, 4)` for a 16x16 sprite. The smaller hitbox prevents edge-snagging on adjacent tile boundaries. Alternatively, use Tiled object layers to define collision rectangles that span multiple tiles (fewer physics bodies = fewer edge cases).

---

### Pitfall 15: Guest JWT (Pass System) Stored in localStorage Persists Across Sessions

**What goes wrong:**
A guest's "pass" JWT is stored in localStorage and never expires, accumulating stale tokens. Or the JWT is too large because it contains achievement data, hitting the 4KB cookie or header size limit.

**Prevention:**
Store the guest JWT in memory (Angular service) with localStorage as a fallback for page refreshes only. Set a short expiration (24h). Keep the JWT payload minimal (just a guest ID). Store achievements and secrets in MongoDB keyed by guest ID, not in the token itself.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Putting all game logic in one Phaser scene | Fast to prototype | Unmaintainable past 500 LOC, can't reuse map logic | Never -- split from day one: Boot, Preload, Game, Dialogue, UI scenes |
| Hardcoding NPC positions in scene code | No need for Tiled object layers | Can't swap world packs, can't edit maps without code changes | Never -- always use Tiled object layers for NPC spawn data |
| Using `setTimeout`/`setInterval` instead of Phaser timers | Familiar API | Timers don't pause with scene, cause bugs when scene is sleeping | Never in Phaser scenes -- always use `this.time.addEvent()` |
| Skipping tile extrusion | Saves one build step | Tile bleeding appears on every device at random scroll positions | Never -- extrude all tilesets before first use |
| Importing all of Phaser (`import Phaser from 'phaser'`) | Simple imports | Bundle includes physics systems, 3D, Facebook Instant Games etc. you don't use | MVP only -- tree-shake for production |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Angular Router + Phaser | Using `router.navigate()` to leave game, destroying the game instance | Use overlay components above the canvas, or save/restore game state |
| Auth0 + Guest Pass | Requiring Auth0 login to play the game | Game is fully playable without auth. Guest JWT is separate from Auth0. Auth0 is only for admin/CMS features |
| Tiled JSON export + Phaser | Exporting as TMX (XML) format | Always export as JSON. Use "Embed tilesets" option to avoid separate tileset file loading |
| PM2 + Static Files | Creating a new PM2 process for the game | The game is part of the Angular build output -- it's served by the existing `platform-frontend` PM2 process, no new process needed |
| Cloudflare Tunnel + WebSocket | Attempting real-time multiplayer or live-updating features via WebSocket through the tunnel | Avoid WebSockets entirely. The game is single-player. Use REST APIs for saving achievements. WebSocket through Cloudflare Tunnel has known timeout issues (disconnects after 20-30s of inactivity) |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Too many tilemap layers | FPS drops below 50 during camera pan | Cap at 4-5 layers, merge decorative layers | Above 5-6 layers on mid-range devices |
| Unoptimized spritesheets (individual PNGs) | Dozens of HTTP requests, texture swapping per draw | Pack all sprites into texture atlases | Above 20 individual sprite files |
| Creating/destroying sprites every frame | GC pauses, frame stuttering | Object pooling for particles, projectiles | When creating/destroying 10+ objects/second |
| Phaser game running while Angular app is in foreground | CPU usage stays at 15-30% even when game is hidden | `scene.sleep()` or `game.scene.pause()` when game view is not visible | Any time the game component is not the active view |
| Large JSON dialogue files loaded synchronously | Frame hitch when opening dialogue | Preload all dialogue JSON in the Preload scene, not on-demand | Dialogue files exceeding 50KB |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing achievement unlock logic client-side only | Users can forge achievements by modifying localStorage/memory | Validate achievement conditions server-side. Client sends "I did X" event, server verifies and records |
| Guest JWT with no expiration | Token accumulation, potential replay attacks | 24h expiration, refresh on revisit, server-side session tracking |
| Embedding API keys in Phaser scene code | Keys visible in browser source | All API calls go through the Express backend. Phaser never talks directly to external services |
| Trusting client-sent player position for building-to-app triggers | Users could trigger navigation to hidden areas | Collision zones are defined in the tilemap, but actual navigation authorization is handled by the Angular app layer, not the game |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No loading progress indicator | Users think the site is broken during 2-3s asset load | Phaser Preload scene with a pixel-art progress bar |
| Dialogue text appears all at once | Feels lifeless, removes the RPG charm | Typewriter effect at 30-50ms per character, with Space to skip-to-end |
| No indication of interactable objects | Users walk past NPCs and buildings without knowing they can interact | Subtle bounce animation or "!" indicator when player is within interaction range |
| Game canvas captures all keyboard input | Users can't use browser shortcuts (Cmd+F, etc.) while game is visible | Only capture game-relevant keys (WASD, Space, E). Let browser defaults pass through for modifier combos |
| No mobile fallback | Mobile visitors see nothing or a broken canvas | Show a static screenshot of the game world with a "Visit on desktop for the full experience" message |

## "Looks Done But Isn't" Checklist

- [ ] **Pixel art rendering:** Test at 1x, 2x, and 3x zoom AND on a Retina display -- blur only shows on HiDPI screens
- [ ] **Tile bleeding:** Test by slowly panning the camera diagonally -- bleeding only shows during sub-pixel camera movement
- [ ] **Scene cleanup:** Navigate away from game and back 5 times, check memory in DevTools -- leaks only compound over multiple transitions
- [ ] **Dialogue system:** Open and close the same NPC dialogue 3 times in a row -- event listener duplication only shows on repeat interactions
- [ ] **Day/night cycle:** Run through a full cycle and verify no sprites disappear -- lighting bugs may only trigger at extreme alpha values
- [ ] **Building navigation:** Enter a building, view the Angular app page, return to game -- state loss only shows on the round-trip
- [ ] **World pack swap:** Switch to a different world pack and verify ALL NPCs, dialogue, and collision data updated -- partial swaps create Frankenworlds
- [ ] **Browser refresh:** Hard-refresh the page while in the game -- does the game recover gracefully or crash?
- [ ] **Guest pass:** Open the game in an incognito window -- does the guest JWT flow work without Auth0?

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Game instance leak on route change | LOW | Add `ngOnDestroy` cleanup + EventBus teardown. One-file fix |
| Blurry pixel art | LOW | Update game config object. One-line changes, immediate visual fix |
| Tile bleeding | MEDIUM | Run `tile-extruder` on all tilesets, update Phaser tileset loading code (margin/spacing params), re-export from Tiled if needed |
| Scene state corruption | MEDIUM | Refactor state initialization to `init()`, add `shutdown` cleanup listeners. Tedious but mechanical |
| Wrong lighting approach (Light2D) | HIGH | Rip out all Light2D code, remove normal maps, replace with overlay system. Architecture-level change |
| Pi OOM during build | LOW | Switch to local build + scp deploy. Process change, not code change |
| Y-depth sorting | MEDIUM | Restructure Tiled layers, add depth-sorting in update loop. Requires map redesign |
| Dialogue input bleed | MEDIUM | Refactor to separate Dialogue scene with own input handling. Requires scene architecture change |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Game instance leak (#1) | Phase 1: Foundation | Navigate away/back 5x, check for canvas duplication and memory growth |
| Blurry pixel art (#2) | Phase 1: Foundation | Screenshot at 2x zoom on Retina display, compare pixel edges to source art |
| Tile bleeding (#3) | Phase 2: Tilemap | Pan camera slowly in all directions, inspect for gap lines |
| Scene state persistence (#4) | Phase 2: Tilemap | Exit and re-enter the same map 3x, verify NPC positions and item states |
| Light pipeline trap (#5) | Phase 4: Theme Engine | Day/night cycle renders correctly without any normal map files in the project |
| Pi memory (#6) | Phase 1: Foundation | Successful `ng build` on Pi with all PM2 processes running (or local build workflow documented) |
| Y-depth sorting (#7) | Phase 2: Tilemap | Player walks behind tree top, in front of tree trunk, no visual popping |
| Dialogue input (#8) | Phase 3: NPCs/Dialogue | Open dialogue, mash WASD -- player must not move |
| Building navigation (#9) | Phase 1: Foundation | Enter building -> view Angular page -> return -> player at same position |
| Layer count FPS (#10) | Phase 2: Tilemap | Maintain 55+ FPS on Chrome mobile emulation (Moto G Power) |
| Cloudflare caching (#11) | Phase 1: Foundation | Cold load under 3s on 4G throttle in DevTools |
| Scale manager (#12) | Phase 1: Foundation | Resize browser window -- canvas maintains aspect ratio without blur |
| EventBus leaks (#13) | Phase 1: Foundation | Restart scene 5x, check EventBus listener count doesn't grow |
| Physics edge snag (#14) | Phase 2: Tilemap | Walk along a wall without getting stuck at tile boundaries |
| Guest JWT (#15) | Phase 5: Pass System | Incognito window creates guest pass, achievements persist across page refresh |

## Sources

- [Phaser 3 Official Docs: Scenes](https://docs.phaser.io/phaser/concepts/scenes) -- scene lifecycle, state persistence warnings (HIGH confidence)
- [Phaser Angular Template](https://github.com/phaserjs/template-angular) -- official bridge pattern, EventBus, component architecture (HIGH confidence)
- [Phaser GitHub Issue #5456](https://github.com/photonstorm/phaser/issues/5456) -- memory leak with texture cache (HIGH confidence)
- [Phaser GitHub Issue #3207](https://github.com/phaserjs/phaser/issues/3207) -- WebGL tilemap rendering blur (HIGH confidence)
- [Phaser GitHub Issue #3352](https://github.com/phaserjs/phaser/issues/3352) -- tile spacing/bleeding during camera movement (HIGH confidence)
- [Phaser GitHub Issue #839](https://github.com/photonstorm/phaser/issues/839) -- tilemap layer count performance impact (HIGH confidence)
- [Phaser GitHub Issue #5327](https://github.com/photonstorm/phaser/issues/5327) -- camera setTint non-functional (HIGH confidence)
- [tile-extruder](https://github.com/sporadic-labs/tile-extruder) -- tileset extrusion tool (HIGH confidence)
- [Phaser Game.destroy() docs](https://newdocs.phaser.io/docs/3.80.0/focus/Phaser.Game-destroy) -- async destruction behavior (HIGH confidence)
- [Phaser Discourse: Scene lifecycle confusion](https://phaser.discourse.group/t/please-unconfuse-me-about-the-lifecycle-of-scenes/9198) -- community discussion on scene state (MEDIUM confidence)
- [Phaser Discourse: Tilemap performance](https://phaser.discourse.group/t/tilemap-performance/10190) -- large map performance (MEDIUM confidence)
- [Phaser Discourse: Light2D broken](https://phaser.discourse.group/t/phaser3-webgl-lights-light2d-am-i-missing-something-or-are-they-broken/3016) -- Light2D normal map requirement (MEDIUM confidence)
- [Cloudflare WebSocket docs](https://developers.cloudflare.com/network/websockets/) -- tunnel WebSocket limitations (MEDIUM confidence)
- [Cloudflare Community: Tunnel WebSocket timeouts](https://community.cloudflare.com/t/websockets-disconnecting-after-20s/661308) -- 20-30s disconnect reports (LOW confidence, community reports)
- [Pixel-perfect Phaser scaling](https://www.davideaversa.it/blog/quick-dev-tips-pixel-perfect-scaling-phaser-game/) -- HiDPI and integer zoom guidance (MEDIUM confidence)
- [Josh Morony: Day/Night in Phaser](https://www.joshmorony.com/how-to-create-a-day-night-cycle-in-phaser/) -- tint-based day/night approach (MEDIUM confidence)
- [Phaser Angular integration discussion](https://phaser.discourse.group/t/phaser-3-angular-combining/3901) -- community patterns and iframe approach (MEDIUM confidence)
- [Angular Router + Phaser canvas duplication](https://github.com/photonstorm/phaser-ce/issues/307) -- canvas element spawning on route changes (HIGH confidence)

---
*Pitfalls research for: Phaser 3 + Angular 19 pixel-art game portfolio on Raspberry Pi 4*
*Researched: 2026-02-14*
