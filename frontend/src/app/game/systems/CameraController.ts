import * as Phaser from 'phaser';

/**
 * Manages the main camera: smooth follow, map-bound clamping, and zoom effects.
 *
 * Constructed with scene, camera, and target sprite. Starts following immediately.
 */
export class CameraController {
  private scene: Phaser.Scene;
  private camera: Phaser.Cameras.Scene2D.Camera;

  constructor(
    scene: Phaser.Scene,
    camera: Phaser.Cameras.Scene2D.Camera,
    target: Phaser.Physics.Arcade.Sprite
  ) {
    this.scene = scene;
    this.camera = camera;

    // Start smooth follow immediately on construction
    this.camera.startFollow(target, true, 0.1, 0.1);
  }

  /** Clamp camera to the tilemap bounds. */
  setBounds(map: Phaser.Tilemaps.Tilemap): void {
    this.camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
  }

  /** Cinematic arrival: starts at 0.5x, tweens to 2x over 2 seconds. */
  arrivalZoom(): void {
    this.camera.setZoom(0.5);

    this.scene.tweens.add({
      targets: this.camera,
      zoom: 2,
      duration: 2000,
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
