# Stack Research

**Domain:** Pixel-art game world (Phaser) embedded in Angular 19 platform app
**Researched:** 2026-02-14
**Confidence:** HIGH (core stack), MEDIUM (supporting libraries)

## Critical Decision: Phaser 3.90.0, NOT Phaser 4

Phaser 4 is at Release Candidate 6 (Dec 2025), described as "production-ready" by the Phaser team. However, **use Phaser 3.90.0** for this project because:

1. **No Angular template for Phaser 4 yet.** The official Phaser + Angular template (phaserjs/template-angular) runs Phaser 3.90.0 + Angular 19.2.0. Phaser 4 Angular templates are promised "when 4.0.0 ships" -- which has not happened.
2. **Rex plugins are Phaser 3 only.** The `phaser3-rex-plugins` package (v1.80.18, actively maintained) provides the textbox, dialogue, and UI components needed for the RPG dialogue system. No Phaser 4 equivalent exists.
3. **Phaser 3.90.0 is final and stable.** No major bugs remain. It is battle-tested with extensive documentation, tutorials, and community examples. Phaser 4 RC6 is still pre-release.
4. **Migration path exists.** The Phaser team states "you don't need to rewrite your games to accommodate v4 as the internal API is the same." When Phaser 4 goes stable with an Angular template, upgrading should be low-friction.
5. **This is a portfolio project, not a game studio.** Stability and time-to-ship matter more than bleeding-edge renderer features. Phaser 3's WebGL1 renderer is more than sufficient for 16x16 pixel art.

**When to reconsider:** If Phaser 4.0.0 stable ships with an Angular template AND rex plugins gain Phaser 4 support, evaluate migration. Until then, Phaser 3 is the correct choice.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Phaser | 3.90.0 | 2D game engine | Final stable v3 release. Native Aseprite loader, built-in tilemap parser, camera follow, pixel art mode. Official Angular template exists. |
| Tiled | 1.11.2 | Tilemap editor | Industry-standard 2D map editor. Exports JSON consumed directly by Phaser's tilemap loader. Free, actively maintained (Jan 2025 release). |
| Aseprite | 1.3.x | Pixel art + animation | De facto pixel art tool. Native Phaser 3 loader (`this.load.aseprite()`) parses exported spritesheets + JSON with animation tags automatically. |
| TypeScript | 5.7.2 | Type safety | Already used in the project. Phaser 3 ships full TypeScript definitions. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| phaser3-rex-plugins | 1.80.18 | UI components (textbox, typing, dialogue) | Dialogue system: provides textbox with built-in typewriter effect, paging, and event callbacks. Import only the plugins you need to minimize bundle size. |
| EventBus (custom) | N/A | Angular-Phaser bridge | Always. Lightweight event emitter pattern from the official template. Enables Angular components to react to Phaser scene events and vice versa. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Tiled Map Editor | Create village tilemap | Export as JSON (not TMX). Use CSV layer format (uncompressed). Check "Embed in Map" for tilesets. 16x16 tile size. |
| Aseprite | Create/animate pixel art sprites | Export as spritesheet PNG + JSON. Use "Packed" sheet type, "None" constraints, check "Tags" in meta. Phaser reads animation tags directly. |
| BMFont / Hiero | Generate bitmap fonts | For pixel-perfect retro text rendering. Phaser's BitmapText loads XML/JSON font descriptors. Alternative: use `RetroFont.Parse()` for fixed-width fonts from a spritesheet. |
| Phaser Examples Browser | Reference implementations | https://phaser.io/examples -- searchable catalog of API usage patterns. Use for verifying tilemap, camera, and animation APIs. |

## Installation

```bash
# Core game engine
npm install phaser@3.90.0

# Rex UI plugins (dialogue system, typewriter text)
npm install phaser3-rex-plugins@1.80.18
```

No additional dev dependencies required -- Phaser ships TypeScript types, and the existing Angular CLI build pipeline handles bundling.

## Bundle Size Considerations

Phaser 3.90.0 is approximately **1MB minified** (~300KB gzipped). For a game feature this is acceptable, but:

- **Lazy-load the game module.** The Phaser game component should be in a lazy-loaded Angular route so the Phaser bundle is only downloaded when the user navigates to the game world.
- **Import rex plugins individually.** Instead of importing the full rexUI plugin, import specific plugins:
  ```typescript
  // Do this (tree-shakeable, smaller bundle)
  import TextTypingPlugin from 'phaser3-rex-plugins/plugins/texttyping-plugin';
  import TextBoxPlugin from 'phaser3-rex-plugins/templates/ui/textbox/TextBox';

  // NOT this (imports entire UI library)
  import UIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin';
  ```
- **Update Angular budget.** The current `angular.json` has a 750KB warning / 1.5MB error budget for initial bundle. The game chunk will be separate (lazy-loaded), but verify it does not inflate the initial bundle.

