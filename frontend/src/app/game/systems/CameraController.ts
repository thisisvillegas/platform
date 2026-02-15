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

  /** Cinematic arrival: starts at 1.0x, tweens to 1.5x over 1.5 seconds. */
  playArrivalZoom(): void {
    this.camera.setZoom(1.0);

    this.scene.tweens.add({
      targets: this.camera,
      zoom: 1.5,
      duration: 1500,
      ease: 'Cubic.easeOut'
    });
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
