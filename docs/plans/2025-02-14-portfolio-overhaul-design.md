# Platform Portfolio Overhaul - Design Document

**Date:** 2025-02-14
**Status:** Approved
**Author:** Andres Villegas + Claude

## Vision

Transform `thisisvillegas.com` from a private Auth0-gated dashboard into a **playable pixel-art world** that showcases every app and project built on the Pi infrastructure. Visitors receive an access code (speakeasy-style), enter a Stardew Valley / Zelda-inspired village, and explore buildings that are live apps. Claude appears as an NPC guide. A Ready Player One-style secrets system rewards deep exploration.

The portfolio IS the proof of concept — it demonstrates what's possible when a developer and Claude collaborate.

## Target Audience

Potential employers, contract leads, and fellow developers. The experience should impress technically while being immediately intuitive for non-technical visitors.

## Architecture

### Two Modes, One App

```
thisisvillegas.com
    │
    ├─► / (default) ──────► Cinematic Intro (animated sequence)
    │                         └── "Enter" → /door
    │
    ├─► /door ────────────► Resident Evil Door (code entry)
    │                         └── Correct code → door swing → /world
    │
    ├─► /world ───────────► Phaser Game World (pixel village)
    │                         ├── Theme engine (day/night, seasonal overlays)
    │                         ├── World Pack system (swappable skins)
    │                         ├── Buildings → app navigation
    │                         ├── Claude NPCs (guide, receptionists)
    │                         ├── Secrets & achievement system
    │                         └── "Return to World" button on all apps
    │
    └─► /dashboard ───────► Existing Angular Dashboard (Auth0, untouched)
          ├── Brain-dump, preferences, server stats (existing)
          ├── World Manager (NEW: theme/world controls)
          └── Pass Manager (NEW: create/revoke access codes)
```

### Tech Stack

- **Game Engine:** Phaser 3 (npm package, runs in Angular component)
- **Angular Integration:** Official Phaser-Angular bridge pattern (`phaser-game.component.ts` with event bus)
- **Map Editor:** Tiled (free, exports JSON consumed by Phaser)
- **Tile Size:** 16x16 pixels
- **Art Assets:** itch.io pixel art tilesets (Stardew Valley style)
- **Frontend:** Angular 19 (existing) + Phaser 3 game module (new)
- **Backend:** Express.js (existing) + new pass/guest/world endpoints
- **Database:** MongoDB (existing) + new collections

### Key Technical Decisions

1. Phaser canvas hosted inside an Angular component — no iframe, direct DOM integration
2. Game module lazy-loaded so `/dashboard` doesn't pay the Phaser bundle cost
3. World Packs are pure data (JSON + images + audio) — engine is world-agnostic
4. Themes are tilemap layer toggles + camera tints + particle emitters — no code changes per theme
5. Pass system issues guest JWTs separate from Auth0 — visitors never touch Auth0
6. All NPC dialogue is pre-written JSON — no live Claude API calls for visitors

## Entry Flow

### Act 1 — Cinematic Intro (`/`)

- Dark screen, ambient sound fades in
- Typewriter text: *"Built by a human. Powered by Claude. Enter the world."*
- Subtle particle effects (floating code snippets, glowing dots)
- Pulsing "Enter" button
- Click transitions to `/door`

### Act 2 — The Door (`/door`)

- Resident Evil-style first-person view of a heavy door
- Code input field styled as a speakeasy keypad/slot
- Wrong code: door rattles, shake animation, denial sound
- Correct code: door swing animation (classic RE camera angle), sound effect
- Fade to black, load Phaser world

### Act 3 — Arrival (`/world`)

- Player avatar spawns at the Entry Gate
- Camera zooms from bird's-eye to game-level view
- Claude NPC nearby with speech bubble: *"Welcome. I'm Claude — I helped build everything you see here. Walk up to any building to explore."*
- Signpost shows controls (arrow keys / WASD / tap to move, Enter/Space to interact)

