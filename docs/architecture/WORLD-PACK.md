# World Pack Format Specification

## Purpose

The World Pack format is a **data-driven architecture** that keeps the game engine world-agnostic. All world-specific content (maps, buildings, NPCs, collectibles, themes) lives in JSON files and assets, allowing new worlds to be created without modifying engine code.

### Benefits
- **Rapid iteration:** Edit JSON files and see changes immediately (no rebuild)
- **Modular design:** Each world is a self-contained package
- **Designer-friendly:** Non-programmers can create worlds using Tiled + JSON editors
- **Multi-world support:** Easily swap between different worlds at runtime

---

## Directory Structure

```
assets/worlds/{world-name}/
├── manifest.json           # World metadata and entity definitions
├── maps/
│   ├── {world-name}.json  # Tiled tilemap (exterior world)
│   └── interiors/         # (Optional) Separate interior tilemaps
├── tilesets/
│   ├── {world-name}-tileset.png  # Main tileset spritesheet
│   └── decorations.png           # (Optional) Seasonal decorations
├── sprites/
│   ├── player.png         # Player spritesheet (16x16 frames)
│   ├── npc.png            # NPC spritesheet
│   └── particles/         # Particle effect textures
├── themes/
│   ├── default.json       # Day theme
│   ├── night.json         # Night theme
│   └── seasonal/          # Valentine, Christmas, Autumn, Halloween
├── dialogue/
│   ├── {npc-id}-01.json   # Branching dialogue trees
│   └── ...
└── audio/
    ├── ambient.mp3        # Looping background music
    ├── door-enter.wav     # SFX for building entry
    ├── npc-talk.wav       # SFX for dialogue start
    └── collectible-pickup.wav  # SFX for collectible pickup
```

---

## manifest.json Schema

### Full TypeScript Interface

```typescript
interface WorldManifest {
  metadata: {
    name: string;           // Display name (e.g., "Village")
    version: string;        // Semantic version (e.g., "1.0.0")
    author: string;         // Creator name
    description?: string;   // Short description
  };

  spawn: {
    x: number;              // Player spawn X coordinate (in pixels)
    y: number;              // Player spawn Y coordinate (in pixels)
    direction?: 'down' | 'up' | 'left' | 'right';  // Initial facing direction
  };

  buildings: Building[];
  npcs: NPC[];
  collectibles?: Collectible[];
}

interface Building {
  id: string;               // Unique identifier (e.g., "projects-building")
  name: string;             // Display name (e.g., "Projects Gallery")
  position: { x: number; y: number };  // Door location (in pixels)
  type: string;             // Building type (e.g., "projects", "dashboard")
  appRoute?: string;        // Angular route to navigate to (e.g., "/projects")
  appUrl?: string;          // External URL (alternative to appRoute)
  requiresAuth?: boolean;   // Requires Auth0 login (default: false)
  description?: string;     // Building description shown in InteriorScene
  interiorMap?: string;     // (Optional) Path to interior tilemap JSON
}

interface NPC {
  id: string;               // Unique identifier (e.g., "claude-npc-01")
  name: string;             // Display name (e.g., "Claude")
  position: { x: number; y: number };  // Spawn location (in pixels)
  sprite: string;           // Sprite key (e.g., "npc")
  dialogueId: string;       // Dialogue tree file basename (e.g., "claude-01")
  type?: 'static' | 'patrol';  // Movement behavior (default: "static")
  patrolPath?: { x: number; y: number }[];  // (Optional) Patrol waypoints
}

interface Collectible {
  id: string;               // Unique identifier (e.g., "player-movement")
  position: { x: number; y: number };  // World location (in pixels)
  title: string;            // Short title (e.g., "Player Movement")
  language: string;         // Code language (e.g., "typescript")
  codeSnippet: string;      // Actual code (5-15 lines)
  explanation: string;      // 1-2 sentence description
}
```

### Example manifest.json

