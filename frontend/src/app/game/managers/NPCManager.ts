import * as Phaser from 'phaser';
import { NPC, NPCConfig } from '../entities/NPC';

/**
 * Loads NPC spawn data from the Tiled object layer, generates placeholder sprites,
 * and manages NPC instances with proximity detection.
 */
export class NPCManager {
  private scene: Phaser.Scene;
  private npcs: Map<string, NPC> = new Map();
  private readonly INTERACTION_RADIUS = 40;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Generate placeholder NPC spritesheets programmatically. */
  preload(): void {
    // NPC colors: each NPC type gets a distinct color
    const npcTypes: { key: string; color: number; accent: number }[] = [
      { key: 'npc-claude', color: 0xd97706, accent: 0xfbbf24 },  // amber/gold for Claude
      { key: 'npc-villager', color: 0x059669, accent: 0x34d399 }, // green for villagers
      { key: 'npc-signpost', color: 0x7c3aed, accent: 0xa78bfa }, // purple for signpost
    ];

    for (const npc of npcTypes) {
      if (!this.scene.textures.exists(npc.key)) {
        this.generateNPCSpritesheet(npc.key, npc.color, npc.accent);
      }
    }
  }

  /** Spawn NPCs from the Tiled object layer. */
  create(tilemap: Phaser.Tilemaps.Tilemap, player: Phaser.Physics.Arcade.Sprite): void {
    const objectLayer = tilemap.getObjectLayer('objects');
    if (!objectLayer) return;

    const npcObjects = objectLayer.objects.filter(obj => obj.type === 'npc');

    for (const obj of npcObjects) {
      if (obj.x == null || obj.y == null) continue;

      const props = this.parseProperties(obj);
      const config: NPCConfig = {
        id: props['id'] ?? obj.name ?? `npc-${obj.id}`,
        name: props['displayName'] ?? obj.name ?? 'NPC',
        x: obj.x,
        y: obj.y,
        spriteKey: props['spriteKey'] ?? 'npc-villager',
        dialogueId: props['dialogueId'] ?? ''
      };

      const npc = new NPC(this.scene, config);
      this.npcs.set(config.id, npc);

      // Collision: player can't walk through NPCs
      this.scene.physics.add.collider(player, npc.sprite);
    }
  }

  /** Find the closest NPC within interaction radius. */
  getClosestNPC(playerX: number, playerY: number): NPC | null {
    let closest: NPC | null = null;
    let closestDist = Infinity;

    for (const npc of this.npcs.values()) {
      const dist = Phaser.Math.Distance.Between(playerX, playerY, npc.x, npc.y);
      if (dist <= this.INTERACTION_RADIUS && dist < closestDist) {
        closest = npc;
        closestDist = dist;
      }
    }

    return closest;
  }

  /** Update all NPCs — face player when nearby. */
  update(playerX: number, playerY: number): void {
    for (const npc of this.npcs.values()) {
      const dist = Phaser.Math.Distance.Between(playerX, playerY, npc.x, npc.y);
      if (dist <= this.INTERACTION_RADIUS * 1.5) {
        npc.facePlayer(playerX);
      }
    }
  }

  destroy(): void {
    for (const npc of this.npcs.values()) {
      npc.destroy();
    }
    this.npcs.clear();
  }

  /** Generate a 4-frame NPC spritesheet (16x16 per frame, 64x16 total). */
  private generateNPCSpritesheet(key: string, bodyColor: number, accentColor: number): void {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 16;
    const ctx = canvas.getContext('2d')!;

    for (let frame = 0; frame < 4; frame++) {
      const ox = frame * 16;
      // Idle animation: slight bob via vertical offset
      const bobY = frame === 1 || frame === 3 ? -1 : 0;

      // Body (hex to rgb)
      const br = (bodyColor >> 16) & 0xff;
      const bg = (bodyColor >> 8) & 0xff;
      const bb = bodyColor & 0xff;
      const ar = (accentColor >> 16) & 0xff;
      const ag = (accentColor >> 8) & 0xff;
      const ab = accentColor & 0xff;

      // Feet (2 pixels at bottom)
      ctx.fillStyle = `rgb(${br},${bg},${bb})`;
      ctx.fillRect(ox + 5, 14 + bobY, 2, 2);
      ctx.fillRect(ox + 9, 14 + bobY, 2, 2);

      // Body (torso rectangle)
      ctx.fillStyle = `rgb(${br},${bg},${bb})`;
      ctx.fillRect(ox + 4, 7 + bobY, 8, 7);

      // Head (rounded)
      ctx.fillStyle = `rgb(${ar},${ag},${ab})`;
      ctx.fillRect(ox + 5, 2 + bobY, 6, 5);

      // Eyes
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ox + 6, 4 + bobY, 1, 1);
      ctx.fillRect(ox + 9, 4 + bobY, 1, 1);

      // Eye pupils — frame 2 looks right, others forward
      ctx.fillStyle = '#000000';
      if (frame === 2) {
        ctx.fillRect(ox + 7, 4 + bobY, 1, 1);
        ctx.fillRect(ox + 10, 4 + bobY, 1, 1);
      } else {
        ctx.fillRect(ox + 6, 4 + bobY, 1, 1);
        ctx.fillRect(ox + 9, 4 + bobY, 1, 1);
      }
    }

    this.scene.textures.addCanvas(key, canvas);
    this.scene.textures.get(key).add(0, 0, 0, 0, 16, 16);
    this.scene.textures.get(key).add(1, 0, 16, 0, 16, 16);
    this.scene.textures.get(key).add(2, 0, 32, 0, 16, 16);
    this.scene.textures.get(key).add(3, 0, 48, 0, 16, 16);
  }

  private parseProperties(obj: Phaser.Types.Tilemaps.TiledObject): Record<string, string> {
    const result: Record<string, string> = {};
    if (!obj.properties) return result;
    const props = obj.properties as Array<{ name: string; value: unknown }>;
    for (const p of props) {
      result[p.name] = String(p.value);
    }
    return result;
  }
}
