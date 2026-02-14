# Architecture Research

**Domain:** Phaser 3 game world inside Angular 19 platform app
**Researched:** 2026-02-14
**Confidence:** MEDIUM-HIGH

## Standard Architecture

### System Overview

```
+=====================================================================+
|                    Angular 19 Application Shell                      |
|  +-------------+  +-----------+  +----------+  +-----------+        |
|  | Landing (/) |  | Door (/d) |  | Dash     |  | App Pages |        |
|  | CinematicPg |  | DoorPage  |  | /dashbrd |  | /rootine  |        |
|  +------+------+  +-----+-----+  +----------+  | /tactiqal |        |
|         |               |                       | /braindmp |        |
|         v               v                       +-----------+        |
|  +------+---------------+------------------------------------+       |
|  |              GameShellComponent (/world)                   |      |
|  |  +--------------------------------------------------+     |      |
|  |  |              PhaserGameComponent                  |     |      |
|  |  |  +---------+  +-----------+  +-----------+       |     |      |
|  |  |  | Boot    |  | Overworld |  | Interior  |       |     |      |
|  |  |  | Scene   |  | Scene     |  | Scene     |       |     |      |
|  |  |  +---------+  +-----------+  +-----------+       |     |      |
|  |  |  +-----------+  +-----------+                     |     |      |
|  |  |  | Dialogue  |  | UI Scene  |                     |     |      |
|  |  |  | Scene     |  | (HUD)     |                     |     |      |
|  |  |  +-----------+  +-----------+                     |     |      |
|  |  +----+---------+-----+---+--------------------------+     |      |
|  |       |         |     |   |                                |      |
|  |       v         v     v   v                                |      |
|  |  +----+---------+----+---+----+                            |      |
|  |  |         EventBus           |  <--- Phaser EventEmitter  |      |
|  |  +---+-----------+-----------++                            |      |
|  |      |           |            |                            |      |
|  +------+-----------+------------+----------------------------+       |
|         |           |            |                                   |
|    +----v----+ +----v------+ +---v---------+                         |
|    | Angular | | Angular   | | Angular     |                         |
|    | Signals | | Services  | | Router      |                         |
|    +---------+ +-----------+ +-------------+                         |
+=====================================================================+
         |                |
         v                v
+=====================================================================+
|                    Express.js Backend (API)                           |
|  +------------+  +----------+  +-----------+  +------------+         |
|  | Pass CRUD  |  | World    |  | Visitor   |  | Leaderboard|         |
|  | /api/pass  |  | Config   |  | Progress  |  | /api/ldr   |         |
|  +------------+  | /api/wld |  | /api/prog |  +------------+         |
|                  +----------+  +-----------+                         |
+=====================================================================+
         |
         v
+=====================================================================+
|                    MongoDB Atlas                                     |
|  +--------+  +--------+  +--------+  +--------+  +--------+         |
|  | passes |  | worlds |  | visitor|  | leader |  | secrets|         |
|  |        |  |        |  |Progress|  | board  |  |        |         |
|  +--------+  +--------+  +--------+  +--------+  +--------+         |
+=====================================================================+
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **GameShellComponent** | Angular wrapper page for the game; owns Angular UI overlays (ReturnButton, CollectiblesPanel); lazy-loaded route | Standalone Angular component at `/world` route |
| **PhaserGameComponent** | Bridge between Angular and Phaser; creates/destroys Phaser.Game instance; forwards EventBus events to Angular | Standalone Angular component wrapping a `<div id="game-container">` |
| **EventBus** | Singleton Phaser.Events.EventEmitter used for all Angular-Phaser communication | Separate file exporting `new Phaser.Events.EventEmitter()` |
| **BootScene** | Loads world pack JSON config, sets up asset manifest, transitions to Overworld | Phaser.Scene with preload/create only |
| **OverworldScene** | Main game world with tilemap, player, NPCs, buildings, collision, camera follow | Phaser.Scene with full update loop |
| **InteriorScene** | Building interiors (optional future use) | Phaser.Scene launched when entering a building that has interior maps |
| **DialogueScene** | Parallel overlay scene for RPG dialogue boxes; runs on top of game scenes | Phaser.Scene launched in parallel (not replacing game scene) |
| **UIScene** | HUD elements rendered in Phaser (interaction prompts, collectible notifications) | Phaser.Scene running in parallel above all other scenes |
| **PlayerController** | WASD/arrow key input, velocity, collision response, animation state | Plain TypeScript class instantiated by OverworldScene |
| **NPCManager** | Spawns NPCs from world pack data, manages proximity detection, triggers dialogue | Plain TypeScript class instantiated by OverworldScene |
| **ThemeEngine** | Day/night tinting, seasonal layer toggles based on time/dashboard config | Plain TypeScript class, reads config from Angular via EventBus |
| **WorldLoader** | Parses world pack JSON, loads tilemap + spritesheets, builds collision layers | Plain TypeScript class used by BootScene |
| **BuildingManager** | Tracks door zones, handles building entry/exit, emits navigation events to Angular | Plain TypeScript class instantiated by OverworldScene |
| **SecretsManager** | Tracks collectible pickups, puzzle states, achievement progress | Plain TypeScript class, persists state via EventBus to Angular service |
| **GameBridgeService** | Angular service that wraps EventBus; translates game events into Angular signals; calls backend APIs | Angular injectable service (`providedIn: 'root'`) |

## Recommended Project Structure

```
frontend/src/app/
+-- game/                           # Phaser game module (lazy-loaded boundary)
|   +-- components/
|   |   +-- game-shell.component.ts       # Angular page wrapper (/world route)
|   |   +-- game-shell.component.html
|   |   +-- game-shell.component.scss
|   |   +-- phaser-game.component.ts      # Phaser bridge component
|   |   +-- return-button.component.ts    # "Return to World" floating button
|   |   +-- collectibles-panel.component.ts
|   |   +-- dialogue-overlay.component.ts # Optional: Angular-rendered dialogue
|   +-- services/
|   |   +-- game-bridge.service.ts        # EventBus <-> Angular signals adapter
|   |   +-- world-config.service.ts       # Fetches world pack config from API
|   |   +-- visitor-progress.service.ts   # Saves/loads player progress
|   |   +-- pass.service.ts              # Pass validation and guest JWT
|   +-- phaser/
|   |   +-- main.ts                       # Phaser.Game config and StartGame()
|   |   +-- EventBus.ts                   # Singleton EventEmitter instance
|   |   +-- scenes/
|   |   |   +-- BootScene.ts
|   |   |   +-- OverworldScene.ts
|   |   |   +-- InteriorScene.ts
|   |   |   +-- DialogueScene.ts
|   |   |   +-- UIScene.ts
|   |   +-- systems/
|   |   |   +-- PlayerController.ts
|   |   |   +-- NPCManager.ts
|   |   |   +-- ThemeEngine.ts
|   |   |   +-- WorldLoader.ts
|   |   |   +-- BuildingManager.ts
|   |   |   +-- SecretsManager.ts
|   |   +-- data/
|   |   |   +-- dialogue-trees.ts         # NPC dialogue data structures
|   |   |   +-- event-keys.ts             # Typed event name constants
|   |   +-- types/
|   |       +-- world-pack.types.ts       # WorldPack, Building, NPC interfaces
|   |       +-- game-events.types.ts      # EventBus payload types
|   +-- game.routes.ts                    # Lazy-loaded child routes
+-- pages/
|   +-- landing/                    # Cinematic intro (no Phaser)
|   +-- door/                       # Speakeasy door (no Phaser, CSS animations)
|   +-- dashboard/                  # Existing, add World Manager tab
+-- services/
    +-- theme.service.ts            # Existing, extended for game theme sync