```json
{
  "metadata": {
    "name": "Village",
    "version": "1.0.0",
    "author": "Andres Villegas",
    "description": "A pixel-art village world with 10 buildings and 3 NPCs"
  },
  "spawn": {
    "x": 400,
    "y": 300,
    "direction": "down"
  },
  "buildings": [
    {
      "id": "projects-building",
      "name": "Projects Gallery",
      "position": { "x": 320, "y": 240 },
      "type": "projects",
      "appRoute": "/projects",
      "requiresAuth": false,
      "description": "Explore my portfolio projects and case studies."
    },
    {
      "id": "dashboard-building",
      "name": "Admin Dashboard",
      "position": { "x": 640, "y": 480 },
      "type": "dashboard",
      "appRoute": "/dashboard",
      "requiresAuth": true,
      "description": "Internal admin tools. Authentication required."
    }
  ],
  "npcs": [
    {
      "id": "claude-npc-01",
      "name": "Claude",
      "position": { "x": 200, "y": 180 },
      "sprite": "npc",
      "dialogueId": "claude-01",
      "type": "static"
    }
  ],
  "collectibles": [
    {
      "id": "player-movement",
      "position": { "x": 150, "y": 200 },
      "title": "Player Movement",
      "language": "typescript",
      "codeSnippet": "handleMovement() {\n  const speed = 120;\n  if (cursors.left.isDown) {\n    this.sprite.setVelocityX(-speed);\n  }\n}",
      "explanation": "Top-down 2D movement with arcade physics and 4-directional animations."
    }
  ]
}
```

---

## Tilemap Requirements (Tiled JSON)

### Layers (Bottom to Top)

1. **ground** - Base terrain (grass, dirt, paths)
2. **buildings** - Building sprites, walls, props
3. **decorations** - Trees, flowers, benches (walkable)
4. **seasonal** - Theme-specific decorations (hidden by default)
5. **collision** - Invisible collision tiles (blocks player movement)
6. **above-player** - Roofs, overhangs (render above player sprite)

### Object Layers

- **doors** - Contains door objects with custom properties:
  - `buildingId` (string) - Matches `buildings[].id` in manifest
  - Position (x, y) - Where the door hitbox is
- **spawns** - Player spawn points (optional, can use manifest spawn instead)
- **npcs** - NPC spawn markers (optional, can use manifest NPCs instead)

### Tile Properties

**Collision Tiles:**
- Set custom property `collides: true` on tiles in collision layer
- Or use specific tile IDs in `CollisionSystem.COLLISION_TILES` array

**Window Tiles:**
- Day windows: Tile IDs 100-105
- Night windows: Tile IDs 106-111 (glowing variants)
- ThemeEngine swaps these based on theme

### Tileset Format

- **Tile size:** 16×16 pixels (pixel art style)
- **Format:** PNG with transparency
- **Palette:** Limited colors for retro aesthetic
- **Margin/Spacing:** 0px (tightly packed spritesheet)
- **Max dimensions:** 512×512 (GPU texture limit safety)

---

## Theme JSON Schema

### TypeScript Interface

```typescript
interface Theme {
  id: string;               // Unique theme ID (e.g., "night", "christmas")
  name: string;             // Display name (e.g., "Night", "Christmas")
  palette: {
    sky?: string;           // Hex color for sky background (e.g., "#1a1a3d")
    overlay?: {
      color: string;        // Hex color for screen tint (e.g., "#0000ff")
      alpha: number;        // Transparency 0.0-1.0 (e.g., 0.3)
    };
  };
  lights: {
    lampTiles: number[];    // Tile IDs for lamp posts (emit light)
    intensity: number;      // Light brightness 0.0-1.0
    radius: number;         // Light radius in pixels
  };
  windowTiles: {
    day: number[];          // Tile IDs for day windows (dark)
    night: number[];        // Tile IDs for night windows (glowing)
  };
  particles?: {
    type: string;           // Particle type (e.g., "snow", "hearts", "leaves")
    density: number;        // Particles per screen (e.g., 20)
    speed: number;          // Fall/drift speed (e.g., 30)
    color: string;          // Hex color (e.g., "#ffffff")
  };
  decorationLayers?: string[];  // Tilemap layers to show (e.g., ["christmas-decorations"])
  audio?: {
    ambient?: string;       // Background music key (e.g., "christmas-bgm")
    music?: string;         // Alias for ambient
  };
}
```

