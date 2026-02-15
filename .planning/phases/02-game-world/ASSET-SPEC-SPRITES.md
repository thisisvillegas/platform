# Sprite Asset Specification - Phase 2: Game World

## Overview
This document specifies pixel art character spritesheets for player and NPC characters in the village/town RPG world. All options are 16x16 compatible and support 4-directional (up/down/left/right) movement with walk and idle animations.

---

## Player Character Sprites

### Option 1: Free TopDown RPG Retro Sprites by ELV Games (Recommended)
- **Creator:** ELV Games
- **URL:** https://elvgames.itch.io/free-retro-game-world-sprites
- **Price:** Free
- **License:** Free for personal and commercial projects
- **What's Included:**
  - 6 character sprite variants
  - 4-direction idle animation (each direction)
  - 4-direction walk animation (4 frames per direction)
  - 16x16 pixel size available
  - PNG format
- **Animations:** Idle (4 frames total) + Walk (4 frames per direction, 16 frames total)
- **Compatibility:** Phaser 3, Tiled, standard game engines
- **Aesthetic:** Retro pixel art style, colorful and charming
- **Recommendation:** **Top pick** - Complete animations, multiple character options, clear commercial license

### Option 2: CC0 Walk Cycles by OpenGameArt Contributors
- **Creator:** OpenGameArt community
- **URL:** https://opengameart.org/content/cc0-walk-cycles
- **Price:** Free
- **License:** CC0 (public domain - no restrictions)
- **What's Included:**
  - Walk cycle animations (4-direction)
  - 16x16 compatible
  - Multiple character variants
- **Animations:** Walk cycles with 4-direction support
- **Compatibility:** All game engines
- **Aesthetic:** High-quality pixel art
- **Recommendation:** Excellent for walk cycles, may need to add idle animation separately

### Option 3: 4 Frame Walk Cycles by OpenGameArt
- **Creator:** OpenGameArt contributors (includes Chasersgaming, LPC sprites)
- **URL:** https://opengameart.org/content/4-frame-walk-cycles
- **Price:** Free
- **License:** Mixed (CC-BY-SA, CC0)
- **What's Included:**
  - 4-frame walk cycles
  - Multiple character bases (male, female, etc.)
  - 16x16 compatible
- **Animations:** Walk (4 frames per direction)
- **Compatibility:** Standard game engine format
- **Recommendation:** Good baseline, integrates well with other LPC assets

### Option 4: Free Character Sprite Sheets by GameFromScratch
- **Creator:** GameFromScratch
- **URL:** https://gamefromscratch.com/free-character-sprite-sheets/
- **Price:** Free
- **License:** CC0 (public domain)
- **What's Included:**
  - Multiple character variants
  - Walk and idle animations
  - JSON Array format for Phaser
  - PNG sprite atlases
- **Animations:** Walk + Idle
- **Compatibility:** **Phaser 3 optimized** (JSON Array format)
- **Recommendation:** Best for Phaser 3 integration, pre-formatted for direct use

### Option 5: Cute Fantasy RPG 16x16 by Kenmi
- **Creator:** Kenmi
- **URL:** https://kenmi-art.itch.io/cute-fantasy-rpg
- **Price:** Free
- **License:** Free for personal and commercial use (check license terms)
- **What's Included:**
  - Multiple character options
  - 16x16 pixel sprites
  - Cute fantasy aesthetic
  - Animations for walk and idle
- **Aesthetic:** Cute, whimsical style
- **Recommendation:** Alternative if a cuter aesthetic is preferred

### Option 6: Character Base - The Mana Seed by Seliel the Shaper
- **Creator:** Seliel the Shaper
- **URL:** https://seliel-the-shaper.itch.io/character-base
- **Price:** Free
- **License:** Free for commercial projects
- **What's Included:**
  - Base character templates
  - Customizable 16x16 character sprites
  - Walk and idle animations
  - Multiple variants and color options
- **Recommendation:** Good for character customization and variation

---

## NPC Character Sprites

### Option 1: Human Villagers Characters - Pixel RPG by Snoblin (Recommended)
- **Creator:** Snoblin
- **URL:** https://snoblin.itch.io/human-npcs
- **Price:** $2.00 USD (on sale from $2.60)
- **License:** Commercial use allowed. Can edit, but cannot redistribute/resell.
- **NPCs Included:**
  - Human Base (foundation character)
  - Human Merchant (3 color variants)
  - Human Peasant (3 color variants)
  - Human Nobleman (3 color variants)
  - Human Noblewoman (3 color variants)
  - Human Smith (3 color variants)
  - Human Thief (3 color variants)
  - Medieval Monks (2 characters)
- **Animations:**
  - Idle (2 frames)
  - Walk (4 frames)
  - Hurt (2 frames)
  - Death (3 frames)
  - Water interactions (idle, swim, hurt, sink)
- **Resolution:** 16x16 pixels
- **Aesthetic:** Medieval-style villagers, excellent variety for diverse NPCs
- **Recommendation:** **Top pick** - Comprehensive character variety, specific professions, well-animated, low cost

### Option 2: Village NPC Pixel Character Sprites by Free Game Assets
- **Creator:** Free Game Assets
- **URL:** https://free-game-assets.itch.io/village-npc-pixel-art-character-sprite-pack
- **Price:** $0.70 USD (90% off from $7.00 - sale price)
- **License:** Check documentation (not specified on main page)
- **NPCs Included:**
  - 3 main character variants
  - Multiple animation frames shown in demo
  - Medieval/fantasy village theme
  - Charming character designs