```

```
frontend/public/
+-- assets/
    +-- world-packs/
        +-- village/
            +-- tilemap.json        # Tiled export
            +-- tileset.png         # Spritesheet
            +-- characters.png      # NPC/player sprites
            +-- config.json         # Building definitions, NPC placements
```

```
backend/src/
+-- routes/
|   +-- passRoutes.ts               # POST /api/pass/validate, CRUD
|   +-- worldRoutes.ts              # GET /api/world/:id/config
|   +-- progressRoutes.ts           # GET/PUT /api/progress/:visitorId
|   +-- leaderboardRoutes.ts        # GET /api/leaderboard
|   +-- secretRoutes.ts             # POST /api/secrets/validate
+-- services/
    +-- passService.ts
    +-- guestAuthService.ts         # Guest JWT generation
    +-- progressService.ts
```

### Structure Rationale

- **`game/` as a top-level feature folder:** This is the lazy-loading boundary. Everything inside `game/` is code-split from the main bundle. The Angular router loads `game-shell.component.ts` via `loadComponent`, and Phaser (980KB minified) only loads when a visitor navigates to `/world`.
- **`game/phaser/` separate from `game/components/`:** Clean separation between Phaser-world code (scenes, systems, types) and Angular-world code (components, services). The bridge layer (EventBus + GameBridgeService) is the only thing that crosses this boundary.
- **`game/phaser/systems/` as plain TypeScript classes:** Game systems are NOT Angular services and NOT Phaser plugins. They are plain classes instantiated by scenes, receiving scene references in their constructors. This avoids Phaser plugin boilerplate and keeps systems testable.
- **`game/phaser/data/event-keys.ts` for typed events:** All EventBus event names defined as typed constants in one file. Prevents magic string bugs across the Angular-Phaser boundary.

## Architectural Patterns

### Pattern 1: The Phaser-Angular Bridge (Official Template Pattern)

**What:** A dedicated Angular component creates the Phaser.Game instance, exposes the current active scene, and connects the EventBus for bidirectional communication. This is the official pattern from the `phaserjs/template-angular` repository.

**When to use:** Always. This is the foundational integration pattern.

**Trade-offs:** Simple and proven. Slightly couples the bridge component to Phaser's lifecycle. The alternative (iframe) provides stronger isolation but loses direct DOM integration and makes communication harder.

**Example:**
```typescript
// game/phaser/EventBus.ts
import { Events } from 'phaser';
export const EventBus = new Events.EventEmitter();