### No-Code Visitors

- Still see the cinematic intro
- At the door: *"This experience is invite-only. Request access at [email/socials]"*
- Optional "peek through the keyhole" teaser — blurred/limited view of the world

## Game World — The Village (World Pack 1)

### Map Layout

```
    ┌─────────────────────────────────────────────┐
    │              ~ Lake / Pond ~                │
    │                                             │
    │   🏠 Homecontrol    🏪 Brain-Dump Tavern    │
    │      (smart home)      (ideas bar)          │
    │                                             │
    │         ⬦ Path ══════════ Path ⬦            │
    │         ║                      ║            │
    │   🏗️ TactIQal         🌿 Rootine           │
    │    (war room)          (garden/greenhouse)  │
    │         ║                      ║            │
    │         ⬦ Path ══════════ Path ⬦            │
    │                  ║                          │
    │            🏛️ Town Square                    │
    │           (Claude + signpost)               │
    │                  ║                          │
    │         ⬦ Path ══════════ Path ⬦            │
    │         ║                      ║            │
    │   🎬 Media Gallery    🏰 Desaogo            │
    │    (theater/cinema)    (castle/keep)        │
    │                                             │
    │   🐝 Beehive Lab      📡 Server Shack       │
    │    (workshop)          (server stats)       │
    │                  ║                          │
    │            🚪 Entry Gate                     │
    └─────────────────────────────────────────────┘
```

### Building → App Mapping

| Building | App | Auth | Route/URL | Vibe |
|----------|-----|------|-----------|------|
| Town Square | Hub / Claude NPC | None | In-game | Central meeting point |
| Brain-Dump Tavern | Brain Dump | Guest account | `/brain-dump` | Bar where Claude is bartender |
| Smart Home | Homecontrol | Guest account | `homecontrol.thisisvillegas.com` | Cozy house, smart lights glowing |
| War Room | TactIQal | None | `tactiqal.thisisvillegas.com` | Military/tactical building |
| Greenhouse | Rootine | None | `rootine.thisisvillegas.com` | Garden with growing plants |
| Theater | Media Gallery | None | `media.thisisvillegas.com` | Cinema/screening room |
| Castle Keep | Desaogo | Guest session | `desaogo.thisisvillegas.com` | Grand stone building |
| Workshop | Beehive | None (showcase) | In-game panel | Buzzing workshop, sparks |
| Server Shack | Server Stats | None | `/server` | Small hut, blinking lights, antenna |
| About House | Your profile | None | In-game | Resume, contact, socials |

### Tilemap Layers (bottom to top)

1. **Ground** — grass, paths, water, dirt
2. **Buildings** — structures, walls, roofs
3. **Decorations** — trees, fences, flowers, signs
4. **Seasonal overlay** — hearts, snow, pumpkins (toggled by theme)
5. **Collision** — invisible layer defining walkable areas
6. **Above-player** — rooftops, tree canopy (render over player sprite)

## App Integration

### Building Entry Flow

**Path A — No auth needed:**
```
Player enters door zone → interaction prompt ("Press Enter")
→ door animation → navigate to app URL
→ "Return to World" button floats in corner
```

**Path B — Auth required:**
```
Player enters door zone → interaction prompt
→ door animation → interior lobby scene (Phaser)
→ Receptionist NPC: "Let me set you up..."
→ Auto-creates temp guest account via API
→ Receptionist: "You're all set. Head through."
→ inner door animation → navigate to app URL
→ "Return to World" button floats in corner
```

### Return to World

- Persistent floating pixel-art button (top-left corner) on all app pages
- Styled to match game world aesthetic, not the app's UI
- Click → navigates back to `/world`, respawns player outside the building
- Player position saved in sessionStorage so world doesn't reset

### Beehive (Workshop) — Special Case

