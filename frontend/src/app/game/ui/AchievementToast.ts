import * as Phaser from 'phaser';
import { Achievement } from '../systems/AchievementEngine';

export class AchievementToast {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private queue: Achievement[] = [];
  private isShowing = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  show(achievement: Achievement): void {
    this.queue.push(achievement);
    if (!this.isShowing) {
      this.showNext();
    }
  }

  private showNext(): void {
    if (this.queue.length === 0) {
      this.isShowing = false;
      return;
    }

    this.isShowing = true;
    const achievement = this.queue.shift()!;

    const camera = this.scene.cameras.main;
    const width = camera.width;

    // Create toast container
    this.container = this.scene.add.container(width / 2, -100);
    this.container.setScrollFactor(0);
    this.container.setDepth(3000);

    // Toast background
    const bg = this.scene.add.rectangle(0, 0, 300, 80, 0x1a1a2e, 0.95);
    bg.setStrokeStyle(2, 0xffd700); // Gold border

    // Achievement icon
    const icon = this.scene.add.text(-130, 0, achievement.icon, {
      fontSize: '32px'
    }).setOrigin(0.5);

    // "Achievement Unlocked!" text
    const label = this.scene.add.text(-30, -20, 'ACHIEVEMENT UNLOCKED!', {
      fontSize: '10px',
      color: '#ffd700',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    // Achievement name
    const name = this.scene.add.text(-30, 0, achievement.name, {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    // Achievement description
    const desc = this.scene.add.text(-30, 18, achievement.description, {
      fontSize: '10px',
      color: '#cccccc',
      fontFamily: 'monospace'
    }).setOrigin(0, 0.5);

    this.container.add([bg, icon, label, name, desc]);

    // Slide down animation
    this.scene.tweens.add({
      targets: this.container,
      y: 60,
      duration: 500,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Hold for 4 seconds
        this.scene.time.delayedCall(4000, () => {
          this.hide();
        });
      }
    });
  }

  private hide(): void {
    if (!this.container) return;

    // Slide up and fade out
    this.scene.tweens.add({
      targets: this.container,
      y: -100,
      alpha: 0,
      duration: 400,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.container?.destroy();
        this.container = null;
        this.showNext(); // Show next achievement if queued
      }
    });
  }
}