// game/phaser/data/event-keys.ts
export const GameEvents = {
  SCENE_READY: 'current-scene-ready',
  ENTER_BUILDING: 'enter-building',
  EXIT_BUILDING: 'exit-building',
  DIALOGUE_START: 'dialogue-start',
  DIALOGUE_END: 'dialogue-end',
  COLLECTIBLE_FOUND: 'collectible-found',
  THEME_CHANGED: 'theme-changed',
  PROGRESS_SAVE: 'progress-save',
  NAVIGATE_TO_APP: 'navigate-to-app',
} as const;

// game/components/phaser-game.component.ts
@Component({
  selector: 'app-phaser-game',
  standalone: true,
  template: '<div id="game-container"></div>',
})
export class PhaserGameComponent implements OnInit, OnDestroy {
  private game!: Phaser.Game;
  scene!: Phaser.Scene;

  private ngZone = inject(NgZone);

  ngOnInit(): void {
    // CRITICAL: Create game OUTSIDE Angular zone
    this.ngZone.runOutsideAngular(() => {
      this.game = StartGame('game-container');
    });

    EventBus.on(GameEvents.SCENE_READY, (scene: Phaser.Scene) => {
      this.scene = scene;
    });
  }

  ngOnDestroy(): void {
    if (this.game) {
      this.game.destroy(true);
    }
    EventBus.removeAllListeners();
  }
}
```

**Confidence:** HIGH -- based on the official `phaserjs/template-angular` repository (Phaser 3.90.0 + Angular 19.2.0).

### Pattern 2: NgZone Isolation for the Game Loop

**What:** Phaser's `requestAnimationFrame`-based game loop fires 60 times per second. If created inside Angular's zone, each frame triggers Angular change detection -- destroying performance. The game MUST be created with `NgZone.runOutsideAngular()`.

**When to use:** Always. Non-negotiable for any Phaser-in-Angular integration.

**Trade-offs:** Game events that should update Angular UI must explicitly re-enter the zone via `NgZone.run()`. The GameBridgeService handles this transition.

**Example:**
```typescript
// game/services/game-bridge.service.ts
@Injectable({ providedIn: 'root' })
export class GameBridgeService {
  private ngZone = inject(NgZone);
  private router = inject(Router);

