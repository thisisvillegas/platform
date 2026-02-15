import * as Phaser from 'phaser';
import { AudioManager } from '../systems/AudioManager';

/**
 * Renders audio mute/unmute controls in the game UI.
 * Shows speaker icon in top-right corner with toggle functionality.
 * Displays "Click to unmute" prompt on first visit for autoplay compliance.
 */
export class AudioControlsUI {
  private scene: Phaser.Scene;
  private audioManager: AudioManager;
  private muteButton!: Phaser.GameObjects.Text;
  private unmutePrompt: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene, audioManager: AudioManager) {
    this.scene = scene;
    this.audioManager = audioManager;
    this.createMuteButton();
    this.createUnmutePrompt();
    this.setupEventListeners();
  }

  /** Create mute/unmute button in top-right corner */
  private createMuteButton(): void {
    const camera = this.scene.cameras.main;
    const padding = 20;

    // Speaker icon: 🔊 when unmuted, 🔇 when muted
    const icon = this.audioManager.getMuted() ? '🔇' : '🔊';

    this.muteButton = this.scene.add.text(
      camera.width - padding,
      padding,
      icon,
      {
        fontSize: '32px',
        color: '#60a5fa',
        fontFamily: 'monospace'
      }
    );

    this.muteButton.setOrigin(1, 0);
    this.muteButton.setScrollFactor(0);
    this.muteButton.setDepth(1000); // Above all game elements
    this.muteButton.setInteractive({ useHandCursor: true });

    // Toggle mute on click
    this.muteButton.on('pointerdown', () => {
      this.audioManager.toggleMute();
      this.hideUnmutePrompt(); // Hide prompt after first interaction
    });

    // Hover effect
    this.muteButton.on('pointerover', () => {
      this.muteButton.setColor('#93c5fd');
    });

    this.muteButton.on('pointerout', () => {
      this.muteButton.setColor('#60a5fa');
    });
  }

  /** Create "Click to unmute" prompt for first-time visitors */
  private createUnmutePrompt(): void {
    if (!this.audioManager.isFirstVisit() || !this.audioManager.getMuted()) {
      return; // Don't show prompt if not first visit or already unmuted
    }

    const camera = this.scene.cameras.main;
    const centerX = camera.width / 2;
    const topY = 60;

    // Background panel
    const bg = this.scene.add.rectangle(0, 0, 280, 60, 0x1e1b4b, 0.95);
    bg.setStrokeStyle(2, 0x60a5fa);

    // Prompt text
    const text = this.scene.add.text(0, 0, '🔊 Click here to unmute', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'monospace',
      align: 'center'
    });
    text.setOrigin(0.5);

    // Arrow pointing to mute button
    const arrow = this.scene.add.text(120, -5, '↗', {
      fontSize: '24px',
      color: '#60a5fa'
    });
    arrow.setOrigin(0.5);

    // Container for all prompt elements
    this.unmutePrompt = this.scene.add.container(centerX, topY, [bg, text, arrow]);
    this.unmutePrompt.setScrollFactor(0);
    this.unmutePrompt.setDepth(999); // Just below mute button
    this.unmutePrompt.setInteractive(
      new Phaser.Geom.Rectangle(-140, -30, 280, 60),
      Phaser.Geom.Rectangle.Contains
    );

    // Make prompt clickable to unmute
    this.unmutePrompt.on('pointerdown', () => {
      if (this.audioManager.getMuted()) {
        this.audioManager.toggleMute();
      }
      this.hideUnmutePrompt();
    });

    // Pulse animation
    this.scene.tweens.add({
      targets: this.unmutePrompt,
      scale: { from: 1, to: 1.05 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  /** Hide the unmute prompt */
  private hideUnmutePrompt(): void {
    if (this.unmutePrompt) {
      this.unmutePrompt.destroy();
      this.unmutePrompt = null;
    }
  }

  /** Listen to audio mute state changes and update button icon */
  private setupEventListeners(): void {
    this.scene.events.on('audio-mute-changed', (isMuted: boolean) => {
      this.muteButton.setText(isMuted ? '🔇' : '🔊');
    });
  }

  /** Update button position if camera size changes (responsive) */
  resize(width: number, height: number): void {
    const padding = 20;
    this.muteButton.setPosition(width - padding, padding);

    if (this.unmutePrompt) {
      this.unmutePrompt.setPosition(width / 2, 60);
    }
  }

  destroy(): void {
    this.muteButton.destroy();
    this.hideUnmutePrompt();
  }
}
