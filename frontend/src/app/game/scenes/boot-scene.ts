import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Placeholder for asset loading in next plan
  }

  create(): void {
    // Test graphics to verify rendering
    const graphics = this.add.graphics();
    graphics.fillStyle(0x00ff00, 1);
    graphics.fillRect(100, 100, 16, 16); // 16x16 pixel test

    this.add.text(400, 300, 'Phaser 3 Running', {
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0.5);
  }
}