  // Angular signals updated from game events
  currentBuilding = signal<string | null>(null);
  collectiblesFound = signal<string[]>([]);
  dialogueActive = signal<boolean>(false);

  constructor() {
    // Listen for game events and re-enter Angular zone
    EventBus.on(GameEvents.ENTER_BUILDING, (buildingId: string) => {
      this.ngZone.run(() => {
        this.currentBuilding.set(buildingId);
      });
    });

    EventBus.on(GameEvents.NAVIGATE_TO_APP, (route: string) => {
      this.ngZone.run(() => {
        this.router.navigate([route]);
      });
    });

    EventBus.on(GameEvents.COLLECTIBLE_FOUND, (id: string) => {
      this.ngZone.run(() => {
        this.collectiblesFound.update(list => [...list, id]);
      });
    });
  }

  // Angular -> Phaser direction (no zone issue)
  sendThemeConfig(theme: ThemeConfig): void {
    EventBus.emit(GameEvents.THEME_CHANGED, theme);
  }
}
```

**Confidence:** HIGH -- zone pollution with `requestAnimationFrame` is documented in Angular's official zone-pollution guide and multiple GitHub issues.

### Pattern 3: Parallel Scenes for UI Layers

**What:** Phaser supports running multiple scenes simultaneously. The UI/HUD scene and DialogueScene run in parallel on top of the OverworldScene, rather than replacing it. This is Phaser's recommended approach for game UI.

**When to use:** For any persistent UI that should overlay the game world (interaction prompts, dialogue boxes, HUD elements).

**Trade-offs:** Scenes communicate through the EventBus, not direct references. Layering order matters (UI scene must render above game scene). Scene lifecycle must be managed carefully -- sleeping/waking scenes, not destroying and recreating them.

**Example:**
```typescript
// In OverworldScene when player interacts with NPC
this.input.keyboard!.on('keydown-SPACE', () => {
  if (this.nearestNPC) {
    EventBus.emit(GameEvents.DIALOGUE_START, {
      npcId: this.nearestNPC.id,
      tree: this.nearestNPC.dialogueTree,
    });
    // Launch DialogueScene in parallel (doesn't stop Overworld)
    this.scene.launch('DialogueScene', {
      tree: this.nearestNPC.dialogueTree,
    });
    // Pause player input while dialogue is active
    this.playerController.freeze();
  }
});

// In DialogueScene
export class DialogueScene extends Phaser.Scene {
  create(data: { tree: DialogueTree }): void {
    // Render dialogue box, typewriter text, choices
    // ...
    EventBus.emit(GameEvents.SCENE_READY, this);
  }

  completeDialogue(): void {
    EventBus.emit(GameEvents.DIALOGUE_END);
    this.scene.stop(); // Remove overlay, Overworld continues
  }
}
```

**Confidence:** HIGH -- parallel scenes documented in Phaser's official scene concepts docs.

### Pattern 4: Game Systems as Plain Classes (Not Plugins)

**What:** Game systems (PlayerController, NPCManager, etc.) are plain TypeScript classes that receive the scene reference in their constructor. They are NOT Phaser plugins and NOT Angular services.

**When to use:** For all game-side logic that needs scene access but should be modular and testable.

**Trade-offs:** Must manually call `system.update(time, delta)` from the scene's update loop. Does not auto-install across scenes like plugins would. But avoids plugin registration boilerplate and keeps the systems portable.

**Example:**
```typescript
// game/phaser/systems/PlayerController.ts
export class PlayerController {
  private sprite: Phaser.Physics.Arcade.Sprite;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: Record<string, Phaser.Input.Keyboard.Key>;
  private frozen = false;
  private speed = 160;

