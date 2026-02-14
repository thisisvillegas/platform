# Platform Portfolio Overhaul

## What This Is

A playable pixel-art portfolio built with Phaser 3 inside the existing Angular 19 app at `thisisvillegas.com`. Visitors receive an access code (speakeasy-style), enter a Stardew Valley / Zelda-inspired village, and explore buildings that are live apps running on a Raspberry Pi. Claude appears as an NPC guide. A Ready Player One secrets system rewards deep exploration. The portfolio IS the proof of concept — it demonstrates what's possible when a developer and Claude collaborate.

## Core Value

When someone visits `thisisvillegas.com` with an access code, they experience an immediately impressive, playable pixel-art world that showcases real working apps — proving both technical skill and creative vision to potential employers and collaborators.

## Requirements

### Validated

- ✓ Angular 19 standalone component architecture — existing
- ✓ Express.js backend with MongoDB — existing
- ✓ Auth0 authentication for dashboard — existing
- ✓ Lazy-loaded route structure — existing
- ✓ Brain-Dump app with Claude AI integration — existing
- ✓ Homecontrol home automation app — existing
- ✓ Rootine routine management app — existing
- ✓ TactIQal tactical planning app — existing
- ✓ Server stats overlay with live Pi metrics — existing
- ✓ GIF gallery (gifgal) — existing
- ✓ PM2 process management on Pi — existing
- ✓ Cloudflare Tunnel routing — existing
- ✓ SCSS styling with sci-fi aesthetic — existing

### Active

- [ ] Cinematic intro sequence at `/` (typewriter text, particles, ambient sound)
- [ ] Speakeasy door at `/door` (code entry, RE-style door swing animation)
- [ ] Phaser 3 game world at `/world` (top-down pixel village)
- [ ] Village world pack with 10 buildings mapped to apps
- [ ] Player avatar with WASD/arrow movement and collision
- [ ] Claude NPC bartender/guide in town square with dialogue system
- [ ] Receptionist NPCs in auth-required buildings
- [ ] RPG dialogue box system with typewriter effect and branching trees
- [ ] Pass system (create/validate access codes, guest JWTs)
- [ ] Guest account auto-creation for auth-required apps
- [ ] Building entry flow (door zones, interaction prompts, navigation to apps)
- [ ] "Return to World" floating button on all app pages
- [ ] Theme engine (day/night based on local time, seasonal overlays)
- [ ] World Pack data structure (JSON + assets, engine is world-agnostic)
- [ ] Secrets: Tier 1 collectibles (10-15 code fragments)
- [ ] Secrets: Tier 2 puzzles (5-7 multi-step challenges)
- [ ] Secrets: Tier 3 The Creator's Key grand easter egg
- [ ] Achievement system with 9 achievements
- [ ] Visitor progress tracking (collectibles, achievements, time, position)
- [ ] Leaderboard for top explorers
- [ ] Dashboard: World Manager (theme/world controls)
- [ ] Dashboard: Pass Manager (create/revoke access codes)
- [ ] Tiled tilemap with 6 layers (ground, buildings, decorations, seasonal, collision, above-player)

### Out of Scope

- Live Claude API calls for visitor dialogue — cost prohibitive, pre-written dialogue achieves the meta effect
- Mobile native app — Phaser touch input handles mobile web natively
- Multiple world packs — architecture supports it but only Village pack for v1
- Real-time multiplayer — single-player exploration, no WebSocket needed
- Custom sprite editor — use existing itch.io pixel art packs
- Payment/subscription for passes — passes are free, manually distributed
- OAuth/social login for guests — guest JWTs are simpler and sufficient

## Context

**Existing infrastructure:** Full-stack Angular 19 + Express.js app running on Raspberry Pi 4 (8GB RAM, Debian 13). 9 PM2 processes serving multiple apps through Cloudflare Tunnel. MongoDB Atlas for data. Auth0 for dashboard authentication.

**Current state:** `thisisvillegas.com` is a private Auth0-gated dashboard. Only authenticated users see anything. Goal is to make the public-facing experience a portfolio that wows visitors.

**Development workflow:** Develop locally on Mac, deploy to Pi via git push + rebuild. Local clone at `/Users/andres/dev/platform/`, Pi deployment at `/home/remus/apps/platform/`.

**Target audience:** Potential employers, contract leads, fellow developers. Should impress technically while being intuitive for non-technical visitors.

**Design document:** Full spec at `docs/plans/2025-02-14-portfolio-overhaul-design.md`.

**Notion board:** 11 epics with stories and tasks created in Notion for project tracking.

## Constraints

- **Hosting:** Raspberry Pi 4 — limited resources, asset sizes must stay reasonable (~2-5MB total world pack)
- **Tech stack:** Must integrate with existing Angular 19 + Express.js + MongoDB — no framework migration
- **Auth:** Auth0 stays for dashboard, guest JWTs are separate system for world visitors
- **Game engine:** Phaser 3 hosted inside Angular component — no iframe, direct DOM integration
- **Assets:** 16x16 pixel tiles, Tiled map editor exports JSON, itch.io art packs
- **Cost:** No per-visitor API costs (no live Claude calls), free tier services where possible
- **Performance:** Game module lazy-loaded so `/dashboard` doesn't pay Phaser bundle cost

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Phaser 3 for game engine | Official Angular template exists, 2D pixel art focus, large ecosystem, web-native | — Pending |
| Pre-written NPC dialogue (no live Claude API) | Cost control, instant response, narrative craftsmanship, meta already achieved | — Pending |
| Guest JWTs separate from Auth0 | Visitors never touch Auth0, simpler flow, auto-expiring | — Pending |
| World Pack as pure data (JSON + assets) | Engine stays world-agnostic, future worlds just need new asset folders | — Pending |
| Themes as tilemap layer toggles + camera tints | No code changes per theme, data-driven, dashboard controllable | — Pending |
| Tiled for map editing | Free, industry standard, exports Phaser-compatible JSON | — Pending |
| Develop locally on Mac, deploy to Pi | Faster iteration, Pi is production only | — Pending |

---
*Last updated: 2026-02-14 after initialization*
