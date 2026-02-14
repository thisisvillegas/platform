# Project Research Summary

**Project:** Interactive Pixel-Art Game World Portfolio
**Domain:** 2D RPG-style portfolio site with Phaser 3 game engine embedded in Angular 19
**Researched:** 2026-02-14
**Confidence:** HIGH (stack/architecture), MEDIUM-HIGH (features/pitfalls)

## Executive Summary

This portfolio project integrates a playable pixel-art 2D game world into the existing Angular 19 platform app, where buildings in the game ARE the actual running applications (GIF Gallery, Rootine, Tactiqal, etc.). Players walk through a top-down RPG-style village, interact with an NPC version of Claude, collect secrets, and enter buildings that navigate to live apps with guest access. The "wow factor" comes from gamification depth (3-tier secrets system, achievements, seasonal themes) and the meta-narrative of Claude as both builder and in-world character.

The recommended stack is **Phaser 3.90.0** (NOT Phaser 4 RC, which lacks Angular template and plugin support), integrated via the official `phaserjs/template-angular` bridge pattern. Game assets are created in **Tiled** (tilemaps) and **Aseprite** (pixel art), served as static files from the existing platform-frontend PM2 process. Critical architectural decisions: run Phaser outside Angular's NgZone to avoid performance death, use EventBus for all Angular-Phaser communication, implement dialogue/UI as parallel Phaser scenes, and design a World Pack JSON system to keep the engine world-agnostic.

Key risks center on **memory leaks** (Phaser game instances not properly destroyed on route changes), **blurry pixel art** (missing rendering config), **tile bleeding** (requires tileset extrusion), and **Pi build resource exhaustion** (8GB RAM shared with 7+ PM2 processes). Mitigation: follow the official template's lifecycle patterns exactly, set all pixel-art rendering flags from day one, run `tile-extruder` as a required asset pipeline step, and build locally then deploy to Pi rather than building on-device.

## Key Findings

### Recommended Stack

The core engine is **Phaser 3.90.0** with **Angular 19** integration via the official template's EventBus bridge pattern. Phaser 4 RC6 is production-ready per the Phaser team, but unavailable for this project due to missing Angular template and zero rex plugin support (needed for dialogue boxes with typewriter effects). Phaser 3.90.0 is the final stable v3 release with battle-tested docs, native Aseprite loader, and a proven Angular 19.2.0 template. Migration path exists when Phaser 4 goes stable.

**Core technologies:**
- **Phaser 3.90.0**: 2D game engine — final stable v3, native Aseprite/Tiled support, official Angular template, 1MB minified (lazy-loaded)
- **Tiled 1.11.2**: Tilemap editor — industry standard, JSON export consumed directly by Phaser, free and actively maintained
- **Aseprite 1.3.x**: Pixel art tool — de facto standard with native Phaser loader parsing animation tags automatically from exported JSON
- **phaser3-rex-plugins 1.80.18**: UI components — provides textbox with typewriter effect for RPG dialogue, actively maintained (Feb 2025)
- **TypeScript 5.7.2**: Type safety — already in project, Phaser ships full type definitions

**Supporting patterns:**
- **EventBus** (Phaser.Events.EventEmitter): Angular-Phaser bridge, bidirectional events, prevents tight coupling
- **World Pack JSON**: Data-driven configuration for tilemap, NPCs, buildings, dialogue, secrets — engine stays world-agnostic
- **NgZone isolation**: Phaser game loop runs outside Angular zone (60 FPS without triggering change detection)

### Expected Features

Users arrive expecting a **playable game, not a tech demo**. The table-stakes features that cannot be skipped: WASD/arrow movement with smooth camera follow, collision detection, building door entry that navigates to real apps, NPC interaction with typewriter dialogue, mobile touch controls (virtual joystick), loading screen with progress bar, return-to-world button on app pages, audio with mute control, and a skip option for recruiters who don't want to play.

**Must have (table stakes):**
- Player movement with collision and camera follow
- Building door entry with Angular route navigation
- NPC interaction (Claude guide) with RPG dialogue box and typewriter text
- Mobile touch controls (virtual joystick + interaction button)
- Loading screen, ambient audio, mute toggle
- Return to World button (persistent on all app routes)
- Skip option for visitors who want direct project access
- Speakeasy door with access code validation (pass system)