  constructor(private scene: Phaser.Scene, spawnX: number, spawnY: number) {
    this.sprite = scene.physics.add.sprite(spawnX, spawnY, 'player');
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.wasd = scene.input.keyboard!.addKeys('W,A,S,D') as any;
  }

  update(): void {
    if (this.frozen) {
      this.sprite.setVelocity(0, 0);
      return;
    }
    // Movement logic using cursors + WASD
    const left = this.cursors.left.isDown || this.wasd['A'].isDown;
    const right = this.cursors.right.isDown || this.wasd['D'].isDown;
    const up = this.cursors.up.isDown || this.wasd['W'].isDown;
    const down = this.cursors.down.isDown || this.wasd['S'].isDown;

    this.sprite.setVelocity(
      (right ? 1 : 0) - (left ? 1 : 0),
      (down ? 1 : 0) - (up ? 1 : 0)
    );
    this.sprite.body!.velocity.normalize().scale(this.speed);
  }

  freeze(): void { this.frozen = true; }
  unfreeze(): void { this.frozen = false; }
  getSprite(): Phaser.Physics.Arcade.Sprite { return this.sprite; }
}
```

**Confidence:** HIGH -- standard game development pattern, no framework-specific concerns.

### Pattern 5: World Pack as Data-Driven Configuration

**What:** The game engine is world-agnostic. All world-specific data (tilemap, NPC positions, building definitions, dialogue trees, secrets) lives in a "world pack" -- a JSON config file plus asset files. The engine reads the pack and builds the world dynamically.

**When to use:** When the architecture should support multiple worlds (even if v1 only ships one).

**Trade-offs:** Slightly more upfront complexity to make the engine generic vs. hardcoding the village. But pays off immediately in testability (can load a tiny test world) and future extensibility.

**Example:**
```typescript
// game/phaser/types/world-pack.types.ts
export interface WorldPack {
  id: string;
  name: string;
  tilemap: string;         // Path to Tiled JSON
  tilesets: TilesetRef[];
  spawnPoint: { x: number; y: number };
  buildings: BuildingDef[];
  npcs: NPCDef[];
  secrets: SecretDef[];
  theme: ThemeConfig;
}

export interface BuildingDef {
  id: string;
  name: string;
  doorZone: { x: number; y: number; width: number; height: number };
  route: string;           // Angular route, e.g. '/rootine'
  requiresAuth: boolean;
  npcId?: string;          // Receptionist NPC for auth-gated buildings
}

export interface NPCDef {
  id: string;
  name: string;
  spriteKey: string;
  position: { x: number; y: number };
  dialogueTreeId: string;
  wanderRadius?: number;
}
```

**Confidence:** MEDIUM-HIGH -- standard game dev pattern, specifics of this project's world pack schema are our design, not ecosystem-driven.

## Data Flow

### Angular -> Phaser (Configuration Push)

```
ThemeService (Angular signal)
    |
    v
GameBridgeService.sendThemeConfig()
    |
    v
EventBus.emit('theme-changed', config)
    |
    v
ThemeEngine.onThemeChanged(config)
    |
    v
Scene camera tint / layer visibility updates
```

**Direction:** Angular owns configuration state. Phaser consumes it. Angular never directly touches Phaser game objects.

### Phaser -> Angular (Game Events)

```
Player walks into building door zone
    |
    v
BuildingManager detects overlap
    |
    v
EventBus.emit('enter-building', { id, route, requiresAuth })
    |
    v
GameBridgeService (NgZone.run)
    |
    v
Angular signal update + optional Router.navigate()
    |
    v
Angular UI updates (ReturnButton shows, app page loads)
```

**Direction:** Phaser emits events. GameBridgeService translates them into Angular zone-safe signal updates and router navigations. Phaser never calls Angular services directly.

### Progress Save Flow

```
SecretsManager detects collectible pickup
    |
    v
