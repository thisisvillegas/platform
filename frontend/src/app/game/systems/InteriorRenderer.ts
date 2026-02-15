import * as Phaser from 'phaser';
import { InteriorConfig } from '../types/WorldPack';

const TILE = 16;

/** Positions and collision data returned after rendering a room. */
export interface RoomLayout {
  /** Top-left corner of the room in canvas pixels. */
  offsetX: number;
  offsetY: number;
  /** Room dimensions in pixels. */
  roomPixelWidth: number;
  roomPixelHeight: number;
  /** Player spawn (just inside exit door, facing up). */
  playerSpawnX: number;
  playerSpawnY: number;
  /** Exit door center (bottom-center gap). */
  exitDoorX: number;
  exitDoorY: number;
  /** NPC world position (from config tileX/tileY, or default). */
  npcX: number;
  npcY: number;
  /** Portal world position (from config, or default). */
  portalX: number;
  portalY: number;
}

/**
 * Draws a themed interior room using Phaser Graphics (no tilemap assets needed).
 *
 * Pattern follows NPCManager: all visuals are programmatic, no external art required.
 * Each building gets a unique color palette (floor, wall, accent) and decorations.
 *
 * Collision uses invisible Phaser Zones with static Arcade physics bodies.
 */
export class InteriorRenderer {
  private scene: Phaser.Scene;
  private wallZones: Phaser.GameObjects.Zone[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Render a complete interior room and return layout positions.
   * Call setupCollision() after creating the player to wire physics.
   */
  renderRoom(config: InteriorConfig, canvasWidth: number, canvasHeight: number): RoomLayout {
    const rw = config.roomWidth * TILE;
    const rh = config.roomHeight * TILE;
    const ox = Math.floor((canvasWidth - rw) / 2);
    const oy = Math.floor((canvasHeight - rh) / 2);

    const floor = hexToNum(config.floorColor);
    const wall = hexToNum(config.wallColor);
    const accent = hexToNum(config.accentColor);

    // Exit gap: 2 tiles wide, centered on bottom wall
    const gapW = 2 * TILE;
    const gapX = ox + Math.floor((rw - gapW) / 2);

    const gfx = this.scene.add.graphics();
    gfx.setDepth(0);

    // ── Void background ───────────────────────
    gfx.fillStyle(0x050508);
    gfx.fillRect(0, 0, canvasWidth, canvasHeight);

    // ── Floor ─────────────────────────────────
    gfx.fillStyle(floor);
    gfx.fillRect(ox + TILE, oy + TILE, rw - 2 * TILE, rh - 2 * TILE);

    // Subtle tile grid (tron-style)
    gfx.lineStyle(1, wall, 0.08);
    for (let tx = 1; tx < config.roomWidth - 1; tx++) {
      gfx.lineBetween(ox + tx * TILE, oy + TILE, ox + tx * TILE, oy + rh - TILE);
    }
    for (let ty = 1; ty < config.roomHeight - 1; ty++) {
      gfx.lineBetween(ox + TILE, oy + ty * TILE, ox + rw - TILE, oy + ty * TILE);
    }

    // ── Walls ─────────────────────────────────
    gfx.fillStyle(wall);
    gfx.fillRect(ox, oy, rw, TILE);                                       // top
    gfx.fillRect(ox, oy, TILE, rh);                                       // left
    gfx.fillRect(ox + rw - TILE, oy, TILE, rh);                           // right
    gfx.fillRect(ox, oy + rh - TILE, gapX - ox, TILE);                    // bottom-left
    gfx.fillRect(gapX + gapW, oy + rh - TILE, (ox + rw) - (gapX + gapW), TILE); // bottom-right

    // Wall inner trim (subtle accent glow on inner edge)
    gfx.lineStyle(1, accent, 0.25);
    gfx.lineBetween(ox + TILE, oy + TILE, ox + rw - TILE, oy + TILE);     // top inner
    gfx.lineBetween(ox + TILE, oy + TILE, ox + TILE, oy + rh - TILE);     // left inner
    gfx.lineBetween(ox + rw - TILE, oy + TILE, ox + rw - TILE, oy + rh - TILE); // right inner

    // ── Exit door highlight ───────────────────
    gfx.fillStyle(accent, 0.12);
    gfx.fillRect(gapX, oy + rh - TILE, gapW, TILE);
    // Doorframe accent lines
    gfx.lineStyle(1, accent, 0.4);
    gfx.lineBetween(gapX, oy + rh - TILE, gapX, oy + rh);
    gfx.lineBetween(gapX + gapW, oy + rh - TILE, gapX + gapW, oy + rh);

    // ── Decorations ───────────────────────────
    this.renderDecorations(gfx, config, ox, oy, accent);

    // ── Wall collision zones ──────────────────
    this.wallZones = [];
    this.addWallZone(ox + rw / 2, oy + TILE / 2, rw, TILE);              // top
    this.addWallZone(ox + TILE / 2, oy + rh / 2, TILE, rh);              // left
    this.addWallZone(ox + rw - TILE / 2, oy + rh / 2, TILE, rh);         // right
    const leftSegW = gapX - ox;
    if (leftSegW > 0) {
      this.addWallZone(ox + leftSegW / 2, oy + rh - TILE / 2, leftSegW, TILE);
    }
    const rightSegStart = gapX + gapW;
    const rightSegW = (ox + rw) - rightSegStart;
    if (rightSegW > 0) {
      this.addWallZone(rightSegStart + rightSegW / 2, oy + rh - TILE / 2, rightSegW, TILE);
    }

    // ── Calculate positions ───────────────────
    const exitDoorX = gapX + gapW / 2;
    const exitDoorY = oy + rh - TILE / 2;
    const npc = config.npc;
    const portal = config.portal;

    return {
      offsetX: ox,
      offsetY: oy,
      roomPixelWidth: rw,
      roomPixelHeight: rh,
      playerSpawnX: exitDoorX,
      playerSpawnY: exitDoorY - TILE,
      exitDoorX,
      exitDoorY,
      npcX: npc ? ox + npc.tileX * TILE + TILE / 2 : ox + 4 * TILE,
      npcY: npc ? oy + npc.tileY * TILE + TILE / 2 : oy + 4 * TILE,
      portalX: portal ? ox + portal.tileX * TILE + TILE / 2 : ox + 9 * TILE,
      portalY: portal ? oy + portal.tileY * TILE + TILE / 2 : oy + 4 * TILE,
    };
  }

  /** Add Arcade physics colliders between the player sprite and all wall zones. */
  setupCollision(player: Phaser.Physics.Arcade.Sprite): void {
    for (const zone of this.wallZones) {
      this.scene.physics.add.collider(player, zone);
    }
  }

  destroy(): void {
    for (const zone of this.wallZones) {
      zone.destroy();
    }
    this.wallZones = [];
  }

  // ── Private helpers ─────────────────────────

  private addWallZone(cx: number, cy: number, w: number, h: number): void {
    const zone = this.scene.add.zone(cx, cy, w, h);
    this.scene.physics.add.existing(zone, true);
    this.wallZones.push(zone);
  }

  private renderDecorations(
    gfx: Phaser.GameObjects.Graphics,
    config: InteriorConfig,
    ox: number,
    oy: number,
    accent: number
  ): void {
    if (!config.decorations) return;

    for (const deco of config.decorations) {
      const x = ox + deco.tileX * TILE;
      const y = oy + deco.tileY * TILE;

      switch (deco.type) {
        case 'table':
          gfx.fillStyle(0x8B4513);
          gfx.fillRect(x + 1, y + 3, TILE * 2 - 2, TILE - 5);
          gfx.lineStyle(1, 0x654321);
          gfx.strokeRect(x + 1, y + 3, TILE * 2 - 2, TILE - 5);
          break;

        case 'bookshelf':
          gfx.fillStyle(0x654321);
          gfx.fillRect(x + 1, y, TILE - 2, TILE * 2);
          gfx.fillStyle(0xcc3333, 0.7);
          gfx.fillRect(x + 3, y + 2, TILE - 6, 3);
          gfx.fillStyle(0x3366cc, 0.7);
          gfx.fillRect(x + 3, y + 7, TILE - 6, 3);
          gfx.fillStyle(0x33aa33, 0.7);
          gfx.fillRect(x + 3, y + 12, TILE - 6, 3);
          break;

        case 'plant':
          gfx.fillStyle(0x8B4513);
          gfx.fillRect(x + 4, y + 9, 8, 7);
          gfx.fillStyle(0x228B22);
          gfx.fillCircle(x + 8, y + 6, 5);
          gfx.fillStyle(0x2da02d);
          gfx.fillCircle(x + 6, y + 4, 3);
          break;

        case 'computer':
        case 'monitor':
          gfx.fillStyle(0x222233);
          gfx.fillRect(x + 2, y + 1, TILE - 4, TILE - 6);
          gfx.fillStyle(accent, 0.5);
          gfx.fillRect(x + 3, y + 2, TILE - 6, TILE - 8);
          gfx.fillStyle(0x444455);
          gfx.fillRect(x + 6, y + TILE - 5, 4, 4);
          break;

        case 'barrel':
          gfx.fillStyle(0x8B6914);
          gfx.fillRect(x + 3, y + 2, TILE - 6, TILE - 4);
          gfx.lineStyle(1, 0x888888, 0.5);
          gfx.lineBetween(x + 3, y + 5, x + TILE - 3, y + 5);
          gfx.lineBetween(x + 3, y + TILE - 5, x + TILE - 3, y + TILE - 5);
          break;

        case 'crate':
          gfx.fillStyle(0x997722);
          gfx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
          gfx.lineStyle(1, 0x664411);
          gfx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
          gfx.lineBetween(x + 2, y + 2, x + TILE - 2, y + TILE - 2);
          gfx.lineBetween(x + TILE - 2, y + 2, x + 2, y + TILE - 2);
          break;

        case 'lamp':
          gfx.fillStyle(accent, 0.15);
          gfx.fillCircle(x + TILE / 2, y + TILE / 2, 14);
          gfx.fillStyle(0xffffcc);
          gfx.fillCircle(x + TILE / 2, y + TILE / 2, 3);
          gfx.fillStyle(accent, 0.8);
          gfx.fillCircle(x + TILE / 2, y + TILE / 2, 2);
          break;

        case 'rug':
          gfx.fillStyle(accent, 0.12);
          gfx.fillRoundedRect(x + 1, y + 1, TILE * 2 - 2, TILE * 2 - 2, 4);
          gfx.lineStyle(1, accent, 0.2);
          gfx.strokeRoundedRect(x + 1, y + 1, TILE * 2 - 2, TILE * 2 - 2, 4);
          break;

        case 'poster':
          gfx.fillStyle(accent, 0.35);
          gfx.fillRect(x + 3, y + 1, TILE - 6, TILE - 2);
          gfx.lineStyle(1, 0xffffff, 0.2);
          gfx.strokeRect(x + 3, y + 1, TILE - 6, TILE - 2);
          break;

        default:
          gfx.fillStyle(accent, 0.2);
          gfx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
      }
    }
  }
}

function hexToNum(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}