ESP32/PlatformIO hardware project, not a web app. Building opens an in-game showcase panel: photos of hardware, code snippets, description of the project. No external navigation.

## Claude the Concierge

### Where Claude Appears

- **Town Square** — main NPC, greets player, explains the world, offers tips
- **Inside auth-required buildings** — as the receptionist who sets up guest access
- **Easter egg encounters** — hidden Claude NPCs with unique dialogue

### Dialogue System

- All dialogue pre-written, stored in World Pack JSON (`dialogue/npcs.json`)
- Branching dialogue trees ("Tell me about this app" / "What tech was used?" / "Any secrets here?")
- Classic RPG text box at bottom of screen with typewriter effect
- Claude sprite: pixel-art character (glowing orb, robot bartender, or humanoid — fits world aesthetic)

### Why No Live Claude API

- API costs per visitor add up
- Pre-written dialogue is instant
- Narrative can be crafted exactly as desired
- Meta is already there: Claude built the world AND is a character in it
- Future option: "chat with Claude" terminal as rate-limited easter egg

## Theme & World Engine

### World Pack Structure

```
/assets/worlds/{world-id}/
    ├── manifest.json           ← World metadata, building→app mappings
    ├── tilesets/               ← PNG spritesheets for Tiled
    ├── maps/
    │   ├── overworld.json      ← Tiled export: main map
    │   └── interiors/          ← Building interior maps
    ├── sprites/                ← Player, NPCs, items
    ├── themes/                 ← Theme definition JSONs
    ├── dialogue/               ← NPC dialogue trees
    ├── secrets/                ← Collectibles, puzzles, achievements
    └── audio/                  ← Ambient music, SFX
```

### Theme System

Themes are data, not code. A theme JSON defines:

```json
{
  "id": "valentines",
  "name": "Valentine's Day",
  "palette": { "tint": "#ff69b4", "tintAlpha": 0.08 },
  "particles": { "type": "falling", "sprite": "heart", "density": 15, "speed": 30 },
  "decorationLayer": "valentines-decorations",
  "ambient": "romantic-ambient.mp3",
  "npcDialogueOverrides": { "claude-main": "greeting_valentines" }
}
```

**How themes apply at runtime:**
1. Base tilemap loads
2. Theme JSON loaded (auto by date or manual override from dashboard)
3. Camera pipeline gets color tint
4. Particle emitter spawns weather/effect sprites
5. Decoration tilemap layer toggled visible
6. Ambient audio swapped
7. NPC greetings overridden

**Day/Night (= light/dark mode):**
- Global lighting via Phaser light pipeline
- Lamp objects emit light cones at night
- Window tiles swap to "lit" variants
- Auto based on visitor's local time, or toggle-able

**Planned themes:** day, night, Valentine's, Halloween, Christmas, synthwave

### World Pack Extensibility

The engine is world-agnostic. Swapping worlds = loading a different asset folder. Future packs:
- Space Station, Hogwarts, Wild West, Jurassic, etc.
- Same buildings (your apps), different skin
- Visitors could pick their world or worlds could cycle seasonally

**Dashboard controls:**
- New "World Manager" section in `/dashboard`
- Toggle active theme, override auto-theme
- Select active world pack (future)

## Secrets System (Ready Player One)

### Tier 1 — Collectibles (10-15, easy to find)

Glowing `</>` pixel items scattered around the world. Walk over to collect.
- Each reveals a real code snippet from a project with explanation
- Tracked in session, viewable via Tab key (collectibles panel)
- Collecting all unlocks achievement: *"Source Diver"*

### Tier 2 — Puzzles (5-7, medium difficulty)

| Puzzle | Description |
|--------|-------------|
| Locked Chest | Combination hidden across three buildings as wall sign clues |
| NPC Riddle Chain | Talk to NPCs in right order, each gives clue to next, last reveals hidden area |
| Terminal Challenge | Programming trivia in Server Shack, correct answer reveals secret room |
| Musical Stones | Stepping stones near lake play notes, play them in order from music sheet in a building |
| Dark Room | Building with no lights, navigate by memory or find torch item elsewhere |