### Example theme: night.json

```json
{
  "id": "night",
  "name": "Night",
  "palette": {
    "sky": "#0a0a1a",
    "overlay": {
      "color": "#000040",
      "alpha": 0.4
    }
  },
  "lights": {
    "lampTiles": [85, 86, 87],
    "intensity": 0.8,
    "radius": 60
  },
  "windowTiles": {
    "day": [100, 101, 102, 103, 104, 105],
    "night": [106, 107, 108, 109, 110, 111]
  },
  "particles": null,
  "decorationLayers": [],
  "audio": {
    "ambient": "ambient"
  }
}
```

### Example theme: christmas.json

```json
{
  "id": "christmas",
  "name": "Christmas",
  "palette": {
    "overlay": {
      "color": "#e6f7ff",
      "alpha": 0.15
    }
  },
  "lights": {
    "lampTiles": [],
    "intensity": 0,
    "radius": 0
  },
  "windowTiles": {
    "day": [100, 101, 102, 103, 104, 105],
    "night": [100, 101, 102, 103, 104, 105]
  },
  "particles": {
    "type": "snow",
    "density": 20,
    "speed": 30,
    "color": "#ffffff"
  },
  "decorationLayers": ["christmas-decorations"],
  "audio": {
    "ambient": "ambient"
  }
}
```

---

## Dialogue Tree JSON Schema

### TypeScript Interface

```typescript
interface DialogueTreeData {
  startNode: string;        // ID of first node to show
  nodes: {
    [nodeId: string]: DialogueNode;
  };
}

interface DialogueNode {
  text: string;             // Dialogue text (supports \n for line breaks)
  choices: DialogueChoice[];
}

interface DialogueChoice {
  text: string;             // Choice button text
  next: string;             // Next node ID or "END" to close dialogue
}
```

### Example: claude-01.json

```json
{
  "startNode": "intro",
  "nodes": {
    "intro": {
      "text": "Hello, traveler! I'm Claude, an AI assistant. Welcome to the village!",
      "choices": [
        { "text": "Tell me about this place", "next": "about" },
        { "text": "What can I do here?", "next": "activities" },
        { "text": "Goodbye", "next": "END" }
      ]
    },
    "about": {
      "text": "This is a pixel-art world built with Phaser 3 and Angular 19. You can explore buildings, collect code fragments, and unlock achievements.",
      "choices": [
        { "text": "What are code fragments?", "next": "collectibles" },
        { "text": "Tell me about achievements", "next": "achievements" },
        { "text": "Thanks!", "next": "END" }
      ]
    },
    "collectibles": {
      "text": "Code fragments are real snippets from this project's source code! Walk over the glowing </> icons to collect them and learn how the game works.",
      "choices": [
        { "text": "Interesting! What else?", "next": "intro" },
        { "text": "Got it, thanks!", "next": "END" }
      ]
    }
  }
}
```

---

## Creating a New World

### Step 1: Set Up Directory Structure

```bash
cd frontend/src/assets/worlds/
mkdir my-world
cd my-world
mkdir maps tilesets sprites themes dialogue audio
```

### Step 2: Create Tilemap in Tiled

1. Open Tiled Map Editor
2. New Map: 80×60 tiles, 16×16 tile size, Orthogonal
3. Create layers (in order): ground, buildings, decorations, seasonal, collision, above-player
4. Import tileset PNG (Tileset → New Tileset → Browse)
5. Paint terrain, buildings, decorations
6. Mark collision tiles with custom property `collides: true`
7. Add Object Layer "doors" with point objects at door locations
8. Set custom property `buildingId` on each door object
9. Export as JSON: File → Export As → my-world.json

