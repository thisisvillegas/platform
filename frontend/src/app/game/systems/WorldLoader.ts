import * as Phaser from 'phaser';

/**
 * Loads a Tiled JSON tilemap, creates all layers, and exposes them for other systems.
 *
 * Lifecycle: construct → preload() → create() → read public layers/helpers
 */
export class WorldLoader {
  private scene: Phaser.Scene;

  public tilemap!: Phaser.Tilemaps.Tilemap;
  public tileset!: Phaser.Tilemaps.Tileset;
  public groundLayer!: Phaser.Tilemaps.TilemapLayer;
  public buildingsLayer: Phaser.Tilemaps.TilemapLayer | null = null;
  public collisionLayer: Phaser.Tilemaps.TilemapLayer | null = null;
  public abovePlayerLayer: Phaser.Tilemaps.TilemapLayer | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Queue tilemap JSON and tileset image for loading. */
  preload(): void {
    this.scene.load.tilemapTiledJSON('village-map', '/assets/worlds/village/maps/village.json');
    this.scene.load.image('village-tileset', '/assets/worlds/village/tilesets/village-tileset.png');
  }

  /** Build tilemap from loaded assets and create all tile layers. */
  create(): void {
    this.tilemap = this.scene.make.tilemap({ key: 'village-map' });

    const tileset = this.tilemap.addTilesetImage('village-tileset', 'village-tileset');
    if (!tileset) {
      console.error('WorldLoader: failed to attach tileset image');
      return;
    }
    this.tileset = tileset;

    // Depth ordering: ground=0, collision=1 (invisible), buildings=5, above-player=20
    this.groundLayer = this.tilemap.createLayer('ground', tileset)!;
    this.groundLayer.setDepth(0);

    this.buildingsLayer = this.tilemap.createLayer('buildings', tileset);
    if (this.buildingsLayer) this.buildingsLayer.setDepth(5);

    this.collisionLayer = this.tilemap.createLayer('collision', tileset);
    if (this.collisionLayer) {
      this.collisionLayer.setDepth(1);
      this.collisionLayer.setVisible(false);
    }

    this.abovePlayerLayer = this.tilemap.createLayer('above-player', tileset);
    if (this.abovePlayerLayer) this.abovePlayerLayer.setDepth(20);
  }

  /** Find the player-spawn point from the objects layer. Falls back to map center. */
  getSpawnPoint(): { x: number; y: number } {
    const objectLayer = this.tilemap.getObjectLayer('objects');
    if (objectLayer) {
      const spawn = objectLayer.objects.find(obj => obj.name === 'player-spawn');
      if (spawn?.x != null && spawn?.y != null) {
        return { x: spawn.x, y: spawn.y };
      }
    }
    return {
      x: this.tilemap.widthInPixels / 2,
      y: this.tilemap.heightInPixels / 2
    };
  }

  /** Find door-zone objects for scene transitions. */
  getDoorZones(): Phaser.Types.Tilemaps.TiledObject[] {
    const objectLayer = this.tilemap.getObjectLayer('objects');
    if (!objectLayer) return [];
    return objectLayer.objects.filter(obj => obj.type === 'door');
  }

  /** Map dimensions in pixels. */
  getMapBounds(): { width: number; height: number } {
    return {
      width: this.tilemap.widthInPixels,
      height: this.tilemap.heightInPixels
    };
  }
}
