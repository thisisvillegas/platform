import * as Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Assets loaded in LoadingScene
  }

  create(): void {
    // Display test tile from world pack, scaled up for visibility
    const testTile = this.add.image(400, 300, 'test-tile');
    testTile.setScale(4);

    this.add.text(400, 400, 'Phaser 3 Running - Asset Loaded', {
      fontSize: '24px',
      color: '#00ff00'
    }).setOrigin(0.5);

    // 16x16 pixel test square — should render crisp
    const graphics = this.add.graphics();
    graphics.fillStyle(0xff0000, 1);
    graphics.fillRect(100, 100, 16, 16);
  }
}
