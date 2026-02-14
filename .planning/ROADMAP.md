# Roadmap: Platform Portfolio Overhaul

## Overview

Transform thisisvillegas.com from a private Auth0-gated dashboard into a playable pixel-art portfolio world. Visitors enter via speakeasy door with an access code, explore a Stardew Valley-inspired village where buildings ARE live running apps, interact with a Claude NPC guide, collect code fragment secrets, and experience day/night themes. Nine phases build from technical foundation through game world, interaction systems, access control, and polish -- each delivering a coherent, verifiable capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Bridge** - Phaser 3 running inside Angular with correct lifecycle, rendering, and deployment
- [ ] **Phase 2: Game World** - Explorable village tilemap with player movement, collision, and mobile controls
- [ ] **Phase 3: NPC & Dialogue** - Claude NPC and RPG dialogue system with branching conversations
- [ ] **Phase 4: Building & App Integration** - Buildings connect to live apps with seamless navigation and return
- [ ] **Phase 5: Pass & Guest Auth** - Access code system, guest JWTs, receptionist NPCs, and account lifecycle
- [ ] **Phase 6: Entry Flow** - Cinematic intro sequence and speakeasy door with code validation
- [ ] **Phase 7: Theme Engine** - Day/night cycle and seasonal theme system with dashboard control
- [ ] **Phase 8: Secrets & Achievements** - Collectible code fragments, achievement badges, and progress tracking
- [ ] **Phase 9: Audio & Polish** - Ambient music, sound effects, mute controls, and autoplay handling

## Phase Details

### Phase 1: Foundation & Bridge
**Goal**: Phaser 3 game engine runs reliably inside the Angular app with pixel-perfect rendering, no memory leaks, and a working deployment pipeline
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, FOUND-07
**Success Criteria** (what must be TRUE):
  1. Navigating to /world shows a Phaser canvas with a test tilemap, and navigating away and back 5 times causes no duplicate canvases or memory growth in DevTools
  2. 16x16 pixel tiles render sharp with no blur or anti-aliasing on both standard and Retina displays
  3. Visiting /dashboard does NOT load the Phaser bundle (verified via Network tab -- no phaser chunk appears)
  4. Angular services can send events to Phaser scenes and receive events back (verified with a test button that triggers an in-game visual change)
  5. Running the local build script produces a dist/ that deploys to Pi and serves the game at thisisvillegas.com/world
**Plans**: TBD

Plans:
- [ ] 01-01: TBD
- [ ] 01-02: TBD

### Phase 2: Game World
**Goal**: Visitors can walk through a complete pixel-art village with 10 buildings, proper collision, camera tracking, and mobile touch controls
**Depends on**: Phase 1
**Requirements**: WORLD-01, WORLD-02, WORLD-03, WORLD-04, WORLD-05, WORLD-06, WORLD-07, WORLD-08
**Success Criteria** (what must be TRUE):
  1. Player moves smoothly with WASD/arrow keys and the camera follows without jitter, clamped to world bounds
  2. Player cannot walk through buildings, water, or trees -- collision stops movement at solid boundaries
  3. Walking behind a tree or building edge shows the canopy/roof rendering above the player sprite
  4. On a mobile device (or emulator), a virtual joystick and interaction button appear and control movement
  5. The village tilemap contains 10 distinct buildings and loads from a World Pack JSON file that defines buildings, NPCs, spawn point, and app mappings
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD

### Phase 3: NPC & Dialogue
**Goal**: Visitors can walk up to the Claude NPC and have a branching RPG-style conversation with typewriter text
**Depends on**: Phase 2
**Requirements**: NPC-01, NPC-02, NPC-03, NPC-04, NPC-05, NPC-06, NPC-07
**Success Criteria** (what must be TRUE):
  1. Claude NPC stands in the town square with an idle animation, and walking near it shows "Press SPACE to talk"
  2. Pressing SPACE opens an RPG dialogue box at the bottom of the screen with text appearing character-by-character
  3. Dialogue presents branching choices and the conversation follows the selected path from a JSON dialogue tree
  4. During active dialogue, WASD/arrow keys do NOT move the player -- movement resumes when dialogue ends
  5. Pressing SPACE or ENTER during typewriter effect either instant-completes the current line or advances to next
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: Building & App Integration
**Goal**: Entering a building in the game world navigates to the actual app, and returning drops the visitor back where they were
**Depends on**: Phase 2
**Requirements**: BLDG-01, BLDG-02, BLDG-03, BLDG-04, BLDG-05, BLDG-06
**Success Criteria** (what must be TRUE):
  1. Walking to a building door shows "Press ENTER to enter" and pressing ENTER navigates to the app's Angular route
  2. A floating "Return to World" button is visible on every app page and clicking it returns to the game world
  3. After returning from a building, the player spawns outside the building they entered (not at world spawn point)
  4. The game pauses (not destroys) when inside an app -- returning shows the world exactly as left with no reload
  5. Player position persists in sessionStorage so refreshing an app page still allows returning to the correct world position
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

