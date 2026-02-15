# Game Architecture

## Overview

The Platform game is a **Phaser 3.60+ game embedded within an Angular 19 application**. The game uses a lazy-loaded route strategy to keep the game bundle separate from the dashboard and other apps, ensuring fast initial page loads for non-game routes.

### Tech Stack
- **Game Engine:** Phaser 3.60+ (Canvas/WebGL rendering)
- **Framework:** Angular 19 (standalone components, signals)
- **Language:** TypeScript (strict mode)
- **Asset Format:** JSON-driven World Packs
- **Physics:** Arcade Physics (top-down 2D movement)
- **Audio:** Web Audio API via Phaser Sound Manager

### Design Philosophy
- **Data-driven:** World content lives in JSON files, engine code is world-agnostic
- **Graceful degradation:** Audio, themes, and collectibles work even if assets are missing
- **Lazy loading:** Game code and assets load on-demand via Angular route
- **Mobile-first:** Touch controls, responsive canvas, virtual joystick support

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Angular App (main.ts → app.routes.ts)                      │
│                                                             │
│  / → CinematicScene (intro animation)                      │
│  /door → DoorScene (access code entry)                     │
│  /world → LoadingScene → OverworldScene                    │
│  /dashboard → DashboardComponent (no Phaser)               │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Phaser Game (phaser-config.ts)                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐    │
│  │ CinematicScene │ DoorScene     │ LoadingScene      │    │
│  └──────────────┘ └──────────────┘ └──────────────────┘    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ OverworldScene (main game loop)                      │  │
│  │  ┌─────────────────────────────────────────────┐     │  │
│  │  │ Systems Layer                               │     │  │
│  │  │  • PlayerController (movement, animations)  │     │  │
│  │  │  • CameraController (follow, bounds)        │     │  │
│  │  │  • CollisionSystem (tile-based collision)   │     │  │
│  │  │  • InteractionSystem (NPCs, buildings)      │     │  │
│  │  │  • AudioManager (music, SFX, mute)          │     │  │
│  │  │  • ThemeEngine (seasonal themes, overlays)  │     │  │
│  │  │  • SecretsManager (collectibles)            │     │  │
│  │  │  • AchievementEngine (badge tracking)       │     │  │
│  │  └─────────────────────────────────────────────┘     │  │
│  │  ┌─────────────────────────────────────────────┐     │  │
│  │  │ UI Layer (Phaser.GameObjects)               │     │  │
│  │  │  • DialogueBox (NPC conversations)          │     │  │
│  │  │  • AudioControlsUI (mute button, prompt)    │     │  │
│  │  │  • AchievementToast (unlock notifications)  │     │  │
│  │  │  • CollectiblesPanel (Tab key inventory)    │     │  │
│  │  └─────────────────────────────────────────────┘     │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ InteriorScene (building interiors)                   │  │
│  │  • Dynamic content based on building type            │  │
│  │  • "Launch App" button → navigate to Angular route   │  │
│  │  • "Return to World" → back to OverworldScene        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ World Pack (JSON + Assets)                                 │
│  • manifest.json (buildings, NPCs, collectibles)           │
│  • village.json (Tiled tilemap, 80x60 tiles)               │
│  • tilesets/ (village-tileset.png)                         │
│  • sprites/ (player.png, npc.png)                          │
│  • themes/ (default.json, night.json, seasonal themes)     │
│  • dialogue/ (claude-01.json, merchant-01.json, ...)       │
│  • audio/ (ambient.mp3, door-enter.wav, npc-talk.wav)      │
└─────────────────────────────────────────────────────────────┘
```

---

## Scene Lifecycle

### 1. CinematicScene
- **Entry:** Route `/` (default landing page)
- **Purpose:** Intro animation, title screen
- **Exit:** Auto-transition to DoorScene or user skip

### 2. DoorScene
- **Entry:** Route `/door` or from CinematicScene
- **Purpose:** Access code validation (speakeasy-style gate)
- **Validation:** POST `/api/passes/validate` → generates guest JWT
- **Storage:** JWT stored in `localStorage` as `guest_token`
- **Exit:** On valid code → navigate to `/world`

### 3. LoadingScene
- **Entry:** Route `/world` triggers this scene first
- **Purpose:** Asset loading with progress bar
- **Assets Loaded:**
  - `village-manifest.json` - building/NPC/collectible definitions
  - `village-map` - Tiled JSON tilemap (80x60 tiles, 6 layers)
  - `village-tileset` - PNG spritesheet
  - `player` - 16x16 player spritesheet (4 directions × 4 frames)
  - `npc` - 16x16 NPC spritesheet
- **Exit:** On complete → transition to OverworldScene

### 4. OverworldScene
- **Entry:** From LoadingScene
- **Purpose:** Main game loop, exploration, interaction
- **Update Loop (60 FPS):**
  1. PlayerController.update() - handle input, animate sprite
  2. CameraController.update() - follow player, respect bounds
  3. CollisionSystem.update() - tile-based collision detection
  4. InteractionSystem.update() - check building/NPC proximity
  5. NPCManager.update() - NPC AI, patrol paths
  6. SecretsManager.checkPickup() - collectible collision
  7. AchievementEngine check - time-based, event-based triggers
- **Exit:** Building entry → InteriorScene, app navigation → Angular route

### 5. InteriorScene
- **Entry:** From OverworldScene (building interaction)
- **Purpose:** Show building-specific content, launch Angular apps
- **Dynamic Content:** Based on `buildingType` (projects, dashboard, homecontrol, etc.)
- **Exit:** "Return to World" → back to OverworldScene at saved (x, y)

---

## Systems Breakdown

### PlayerController
**Purpose:** Player movement, input handling, sprite animations

**Key Methods:**
- `handleMovement(cursors, wasd)` - process keyboard/gamepad input
- `animate(direction)` - update sprite animation based on direction
- `setVelocity(x, y)` - apply physics velocity

**Input Support:**
- Arrow keys / WASD
- Gamepad (left stick)
- Touch controls (virtual joystick, planned)

**Animation States:**
- `walk-down`, `walk-up`, `walk-left`, `walk-right` (4-frame loops)
- Idle frames when velocity is zero

### AudioManager
**Purpose:** Background music, sound effects, mute controls

**Features:**
- **Autoplay Compliance:** Starts muted on first visit, shows "Click to unmute" prompt
- **Mute Persistence:** Saves mute state to `localStorage` (`world-audio-muted`)
- **Graceful Degradation:** Silently continues if audio files missing
- **Event Emission:** Fires `audio-mute-changed` for UI updates

**API:**
- `initialize()` - check first visit, apply autoplay policy
- `playMusic(key, volume)` - loop background music
- `pauseMusic()` / `resumeMusic()` - pause/resume without destroying
- `playSFX(key, volume)` - one-shot sound effects
- `toggleMute()` - flip mute state, save to localStorage

**Expected Audio Files:**
- `ambient` - looping background music (MP3)
- `door-enter` - building entry SFX (WAV/OGG)
- `npc-talk` - dialogue start SFX (WAV/OGG)
- `collectible-pickup` - code fragment pickup SFX (WAV/OGG)

### DialogueSystem
**Purpose:** NPC conversations with branching dialogue trees

**Architecture:**
- **DialogueTree:** Parses JSON dialogue files, traverses nodes
- **DialogueBox:** Renders text with typewriter effect, choice buttons
- **Branching:** Each node can have 1-4 choices leading to other nodes

**Dialogue JSON Structure:**
```json
{
  "startNode": "intro",
  "nodes": {
    "intro": {
      "text": "Hello, traveler!",
      "choices": [
        { "text": "Tell me about this place", "next": "about" },
        { "text": "Goodbye", "next": "END" }
      ]
    }
  }
}
```

**Key Features:**
- Typewriter text reveal (3 chars/frame)
- Dialogue pauses game input (player can't move)
- ESC/SPACE closes dialogue

### ProgressTracker
**Purpose:** Visitor state persistence (collectibles, achievements, visited buildings)

**Storage:**
- **Client-side:** `sessionStorage` for in-session state
- **Server-side:** MongoDB (planned, not yet implemented)

**Tracked Data:**
- `collectedItems` - array of collectible IDs
- `unlockedAchievements` - array of achievement IDs
- `buildingsVisited` - set of building IDs
- `npcsInteracted` - set of NPC dialogue IDs

---

## Angular-Phaser Bridge

### EventBridge Service (Angular)
**Purpose:** Communication between Angular and Phaser game

**Pattern:**
- Phaser scenes emit custom events: `this.scene.events.emit('building-entered', buildingId)`
- Angular service subscribes: `game.scene.events.on('building-entered', (id) => { ... })`

**Use Cases:**
- Game → Angular: "Launch app" button in InteriorScene navigates to Angular route
- Angular → Game: "Return to World" button triggers scene transition back to game

**Implementation:**
```typescript
// Phaser (InteriorScene)
launchApp() {
  this.events.emit('navigate-to-app', this.appRoute);
}