### Tier 3 — The Creator's Key (1, multi-step quest)

1. Claude's dialogue contains subtle hint: *"Everything started with a single commit..."*
2. Git log monument has one highlighted commit containing tile coordinates
3. Walking to coordinates reveals invisible interactive tile with a riddle
4. Answer typed into Server Shack terminal reveals hidden path on map
5. Path leads to sealed door with hexagon keyhole (⬡ motif)
6. Behind the door: secret room with personal message, "Hall of Builders" (you + Claude pixel art), project stats (total commits, lines of code), and a recorded achievement

### Achievement System

| ID | Name | Description | Trigger |
|----|------|-------------|---------|
| source_diver | Source Diver | Found all code fragments | All collectibles |
| riddler | Riddler | Solved the NPC riddle chain | Complete chain |
| maestro | Maestro | Played the musical stones | Correct sequence |
| night_owl | Night Owl | Explored the world at night | Visit at night theme |
| konami | Old School | Entered the Konami code | ↑↑↓↓←→←→BA |
| creators_key | The Creator's Key | Found the grand easter egg | Complete quest |
| explorer | Explorer | Visited every building | All buildings entered |
| social | Social Butterfly | Talked to every NPC | All NPCs interacted |
| fearless | Fearless | Navigated the dark room | Complete dark room |

### Visitor Progress

- Each pass-holder gets a profile tracking discoveries
- Press Tab: collectibles found, achievements unlocked, time in world
- Town square leaderboard shows top explorers (by pass label)
- Dashboard shows all visitor progress

### Additional Easter Eggs

- **Git log monument** — stone tablet with real commit messages
- **Hidden cave** — behind waterfall, contains retro arcade mini-game
- **Claude's journal** — bookshelf in tavern with meta development entries
- **Konami code** — visual effect + secret message anywhere in world
- **Dev terminal** — computer in Server Shack showing live `pm2 status`
- **Tech stack signs** — road signs: "Angular 19 →", "Express.js ↓", "MongoDB ←"
- **Visitor counter** — notice board in town square
- **Construction zones** — future/WIP projects as buildings with scaffolding
- **Inspect element joke** — hidden HTML comment for devs who peek
- **Birthday theme** — confetti and cake in tavern on your birthday

## Pass System

### How Passes Work

1. You create a pass from `/dashboard` (label, expiry)
2. Pass stored in MongoDB: `{ code, label, expiresAt, createdAt, usedCount }`
3. You give the code to someone (text, in-person, email)
4. Visitor enters code at the door
5. Backend validates → issues guest JWT with `role: "guest"` and expiry
6. Guest JWT stored in localStorage, checked on protected app routes
7. Expired pass → kicked back to door with message

### Guest Accounts

- Created on-demand when visitor enters an auth-required building
- Receptionist NPC triggers `POST /api/guest/create`
- Temp user in MongoDB with limited permissions
- Auto-expire with the pass
- Cleanup cron deletes expired guest data nightly

## Backend Additions

### New API Endpoints

```
POST   /api/passes              ← Create pass (auth required)
GET    /api/passes              ← List passes (auth required)
DELETE /api/passes/:id          ← Revoke pass (auth required)
POST   /api/passes/validate     ← Validate code, return guest JWT (public)
POST   /api/guest/create        ← Create temp guest account (guest JWT required)
GET    /api/world/theme         ← Get active theme (public)
PUT    /api/world/theme         ← Set active theme (auth required)
GET    /api/world/stats         ← Visitor count, popular buildings (public)
POST   /api/world/progress      ← Save visitor discovery (guest JWT required)
GET    /api/world/progress      ← Get visitor progress (guest JWT required)
GET    /api/world/leaderboard   ← Top explorers (public)
```