### Phase 5: Pass & Guest Auth
**Goal**: Owner can create and manage access codes, visitors authenticate with codes to get guest JWTs, and auth-required buildings auto-provision guest accounts
**Depends on**: Phase 3, Phase 4
**Requirements**: PASS-01, PASS-02, PASS-03, PASS-04, PASS-05, PASS-06, PASS-07
**Success Criteria** (what must be TRUE):
  1. Dashboard Pass Manager lets the owner create a pass with label and expiry, and lists all passes with used count and revoke option
  2. POST /api/passes/validate with a valid code returns a guest JWT, and an invalid or expired code returns an error
  3. Guest JWT is stored in localStorage with role:"guest" and the visitor can access the game world across page refreshes until expiry
  4. Entering an auth-required building triggers a receptionist NPC that auto-creates a guest account for that app's backend
  5. Expired passes show an expiry message and redirect the visitor back to the door, and a nightly cron cleans up expired guest accounts
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

### Phase 6: Entry Flow
**Goal**: Visitors experience a cinematic intro at the root URL and enter the world through a speakeasy door that validates their access code
**Depends on**: Phase 5
**Requirements**: ENTRY-01, ENTRY-02, ENTRY-03, ENTRY-04, ENTRY-05, ENTRY-06
**Success Criteria** (what must be TRUE):
  1. Visiting thisisvillegas.com shows a cinematic intro with typewriter text, ambient particles, and a pulsing "Enter" button
  2. The /door route shows a speakeasy-styled keypad where the visitor enters their access code
  3. A wrong code triggers a door rattle animation with shake and denial sound; a correct code triggers a door swing open (RE-style) with fade to black and transition to the game world
  4. Visitors without a code see a clear message explaining how to request access
  5. A "Skip" link is visible for visitors who want direct project list access without playing the game
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD

### Phase 7: Theme Engine
**Goal**: The game world visually adapts to time of day and seasons, controllable from the dashboard
**Depends on**: Phase 2
**Requirements**: THEME-01, THEME-02, THEME-03, THEME-04, THEME-05
**Success Criteria** (what must be TRUE):
  1. Visiting the world at night (based on local time) shows a dark overlay tint that gradually shifts -- no Light2D, no normal maps needed
  2. At night, lamp objects emit visible light cones and window tiles swap to lit variants
  3. The Dashboard World Manager lets the owner toggle between themes or set automatic date-based theme selection
  4. At least one seasonal theme (Valentine's) works end-to-end: hearts particles, pink camera tint, romantic ambient audio, and NPC dialogue overrides
**Plans**: TBD

Plans:
- [ ] 07-01: TBD
- [ ] 07-02: TBD

### Phase 8: Secrets & Achievements
**Goal**: Visitors discover hidden collectibles, earn achievements, and track their exploration progress across sessions
**Depends on**: Phase 2, Phase 5
**Requirements**: SECR-01, SECR-02, SECR-03, SECR-04, SECR-05, SECR-06
**Success Criteria** (what must be TRUE):
  1. 10-15 glowing code fragment collectibles are scattered across the world map, and picking one up reveals a real code snippet with explanation
  2. Pressing Tab opens a collectibles panel showing found items, unlocked achievements, and time spent in the world
  3. 9 pixel-art achievement badges exist and unlock based on specific exploration behaviors (visiting all buildings, finding all fragments, etc.)
  4. Entering the Konami code triggers a visual effect and unlocks the "Old School" achievement
  5. Visitor progress (collectibles, achievements, visited buildings) persists across browser sessions via backend API
**Plans**: TBD

Plans:
- [ ] 08-01: TBD
- [ ] 08-02: TBD

### Phase 9: Audio & Polish
**Goal**: The game world has ambient music and sound effects that respect browser autoplay rules and give visitors full control
**Depends on**: Phase 2
**Requirements**: AUDIO-01, AUDIO-02, AUDIO-03, AUDIO-04
**Success Criteria** (what must be TRUE):
  1. Ambient background music plays while exploring the game world
  2. Distinct sound effects play for door entry, NPC interaction start, and collectible pickup
  3. A mute/unmute toggle is accessible in the game UI at all times
  4. Audio starts muted on first visit (respecting browser autoplay policy) and prompts the visitor to unmute
**Plans**: TBD

Plans:
- [ ] 09-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9

Note: Phases 7, 8, and 9 depend on Phase 2 (not each other) so they could execute in parallel after their dependencies are met. However, Phase 8 also depends on Phase 5 for progress persistence.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Bridge | 0/TBD | Not started | - |
| 2. Game World | 0/TBD | Not started | - |
| 3. NPC & Dialogue | 0/TBD | Not started | - |
| 4. Building & App Integration | 0/TBD | Not started | - |
| 5. Pass & Guest Auth | 0/TBD | Not started | - |
| 6. Entry Flow | 0/TBD | Not started | - |
| 7. Theme Engine | 0/TBD | Not started | - |
| 8. Secrets & Achievements | 0/TBD | Not started | - |
| 9. Audio & Polish | 0/TBD | Not started | - |