**Should have (competitive differentiators):**
- **Secrets Tier 1**: Collectible code fragments scattered in world (10-15 items revealing real code snippets)
- **Day/night cycle**: Auto-detected from visitor's local time, camera tint overlay (NOT Light2D pipeline — no normal maps)
- **Achievement system**: 9 pixel-art badges unlocked through exploration
- **Collectibles panel (Tab key)**: In-game overlay showing found items, achievements, stats
- **Receptionist NPCs**: In auth-required buildings, narrative-driven guest account creation
- **Seasonal themes (Valentine's, Halloween, Christmas)**: Theme JSON swaps tint, particles, audio, decoration layers
- **World Pack architecture**: Engine supports multiple worlds, ship Village only at launch

**Defer (v2+):**
- **Secrets Tier 2**: Multi-step puzzles (locked chest, NPC riddle chains, terminal challenge)
- **Secrets Tier 3**: Grand easter egg hunt (The Creator's Key quest)
- **Leaderboard**: Only valuable when visitor count justifies it
- **Dashboard managers**: World Manager, Pass Manager (use API/MongoDB direct until needed)
- **Additional World Packs**: Space Station, Hogwarts skins (architecture supports, defer until Village proven)

**Anti-features (do NOT build):**
- **Live Claude API calls for dialogue**: Cost, latency, uncontrolled outputs. Use pre-written JSON trees.
- **Real-time multiplayer**: WebSocket infrastructure on Pi, massive scope. Use leaderboard for social proof instead.
- **Complex combat system**: This is a portfolio, not a game. Movement and exploration only.
- **Procedural generation**: Destroys hand-crafted building-app mapping and secrets design.
- **Full inventory system**: Over-engineering for code snippet collectibles. Simple list in Tab panel.

### Architecture Approach

The architecture separates Angular (app shell, routing, UI overlays) from Phaser (game world, scenes, physics) with a clean EventBus boundary. Phaser never imports Angular code; Angular never directly touches Phaser game objects. The `PhaserGameComponent` creates the game instance **outside NgZone** (critical for 60 FPS), and `GameBridgeService` translates EventBus events into Angular signals with `NgZone.run()` for safe updates.

**Major components:**

1. **GameShellComponent** (Angular) — Lazy-loaded route wrapper at `/world`, owns ReturnButton and CollectiblesPanel overlays
2. **PhaserGameComponent** (Angular) — Bridge component creating/destroying Phaser.Game, listening to EventBus for scene-ready events
3. **EventBus** (Phaser singleton) — Phaser.Events.EventEmitter, ONLY communication channel between frameworks
4. **BootScene** (Phaser) — Loads world pack JSON, preloads assets, transitions to OverworldScene
5. **OverworldScene** (Phaser) — Main game world with tilemap, player, NPCs, buildings, collision, camera follow
6. **DialogueScene** (Phaser) — Parallel overlay scene for RPG text boxes, runs on top of Overworld without replacing it
7. **UIScene** (Phaser) — HUD overlay for interaction prompts and notifications
8. **PlayerController** (Plain TypeScript class) — WASD/arrow input, velocity, animation, spawned by OverworldScene
9. **NPCManager** (Plain TypeScript class) — Spawns NPCs from world pack data, proximity detection
10. **BuildingManager** (Plain TypeScript class) — Door zones, building entry, emits navigate events to Angular
11. **ThemeEngine** (Plain TypeScript class) — Day/night tinting, seasonal layer toggles
12. **SecretsManager** (Plain TypeScript class) — Collectible pickup, achievement tracking
13. **GameBridgeService** (Angular service) — Wraps EventBus, translates events to Angular signals, calls backend APIs

**Key architectural patterns:**
- **Parallel scenes for UI layers**: DialogueScene and UIScene run simultaneously above OverworldScene, not replacing it
- **Game systems as plain classes**: PlayerController, NPCManager, etc. are NOT Phaser plugins or Angular services — plain TypeScript instantiated by scenes
- **World Pack as configuration**: World-specific data (tilemap, NPCs, buildings, dialogue) lives in JSON + asset folder, engine reads generically
- **NgZone isolation**: Game creation wrapped in `runOutsideAngular()`, EventBus re-enters zone for Angular updates

### Critical Pitfalls

Research identified 15 pitfalls. Top 5 most dangerous:

1. **Phaser game instance leaks on Angular route changes** — Game's `requestAnimationFrame` loop, WebGL context, and textures persist after navigating away. After 3-4 round-trips, Pi's 8GB RAM exhausted. **Prevention:** `ngOnDestroy()` must call `game.destroy(true, false)` AND `EventBus.removeAllListeners()`. Verify no duplicate canvas elements in DevTools. Follow official template pattern exactly.

2. **Blurry pixel art from missing rendering config** — 16x16 tiles render anti-aliased/smeared without explicit settings. Especially bad on Retina displays. **Prevention:** Set ALL four config flags: `pixelArt: true`, `antialias: false`, `roundPixels: true`, `scale.autoRound: true`. Add CSS `image-rendering: pixelated`. Use integer zoom only (1x, 2x, 3x).

3. **Tilemap tile bleeding (gap lines between tiles)** — Single-pixel seams appear during camera movement due to WebGL texture sampling at sub-pixel coordinates. **Prevention:** Run `tile-extruder` on all tilesets BEFORE first import. Set `margin: 1, spacing: 2` in Phaser tileset loader. Set `camera.roundPixels = true`. Avoid non-integer camera zoom.

4. **Scene state not resetting on scene restart** — Class-level variables in Phaser scenes persist across `stop()`/`start()` cycles. Arrays holding destroyed game object references cause crashes. **Prevention:** Initialize ALL mutable state in `init()`, not constructor. Listen to `shutdown` event to clear arrays/maps. Never cache NPC positions outside scenes.

5. **Day/night cycle via Light2D requires normal maps** — Phaser's Light2D pipeline renders sprites black without normal maps. Creating normal maps for every tile/sprite in a pixel-art game is impractical. **Prevention:** Do NOT use Light2D. Use fullscreen Rectangle overlay with tint and alpha tween (Approach A), or per-object `setTint()` (Approach B). Decision must be documented in Phase 1.

**Additional critical concerns:**
- **Pi build memory exhaustion**: Angular build on Pi with 7+ PM2 processes risks OOM kill. Build locally on Mac, `scp dist/` to Pi.
- **Y-depth sorting**: Tilemap layers have fixed depth, sprites dynamic. Use explicit `above-player` layer at depth 1000, sprites at `depth = y + height * 0.5`.
- **Dialogue input bleed**: Dialogue system must be separate parallel scene with `scene.pause('GameScene')` to prevent WASD movement during text.

## Implications for Roadmap

Based on dependencies, technical risks, and feature value, recommend **6 phases** structured around architectural layers. Early phases establish patterns that later phases replicate. Critical pitfalls are addressed in Phase 1 (foundation) to prevent costly rework.

### Phase 1: Foundation & Bridge

**Rationale:** The Phaser-Angular bridge, game lifecycle, and rendering config must be correct from day one. Retrofitting memory leak fixes or pixel-art rendering after 2000 lines of game code is expensive and error-prone. This phase produces a provably-working integration with a walkable test world.

**Delivers:**
- Phaser game running in Angular with proper lifecycle (no leaks)
- Pixel-perfect rendering config (no blur, tested on Retina display)
- EventBus bridge pattern with typed event keys
- BootScene loading a minimal test world
- OverworldScene with collision-enabled tilemap
- PlayerController with WASD/arrows + camera follow
- Loading screen with progress bar
- Local build + deploy-to-Pi workflow

**Addresses pitfalls:**
- Pitfall #1 (game instance leak) — ngOnDestroy cleanup verified
- Pitfall #2 (blurry pixel art) — all rendering flags set, screenshot tested
- Pitfall #3 (tile bleeding) — tile-extruder pipeline established
- Pitfall #6 (Pi OOM) — local build workflow documented

**Tech from STACK.md:**
- Phaser 3.90.0, Tiled 1.11.2, official template EventBus pattern

**Features from FEATURES.md:**
- Player movement, collision, camera follow, loading screen (table stakes)

**Flag:** Standard patterns, skip research-phase. Follow official template exactly.

---

### Phase 2: World & Interaction Zones

**Rationale:** Building the actual Village tilemap and establishing interaction patterns (doors, NPCs) before adding dialogue or themes ensures the world is explorable and spatial relationships are correct. The World Pack JSON architecture is introduced here so all subsequent features read from data, not hardcoded logic.

**Delivers:**
- Village tilemap designed in Tiled (10 buildings, all 6 layers)
- World Pack JSON format defined (buildings, NPCs, spawn point)
- BuildingManager with door zones and interaction prompts
- UIScene for "Press SPACE to enter" overlays
- Above-player layer rendering (tree tops, roofs) with depth sorting
- Mobile touch controls (virtual joystick, interaction button)
- Responsive canvas scaling (FIT mode, tested on mobile)

**Addresses pitfalls:**
- Pitfall #4 (scene state) — init/shutdown pattern established
- Pitfall #7 (Y-depth sorting) — layer structure tested with player walking behind trees
- Pitfall #10 (layer count FPS) — cap at 4-5 layers, verified 55+ FPS on mobile emulation
- Pitfall #14 (edge snagging) — player hitbox sized smaller than sprite

**Tech from STACK.md:**
- Tiled tilemap JSON export, Phaser collision layers, Arcade physics

**Features from FEATURES.md:**
- Tilemap world, building door entry, interaction prompts, mobile controls (table stakes)

**Flag:** Standard patterns, skip research-phase. Tilemap performance benchmarks well-documented.

---

### Phase 3: Dialogue & NPCs

**Rationale:** The Claude NPC is a headline feature and dialogue sets the portfolio's tone. Implementing dialogue as a parallel scene now establishes the pattern for receptionist NPCs later. Dialogue data structure (JSON trees) is designed here and reused throughout.

**Delivers:**
- DialogueScene as parallel overlay (pauses Overworld)
- Rex textbox with typewriter effect (character-by-character)
- Dialogue JSON tree format with branching choices
- Claude NPC in town square with pre-written dialogue
- NPCManager spawning NPCs from World Pack data
- NPC proximity detection and interaction triggers
- Space/Enter to advance or instant-complete text

**Addresses pitfalls:**
- Pitfall #8 (dialogue input bleed) — DialogueScene owns input, GameScene paused
- Pitfall #13 (EventBus leaks) — dialogue listeners cleaned on shutdown

**Tech from STACK.md:**
- phaser3-rex-plugins (textbox), EventBus for dialogue events

**Features from FEATURES.md:**
- Claude NPC, typewriter text, dialogue box UI, branching choices (table stakes)

**Flag:** MEDIUM confidence — rex plugin integration patterns are community-documented (not official). May need brief research-phase for rex textbox setup if official examples insufficient.

---

### Phase 4: Navigation & App Integration

**Rationale:** Connecting the game world to the rest of the platform (the core portfolio value prop) requires solving the Angular routing + Phaser state problem. Building navigation before themes/secrets ensures the "enter building -> view app -> return" loop works early, validating the entire concept.

**Delivers:**
- Building entry emits navigate event to Angular Router
- GameBridgeService translates building IDs to Angular routes
- ReturnButton component (floating button on all app routes)
- Game pause/resume on route change (not destroy/recreate)
- Player position save/restore via sessionStorage
- Skip option link (bypasses game, shows project list)
- No-code visitor messaging at speakeasy door

**Addresses pitfalls:**
- Pitfall #9 (navigation breaks state) — scene.sleep() not destroy(), position saved

**Tech from ARCHITECTURE.md:**
- EventBus navigate events, GameBridgeService Angular signals, Router

**Features from FEATURES.md:**
- Building door entry, return to world button, skip option (table stakes)

**Flag:** Standard patterns, skip research-phase. Phaser scene sleep/wake well-documented.

---

### Phase 5: Pass System & Persistence

**Rationale:** The speakeasy metaphor requires the pass validation API to work, and collectibles/achievements need backend storage. Building the persistence layer now enables all future secret/theme features to save progress immediately.

**Delivers:**
- Pass API routes (POST /api/pass/validate, CRUD)
- Guest JWT issuance on valid code
- Speakeasy door scene with code input
- Door swing animation on correct code, shake on wrong code
- VisitorProgressService (Angular) saving state to backend
- Backend visitorProgress collection in MongoDB
- Receptionist NPC in auth-required buildings (guest account flow)
- Progress save/load (collectibles, achievements, visited buildings)

**Addresses pitfalls:**
- Pitfall #15 (guest JWT) — 24h expiration, minimal payload, stored in service not just localStorage

**Tech from STACK.md:**
- Express API routes, MongoDB Atlas, JWT

**Features from FEATURES.md:**
- Access code validation, pass system, guest account creation, progress persistence (table stakes)

**Flag:** Standard patterns, skip research-phase. JWT + Express + MongoDB well-established.

---

### Phase 6: Theme Engine & Secrets Tier 1

**Rationale:** Day/night cycle and collectibles are the first "wow" features beyond the base game. Themes add visual depth, collectibles add replay value. These are independent systems that can be built in parallel. Tier 1 secrets (collectibles) establish the pattern for Tier 2/3 (deferred to v2).

**Delivers:**
- ThemeEngine with day/night tinting (overlay approach, NOT Light2D)
- Auto-detect visitor's local time for theme selection
- Seasonal theme JSON format (camera tint, particles, decoration layers)
- SecretsManager tracking collectible pickups
- 10-15 code fragment collectibles placed in world
- Collectibles panel (Tab key) showing found items
- Achievement system with 9 pixel-art badges
- Ambient music + SFX with mute toggle
- Konami code easter egg (achievement unlock)

**Addresses pitfalls:**
- Pitfall #5 (Light2D trap) — use overlay tint, verify no normal maps in project
- Pitfall #11 (Cloudflare caching) — cache headers set for assets, R2 for large files if needed

**Tech from STACK.md:**
- Phaser camera tint, particle emitters, audio manager

**Features from FEATURES.md:**
- Day/night cycle, seasonal themes, Tier 1 collectibles, achievements, audio (differentiators)

**Flag:** MEDIUM confidence — theme particle effects and seasonal layer swapping are custom implementation (not framework features). Brief research-phase may be needed for particle emitter config if visual polish requires advanced tweens.

---

### Phase Ordering Rationale

**Dependency-driven order:**
- Phase 1 must come first: all later phases assume a working bridge and correct rendering config.
- Phase 2 (tilemap) before Phase 3 (NPCs): NPCs need world coordinates and collision layers.
- Phase 3 (dialogue) before Phase 5 (receptionist NPCs): receptionist flow reuses dialogue scene.
- Phase 4 (navigation) before Phase 5 (pass system): pass validation gates building entry, which requires navigation flow.
- Phase 6 (themes/secrets) last: these enhance an already-playable world.

**Risk-mitigation order:**
- Critical pitfalls (#1-3, #6) addressed in Phase 1 before writing game logic.
- Moderate pitfalls (#4, #7-10) addressed in Phases 2-4 as their systems are built.
- UX pitfalls (no loading screen, no mute) addressed in Phase 1 and Phase 6.

**Value-driven grouping:**
- Phase 1-4 deliver the minimum "playable portfolio" (v1.0 launch candidate).
- Phase 5 adds persistence and polish (required for launch but can be built in parallel with Phase 6).
- Phase 6 adds "wow" features (differentiators, can be v1.1 if timeline tight).

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 3 (Dialogue/NPCs):** Rex plugin textbox integration patterns are community-documented, not official. If rex examples don't cover typewriter + paging + choices, may need brief research-phase for implementation patterns.
- **Phase 6 (Theme Engine):** Particle emitter configuration and seasonal layer swapping are custom implementations. If visual polish requires advanced tweens/shaders, may need research-phase for Phaser tween API and blend modes.

**Phases with standard patterns (skip research-phase):**
- **Phase 1:** Official Phaser-Angular template provides exact pattern. No research needed.
- **Phase 2:** Tilemap, collision, camera follow are core Phaser features with extensive official docs.
- **Phase 4:** Angular routing + Phaser scene lifecycle well-documented.
- **Phase 5:** Express + MongoDB + JWT are standard backend patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Phaser 3.90.0 + Angular verified via official template. Tiled/Aseprite integration confirmed via Phaser docs. Rex plugins actively maintained (Feb 2025). |
| Features | MEDIUM-HIGH | Table stakes verified via competitor analysis (Bruno Simon, Sittiphol). Differentiators (secrets, themes) are original design but informed by game design articles (GameDeveloper.com, Ready Player One structure). |
| Architecture | HIGH | EventBus pattern from official template. NgZone isolation documented in Angular official docs. Parallel scenes and World Pack JSON are standard game dev patterns. |
| Pitfalls | MEDIUM-HIGH | Critical pitfalls (#1-6) verified via Phaser GitHub issues and official docs. Moderate pitfalls (#7-11) based on Phaser Discourse community reports and benchmarks. Recovery strategies tested in Phaser 3 context. |

**Overall confidence:** HIGH for architecture and stack decisions, MEDIUM-HIGH for feature prioritization and pitfall avoidance strategies.

### Gaps to Address

**Gap 1: Rex plugin bundle size impact**
- Rex textbox adds unknown bundle weight. Official npm page shows 1.80.18 is modular (can import individual plugins), but actual bundle increase when tree-shaken is undocumented.
- **Resolution:** During Phase 3 planning, run test import of `TextBoxPlugin` only and check Angular build output for chunk size. If rex textbox adds >100KB, evaluate custom dialogue implementation.

**Gap 2: Mobile touch control UX on small screens**
- Virtual joystick positioning and size for phones under 375px width not tested in research. Phaser examples show joystick at bottom-left, but interaction with browser UI (address bar, bottom nav) unclear.
- **Resolution:** During Phase 2 execution, test joystick on iPhone SE (375x667) and verify no overlap with browser chrome. Adjust positioning if needed.

**Gap 3: Cloudflare Tunnel caching for dynamic World Pack configs**
- If World Pack JSON config is fetched from `/api/world/:id/config` (backend route), Cloudflare may cache aggressively and serve stale data when dashboard admin changes themes.
- **Resolution:** During Phase 5 planning, decide if world config is static file (versioned, long cache) or API endpoint (short cache). Document cache-busting strategy.

**Gap 4: Pi PM2 process count at 7+ apps**
- Research assumes 7 PM2 processes (platform, gif-gallery, homecontrol, rootine, tactiqal). Actual count and RAM usage not verified. May affect local-build-then-deploy decision.
- **Resolution:** Before Phase 1 execution, SSH to Pi and verify `pm2 status` + `free -h`. Confirm available RAM for potential on-Pi builds or commit to Mac-only builds.

## Sources

### Primary (HIGH confidence)
- [Phaser v3.90.0 release notes](https://phaser.io/download/stable) — Confirmed final v3 release
- [phaserjs/template-angular GitHub](https://github.com/phaserjs/template-angular) — Official Angular 19.2.0 + Phaser 3.90.0 integration
- [Phaser official docs](https://docs.phaser.io/phaser/concepts/) — Scenes, cameras, events, arcade physics
- [Angular NgZone docs](https://angular.dev/best-practices/zone-pollution) — runOutsideAngular pattern
- [Tiled Map Editor](http://www.mapeditor.org/) — Version 1.11.2 release notes
- [Phaser GitHub issues](https://github.com/photonstorm/phaser/issues) — #5456 (memory leaks), #3207 (blur), #3352 (tile bleeding), #839 (layer count), #5327 (camera tint)

### Secondary (MEDIUM confidence)
- [phaser3-rex-plugins npm](https://www.npmjs.com/package/phaser3-rex-plugins) — Last published Feb 2025, textbox docs
- [Bruno Simon portfolio](https://bruno-simon.com/) — Competitor analysis, 3D car-driving portfolio
- [Sittiphol pixel portfolio](https://medium.com/@nuuneoi/the-making-of-my-own-pixel-art-interactive-profile-e8bcafef445d) — Pixel-art side-scroller, 100k visitors
- [GameDeveloper.com achievement design](https://www.gamedeveloper.com/design/designing-and-building-a-robust-comprehensive-achievement-system) — Achievement system patterns
- [Phaser Discourse forums](https://phaser.discourse.group/) — Scene lifecycle, tilemap performance, Light2D issues

### Tertiary (LOW confidence)
- [Cloudflare Community forums](https://community.cloudflare.com/) — WebSocket timeout reports (20-30s disconnect, needs validation)
- [tile-extruder tool](https://github.com/sporadic-labs/tile-extruder) — Tileset extrusion pipeline
- Ready Player One easter egg hunt structure — 3-tier secrets inspiration (cultural reference, not technical source)

---
*Research completed: 2026-02-14*
*Ready for roadmap: yes*