### Step 3: Create manifest.json

```json
{
  "metadata": {
    "name": "My World",
    "version": "1.0.0",
    "author": "Your Name"
  },
  "spawn": { "x": 400, "y": 300 },
  "buildings": [
    {
      "id": "first-building",
      "name": "First Building",
      "position": { "x": 320, "y": 240 },
      "type": "placeholder",
      "description": "A test building."
    }
  ],
  "npcs": [
    {
      "id": "test-npc",
      "name": "Test NPC",
      "position": { "x": 200, "y": 180 },
      "sprite": "npc",
      "dialogueId": "test-npc-01"
    }
  ]
}
```

### Step 4: Create Default Theme

**themes/default.json:**
```json
{
  "id": "default",
  "name": "Day",
  "palette": {
    "sky": "#87CEEB"
  },
  "lights": {
    "lampTiles": [],
    "intensity": 0,
    "radius": 0
  },
  "windowTiles": {
    "day": [],
    "night": []
  }
}
```

### Step 5: Create Dialogue Tree

**dialogue/test-npc-01.json:**
```json
{
  "startNode": "greeting",
  "nodes": {
    "greeting": {
      "text": "Hello! Welcome to my world!",
      "choices": [
        { "text": "Thanks!", "next": "END" }
      ]
    }
  }
}
```

### Step 6: Update LoadingScene

Edit `frontend/src/app/game/scenes/loading-scene.ts`:

```typescript
// Change all 'village' references to 'my-world'
this.load.json('my-world-manifest', '/assets/worlds/my-world/manifest.json');
this.load.tilemapTiledJSON('my-world-map', '/assets/worlds/my-world/maps/my-world.json');
this.load.image('my-world-tileset', '/assets/worlds/my-world/tilesets/my-world-tileset.png');
```

### Step 7: Test Locally

```bash
cd frontend
ng serve
# Visit http://localhost:4200/world
```

---

## Validation Checklist

Before deploying a new world, validate:

- [ ] `manifest.json` parses as valid JSON
- [ ] All `buildingId` values in doors match `buildings[].id` in manifest
- [ ] All `dialogueId` values have corresponding JSON files in `dialogue/`
- [ ] Tilemap JSON has all 6 required layers
- [ ] Tileset PNG exists and dimensions are multiples of 16
- [ ] Player sprite exists at `sprites/player.png` (16×16 frames)
- [ ] NPC sprite exists at `sprites/npc.png`
- [ ] Default theme exists at `themes/default.json`
- [ ] Spawn point (x, y) is within map bounds and not on collision tile
- [ ] All dialogue trees end with "END" or loop back to valid nodes
- [ ] Audio files are optional but paths match AudioManager expected keys

---

## Common Issues

**Problem:** Player spawns inside a wall
- **Fix:** Check spawn point in manifest.json is not on collision layer

**Problem:** Door doesn't trigger building entry
- **Fix:** Verify door object has `buildingId` property matching manifest

**Problem:** NPC has no dialogue
- **Fix:** Check `dialogueId` matches filename (without `.json` extension)

**Problem:** Theme doesn't load
- **Fix:** Ensure theme JSON is valid and `id` matches filename

**Problem:** Collectibles don't appear
- **Fix:** SecretsManager loads from `collectibles.json`, not manifest (separate system)

---

## Future Format Extensions

- **Multi-map support:** Link maps via portals (e.g., overworld → dungeon)
- **Dynamic weather:** Rain, snow, fog as separate overlay system
- **Quest definitions:** Structured objectives with triggers and rewards
- **Shop inventory:** NPC vendors with purchasable items
- **Combat encounters:** Enemy spawns and battle transitions
- **Mod loader:** Load third-party World Packs from user folders
