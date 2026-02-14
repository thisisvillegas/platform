# Requirements: Platform Portfolio Overhaul

**Defined:** 2026-02-14
**Core Value:** When someone visits thisisvillegas.com with an access code, they experience an immediately impressive, playable pixel-art world that showcases real working apps.

## v1 Requirements

### Foundation

- [ ] **FOUND-01**: Phaser 3 game runs inside Angular component with proper lifecycle (no memory leaks on route changes)
- [ ] **FOUND-02**: Pixel art renders crisp at 16x16 tiles on all displays including Retina (pixelArt, antialias, roundPixels, CSS)
- [ ] **FOUND-03**: Game module is lazy-loaded so /dashboard users don't pay Phaser bundle cost
- [ ] **FOUND-04**: EventBus bridge connects Phaser scenes to Angular services bidirectionally
- [ ] **FOUND-05**: Game loop runs outside NgZone (no 60fps change detection triggering)
- [ ] **FOUND-06**: Local Mac build + scp deploy-to-Pi workflow works reliably
- [ ] **FOUND-07**: Loading screen with progress bar shows during asset preload

### Entry Flow

- [ ] **ENTRY-01**: Cinematic intro at / with typewriter text, ambient sound, particles, and pulsing "Enter" button
- [ ] **ENTRY-02**: Speakeasy door at /door with code input field styled as keypad
- [ ] **ENTRY-03**: Wrong code triggers door rattle, shake animation, denial sound
- [ ] **ENTRY-04**: Correct code triggers door swing animation (RE-style), fade to black, load world
- [ ] **ENTRY-05**: No-code visitors see message with access request info
- [ ] **ENTRY-06**: Skip option link visible for visitors who want direct project list access

### Game World

- [ ] **WORLD-01**: Player avatar moves with WASD/arrow keys with smooth animation
- [ ] **WORLD-02**: Collision detection prevents walking through buildings, water, trees
- [ ] **WORLD-03**: Camera follows player smoothly with world bounds clamping
- [ ] **WORLD-04**: Village tilemap with 10 buildings designed in Tiled (6 layers: ground, buildings, decorations, seasonal, collision, above-player)
- [ ] **WORLD-05**: Above-player layer renders tree canopy and roofs over player sprite (y-depth sorting)
- [ ] **WORLD-06**: Mobile touch controls with virtual joystick and interaction button
- [ ] **WORLD-07**: Responsive canvas scaling works on desktop, tablet, and mobile
- [ ] **WORLD-08**: World Pack JSON format defines buildings, NPCs, spawn point, and app mappings

### NPC & Dialogue

- [ ] **NPC-01**: Claude NPC stands in town square with idle animation
- [ ] **NPC-02**: Walking near an NPC shows interaction prompt ("Press SPACE to talk")
- [ ] **NPC-03**: RPG dialogue box appears at bottom of screen with typewriter text effect
- [ ] **NPC-04**: Dialogue supports branching choices ("Tell me about this app" / "What tech was used?" / "Any secrets?")
- [ ] **NPC-05**: Dialogue JSON tree format with per-NPC dialogue files
- [ ] **NPC-06**: Space/Enter advances text or instant-completes current line
- [ ] **NPC-07**: Player movement paused during active dialogue

### Building & App Integration

- [ ] **BLDG-01**: Door zones around buildings show interaction prompt ("Press ENTER to enter")
- [ ] **BLDG-02**: Entering a building navigates to the app's Angular route or external URL
- [ ] **BLDG-03**: Floating "Return to World" button visible on all app pages
- [ ] **BLDG-04**: Returning to world respawns player outside the building they entered
- [ ] **BLDG-05**: Player position saved in sessionStorage so world state persists across building visits
- [ ] **BLDG-06**: Game pauses (not destroys) when navigating to apps, resumes on return

### Pass & Guest Auth

- [ ] **PASS-01**: Dashboard Pass Manager lets owner create passes with label and expiry
- [ ] **PASS-02**: Dashboard Pass Manager lists all passes with used count and ability to revoke
- [ ] **PASS-03**: POST /api/passes/validate accepts code, returns guest JWT on success
- [ ] **PASS-04**: Guest JWT stored in localStorage with role:"guest" and expiry
- [ ] **PASS-05**: Expired pass kicks visitor back to door with expiry message
- [ ] **PASS-06**: Receptionist NPC in auth-required buildings auto-creates guest account via API
- [ ] **PASS-07**: Guest accounts auto-expire with their pass, cleanup cron runs nightly

### Theme Engine

