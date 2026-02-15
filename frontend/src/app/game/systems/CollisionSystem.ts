import * as Phaser from 'phaser';

/**
 * Sets up Arcade physics collisions between the player and tilemap layers.
 * Also constrains the player to map world bounds.
 */
export class CollisionSystem {
  private scene: Phaser.Scene;
  private colliders: Phaser.Physics.Arcade.Collider[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Enable collision between the player and a collision tilemap layer.
   * Sets world bounds and marks all non-empty tiles as solid.
   */
  create(
    player: Phaser.Physics.Arcade.Sprite,
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
    mapWidth: number,
    mapHeight: number
  ): void {
    this.scene.physics.world.setBounds(0, 0, mapWidth, mapHeight);
    player.setCollideWorldBounds(true);

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
