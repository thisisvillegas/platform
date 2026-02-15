import * as Phaser from 'phaser';

export class SceneTransition {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private isTransitioning = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  fadeOut(): Promise<void> {
    return new Promise((resolve) => {
      const { width, height } = this.scene.cameras.main;
      this.overlay = this.scene.add.rectangle(
        width / 2, height / 2, width, height, 0x000000
      );
      this.overlay.setDepth(9999);
      this.overlay.setScrollFactor(0);
      this.overlay.setAlpha(0);

      this.scene.tweens.add({
        targets: this.overlay,
        alpha: 1,
        duration: 500,
        ease: 'Power2',
        onComplete: () => resolve()
      });
    });
  }

  fadeIn(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.overlay) {
        const { width, height } = this.scene.cameras.main;
        this.overlay = this.scene.add.rectangle(
          width / 2, height / 2, width, height, 0x000000
        );
        this.overlay.setDepth(9999);
        this.overlay.setScrollFactor(0);
        this.overlay.setAlpha(1);
      }

      this.scene.tweens.add({
        targets: this.overlay,
        alpha: 0,
        duration: 500,
        ease: 'Power2',
        onComplete: () => {
          this.cleanup();
          resolve();
        }
      });
    });
  }

  async transitionTo(targetKey: string, data?: Record<string, unknown>): Promise<void> {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    await this.fadeOut();
    this.scene.scene.start(targetKey, data);
    this.isTransitioning = false;
  }

  private cleanup(): void {
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }
  }
}