## Architecture Patterns from Official Template

The official `phaserjs/template-angular` (Angular 19.2.0 + Phaser 3.90.0) establishes these patterns:

### Bridge Component Pattern
```typescript
// phaser-game.component.ts -- bridge between Angular and Phaser
@Component({
  selector: 'app-phaser-game',
  template: '<div id="game-container"></div>',
  standalone: true
})
export class PhaserGameComponent implements OnDestroy {
  phaserRef = viewChild.required(PhaserGame);

  ngOnDestroy() {
    this.game?.destroy(true); // Critical: prevents memory leaks
  }
}
```

### EventBus Pattern
```typescript
// EventBus.ts -- bidirectional Angular <-> Phaser communication
import { Events } from 'phaser';
export const EventBus = new Events.EventEmitter();

// In Phaser scene:
EventBus.emit('current-scene-ready', this);

// In Angular component:
EventBus.on('current-scene-ready', (scene: Phaser.Scene) => { ... });
```

### Scene Management Pattern (for RPG)
```
GameScene (world, player, NPCs)  -- always running
UIScene (dialogue boxes, HUD)    -- overlaid on top, launched parallel
```
Phaser renders scenes in order. The UI scene sits on top. Input is processed top-down (UI first), preventing clicks from "falling through" dialogue boxes to the game world.

## Pixel Art Configuration

```typescript
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,           // WebGL with Canvas fallback
  pixelArt: true,              // Nearest-neighbor scaling, no antialiasing
  roundPixels: true,           // Prevents sub-pixel rendering artifacts
  scale: {
    mode: Phaser.Scale.FIT,    // Fit to container, maintain aspect ratio
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 320,                // Native resolution (320x240 = 20x15 tiles at 16px)
    height: 240
  },
  physics: {
    default: 'arcade',         // Lightweight physics for top-down movement
    arcade: { gravity: { x: 0, y: 0 } } // No gravity for top-down
  }
};
```

Key settings:
- `pixelArt: true` sets nearest-neighbor texture filtering globally
- `roundPixels: true` prevents tile bleeding / sub-pixel jitter when camera follows player
- Native resolution of 320x240 scales cleanly to modern displays (integer multiples)
- Arcade physics with zero gravity for top-down movement

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Phaser 3.90.0 | Phaser 4 RC6 | When Phaser 4 goes stable with Angular template + plugin ecosystem. Not before. |
| Phaser 3.90.0 | PixiJS 8 | If you need only rendering (no game logic, physics, input). Phaser includes PixiJS-level rendering PLUS scene management, physics, input, tilemaps, asset loading. |
| Phaser 3.90.0 | Kaboom.js / Kaplay | Simpler API but far less mature tilemap support, no Angular template, smaller community. |
| Tiled | LDtk | If you prefer a more opinionated editor with built-in auto-tiling. Tiled has better Phaser integration and more community resources. |
| Aseprite ($20) | Piskel (free, web) | If cost is a concern. Piskel lacks animation tag export that Phaser's Aseprite loader uses. Aseprite is worth the $20 for the workflow. |
| phaser3-rex-plugins | Custom dialogue system | If Rex plugins add too much bundle weight or you need highly custom RPG dialogue. Building from scratch takes significantly longer. |
| Arcade Physics | Matter.js (built-in) | If you need complex physics (slopes, joints, polygon colliders). Arcade is simpler and faster for grid-based top-down movement. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Phaser 4 (today) | No Angular template, no rex plugin support, still RC. Risk of API changes before stable. | Phaser 3.90.0 |
| Phaser 2 / Phaser CE | Deprecated. No TypeScript types. No maintained community. | Phaser 3.90.0 |
| `@phaserjs/phaser` npm package | Abandoned experimental Phaser 4 package (v0.2.2, 4 years old). NOT the real Phaser 4. | `phaser@3.90.0` from npm |
| Canvas renderer (force) | WebGL is required for shader effects (day/night overlay, color tinting). Canvas mode has no shader support. | `Phaser.AUTO` (defaults to WebGL) |
| Matter.js physics | Overkill for top-down tile-based movement. Adds complexity and performance cost. | Arcade physics |
| Full rexUI plugin import | Imports entire UI library (~200KB+). Most components unused. | Individual plugin imports from `phaser3-rex-plugins/plugins/` |
| CSS-based game UI | Mixing CSS DOM elements over a WebGL canvas causes z-index headaches, input conflicts, and scaling mismatches. | Phaser's built-in UI (BitmapText, Sprites, rexUI textboxes) rendered on the canvas |

## Stack Patterns by Variant