### New MongoDB Collections

```
passes:          { code, label, expiresAt, createdAt, usedCount }
guests:          { passCode, createdAt, expiresAt, apps: [] }
worldConfig:     { activeTheme, activeWorld, overrides }
worldStats:      { totalVisitors, buildingVisits: {} }
visitorProgress: { passCode, collectibles: [], achievements: [],
                   buildingsVisited: [], timeSpent, grandEggFound,
                   lastPosition: {x, y}, firstVisit }
```

## Frontend File Structure

```
frontend/src/app/
├── game/                          ← NEW: Phaser game module
│   ├── game.component.ts          ← Angular host for Phaser canvas
│   ├── phaser-bridge.service.ts   ← Angular ↔ Phaser event bus
│   ├── scenes/
│   │   ├── BootScene.ts           ← Asset preloading with progress bar
│   │   ├── CinematicScene.ts      ← Intro sequence
│   │   ├── DoorScene.ts           ← Code entry + door animation
│   │   ├── OverworldScene.ts      ← Main village gameplay
│   │   ├── InteriorScene.ts       ← Building interior lobbies
│   │   └── DialogueScene.ts       ← RPG dialogue overlay
│   ├── systems/
│   │   ├── PlayerController.ts    ← Movement, collision, interaction
│   │   ├── NPCManager.ts         ← NPC spawning, dialogue triggers
│   │   ├── ThemeEngine.ts         ← Theme loading, particles, tints
│   │   ├── WorldLoader.ts        ← World pack loading and parsing
│   │   ├── BuildingManager.ts    ← Door zones, auth checks, navigation
│   │   └── SecretsManager.ts     ← Collectibles, puzzles, achievements
│   └── ui/
│       ├── DialogueBox.ts         ← RPG text box, typewriter effect
│       ├── InteractionPrompt.ts   ← "Press Enter" bubble
│       ├── CollectiblesPanel.ts   ← Tab overlay: progress, achievements
│       └── ReturnButton.ts        ← Floating "Return to World" overlay
├── pages/
│   ├── world-manager/             ← NEW: Theme/world controls
│   └── pass-manager/              ← NEW: Pass CRUD
└── services/
    ├── pass.service.ts            ← NEW: Pass API client
    └── world-config.service.ts    ← NEW: Theme/world API client

frontend/src/assets/worlds/village/  ← World Pack assets
```

## Deployment

- Phaser installed as npm dependency (`npm install phaser`)
- Assets in Angular `assets/` directory, served statically
- Tiled maps designed on Mac, exported as JSON, committed to repo
- No new PM2 processes — runs within existing platform-frontend and platform-api
- Game module lazy-loaded for performance
- Total world pack asset size: ~2-5MB (tilesets, spritesheets, audio)
- Mobile: Phaser touch input native, virtual joystick plugin available

## Asset Sources

- **Tilesets:** itch.io Stardew Valley-style packs (Pix-Quest, sanctumpixel Village, PicoVillage)
- **Map Editor:** Tiled (free, https://www.mapeditor.org)
- **Phaser-Angular Template:** https://github.com/phaserjs/template-angular
- **Audio:** freesound.org ambient tracks + pixel-art SFX packs from itch.io

## Summary

| Component | What |
|-----------|------|
| Cinematic intro | Typewriter text, particles, "Enter" button |
| Speakeasy door | Code entry, RE door swing animation |
| Pixel world | Stardew/Zelda top-down village, Phaser.js |
| Buildings = apps | Walk in, get guest access, use the real app |
| Claude NPCs | Bartender guide, receptionists, pre-written dialogue |
| Theme engine | Day/night, seasonal overlays, swappable world packs |
| Secrets system | Collectibles, puzzles, grand easter egg, achievements |
| Pass system | You generate codes, visitors enter at door, guest JWTs |
| Dashboard | Untouched + new World Manager and Pass Manager |
