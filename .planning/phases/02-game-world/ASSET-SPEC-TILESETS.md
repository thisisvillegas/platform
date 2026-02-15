# Tileset Asset Specification - Phase 2: Game World

## Overview
This document specifies 16x16 pixel art tilesets suitable for the village/town RPG world in the platform-overhaul project. All options are compatible with Tiled map editor and Phaser 3 game engine.

---

## Research Summary

### Option 1: Cozy RPG - 16x16 Pixel Art Topdown Tileset (Recommended)
- **Creator:** lakiiah
- **URL:** https://lakiah.itch.io/cozy-rpg-16x16-pixel-art-topdown-tileset
- **Price:** Free (name your own price, minimum $0)
- **License:** Personal and commercial use allowed. Modification permitted. No redistribution/resale.
- **What's Included:**
  - Terrain tileset (grass, dirt, stone, etc.)
  - House tiles (roofs, walls, doors, windows)
  - Decoration tiles (trees, plants, furniture)
  - All in PNG format, 16x16 pixels
- **Phaser 3 / Tiled Compatibility:** Yes, standard PNG format works with both
- **Screenshot Description:** Cozy pixel art landscape inspired by Stardew Valley, displaying varied terrain, vegetation, and building elements in top-down perspective
- **Aesthetic:** Warm, inviting, "cozy" vibes matching the sci-fi village concept

### Option 2: FREE RPG Tileset 16x16
- **Creator:** Pipoya
- **URL:** https://pipoya.itch.io/free-rpg-tileset-16x16
- **Price:** Free (name your own price, minimum $0)
- **License:** Free for commercial and personal use. Modification allowed. No redistribution/resale.
- **What's Included:**
  - Outdoors tiles (terrain, water, vegetation)
  - Indoors tiles (walls, floors, furniture)
  - Dungeon tiles (stone, traps, chests)
  - Comprehensive coverage for multiple environments
- **Phaser 3 / Tiled Compatibility:** Yes, PNG format. Confirmed working with Godot autotile, should work with Tiled and Phaser
- **Screenshot Description:** Multi-environment tileset covering outdoor villages, interior rooms, and dungeon spaces in consistent 16x16 art style
- **Aesthetic:** Versatile, professional RPG style

### Option 3: 16x16 RPG Tileset (OpenGameArt)
- **Creator:** hilau, George Bailey, bluecarrot16 (collaborative)
- **URL:** https://opengameart.org/content/16x16-rpg-tileset
- **Price:** Free
- **License:** CC-BY-SA 3.0 and GPL 3.0 (dual-licensed)
- **What's Included:**
  - Overworld terrain (grass, rock, dirt, water, waterfalls)
  - Trees and plants
  - Interior and exterior building assets
  - Village tiles
  - Human sprite base
  - Additional contributions: recolored grass, improved trees, cave tiles, stairs, doors, indoor elements
- **Phaser 3 / Tiled Compatibility:** Yes, ZIP file contains tiles in compatible formats
- **Screenshot Description:** Complete RPG tileset with varied terrain types, vegetation, village buildings, and character sprites
- **Aesthetic:** Classic RPG style, community-maintained quality

### Option 4: Mushroom Village Tileset
- **Creator:** Unknown (OpenGameArt contributor)
- **URL:** https://opengameart.org/content/mushroom-village-tileset
- **Price:** Free
- **License:** CC0 (public domain)
- **What's Included:**
  - Village/town tiles
  - RPG Maker format (compatible with other engines)
  - 16x16 pixel dimension
- **Phaser 3 / Tiled Compatibility:** Yes, can be exported to standard formats
- **Aesthetic:** Whimsical, fantasy village theme

### Option 5: 16x16 Town Remix
- **Creator:** Multiple contributors (combines works by Surt, Redshrike)
- **URL:** https://opengameart.org/content/16x16-town-remix
- **Price:** Free
- **License:** CC0 / CC-BY-SA (mixed)
- **What's Included:**
  - Town/village tiles
  - Indoor/interior tileset expansion
  - Additional custom content
  - Comprehensive town creation resources
- **Phaser 3 / Tiled Compatibility:** Yes
- **Aesthetic:** Community-curated, well-tested

---

## Recommendation

**Top Pick: Cozy RPG - 16x16 Pixel Art Topdown Tileset by lakiiah**

### Justification:
1. **Aesthetic Match:** The "cozy" art style aligns perfectly with a sci-fi village aesthetic that feels welcoming and atmospheric
2. **Completeness:** Includes terrain, buildings, and decorations—everything needed for initial village development
3. **Flexibility:** Free to use, modify, and sell games with it. No complex attribution requirements like CC-BY-SA
4. **Community Proven:** Available on itch.io with positive engagement (popular asset)
5. **Future-Proof:** Can be supplemented with other assets as needed without licensing conflicts
6. **Zero Cost:** Completely free even for commercial use

### Secondary Option:
**FREE RPG Tileset 16x16 by Pipoya** serves as a strong backup if additional environment variety is needed (outdoor + indoor + dungeon coverage provides more flexibility for future features).

---

## Integration Plan

### Tiled Map Editor Setup
1. Import PNG tileset into Tiled as a new tileset
2. Configure 16x16 tile size
3. Create multiple layers:
   - Ground (terrain base)
   - Buildings (structures, walls)
   - Decorations (trees, plants, props)
   - Above-Player (elements that obscure the player)
   - Collision (invisible layer for pathfinding)

### Phaser 3 Integration
1. Load tileset PNG as asset
2. Define tilemap from Tiled JSON export
3. Create tilemap layers matching Tiled layer structure
4. Configure depth/sorting for above-player layer

### Modification Approach
- Both recommended tilesets allow modification
- Can recolor/adjust tiles to match sci-fi aesthetic
- Can extend with custom tiles if needed

---

## Next Steps

1. Download and import Cozy RPG tileset into Tiled
2. Create initial village map layout (see MAP-DESIGN-SPEC.md)
3. Test rendering in Phaser 3
4. Supplement with character sprites (see ASSET-SPEC-SPRITES.md)
5. Add audio elements (see ASSET-SPEC-AUDIO.md)