// Angular (GameComponent)
ngAfterViewInit() {
  this.game.scene.events.on('navigate-to-app', (route) => {
    this.router.navigate([route]);
  });
}
```

---

## Asset Loading Strategy

### Initial Load (LoadingScene)
- **Village exterior:** Tilemap JSON, tileset PNG, player/NPC sprites
- **Total size:** ~500KB compressed (target)

### Lazy Load (On-Demand)
- **Dialogue trees:** Loaded when NPC interaction starts (cache check first)
- **Themes:** Loaded async when ThemeEngine.switchTheme() called
- **Audio:** Loaded in LoadingScene but gracefully skipped if missing

### Bundle Splitting (Angular)
- **Game chunk:** Only loads when visiting `/world` route
- **Dashboard chunk:** Separate bundle for `/dashboard`
- **Shared chunk:** Angular core, common services

**Production Build Output:**
```
main.js        - Angular bootstrap + router
game.chunk.js  - Phaser + game scenes + systems
dashboard.chunk.js - Dashboard components
```

---

## Mobile Support

### Responsive Canvas
- **Scale Mode:** `Phaser.Scale.FIT` - maintains aspect ratio
- **Auto-center:** `Phaser.Scale.CENTER_BOTH`
- **Min size:** 400×300 (mobile phones)
- **Max size:** 1600×1200 (large desktops)

### Touch Controls (Planned)
- Virtual joystick overlay (bottom-left)
- Tap-to-move pathfinding
- Interaction buttons (A/B style)

### Performance Considerations
- Target: 60 FPS on mid-range mobile devices
- Pixel art rendering (no anti-aliasing = faster)
- Limit particle effects on low-end devices
- Use texture atlases to reduce draw calls

---

## Performance Optimization

### Bundle Splitting
- Phaser library lazy-loaded only on `/world` route
- Dashboard users don't download game code
- Target: <500KB main bundle, <1MB game chunk

### Asset Compression
- PNG tilesets: Optimized with imagemin (target <200KB each)
- Audio: MP3 for music (128kbps), OGG for SFX (<50KB each)
- JSON: Minified in production builds

### Load Time Targets
- **Initial page load (/):** <1 second (cinematic scene)
- **Game load (/world):** <3 seconds on 4G connection
- **Scene transitions:** <200ms (fade animations)

### Runtime Optimization
- Use object pools for frequently created/destroyed objects
- Limit physics body updates to visible entities
- Cull off-screen sprites from render pipeline

---

## Debugging Tips

### Phaser Debug Mode
Enable in `phaser-config.ts`:
```typescript
physics: {
  arcade: {
    debug: true  // Shows collision boxes, velocity vectors
  }
}
```

### Scene Inspector
Open browser console and access:
```javascript
game.scene.scenes[0]  // Access active scene
game.scene.scenes[0].children.list  // All game objects
```

### Common Issues

**Problem:** Player falls through tiles
- **Cause:** Collision layer not enabled or incorrect tile indices
- **Fix:** Check `CollisionSystem` tile ID array matches Tiled collision layer

**Problem:** Audio doesn't play
- **Cause:** Browser autoplay policy or missing audio files
- **Fix:** Check `AudioManager.isFirstVisit()` prompt appears, click to unmute

**Problem:** NPC dialogue doesn't trigger
- **Cause:** Proximity check failing or dialogue JSON not loaded
- **Fix:** Check `InteractionSystem.PROXIMITY_RADIUS`, verify dialogue file path

**Problem:** Building transition fails
- **Cause:** Building ID mismatch or missing manifest entry
- **Fix:** Check `manifest.json` building ID matches Tiled object layer name

---

## Development Workflow

### Local Development
1. `cd frontend && ng serve` - Angular dev server on `localhost:4200`
2. Game loads at `http://localhost:4200/world`
3. Hot reload works for Angular code, Phaser requires manual refresh

