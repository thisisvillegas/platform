import * as Phaser from 'phaser';

export interface PortalConfig {
  x: number;
  y: number;
  label: string;
  glowColor: string;
}

/**
 * Animated portal entity for interior scenes.
 * Renders as concentric glowing rings with a pulsing animation.
 * 2x2 tile visual footprint (~28px diameter).
 */
export class Portal {
  readonly x: number;
  readonly y: number;

  private graphics: Phaser.GameObjects.Graphics;
  private labelText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, config: PortalConfig) {
    this.x = config.x;
    this.y = config.y;

    const color = parseInt(config.glowColor.replace('#', ''), 16);

    // Draw portal rings
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(8);

    // Outer glow
    this.graphics.lineStyle(2, color, 0.3);
    this.graphics.strokeCircle(this.x, this.y, 14);

    // Middle ring
    this.graphics.lineStyle(2, color, 0.5);
    this.graphics.strokeCircle(this.x, this.y, 10);

    // Inner fill
    this.graphics.fillStyle(color, 0.15);
    this.graphics.fillCircle(this.x, this.y, 10);

    // Center bright point
    this.graphics.fillStyle(color, 0.8);
    this.graphics.fillCircle(this.x, this.y, 3);

    // Label above portal
    this.labelText = scene.add.text(this.x, this.y - 22, config.label, {
      fontSize: '9px',
      color: config.glowColor,
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(8);

    // Pulse animation
    scene.tweens.add({
      targets: [this.graphics, this.labelText],
      alpha: { from: 1, to: 0.4 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  destroy(): void {
    this.graphics.destroy();
    this.labelText.destroy();
  }
}
