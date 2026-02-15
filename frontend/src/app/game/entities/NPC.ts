import * as Phaser from 'phaser';

export interface NPCConfig {
  id: string;
  name: string;
  x: number;
  y: number;
  spriteKey: string;
  dialogueId: string;
}

/**
 * NPC entity with idle animation, physics body, and face-player behavior.
 * Placed in the world from Tiled object layer data.
 */
export class NPC {
  public readonly id: string;
  public readonly name: string;
  public readonly dialogueId: string;
  public sprite: Phaser.Physics.Arcade.Sprite;

  private scene: Phaser.Scene;
  private idleTimer: Phaser.Time.TimerEvent | null = null;
  private facingLeft = false;

  constructor(scene: Phaser.Scene, config: NPCConfig) {
    this.scene = scene;
    this.id = config.id;
    this.name = config.name;
    this.dialogueId = config.dialogueId;

    this.sprite = scene.physics.add.sprite(config.x, config.y, config.spriteKey, 0);
    this.sprite.setDepth(10);
    this.sprite.setImmovable(true);
    (this.sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    this.createAnimations(config.spriteKey);
    this.sprite.anims.play(`${config.spriteKey}-idle`, true);
    this.startIdleBehavior(config.spriteKey);
  }

  /** Flip sprite to face toward the player's x position. */
  facePlayer(playerX: number): void {
    if (playerX < this.sprite.x) {
      this.sprite.setFlipX(true);
      this.facingLeft = true;
    } else {
      this.sprite.setFlipX(false);
      this.facingLeft = false;
    }
  }

  get x(): number { return this.sprite.x; }
  get y(): number { return this.sprite.y; }

  private createAnimations(key: string): void {
    const anims = this.scene.anims;

    // NPC spritesheet: 4 frames in a row (16x16 each)
    // Frame 0: idle base, Frames 1-3: idle variation
    if (!anims.exists(`${key}-idle`)) {
      anims.create({
        key: `${key}-idle`,
        frames: anims.generateFrameNumbers(key, { start: 0, end: 3 }),
        frameRate: 3,
        repeat: -1
      });
    }
  }

  private startIdleBehavior(_key: string): void {
    // Randomly look left/right every 2-5 seconds
    this.scheduleIdleFlip();
  }

  private scheduleIdleFlip(): void {
    this.idleTimer = this.scene.time.delayedCall(
      Phaser.Math.Between(2000, 5000),
      () => {
        this.sprite.setFlipX(!this.sprite.flipX);
        this.scheduleIdleFlip();
      }
    );
  }

  destroy(): void {
    if (this.idleTimer) {
      this.idleTimer.destroy();
      this.idleTimer = null;
    }
    this.sprite.destroy();
  }
}
