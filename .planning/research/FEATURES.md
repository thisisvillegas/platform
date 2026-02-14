# Feature Research

**Domain:** Interactive pixel-art game-world portfolio (top-down RPG)
**Researched:** 2026-02-14
**Confidence:** MEDIUM-HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features visitors assume exist in any playable game-world experience. Missing these makes the portfolio feel broken or amateur.

#### Core Movement & World

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| WASD + Arrow key movement | Every top-down game uses this; visitors will try these keys immediately | LOW | Phaser Arcade Physics handles velocity. Support both key sets from day one |
| Collision detection | Walking through buildings/water/trees destroys immersion instantly | LOW | Tiled collision layer + Phaser `setCollisionByProperty`. Mark tiles with `collides: true` in Tiled editor |
| Camera follow with smooth lerp | Snapping camera feels jarring; smooth follow is standard in every modern 2D game | LOW | `camera.startFollow(player, true, 0.1, 0.1)`. Set deadzone for breathing room |
| Proper layer rendering (above-player) | Tree canopies and rooftops must render over the player sprite or the world looks flat | MEDIUM | Tilemap layer depth sorting. Layer 6 "above-player" renders at higher depth than player sprite |
| Interaction prompts | Players must know WHEN they can interact. Without prompts, they walk past everything | LOW | "Press Enter" or "E" bubble appears over interactable zones. Phaser overlap detection on door/NPC zones |
| Building door entry | The entire portfolio metaphor breaks if you cannot enter buildings. This is the core mechanic | MEDIUM | Door zones with overlap detection, brief door animation, then Angular route navigation or interior scene transition |
| Loading screen with progress bar | Pixel art assets (tilesets, spritesheets, audio) take time to load. A blank screen = "is it broken?" | LOW | Phaser BootScene with `this.load.on('progress')`. Pixel-art styled progress bar. Show "Loading Village..." text |
| Return to World button | Visitors who navigate to an app MUST be able to get back to the game. No back button = trapped | LOW | Persistent floating pixel-art button on all app routes. Saves player position in sessionStorage for respawn |
| Mobile touch controls | ~60% of web traffic is mobile. A portfolio that only works on desktop loses the majority of visitors | MEDIUM | Virtual joystick plugin (Rex or phaser-vjoy-plugin). Reposition joystick to initial touch point per Brawl Stars pattern. Interaction button in bottom-right |
| Responsive canvas scaling | Game must look correct on phones, tablets, and desktop monitors without manual adjustment | MEDIUM | Phaser `scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }`. Test at common breakpoints |
| Skip/bypass option | Not everyone wants to play a game. Recruiters spend ~15 seconds on portfolios. Respect their time | LOW | Subtle "Skip to projects" link on intro and in-game menu. Links to a clean project list page or opens all buildings as a list overlay |

#### NPC & Dialogue

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| NPC interaction (walk up + press key) | The Claude NPC is a headline feature. If you cannot talk to NPCs, the world feels empty and pointless | MEDIUM | Overlap zone around NPC sprite. Press Enter/Space triggers DialogueScene overlay. NPC faces player on interaction |
| Typewriter text effect | RPG dialogue without typewriter text feels wrong. This is the universal expectation from Zelda, Pokemon, Stardew, etc. | LOW | Character-by-character reveal with configurable speed. Press Enter/Space to instant-complete or advance |
| Dialogue box UI | A proper bottom-of-screen RPG text box with character portrait and name. Floating text above heads is not sufficient for branching dialogue | MEDIUM | Fixed-position DOM overlay or Phaser UI scene. Character portrait on left, name label, text area, choice buttons |
| Branching dialogue choices | "Tell me about this app" / "What tech was used?" / "Any secrets?" -- without choices, dialogue is just a wall of text | MEDIUM | JSON dialogue tree format with `choices[]` arrays pointing to next node IDs. 2-4 choices per branch point |