EventBus.emit('collectible-found', { id, type })
    |
    v
GameBridgeService (NgZone.run)
    |
    v
VisitorProgressService.saveProgress()
    |
    v
PUT /api/progress/:visitorId  (Express)
    |
    v
MongoDB: visitorProgress collection
```

### World Load Flow

```
Angular Router navigates to /world
    |
    v
GameShellComponent lazy-loads (brings Phaser bundle)
    |
    v
PhaserGameComponent.ngOnInit() (outside NgZone)
    |
    v
Phaser.Game created -> BootScene starts
    |
    v
WorldLoader fetches world pack config
    |
    v
BootScene.preload() loads tilemap + assets
    |
    v
BootScene.create() transitions to OverworldScene
    |
    v
OverworldScene builds world from WorldPack data:
  - Creates tilemap layers
  - Spawns PlayerController
  - Spawns NPCs via NPCManager
  - Sets up BuildingManager door zones
  - Initializes ThemeEngine
  - Launches UIScene in parallel
    |
    v
EventBus.emit('current-scene-ready', overworldScene)
    |
    v
GameBridgeService picks up scene ref
```

### Building Entry / App Navigation Flow

```
Player walks to building door zone
    |
    v
InteractionPrompt shows "Press SPACE to enter [Building Name]"
    |
    v
Player presses SPACE
    |
    v
BuildingManager checks: requiresAuth?
    |
    +-- NO --> EventBus.emit('navigate-to-app', { route: '/gifgal' })
    |              |
    |              v
    |          GameBridgeService -> Router.navigate(['/gifgal'])
    |          Phaser game continues running (paused/hidden)
    |
    +-- YES -> BuildingManager triggers receptionist NPC dialogue
                  |
                  v
               DialogueScene launched with auth check dialogue
                  |
                  v
               Guest JWT validated? -> navigate to app
               No JWT? -> dialogue offers to create guest account
