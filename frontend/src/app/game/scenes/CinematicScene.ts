import * as Phaser from 'phaser';

export class CinematicScene extends Phaser.Scene {
  private fadeOverlay!: Phaser.GameObjects.Rectangle;
  private particles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private typewriterText!: Phaser.GameObjects.Text;
  private enterButton!: Phaser.GameObjects.Container;
  private enterButtonBg!: Phaser.GameObjects.Rectangle;
  private enterButtonText!: Phaser.GameObjects.Text;

  private fullText = 'Built by a human. Powered by Claude. Enter the world.';
  private currentCharIndex = 0;
  private typewriterTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'CinematicScene' });
  }

  preload(): void {
    // Create a simple particle texture programmatically
    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff);
    graphics.fillCircle(4, 4, 4);
    graphics.generateTexture('particle', 8, 8);
    graphics.destroy();
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Create dark background
    this.add.rectangle(0, 0, width, height, 0x0a0a1a).setOrigin(0, 0);

    // Create floating particle effect
    const particles = this.add.particles(0, 0, 'particle', {
      x: { min: 0, max: width },
      y: { min: height, max: height + 50 },
      speedY: { min: -50, max: -30 },
      speedX: { min: -10, max: 10 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 4000,
      frequency: 200,
      tint: [0x00ffff, 0xffffff, 0x4da6ff]
    });

    // Create fade-in overlay
    this.fadeOverlay = this.add.rectangle(0, 0, width, height, 0x000000).setOrigin(0, 0);
    this.fadeOverlay.setAlpha(1);

    // Fade in from black over 2 seconds
    this.tweens.add({
      targets: this.fadeOverlay,
      alpha: 0,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => {
        this.startTypewriter();
      }
    });

    // Create typewriter text (initially empty)
    this.typewriterText = this.add.text(
      width / 2,
      height / 2 - 40,
      '',
      {
        fontSize: '20px',
        color: '#00ffff',
        fontFamily: 'monospace',
        align: 'center',
        wordWrap: { width: width - 100 }
      }
    ).setOrigin(0.5);

    // Handle window resize
    this.scale.on('resize', this.handleResize, this);
  }

  private startTypewriter(): void {
    this.currentCharIndex = 0;
    this.typewriterTimer = this.time.addEvent({
      delay: 50,
      callback: this.revealNextCharacter,
      callbackScope: this,
      repeat: this.fullText.length - 1
    });
  }

  private revealNextCharacter(): void {
    this.currentCharIndex++;
    this.typewriterText.setText(this.fullText.substring(0, this.currentCharIndex));

    // When typewriter completes, wait 1 second then show Enter button
    if (this.currentCharIndex === this.fullText.length) {
      this.time.delayedCall(1000, () => {
        this.showEnterButton();
      });
    }
  }

  private showEnterButton(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Create button container
    this.enterButton = this.add.container(width / 2, height - 100);

    // Button background
    this.enterButtonBg = this.add.rectangle(0, 0, 200, 60, 0x00ffff, 0.2);
    this.enterButtonBg.setStrokeStyle(2, 0x00ffff);

    // Button text
    this.enterButtonText = this.add.text(0, 0, '⏎ ENTER', {
      fontSize: '24px',
      color: '#00ffff',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    this.enterButton.add([this.enterButtonBg, this.enterButtonText]);

    // Make button interactive
    this.enterButtonBg.setInteractive({ useHandCursor: true });

    // Pulse animation
    this.tweens.add({
      targets: this.enterButton,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Hover effects
    this.enterButtonBg.on('pointerover', () => {
      this.enterButtonBg.setFillStyle(0x00ffff, 0.4);
      this.enterButtonText.setScale(1.1);
    });

    this.enterButtonBg.on('pointerout', () => {
      this.enterButtonBg.setFillStyle(0x00ffff, 0.2);
      this.enterButtonText.setScale(1.0);
    });

    // Click handler - transition to DoorScene
    this.enterButtonBg.on('pointerdown', () => {
      this.transitionToDoorScene();
    });
  }

  private transitionToDoorScene(): void {
    // Disable button during transition
    if (this.enterButtonBg) {
      this.enterButtonBg.disableInteractive();
    }

    // Fade to black
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const fadeOut = this.add.rectangle(0, 0, width, height, 0x000000).setOrigin(0, 0);
    fadeOut.setAlpha(0);
    fadeOut.setDepth(1000);

    this.tweens.add({
      targets: fadeOut,
      alpha: 1,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        this.scene.start('DoorScene');
      }
    });
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    // Guard against resize events after scene shutdown
    if (!this.scene || !this.scene.isActive()) return;

    const width = gameSize.width;
    const height = gameSize.height;

    // Reposition elements on resize
    if (this.typewriterText) {
      this.typewriterText.setPosition(width / 2, height / 2 - 40);
    }

    if (this.enterButton) {
      this.enterButton.setPosition(width / 2, height - 100);
    }

    if (this.fadeOverlay) {
      this.fadeOverlay.setSize(width, height);
    }
  }

  shutdown(): void {
    this.scale.off('resize', this.handleResize, this);
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
    }
  }
}