#### Entry Flow

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Clear entry point | Visitors must immediately understand what to do when they land on the site | LOW | Cinematic intro with clear "Enter" CTA. No ambiguity about where to click |
| Access code validation | The speakeasy metaphor requires the code to actually work. Wrong code must visibly fail, correct code must visibly succeed | MEDIUM | POST to `/api/passes/validate`. Visual feedback: door rattle + shake on failure, door swing animation on success |
| No-code visitor messaging | Visitors without a code should not hit a dead end. They need to know how to get one | LOW | Message at door: "This experience is invite-only. Request access at [contact info]." Link to email/socials |

#### Audio

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Ambient background music | Silent game worlds feel lifeless. Even a simple looping track transforms the experience | LOW | Single ambient loop per world, crossfade on theme change. Keep file size small (OGG/MP3, ~500KB-1MB) |
| Sound effects for interactions | Door opens, dialogue box appears, collectible picked up -- without SFX these feel hollow | LOW | 5-10 short SFX clips. Phaser `this.sound.play('door_open')`. Keep total SFX under 200KB |
| Mute/volume control | Auto-playing audio is hostile. Users MUST be able to silence it, and browsers often block autoplay anyway | LOW | Mute toggle button (visible, not buried). Remember preference in localStorage. Start muted, let user opt in -- or use a "click to enter" gate that satisfies browser autoplay policy |

#### State Persistence

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Player position save | Returning from an app must put you back where you were, not at the spawn point every time | LOW | Save `{x, y}` to sessionStorage on app navigation. Restore on `/world` remount |
| Progress persistence | Collectibles found, buildings visited, achievements earned must survive page refreshes | MEDIUM | localStorage for anonymous/session state. Backend POST to `/api/world/progress` for pass-holders with persistent profiles |

### Differentiators (Competitive Advantage)

Features that make this portfolio memorable and shareable. Not expected, but create the "wow" factor.