- [ ] **THEME-01**: Day/night cycle based on visitor's local time (dark overlay with alpha tween, NOT Light2D)
- [ ] **THEME-02**: Lamp objects emit light cones at night, window tiles swap to lit variants
- [ ] **THEME-03**: Theme JSON format defines tint, particles, decoration layer, ambient audio, NPC overrides
- [ ] **THEME-04**: Dashboard World Manager lets owner toggle active theme or set auto-by-date
- [ ] **THEME-05**: At least one seasonal theme works end-to-end (Valentine's: hearts, pink tint, romantic audio)

### Secrets & Achievements

- [ ] **SECR-01**: 10-15 glowing code fragment collectibles scattered across the world map
- [ ] **SECR-02**: Each collectible reveals a real code snippet with explanation
- [ ] **SECR-03**: Tab key opens collectibles panel showing found items, achievements, time in world
- [ ] **SECR-04**: Achievement system with 9 pixel-art badges (Source Diver, Explorer, Night Owl, Old School, etc.)
- [ ] **SECR-05**: Konami code easter egg triggers visual effect and unlocks "Old School" achievement
- [ ] **SECR-06**: Visitor progress persists across sessions via backend API

### Audio & Polish

- [ ] **AUDIO-01**: Ambient background music plays in the game world
- [ ] **AUDIO-02**: Sound effects for door entry, NPC interaction, collectible pickup
- [ ] **AUDIO-03**: Mute/unmute toggle accessible in game UI
- [ ] **AUDIO-04**: Audio respects browser autoplay policies (starts muted, prompt to unmute)

## v2 Requirements

### Secrets Tier 2 (Puzzles)

- **SECR-T2-01**: Locked chest puzzle with clues hidden across three buildings
- **SECR-T2-02**: NPC riddle chain requiring correct talk order
- **SECR-T2-03**: Terminal challenge with programming trivia in Server Shack
- **SECR-T2-04**: Musical stones puzzle near the lake
- **SECR-T2-05**: Dark room navigation puzzle

### Secrets Tier 3 (Grand Easter Egg)

- **SECR-T3-01**: The Creator's Key multi-step quest (git log monument, coordinates, riddle, hidden path, sealed door, Hall of Builders)

### Additional Features

- **V2-01**: Leaderboard showing top explorers by pass label
- **V2-02**: Additional world packs (Space Station, Hogwarts, etc.)
- **V2-03**: Git log monument in town square with real commit messages
- **V2-04**: Hidden cave behind waterfall with retro arcade mini-game
- **V2-05**: Claude's journal (bookshelf in tavern with meta development entries)
- **V2-06**: Dev terminal in Server Shack showing live pm2 status
- **V2-07**: Visitor counter on town square notice board
- **V2-08**: Construction zones for future/WIP projects
- **V2-09**: Birthday theme (confetti on owner's birthday)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Live Claude API calls for NPC dialogue | Cost per visitor, latency, uncontrolled outputs. Pre-written JSON achieves the meta effect. |
| Real-time multiplayer | WebSocket infrastructure on Pi, massive scope increase. Single-player exploration. |
| Combat system | This is a portfolio, not a game. Movement and exploration only. |
| Procedural world generation | Destroys hand-crafted building→app mappings and secrets placement. |
| Character creation/customization | Over-scoped for portfolio. Single avatar is fine. |
| Full inventory system | Over-engineering for collectible code snippets. Simple list panel. |
| OAuth/social login for guests | Guest JWTs are simpler and sufficient for temporary access. |
| Mobile native app | Phaser handles touch natively on mobile web. |
| Phaser 4 migration | RC6 as of Dec 2025, no Angular template, no rex plugin support. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Pending |
| FOUND-02 | Phase 1 | Pending |
| FOUND-03 | Phase 1 | Pending |
| FOUND-04 | Phase 1 | Pending |
| FOUND-05 | Phase 1 | Pending |
| FOUND-06 | Phase 1 | Pending |
| FOUND-07 | Phase 1 | Pending |
| WORLD-01 | Phase 2 | Pending |
| WORLD-02 | Phase 2 | Pending |
| WORLD-03 | Phase 2 | Pending |
| WORLD-04 | Phase 2 | Pending |
| WORLD-05 | Phase 2 | Pending |
| WORLD-06 | Phase 2 | Pending |
| WORLD-07 | Phase 2 | Pending |
| WORLD-08 | Phase 2 | Pending |
| NPC-01 | Phase 3 | Pending |
| NPC-02 | Phase 3 | Pending |
| NPC-03 | Phase 3 | Pending |
| NPC-04 | Phase 3 | Pending |
| NPC-05 | Phase 3 | Pending |
| NPC-06 | Phase 3 | Pending |
| NPC-07 | Phase 3 | Pending |
| BLDG-01 | Phase 4 | Pending |
| BLDG-02 | Phase 4 | Pending |
| BLDG-03 | Phase 4 | Pending |
| BLDG-04 | Phase 4 | Pending |
| BLDG-05 | Phase 4 | Pending |
| BLDG-06 | Phase 4 | Pending |
| PASS-01 | Phase 5 | Pending |
| PASS-02 | Phase 5 | Pending |
| PASS-03 | Phase 5 | Pending |
| PASS-04 | Phase 5 | Pending |
| PASS-05 | Phase 5 | Pending |
| PASS-06 | Phase 5 | Pending |
| PASS-07 | Phase 5 | Pending |
| ENTRY-01 | Phase 6 | Pending |
| ENTRY-02 | Phase 6 | Pending |
| ENTRY-03 | Phase 6 | Pending |
| ENTRY-04 | Phase 6 | Pending |
| ENTRY-05 | Phase 6 | Pending |
| ENTRY-06 | Phase 6 | Pending |
| THEME-01 | Phase 7 | Pending |
| THEME-02 | Phase 7 | Pending |
| THEME-03 | Phase 7 | Pending |
| THEME-04 | Phase 7 | Pending |
| THEME-05 | Phase 7 | Pending |
| SECR-01 | Phase 8 | Pending |
| SECR-02 | Phase 8 | Pending |
| SECR-03 | Phase 8 | Pending |
| SECR-04 | Phase 8 | Pending |
| SECR-05 | Phase 8 | Pending |
| SECR-06 | Phase 8 | Pending |
| AUDIO-01 | Phase 9 | Pending |
| AUDIO-02 | Phase 9 | Pending |
| AUDIO-03 | Phase 9 | Pending |
| AUDIO-04 | Phase 9 | Pending |

**Coverage:**
- v1 requirements: 56 total
- Mapped to phases: 56
- Unmapped: 0

---
*Requirements defined: 2026-02-14*
*Last updated: 2026-02-14 after roadmap creation (9 phases)*
