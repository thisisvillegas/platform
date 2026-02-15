import * as Phaser from 'phaser';

/**
 * Manages the main camera: smooth follow, map-bound clamping, and zoom effects.
 */
export class CameraController {
  private scene: Phaser.Scene;
  private camera: Phaser.Cameras.Scene2D.Camera;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;
  }

  /** Start following a sprite with smooth lerp, clamped to map bounds. */
  startFollow(target: Phaser.Physics.Arcade.Sprite, mapWidth: number, mapHeight: number): void {
    this.camera.setBounds(0, 0, mapWidth, mapHeight);
    this.camera.startFollow(target, true, 0.1, 0.1);
  }

  /** Set camera to 1x zoom (integer zoom avoids tile seam artifacts). */
  playArrivalZoom(): void {
    this.camera.setZoom(1.0);
  }

  /** Set camera zoom immediately. */
  setZoom(zoom: number): void {
    this.camera.setZoom(zoom);
  }

  /** Smoothly tween camera zoom to a target value. */
  tweenZoom(zoom: number, duration = 500): void {
    this.scene.tweens.add({
      targets: this.camera,
      zoom,
      duration,
      ease: 'Cubic.easeOut'
    });
  }
}