- **Formats:** PSD and PNG
- **File Size:** 375 kB
- **Recommendation:** Good alternative if Snoblin pack is unavailable, currently heavily discounted

### Option 3: Free Pixel Art Asset Pack by Anokolisa
- **Creator:** Anokolisa
- **URL:** https://anokolisa.itch.io/free-pixel-art-asset-pack-topdown-tileset-rpg-16x16-sprites
- **Price:** Free
- **License:** Check terms (permanent free option)
- **NPCs Included:**
  - 3 hero characters
  - 8 enemies (Skeletons, Orcs, variants)
  - 50+ weapons
  - Multiple animation variants
- **Animations:** Walk, Idle, Hit, Collect, Death, Fishing, Watering, Slice, Crush, Pierce, Carry (multiple states)
- **Resolution:** 16x16 pixels
- **File Size:** 1.9 MB (v2.0.4)
- **Recommendation:** Great supplementary asset pack, especially for enemy/creature sprites

### Option 4: Villagers Sprite Sheets Free Pixel Art Pack by Free Game Assets
- **Creator:** Free Game Assets
- **URL:** https://free-game-assets.itch.io/villagers-sprite-sheets-free-pixel-art-pack
- **Price:** Free (or discounted)
- **NPCs Included:**
  - Multiple villager character sheets
  - Various profession/role variants
  - Idle and walk animations
- **Recommendation:** Free alternative for basic villager variety

---

## NPC Type Mapping

For the village building locations, recommended NPC types:

| Building | NPC Role | Asset Source |
|----------|----------|--------------|
| Tavern | Bartender | Snoblin (Merchant variant, customize) |
| Smart Home | Guide/Host | Snoblin (Merchant, customize) |
| War Room | Military Officer | Snoblin (Nobleman/Noblewoman) |
| Greenhouse | Gardener/Farmer | Snoblin (Peasant variant) |
| Theater | Performer/Artist | Snoblin (Custom) + Anokolisa |
| Castle | Noble/Royalty | Snoblin (Nobleman/Noblewoman) |
| Workshop | Craftsperson | Snoblin (Smith) |
| Server Shack | Technician | Snoblin (Merchant customize) |
| About House | Guide/Innkeeper | Snoblin (Merchant) |
| Generic Villagers | Townspeople | Snoblin Peasant, Free Game Assets |

---

## Recommendations

### Player Character (Mandatory)
**Primary:** Free TopDown RPG Retro Sprites by ELV Games
- ✅ Free
- ✅ 4-direction walk + idle
- ✅ Multiple character options (6 variants)
- ✅ Clear commercial license
- ✅ 16x16 format

**Backup Options:**
1. GameFromScratch sheets (Phaser-optimized JSON format)
2. CC0 Walk Cycles + custom idle animation

### NPCs (Recommended)
**Primary:** Human Villagers Characters by Snoblin ($2.00)
- ✅ Excellent profession variety
- ✅ Multiple color variants per profession
- ✅ 16x16 perfect fit
- ✅ Commercial use allowed
- ✅ Well-animated (walk, idle, hurt, death)
- ✅ Low cost investment

**Supplementary:** Anokolisa pack (free)
- For extra NPCs, enemies, props
- Additional animation variety

---

## Integration Plan

### Phaser 3 Implementation

1. **Load Sprite Assets:**
   ```typescript
   // Load player character
   this.load.spritesheet('player', 'assets/sprites/player.png', {
     frameWidth: 16,
     frameHeight: 16
   });

   // Load NPC sprites
   this.load.spritesheet('npc-merchant', 'assets/sprites/npcs/merchant.png', {
     frameWidth: 16,
     frameHeight: 16
   });
   ```

2. **Define Animations:**
   ```typescript
   // Player walk animation (4 frames per direction)
   this.anims.create({
     key: 'walk-down',
     frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
     frameRate: 8,
     repeat: -1
   });
   ```

3. **Create Character Instances:**
   ```typescript
   const player = this.add.sprite(x, y, 'player');
   player.play('walk-down');
   ```

### Tiled Integration
- Sprites are separate from tilemap
- Position NPCs using Tiled object layer
- Link objects to sprite assets via custom properties
- Assign animation states based on NPC behavior

### File Organization
```
/assets/sprites/
├── player/
│   ├── hero-1.png
│   ├── hero-2.png
│   └── hero-3.png
├── npcs/
│   ├── merchant.png
│   ├── peasant.png
│   ├── smith.png
│   ├── monk.png
│   └── noblewoman.png
└── README.md (license attribution)
```

---

## License Attribution

### Free TopDown RPG Retro Sprites
- Created by ELV Games
- Free for personal and commercial projects

### Human Villagers Characters
- Created by Snoblin
- Commercial use allowed, proper copyright maintained
- Reference in credits: "NPCs by Snoblin (https://snoblin.itch.io/human-npcs)"

### CC0/OpenGameArt Assets
- Credit required per specific asset (auto-generated CSV available from generators)

---

## Next Steps

1. Download Free TopDown RPG Retro Sprites (ELV Games)
2. Download Human Villagers Characters (Snoblin) - $2.00 investment
3. Optionally download Anokolisa pack for supplementary assets
4. Extract and organize sprites into `/assets/sprites/` directory
5. Test sprite loading and animation in Phaser 3
6. Create character prefab classes for player and NPCs
7. Integrate with map design (see MAP-DESIGN-SPEC.md)
