import Phaser from 'phaser';

export class LoadingScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressBox!: Phaser.GameObjects.Graphics;
  private loadingText!: Phaser.GameObjects.Text;
  private percentText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'LoadingScene' });
  }

  preload(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Progress bar background
    this.progressBox = this.add.graphics();
    this.progressBox.fillStyle(0x222222, 0.8);
    this.progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    // Progress bar fill
    this.progressBar = this.add.graphics();

    this.loadingText = this.add.text(width / 2, height / 2 - 60, 'LOADING...', {
      fontSize: '24px',
      color: '#00ffff',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    this.percentText = this.add.text(width / 2, height / 2, '0%', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      this.progressBar.clear();
      this.progressBar.fillStyle(0x00ffff, 1);
      this.progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
      this.percentText.setText(Math.floor(value * 100) + '%');
    });

    this.load.on('complete', () => {
      this.progressBar.destroy();
      this.progressBox.destroy();
      this.loadingText.destroy();
      this.percentText.destroy();
    });

    // Load all game assets here
    this.load.image('test-tile', '/assets/worlds/village/sprites/test-tile.png');
  }

  create(): void {
    this.scene.start('BootScene');
  }
}