#### Theme Engine

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Day/night cycle | Instantly makes the world feel alive and dynamic. Visiting at different times = different experience. Most portfolio sites look identical every visit | MEDIUM | Auto-detect via visitor's local time. Phaser camera tint pipeline for global lighting. Lamp objects emit light cones at night. Window tiles swap to "lit" variants |
| Seasonal themes (Valentine's, Halloween, Christmas) | Repeat visitors see a different world each season. Creates social media shareability ("check out this portfolio's Halloween mode"). No competitor does this | HIGH | Theme JSON defines: camera tint, particle emitter (hearts/snow/pumpkins), decoration layer toggle, ambient audio swap, NPC dialogue overrides. Dashboard controls for manual override |
| Particle weather/effects | Falling hearts, snow, leaves -- adds polish that separates this from a flat tilemap demo | MEDIUM | Phaser particle emitter with falling sprites. Theme JSON configures type/density/speed. Keep sprite count reasonable for Pi performance |

#### Secrets & Achievement System

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Tier 1: Collectible code fragments | Scattered `</>` glowing items revealing real code snippets. Turns passive browsing into active exploration. Visitors WANT to find all of them | MEDIUM | 10-15 items placed in world JSON. Walk-over collection. Each reveals a code snippet modal with syntax highlighting. Track found state in progress |
| Tier 2: Multi-step puzzles | Locked chest, NPC riddle chain, terminal challenge, musical stones, dark room. These are the "I told my friend about this" moments | HIGH | Each puzzle is a custom interaction chain. Must be solvable without external help but require observation and exploration. 5-7 puzzles total |
| Tier 3: The Creator's Key | A grand easter egg hunt spanning the entire world. Inspired by Ready Player One's 3-tier structure (Copper/Jade/Crystal keys). Nobody expects a portfolio to have a meta-quest | HIGH | Multi-step: dialogue hint -> git monument -> hidden tile -> terminal riddle -> secret path -> sealed room with Hall of Builders. This is the crown jewel |
| Achievement system | 9 unlockable achievements with pixel-art badges. Gives exploration a sense of completeness and reward | MEDIUM | Achievement definitions in JSON. Trigger checks in SecretsManager. Toast notification on unlock. Viewable in Tab overlay panel |
| Leaderboard | Top explorers ranked by discoveries. Creates competition among visitors. "I found more than you" | MEDIUM | Backend `/api/world/leaderboard`. Display in town square signboard. Ranked by collectibles + achievements + time |

#### World & Polish

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Speakeasy door entry animation | The Resident Evil door swing is iconic and immediately recognizable. Sets the tone: "this is not a normal portfolio" | HIGH | RE-style first-person door view. Code input as speakeasy keypad. Door swing animation on correct code. Sound design critical here |
| Cinematic intro sequence | Dark screen, typewriter text, floating particles. Creates anticipation before the game world. Film-level pacing for a web portfolio | MEDIUM | Phaser scene or pure Angular/CSS. Typewriter text with ambient sound fade-in. Particle effects (floating code snippets). "Enter" button with pulse animation |
| Claude as NPC guide | The meta-narrative: Claude built the world AND is a character in it. This is the story. No other portfolio has an AI collaborator as an in-world character | MEDIUM | Pixel-art Claude sprite. Pre-written dialogue covering: world explanation, app descriptions, development stories, hints at secrets |
| Receptionist NPCs in auth buildings | Instead of a login form, an NPC "sets you up" with guest access. Transforms a friction point into a narrative moment | MEDIUM | NPC in interior lobby scene. Triggers guest account creation API call during dialogue. "You're all set, head through" -> navigate to app |
| World Pack architecture | Engine is world-agnostic. Different worlds = different asset folders. Future: Space Station, Hogwarts, Wild West skins over the same apps | HIGH | Manifest JSON defines building->app mappings, tileset references, NPC positions, secrets locations. Engine reads manifest, never hardcodes world specifics. This is architecture, not a feature visitors see directly |
| Konami code easter egg | Universal gamer signal. 5 seconds to implement, years of delight. Visitors who try it feel rewarded for being "in the know" | LOW | Listen for arrow key sequence + B + A. Trigger visual effect (screen flash, pixel explosion, secret message). Unlock achievement |
| Git log monument | Stone tablet in-world with real commit messages from the repo. Developers who read it will be delighted | LOW | Fetch real git log at build time (or hardcode notable commits). Display as interactable stone object. One commit contains coordinates for Tier 3 quest |
| Peek through keyhole | No-code visitors get a blurred/limited preview of the world. Teases without giving full access. Creates FOMO that drives code requests | MEDIUM | Render a small viewport of the live world behind a keyhole mask shape. Or a pre-rendered screenshot with blur filter |
| Construction zone buildings | Future/WIP projects shown as buildings with scaffolding and "Coming Soon" signs. Shows the portfolio is alive and growing | LOW | Scaffolding tiles + NPC or sign saying "Under construction." Placeholder buildings for future apps |

#### Portfolio-Specific

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Collectibles panel (Tab key) | Press Tab to see: collectibles found, achievements, buildings visited, time in world. Gamifies the portfolio visit itself | MEDIUM | Phaser UI overlay or DOM overlay. Tabs for collectibles, achievements, stats. Pixel-art styling consistent with world |
| Dev terminal in Server Shack | Computer showing live `pm2 status` from the Pi. Real data from the real server running the portfolio. Meta-level impressive | MEDIUM | Fetch `/api/server/stats` (already exists). Render as retro terminal UI in-game. Green phosphor text on black background |
| About House | Building dedicated to resume, contact info, socials. The "normal portfolio stuff" is inside the game world rather than replacing it | LOW | Interior scene or in-game panel. Links to LinkedIn, GitHub, email. Brief bio text. Downloadable resume link |
| Visitor counter | Notice board in town square showing total visits. Social proof that people actually come here | LOW | Backend counter incremented on world entry. Display on in-game signpost object |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem appealing but create problems disproportionate to their value.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Live Claude API calls for NPC dialogue | "Real AI conversations would be so cool!" | Cost per visitor adds up fast. Response latency breaks RPG pacing. Uncontrolled outputs risk inappropriate content. Narrative cannot be crafted precisely | Pre-written dialogue trees stored in JSON. Instant response. Crafted narrative. The meta is already there: Claude wrote its own dialogue. Future: rate-limited "chat terminal" as easter egg, not main interaction |
| Real-time multiplayer | "Wouldn't it be cool to see other visitors walking around?" | WebSocket infrastructure on a Raspberry Pi with 8GB RAM. State synchronization complexity. Security surface area. Massive scope increase for minimal portfolio value | Visitor counter shows "3 people exploring now." Leaderboard shows other visitors' progress. Social proof without the engineering nightmare |
| Complex combat system | "It's an RPG, so you need enemies and fighting" | This is a portfolio, not a game. Combat distracts from the goal (showcasing apps). Massive scope: health, damage, AI, balancing. Visitors came to see your work, not fight slimes | Movement and exploration only. The "gameplay" is discovery and dialogue. If desired later, a single mini-game in the hidden cave (retro arcade) scratches the itch |
| Procedural world generation | "Generate unique worlds for each visitor" | Destroys the carefully crafted building->app mapping. Makes secrets/puzzles impossible to design. Massive complexity for zero portfolio value | Hand-crafted Tiled map. Every tile placement is intentional. World Pack system provides variety through curated skins, not randomness |
| Custom character creation / avatar picker | "Let visitors design their character" | Scope creep. Asset creation burden (all combinations must look good). Storage complexity. Distraction from the portfolio content itself | Single well-designed player sprite that fits the world. Maybe 2-3 preset color variants selectable at spawn. Keep it simple |
| Full inventory system | "Collectibles should go in an inventory with drag-and-drop" | Over-engineering. This is not an RPG with 200 items. Collectibles are code fragments, not swords and potions | Simple list in the Tab overlay panel. Found/not-found state. Click to re-read the code snippet. No inventory management |
| Multiple world packs in v1 | "Ship Village, Space Station, and Hogwarts at launch" | Each world pack requires: complete tileset, NPC sprites, theme variants, building mapping, testing. One polished world >>> three half-baked ones | Architecture supports it (World Pack JSON + engine separation). Ship Village pack only. Add more packs as post-launch content when the engine is proven |
| OAuth/social login for guests | "Use Google/GitHub login for visitors" | Friction. Visitors do not want to create an account to see a portfolio. Privacy concerns. Integration complexity with Auth0 | Guest JWTs issued on pass validation. Auto-expire. No personal data collected. Zero friction |
| Persistent chat/messaging between visitors | "Let visitors leave messages for each other" | Moderation burden. Spam risk. Storage/cleanup. Legal issues (GDPR). Far outside portfolio scope | One-way guestbook: visitors can leave a short message visible only to you in the dashboard. Or skip entirely |
| Mobile-first design over desktop | "Most traffic is mobile, build for phone first" | The game experience IS the differentiator, and it is fundamentally better with a keyboard. Optimizing everything for mobile-first dilutes the desktop magic | Support mobile with virtual joystick and responsive scaling, but design the primary experience for desktop with keyboard controls. Mobile is "it works" not "it's optimal" |

## Feature Dependencies

```
[Phaser Engine Setup]
    |
    +---> [Tilemap Loading] ---> [Collision Detection] ---> [Player Movement]
    |                                                            |
    |                                                            +---> [Camera Follow]
    |                                                            |
    |                                                            +---> [Interaction Zones]
    |                                                                       |
    |                                                                       +---> [NPC Dialogue System]
    |                                                                       |        |
    |                                                                       |        +---> [Claude NPC]
    |                                                                       |        +---> [Receptionist NPCs]
    |                                                                       |
    |                                                                       +---> [Building Door Entry]
    |                                                                       |        |
    |                                                                       |        +---> [Guest Account Creation]
    |                                                                       |        +---> [Return to World Button]
    |                                                                       |
    |                                                                       +---> [Collectible Pickup]
    |                                                                                |
    |                                                                                +---> [Secrets Tier 1]
    |                                                                                +---> [Secrets Tier 2] (requires Tier 1 patterns)
    |                                                                                +---> [Secrets Tier 3] (requires Tier 1 + Tier 2)
    |
    +---> [Loading Screen / BootScene]
    |
    +---> [Audio System] ---> [Mute Controls]
    |                              |
    |                              +---> [Theme Audio Swap]
    |
    +---> [Theme Engine]
              |
              +---> [Day/Night Cycle]
              +---> [Seasonal Themes]
              +---> [Particle Effects]

[Pass System API]
    |
    +---> [Access Code Validation]
    |        |
    |        +---> [Guest JWT Issuance]
    |                 |
    |                 +---> [Guest Account Creation]
    |                 +---> [Progress Persistence (backend)]
    |                 +---> [Leaderboard]
    |
    +---> [Pass Manager Dashboard]

[Cinematic Intro] ---> [Speakeasy Door] ---> [World Entry]

[Achievement System]
    |
    +--requires---> [Progress Tracking]
    +--requires---> [Secrets System] (achievements are triggered by secret discoveries)
    +--enhances---> [Collectibles Panel]
```

### Dependency Notes

- **Player Movement requires Collision Detection:** Without collision, movement exists but the world is broken (walk through everything). These must ship together.
- **NPC Dialogue requires Interaction Zones:** The prompt/trigger system must exist before dialogue can fire. Build the generic interaction system, then layer dialogue on top.
- **Building Door Entry requires Interaction Zones:** Same interaction system handles doors and NPCs. Build once, use for both.
- **Secrets Tier 2 requires Tier 1 patterns:** Tier 1 establishes the "find and collect" mechanic. Tier 2 builds multi-step versions of it. Do not attempt puzzles before the basic collectible system works.
- **Secrets Tier 3 requires Tier 1 + Tier 2:** The grand quest chains multiple Tier 2 patterns together. It is the capstone, not a parallel track.
- **Theme Engine is independent of gameplay:** Themes modify visuals/audio, not mechanics. Can be built after core gameplay works. Add themes to a playable world, not themes to an empty world.
- **Pass System is independent of game engine:** API endpoints and JWT logic are pure backend. Can be built in parallel with Phaser work. But the door scene CONSUMES the pass API, so the API must exist before the door scene is functional.
- **Cinematic Intro is independent but gates the door:** The intro is pure animation, no game mechanics. Can be built separately. But the user flow is: Intro -> Door -> World, so all three must connect.

## MVP Definition

### Launch With (v1.0 -- "Playable Portfolio")

The minimum experience that delivers the "wow" factor and is usable as an actual portfolio.

- [ ] **Loading screen** -- pixel-art progress bar, sets the tone immediately
- [ ] **Cinematic intro** -- typewriter text, particles, ambient sound, "Enter" button
- [ ] **Speakeasy door** -- code entry, wrong/correct feedback, door animation
- [ ] **Pass system API** -- create, validate, issue guest JWT
- [ ] **Player movement** -- WASD/arrows, collision, camera follow
- [ ] **Tilemap world** -- Village map with 10 buildings, all 6 layers
- [ ] **Building door entry** -- walk up, prompt, enter, navigate to app
- [ ] **Return to World button** -- floating button on all app pages
- [ ] **Claude NPC** -- town square guide with branching dialogue
- [ ] **Dialogue box UI** -- typewriter text, portrait, choices
- [ ] **Ambient music + SFX** -- background loop, door/interaction sounds, mute toggle
- [ ] **Player position save** -- sessionStorage restore on return
- [ ] **Mobile touch controls** -- virtual joystick + interaction button
- [ ] **Skip option** -- link to bypass game for recruiters in a hurry
- [ ] **No-code visitor message** -- clear "request access" messaging at door

### Add After Validation (v1.x -- "Exploration Layer")

Features to add once the core world is stable and visitors are actually using it.

- [ ] **Secrets Tier 1: Collectibles** -- add after confirming the world is explorable and fun to walk around
- [ ] **Collectibles panel (Tab)** -- add alongside collectibles
- [ ] **Day/night cycle** -- add when the base world feels polished; this is pure visual enhancement
- [ ] **Achievement system** -- add alongside or just after collectibles; gives exploration a reward loop
- [ ] **Receptionist NPCs** -- add for auth-required buildings; upgrade from "redirect to login" to narrative flow
- [ ] **Guest account creation** -- backend support for receptionist flow
- [ ] **Progress persistence (backend)** -- save visitor progress to MongoDB for pass-holders
- [ ] **Visitor counter** -- signpost in town square
- [ ] **Git log monument** -- stone tablet with real commits
- [ ] **Konami code** -- 30 minutes of work, permanent delight

### Future Consideration (v2+ -- "Deep Engagement")

Features to defer until the base portfolio is proven and the architecture is stable.

- [ ] **Secrets Tier 2: Puzzles** -- each puzzle is a custom interaction. High effort per puzzle. Add when Tier 1 proves visitors explore deeply
- [ ] **Secrets Tier 3: Creator's Key** -- the grand quest. Only worth building after Tier 1 + 2 exist and visitors are engaged enough to attempt it
- [ ] **Seasonal themes (Valentine's, Halloween, Christmas)** -- build when the theme engine is proven with day/night. Each theme needs assets + testing
- [ ] **Particle weather effects** -- falling hearts/snow/leaves. Polish layer on top of themes
- [ ] **Leaderboard** -- only valuable when enough visitors exist to populate it
- [ ] **World Manager dashboard** -- admin UI for theme control. Until then, set themes via API/config
- [ ] **Pass Manager dashboard** -- admin UI for pass CRUD. Until then, manage via MongoDB directly or API calls
- [ ] **Peek through keyhole** -- nice-to-have for no-code visitors. Not critical for launch
- [ ] **Dev terminal in Server Shack** -- live pm2 status display. Cool but not essential
- [ ] **Hidden cave with retro mini-game** -- scope monster. Defer until boredom strikes
- [ ] **Additional World Packs** -- architecture supports it, but Village must be excellent first
- [ ] **Birthday theme** -- delightful but requires date detection and dedicated assets
- [ ] **Interior scenes for buildings** -- most buildings just navigate to the app URL. Interior lobby scenes only needed for auth-required buildings. Defer non-essential interiors

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Player movement + collision | HIGH | LOW | P1 |
| Tilemap world with buildings | HIGH | MEDIUM | P1 |
| Building door entry + navigation | HIGH | MEDIUM | P1 |
| Cinematic intro | HIGH | MEDIUM | P1 |
| Speakeasy door entry | HIGH | HIGH | P1 |
| Pass system API | HIGH | MEDIUM | P1 |
| Claude NPC + dialogue system | HIGH | MEDIUM | P1 |
| Return to World button | HIGH | LOW | P1 |
| Loading screen | MEDIUM | LOW | P1 |
| Mobile touch controls | MEDIUM | MEDIUM | P1 |
| Skip option for recruiters | MEDIUM | LOW | P1 |
| Ambient audio + mute | MEDIUM | LOW | P1 |
| No-code visitor messaging | MEDIUM | LOW | P1 |
| Tier 1 collectibles | MEDIUM | MEDIUM | P2 |
| Day/night cycle | MEDIUM | MEDIUM | P2 |
| Achievement system | MEDIUM | MEDIUM | P2 |
| Collectibles panel | MEDIUM | MEDIUM | P2 |
| Receptionist NPCs | MEDIUM | MEDIUM | P2 |
| Progress persistence | MEDIUM | MEDIUM | P2 |
| Konami code | LOW | LOW | P2 |
| Git log monument | LOW | LOW | P2 |
| Visitor counter | LOW | LOW | P2 |
| Tier 2 puzzles | MEDIUM | HIGH | P3 |
| Seasonal themes | MEDIUM | HIGH | P3 |
| Tier 3 Creator's Key | MEDIUM | HIGH | P3 |
| Leaderboard | LOW | MEDIUM | P3 |
| Dashboard managers | LOW | MEDIUM | P3 |
| Dev terminal | LOW | MEDIUM | P3 |
| Peek through keyhole | LOW | MEDIUM | P3 |
| Hidden cave mini-game | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch -- the portfolio is not usable without these
- P2: Should have -- adds depth and replay value, build within weeks of launch
- P3: Nice to have -- impressive but not essential, build when the core is solid

## Competitor Feature Analysis

| Feature | Bruno Simon (3D car) | Peter Oravec (8-bit neighborhood) | Sittiphol (pixel side-scroller) | Our Approach |
|---------|---------------------|----------------------------------|-------------------------------|--------------|
| Navigation style | Arrow keys drive a car through 3D world | Arrow keys move 8-bit character through neighborhood | Mouse scroll drives side-scroller | WASD/arrow top-down RPG with mobile virtual joystick |
| Content display | Drive to 3D objects representing projects | Walk through buildings/landmarks | Scroll past landmarks | Enter buildings that ARE the real running apps |
| Audio | Sound effects | Background music | Background music | Ambient music + SFX + mute control |
| Interactivity depth | Drive around, bump into things | Walk around, visual exploration | Passive scroll | NPC dialogue, collectibles, secrets, puzzles, achievements |
| Framework | Three.js (3D) | Custom HTML5 Canvas | Custom canvas | Phaser 3 (purpose-built game engine) |
| Mobile support | Limited | Limited | Mouse scroll works | Virtual joystick, responsive scaling |
| Theming | Static | Static | Static | Day/night + seasonal + World Pack system |
| Replay value | Low (one visit) | Low (one visit) | Low (one visit) | High (secrets, achievements, seasonal changes) |
| Real app integration | Links to projects | Links to projects | Links to projects | Buildings ARE live apps. Visitors get guest access and actually use them |
| Secret content | None | None | None | 3-tier secrets system, achievements, grand easter egg |

**Key differentiator:** No existing interactive portfolio integrates live running applications as game-world buildings. They all link OUT to projects. This portfolio links INTO them, with in-world guest account creation. The secrets/achievement system creates replay value that no competitor offers.

## Sources

- [Bruno Simon interactive portfolio](https://bruno-simon.com/) -- MEDIUM confidence (community-referenced, verified via multiple sources)
- [Sittiphol pixel art interactive profile](https://medium.com/@nuuneoi/the-making-of-my-own-pixel-art-interactive-profile-e8bcafef445d) -- MEDIUM confidence (100k visitors, multiple job offers reported)
- [Phaser.io official docs - Camera](https://docs.phaser.io/phaser/concepts/cameras) -- HIGH confidence (official documentation)
- [Phaser Rex Virtual Joystick Plugin](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/virtualjoystick/) -- HIGH confidence (established Phaser plugin ecosystem)
- [GameDeveloper.com - Achievement System Design](https://www.gamedeveloper.com/design/designing-and-building-a-robust-comprehensive-achievement-system) -- MEDIUM confidence (industry publication)
- [Ready Player One Wiki - Easter Egg Hunt structure](https://readyplayerone.fandom.com/wiki/Halliday's_Easter_Egg_Hunt) -- HIGH confidence (canonical source for 3-tier hunt design)
- [Playable Interactive Websites roundup](https://qodeinteractive.com/magazine/playable-interactive-websites/) -- MEDIUM confidence (curated list, multiple examples verified)
- [MDN - Mobile touch controls for games](https://developer.mozilla.org/en-US/docs/Games/Techniques/Control_mechanisms/Mobile_touch) -- HIGH confidence (Mozilla official docs)
- [OnePageLove - Pixel art website examples](https://onepagelove.com/tag/pixel-art) -- MEDIUM confidence (curated design gallery)
- [Hakia - Building a Portfolio That Gets Hired 2025](https://www.hakia.com/skills/building-portfolio/) -- MEDIUM confidence (employer perspective, verified with multiple hiring sources)
- [Pesto Tech - What Recruiters Look For](https://pesto.tech/resources/what-recruiters-look-for-in-developer-portfolios) -- MEDIUM confidence (recruiter perspective)
- [Gamedev.js - localStorage for game progress](https://gamedevjs.com/articles/using-local-storage-for-high-scores-and-game-progress/) -- MEDIUM confidence (game dev community resource)
- [Wix - Website Gamification Guide](https://www.wix.com/studio/blog/website-gamification) -- MEDIUM confidence (web design resource)
- [GameDev Academy - Phaser 3 Loading Screen](https://gamedevacademy.org/creating-a-preloading-screen-in-phaser-3/) -- MEDIUM confidence (tutorial verified against Phaser docs)

---
*Feature research for: Interactive pixel-art game-world portfolio*
*Researched: 2026-02-14*
