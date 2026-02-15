import * as Phaser from 'phaser';
import { SceneTransition } from '../systems/SceneTransition';

interface InteriorData {
  buildingId: string;
  returnX: number;
  returnY: number;
}

export class InteriorScene extends Phaser.Scene {
  private transition!: SceneTransition;
  private buildingId = '';
  private returnX = 0;
  private returnY = 0;
  private escKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: 'InteriorScene' });
  }

  init(data: InteriorData): void {
    this.buildingId = data.buildingId || 'unknown';
    this.returnX = data.returnX || 0;
    this.returnY = data.returnY || 0;
  }

  create(): void {
    this.transition = new SceneTransition(this);

    this.cameras.main.setBackgroundColor('#111111');

    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    this.add.text(centerX, centerY - 30, `Inside: ${this.buildingId}`, {
      fontSize: '20px',
      color: '#00ffff',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    this.add.text(centerX, centerY + 20, 'Press ESC to exit', {
      fontSize: '14px',
      color: '#888888',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    this.escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    this.transition.fadeIn();
  }

  override update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.transition.transitionTo('OverworldScene', {
        spawnX: this.returnX,
        spawnY: this.returnY
      });
    }
  }
}