### Adding New Scenes
1. Create scene file in `frontend/src/app/game/scenes/NewScene.ts`
2. Add to `phaser-config.ts` scenes array
3. Transition from another scene: `this.scene.start('NewScene', { data })`

### Adding New Systems
1. Create system file in `frontend/src/app/game/systems/NewSystem.ts`
2. Instantiate in scene `create()`: `this.newSystem = new NewSystem(this)`
3. Call in scene `update()`: `this.newSystem.update()`

### Modifying World Data
1. Edit JSON files in `frontend/src/assets/worlds/village/`
2. Reload game (no rebuild needed, assets loaded at runtime)
3. For tilemap changes, export from Tiled as JSON

### Deployment to Pi
1. `cd frontend && rm -rf .angular/cache && npx ng build` (production build)
2. `pm2 restart platform-frontend` (serve from dist/)
3. Test at `https://platform.thisisvillegas.com/world`

---

## Future Enhancements

- **Multiplayer:** Real-time co-op exploration with WebSockets
- **Quest System:** Structured objectives with progress tracking
- **Inventory:** Item collection and usage system
- **Weather System:** Rain, snow, fog effects tied to themes
- **Day/Night Cycle:** Automatic theme transitions based on real time
- **Mobile Touch Controls:** Virtual joystick and action buttons
- **Save Slots:** Multiple visitor profiles with independent progress
- **Mod Support:** Custom World Packs loaded from user JSON files