**If day/night cycle needs smooth ambient lighting:**
- Use a fullscreen semi-transparent rectangle with `setBlendMode(Phaser.BlendModes.MULTIPLY)` or a camera postFX pipeline
- Tint the rectangle's color and alpha via tweens for sunrise/sunset transitions
- WebGL required (default with `Phaser.AUTO`)

**If dialogue system needs portraits + choices:**
- Use rex textbox for base typewriter text
- Layer a Phaser Sprite (NPC portrait) alongside the textbox container
- Handle choice selection via rex dialog's button system or custom button sprites

**If world packs need swappable tilesets:**
- Design tilemap layers referencing tileset by key name
- At runtime, swap the tileset image (`tilemap.addTilesetImage('village', 'village-winter')`) before creating layers
- Keep tile indices consistent across seasonal variants (same layout, different textures)

**If building-to-app navigation is needed:**
- Phaser scene emits event via EventBus: `EventBus.emit('navigate', '/projects')`
- Angular component listens and uses Angular Router: `this.router.navigate(['/projects'])`
- Game can be paused/destroyed when navigating away, restored when returning

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| phaser@3.90.0 | Angular 19.2.x | Verified by official phaserjs/template-angular. Uses esbuild bundler (Angular CLI application builder). |
| phaser@3.90.0 | TypeScript 5.7.x | Ships with TypeScript definitions. Verified compatible with TS 5.7.2 in the official template. |
| phaser3-rex-plugins@1.80.18 | phaser@3.90.0 | Actively maintained (last published Feb 2025). Built for Phaser 3.x. |
| Tiled 1.11.2 JSON export | phaser@3.90.0 | Phaser's tilemap loader parses Tiled JSON natively. Use CSV layer format, embed tilesets. |
| Aseprite 1.3.x JSON export | phaser@3.90.0 | Native `this.load.aseprite()` loader. Export as packed spritesheet + JSON with tags. |
| @angular-devkit/build-angular | phaser@3.90.0 | The existing esbuild-based builder handles Phaser's CommonJS internals. May show a CommonJS warning -- add to `allowedCommonJsDependencies` in angular.json if needed. |

## Hosting Consideration: Raspberry Pi 4

The game runs entirely client-side (browser). The Pi only serves static files. Performance considerations:

- Phaser game assets (tilemaps, spritesheets) are static files served from `dist/`
- No server-side game logic needed
- Total asset size for a 16x16 pixel art game: likely under 5MB (tilemaps + spritesheets + fonts)
- Ensure `Cache-Control` headers are set for game assets (they change infrequently)
- Game state (achievements, progress) can be saved to localStorage (no backend needed) or MongoDB via existing API

## Sources

- [Phaser v3.90.0 stable release](https://phaser.io/download/stable) -- Confirmed final v3 release, May 2025 (HIGH confidence)
- [Phaser v4 RC6 announcement](https://phaser.io/news/2025/12/phaser-v4-release-candidate-6-is-out) -- Production-ready RC, not stable release (HIGH confidence)
- [phaserjs/template-angular GitHub](https://github.com/phaserjs/template-angular) -- Angular 19.2.0 + Phaser 3.90.0, verified via WebFetch (HIGH confidence)
- [Phaser Mega Update](https://phaser.io/news/2025/05/phaser-mega-update) -- v3.90 is last v3; v4 templates coming "when 4.0.0 ships" (HIGH confidence)
- [phaser3-rex-plugins npm](https://www.npmjs.com/package/phaser3-rex-plugins) -- v1.80.18, last published Feb 2025 (HIGH confidence)
- [Rex UI Textbox docs](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/ui-textbox/) -- Textbox with typewriter, paging, events (MEDIUM confidence -- docs are undated)
- [Tiled 1.11.2 release](http://www.mapeditor.org/2025/01/28/tiled-1-11-2-released.html) -- Latest Tiled version, Jan 2025 (HIGH confidence)
- [Phaser Aseprite loader docs](https://newdocs.phaser.io/docs/3.80.0/focus/Phaser.Loader.LoaderPlugin-aseprite) -- Native Aseprite sprite loading (MEDIUM confidence -- docs reference 3.80, but feature exists in 3.90)
- [Phaser pixel art mode example](https://phaser.io/examples/v3/view/game-config/pixel-art-mode) -- pixelArt config demonstration (HIGH confidence)
- [Phaser Scenes docs](https://docs.phaser.io/phaser/concepts/scenes) -- Multi-scene management, UI overlay pattern (HIGH confidence)
- [Phaser Cameras docs](https://docs.phaser.io/phaser/concepts/cameras) -- Camera follow, zoom, dead zone (HIGH confidence)
- [Phaser BitmapText docs](https://docs.phaser.io/phaser/concepts/gameobjects/bitmap-text) -- Retro font rendering (HIGH confidence)

---
*Stack research for: Phaser pixel-art game world in Angular 19*
*Researched: 2026-02-14*