```

### Key Data Flows Summary

1. **World Load:** Angular route -> PhaserGame init -> BootScene -> WorldLoader -> OverworldScene built
2. **Theme Sync:** Angular ThemeService -> GameBridgeService -> EventBus -> ThemeEngine -> scene visual updates
3. **Building Entry:** Phaser collision -> BuildingManager -> EventBus -> GameBridgeService -> Angular Router
4. **Dialogue:** NPC interaction -> EventBus -> DialogueScene launch (parallel) -> player frozen -> dialogue complete -> EventBus -> player unfrozen
5. **Progress Save:** Game event -> EventBus -> GameBridgeService -> VisitorProgressService -> backend API -> MongoDB
6. **Return to World:** Angular ReturnButton click -> Router.navigate(['/world']) -> game resumes (was paused, not destroyed)

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-100 visitors | Current architecture is fine. Single Pi, Phaser bundle lazy-loaded, world pack served as static assets. |
| 100-1k visitors | Add asset caching headers. World pack assets served via Cloudflare CDN (already have Cloudflare Tunnel). Consider compressing tilemap JSON. |
| 1k-10k visitors | Move static assets (sprites, tilemaps) to Cloudflare R2 or S3. Backend handles only API calls (pass validation, progress). Pi stays as API server. |
| 10k+ visitors | Not a realistic concern for a portfolio site. If needed: serverless functions for API, CDN for all static content, Pi becomes development server only. |

### Scaling Priorities

1. **First bottleneck:** Phaser bundle size (980KB). Mitigate with lazy loading (already planned), gzip compression (Cloudflare handles this), and long cache TTL headers for the Phaser chunk.
2. **Second bottleneck:** Asset loading time. Keep world pack under 2-5MB total. Use texture atlases instead of individual sprite files. Preload critical assets in BootScene, defer decorative assets.
3. **Third bottleneck:** MongoDB writes from progress saves. Debounce saves (save every 30 seconds, not every collectible pickup). Batch updates.

## Anti-Patterns

### Anti-Pattern 1: Injecting Angular Services into Phaser Scenes

**What people do:** Pass Angular service instances into Phaser scene constructors or access them via global references from inside Phaser code.

**Why it's wrong:** Creates tight coupling between the game engine and Angular's DI system. Makes scenes untestable outside Angular. Breaks the clean boundary between the two frameworks. Zone.js context issues when Angular services trigger change detection from within Phaser's game loop.

**Do this instead:** Use the EventBus as the ONLY communication channel. Phaser scenes emit events; Angular's GameBridgeService listens and calls services. Phaser never imports from `@angular/*`.

### Anti-Pattern 2: Creating Phaser.Game Inside Angular's Zone

**What people do:** Call `new Phaser.Game(config)` or `StartGame()` directly in `ngOnInit()` without `runOutsideAngular()`.

**Why it's wrong:** Phaser's game loop uses `requestAnimationFrame`, firing 60 times per second. Each frame triggers Angular change detection on the entire component tree. CPU usage spikes, frame rate drops, the app becomes unresponsive. This is documented in Angular's official zone-pollution guide.

**Do this instead:** Always wrap game creation: `this.ngZone.runOutsideAngular(() => { this.game = StartGame(...); });`

### Anti-Pattern 3: Destroying and Recreating the Game on Route Changes

**What people do:** Call `game.destroy(true)` when navigating away from `/world` to an app page, then recreate the entire Phaser game when returning.

**Why it's wrong:** Game creation is expensive (tilemap parsing, asset loading, physics world setup). Destroys player position, progress state, and scene state. Causes loading flickers.

**Do this instead:** When navigating to an app page, pause the game scene (`scene.pause()`) and hide the game container via CSS (`display: none`). When returning, resume the scene and show the container. Only destroy the game on Angular component destruction (navigating completely away from the game shell).

### Anti-Pattern 4: Using Phaser for Angular UI Elements

**What people do:** Render buttons, panels, text overlays, and navigation elements as Phaser game objects inside scenes.

**Why it's wrong:** Phaser's UI capabilities are limited compared to HTML/CSS. No accessibility (screen readers), no responsive layout, no Angular data binding, harder to style consistently with the rest of the app.

**Do this instead:** Use Angular components for all non-game UI: ReturnButton, CollectiblesPanel, dialogue choices (optionally). Position Angular UI overlays on top of the Phaser canvas using CSS `position: absolute` / `z-index`. Use the EventBus to sync game state with Angular UI components.

### Anti-Pattern 5: Storing Game State Only in Phaser

**What people do:** Keep all player progress, collectible state, and position data only in Phaser scene properties or Phaser's Registry.

**Why it's wrong:** Phaser state is lost when the game is destroyed or the page refreshes. No persistence. No ability to resume sessions.

**Do this instead:** Use Phaser's state as the runtime source of truth during gameplay. Periodically sync state to Angular's VisitorProgressService via EventBus, which persists to the backend. On game load, restore state from the backend.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Auth0 | Angular `AuthService` only. Game never touches Auth0. Guest JWTs are separate. | Dashboard Auth0 stays unchanged. Guest JWT issued by Express backend. |
| MongoDB Atlas | Express API routes. No direct DB access from frontend. | Collections: passes, visitorProgress, leaderboard, worlds |
| Cloudflare Tunnel | Routes all traffic. No code changes needed. | Static assets benefit from Cloudflare caching automatically. |
| Tiled Map Editor | Offline tool. Exports JSON tilemap consumed by Phaser at runtime. | `.json` tilemap placed in `public/assets/world-packs/village/` |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Angular <-> Phaser | EventBus (Phaser.Events.EventEmitter) | Unidirectional patterns: Angular pushes config, Phaser pushes events. GameBridgeService is the ONLY Angular code that touches EventBus. |
| Angular <-> Express API | HTTP (Angular HttpClient with Auth0 interceptor for dashboard, plain fetch/HttpClient for guest APIs) | Guest JWT passed as Bearer token on progress/secrets endpoints. |
| Phaser Scene <-> Phaser Scene | EventBus for cross-scene events; `scene.launch()` / `scene.stop()` for lifecycle | Avoid `this.scene.get('OtherScene')` direct references. Use EventBus. |
| OverworldScene <-> Game Systems | Constructor injection (scene ref passed to system). Scene calls `system.update()` each frame. | Systems are plain classes, not plugins. Scene owns their lifecycle. |
| Cinematic/Door pages <-> Game | No direct communication. Cinematic and Door are pure Angular pages. They navigate to `/world` via Angular Router when complete. | Cinematic uses CSS animations and Angular, not Phaser. |

## Build Order (Dependency Graph)

Components must be built in this order due to dependencies:

```
Phase 1: Foundation (no dependencies)
  EventBus.ts
  event-keys.ts
  world-pack.types.ts
  PhaserGameComponent (bridge)
  GameBridgeService
  BootScene (minimal: just loads and transitions)
  Game config (main.ts)

Phase 2: Core Game World (depends on Phase 1)
  WorldLoader
  PlayerController
  OverworldScene (uses WorldLoader + PlayerController)
  Tilemap + collision layers
  Camera follow

Phase 3: Interaction (depends on Phase 2)
  NPCManager
  BuildingManager
  UIScene (interaction prompts)
  DialogueScene + dialogue box rendering
  Door zone detection + building entry flow

Phase 4: Angular Integration (depends on Phase 3)
  GameShellComponent (wraps PhaserGame + Angular overlays)
  ReturnButton component
  App navigation from buildings
  Game pause/resume on route changes

Phase 5: Theme + Persistence (depends on Phase 4)
  ThemeEngine (day/night, seasonal)
  VisitorProgressService + backend API
  SecretsManager
  Progress save/load flow

Phase 6: Polish (depends on Phase 5)
  CollectiblesPanel
  Achievement system
  Leaderboard
  Dashboard World Manager
  Pass Manager
```

**Rationale:** Each phase produces a testable, working increment. Phase 1 gives you a Phaser game running inside Angular. Phase 2 gives you a walkable world. Phase 3 adds interactivity. Phase 4 connects it to the rest of the platform. Phase 5 adds persistence and visual polish. Phase 6 is completionist features.

## Sources

- [Official Phaser-Angular Template (phaserjs/template-angular)](https://github.com/phaserjs/template-angular) -- HIGH confidence, official source, Phaser 3.90.0 + Angular 19.2.0
- [Phaser-Angular Template README](https://github.com/phaserjs/template-angular/blob/main/README.md) -- HIGH confidence, documents EventBus and bridge pattern
- [Phaser Scene Concepts (official docs)](https://docs.phaser.io/phaser/concepts/scenes) -- HIGH confidence, scene lifecycle, parallel scenes, scene states
- [Phaser Events Concepts (official docs)](https://docs.phaser.io/phaser/concepts/events) -- HIGH confidence, EventEmitter API, custom events
- [Angular Zone Pollution Guide (official docs)](https://angular.dev/best-practices/zone-pollution) -- HIGH confidence, runOutsideAngular pattern
- [Angular Zoneless Change Detection (official docs)](https://angular.dev/guide/zoneless) -- MEDIUM confidence, project currently uses zone.js
- [Phaser Custom Builds (phaserjs/custom-build)](https://github.com/phaserjs/custom-build) -- MEDIUM confidence, bundle size reduction option
- [Phaser Forum: HUD Scene / Multiple Scenes](https://phaser.discourse.group/t/hud-scene-multiple-scenes/6348) -- MEDIUM confidence, community pattern for UI overlays
- [Phaser Forum: Event Emitter Communication](https://phaser.discourse.group/t/using-event-emitters-to-communicate-between-scenes/8822) -- MEDIUM confidence, EventEmitter patterns for cross-scene communication
- [Ourcade Blog: Communicate Between Scenes](https://blog.ourcade.co/posts/2020/phaser3-how-to-communicate-between-scenes/) -- MEDIUM confidence, dedicated EventEmitter instance pattern

---
*Architecture research for: Phaser 3 game world inside Angular 19 platform*
*Researched: 2026-02-14*
