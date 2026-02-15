import * as Phaser from 'phaser';

/**
 * Sets up Arcade physics collisions between the player and tilemap layers.
 * Derives world bounds from the collision layer's parent tilemap.
 */
export class CollisionSystem {
  private scene: Phaser.Scene;
  private colliders: Phaser.Physics.Arcade.Collider[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Enable collision between the player and a tilemap collision layer.
   * Automatically sets physics world bounds from the layer's tilemap.
   */
  addCollision(
    player: Phaser.Physics.Arcade.Sprite,
    collisionLayer: Phaser.Tilemaps.TilemapLayer
  ): void {
    const map = collisionLayer.tilemap;

    // Set physics world bounds from the tilemap dimensions
    this.scene.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    player.setCollideWorldBounds(true);

    // Mark all non-empty tiles as solid
    collisionLayer.setCollisionByExclusion([-1, 0]);
    collisionLayer.setVisible(false);

    const collider = this.scene.physics.add.collider(player, collisionLayer);
    this.colliders.push(collider);
  }

  /** Remove all colliders (useful for scene teardown). */
  destroy(): void {
    for (const collider of this.colliders) {
      collider.destroy();
    }
    this.colliders = [];
  }
}
