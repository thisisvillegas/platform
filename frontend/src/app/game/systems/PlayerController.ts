import * as Phaser from 'phaser';

/**
 * Manages player sprite, input handling, and walk animations.
 * Desktop-only: WASD + arrow keys, no touch/joystick support.
 *
 * Lifecycle: construct → preload() → create(x, y) → update() each frame
 */
export class PlayerController {
  private scene: Phaser.Scene;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };

  public sprite!: Phaser.Physics.Arcade.Sprite;
  public speed: number;

  constructor(scene: Phaser.Scene, speed = 100) {
    this.scene = scene;
    this.speed = speed;
  }

  /** Queue the player spritesheet for loading. */
  preload(): void {
    this.scene.load.spritesheet('player', '/assets/worlds/village/sprites/player.png', {
      frameWidth: 16,
      frameHeight: 16
    });
  }

  /** Create the player sprite at (x, y), set up animations and input. */
  create(x: number, y: number): void {
    this.sprite = this.scene.physics.add.sprite(x, y, 'player', 0);
    this.sprite.setDepth(10);

    this.createAnimations();
    this.setupInput();
  }

  /** Read input and update velocity + animation each frame. */
  update(): void {
    if (!this.sprite?.body) return;

    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;

    this.sprite.setVelocity(0);

    if (left) {
      this.sprite.setVelocityX(-this.speed);
      this.sprite.anims.play('walk-left', true);
    } else if (right) {
      this.sprite.setVelocityX(this.speed);
      this.sprite.anims.play('walk-right', true);
    } else if (up) {
      this.sprite.setVelocityY(-this.speed);
      this.sprite.anims.play('walk-up', true);
    } else if (down) {
      this.sprite.setVelocityY(this.speed);
      this.sprite.anims.play('walk-down', true);
    } else {
      const anim = this.sprite.anims.currentAnim;
      if (anim) {
        // Extract direction from either "walk-left" or "idle-left"
        const dir = anim.key.split('-').pop();
        this.sprite.anims.play('idle-' + dir, true);
      }
    }

    // Normalize diagonal movement so speed stays consistent
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (body.velocity.x !== 0 && body.velocity.y !== 0) {
      body.velocity.normalize().scale(this.speed);
    }
  }

  private createAnimations(): void {
    const anims = this.scene.anims;

    // Spritesheet: 4 cols x 4 rows (16x16 frames)
    // Row 0: down, Row 1: left, Row 2: right, Row 3: up
    const directions: { name: string; startFrame: number }[] = [
      { name: 'down', startFrame: 0 },
      { name: 'left', startFrame: 4 },
      { name: 'right', startFrame: 8 },
      { name: 'up', startFrame: 12 }
    ];

    for (const dir of directions) {
      if (!anims.exists('walk-' + dir.name)) {
        anims.create({
          key: 'walk-' + dir.name,
          frames: anims.generateFrameNumbers('player', {
            start: dir.startFrame,
            end: dir.startFrame + 3
          }),
          frameRate: 8,
          repeat: -1
        });
      }

      if (!anims.exists('idle-' + dir.name)) {
        anims.create({
          key: 'idle-' + dir.name,
          frames: [{ key: 'player', frame: dir.startFrame }],
          frameRate: 1,
          repeat: 0
        });
      }
    }
  }

  private setupInput(): void {
    const keyboard = this.scene.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.wasd = {
      W: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };
  }
}
