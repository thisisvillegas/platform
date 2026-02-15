import * as Phaser from 'phaser';

/**
 * Creates a Tiled tilemap from pre-loaded assets and returns all layers
 * as a keyed record for other systems to consume.
 *
 * The scene handles preload() itself — this class only does the create step.
 */
export class WorldLoader {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Build the tilemap and create all tile layers.
   * Assets must already be loaded by the scene's preload().
   *
   * @returns map and layers keyed by Tiled layer name
   */
  createMap(
    mapKey: string,
    tilesetKey: string
  ): { map: Phaser.Tilemaps.Tilemap; layers: Record<string, Phaser.Tilemaps.TilemapLayer> } {
    const map = this.scene.make.tilemap({ key: mapKey });

    const tileset = map.addTilesetImage('village-tileset', tilesetKey);
    if (!tileset) {
      throw new Error('WorldLoader: failed to attach tileset "' + tilesetKey + '"');
    }

    const layers: Record<string, Phaser.Tilemaps.TilemapLayer> = {};

    // Depth ordering: ground=0, collision=1 (invisible), buildings=5, above-player=20
    const layerConfig: { name: string; depth: number; visible?: boolean }[] = [
      { name: 'ground', depth: 0 },
      { name: 'buildings', depth: 5 },
      { name: 'collision', depth: 1, visible: false },
      { name: 'above-player', depth: 20 }
    ];

    for (const cfg of layerConfig) {
      const layer = map.createLayer(cfg.name, tileset);
      if (layer) {
        layer.setDepth(cfg.depth);
        if (cfg.visible === false) {
          layer.setVisible(false);
        }
        layers[cfg.name] = layer;
      }
    }

    return { map, layers };
  }
}
