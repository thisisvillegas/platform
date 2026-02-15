import * as Phaser from 'phaser';
import { environment } from '../../../environments/environment';

export class DoorScene extends Phaser.Scene {
  private background!: Phaser.GameObjects.Rectangle;
  private doorSprite!: Phaser.GameObjects.Rectangle;
  private metalBands: Phaser.GameObjects.Rectangle[] = [];
  private keypadBg!: Phaser.GameObjects.Rectangle;
  private instructionsText!: Phaser.GameObjects.Text;
  private codeInput: string = '';
  private codeDisplay!: Phaser.GameObjects.Text;
  private errorText!: Phaser.GameObjects.Text;
  private submitButton!: Phaser.GameObjects.Container;
  private needCodeButton!: Phaser.GameObjects.Container;
  private skipLink!: Phaser.GameObjects.Text;
  private helpModal?: Phaser.GameObjects.Container;

  private attemptCount = 0;
  private maxAttempts = 3;
  private rateLimitEndTime = 0;
  private cooldownText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'DoorScene' });
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Dark background
    this.background = this.add.rectangle(0, 0, width, height, 0x0a0a1a).setOrigin(0, 0);

    // Speakeasy door (simplified as a large rectangle)
    this.doorSprite = this.add.rectangle(
      width / 2,
      height / 2 - 50,
      300,
      400,
      0x3d2817
    );
    this.doorSprite.setStrokeStyle(4, 0x2a1810);

    // Door details (metal bands)
    this.metalBands = [
      this.add.rectangle(width / 2, height / 2 - 150, 280, 8, 0x4a4a4a),
      this.add.rectangle(width / 2, height / 2, 280, 8, 0x4a4a4a),
      this.add.rectangle(width / 2, height / 2 + 150, 280, 8, 0x4a4a4a)
    ];

    // Keypad background
    this.keypadBg = this.add.rectangle(width / 2, height / 2 + 50, 260, 120, 0x1a1a2e);
    this.keypadBg.setStrokeStyle(2, 0x00ffff);

    // Code display (masked)
    this.codeDisplay = this.add.text(
      width / 2,
      height / 2 + 20,
      '________',
      {
        fontSize: '28px',
        color: '#00ffff',
        fontFamily: 'monospace'
      }
    ).setOrigin(0.5).setLetterSpacing(8);

    // Instructions — Fix #7: indicate expected code length
    this.instructionsText = this.add.text(
      width / 2,
      height / 2 - 20,
      'ENTER YOUR 8-CHARACTER CODE',
      {
        fontSize: '14px',
        color: '#00ffff',
        fontFamily: 'monospace'
      }
    ).setOrigin(0.5);

    // Error text (hidden initially)
    this.errorText = this.add.text(
      width / 2,
      height / 2 + 130,
      '',
      {
        fontSize: '14px',
        color: '#ff4444',
        fontFamily: 'monospace'
      }
    ).setOrigin(0.5);

    // Submit button
    this.createSubmitButton();

    // "Need a code?" button
    this.createNeedCodeButton();

    // Skip link
    this.createSkipLink();

    // Enable keyboard input
    this.enableKeyboardInput();

    // Handle resize
    this.scale.on('resize', this.handleResize, this);
  }

  private createSubmitButton(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.submitButton = this.add.container(width / 2, height / 2 + 90);

    const bg = this.add.rectangle(0, 0, 120, 40, 0x00ffff, 0.3);
    bg.setStrokeStyle(2, 0x00ffff);

    const text = this.add.text(0, 0, 'SUBMIT', {
      fontSize: '16px',
      color: '#00ffff',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    this.submitButton.add([bg, text]);

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(0x00ffff, 0.5));
    bg.on('pointerout', () => bg.setFillStyle(0x00ffff, 0.3));
    bg.on('pointerdown', () => this.submitCode());
  }

  private createNeedCodeButton(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.needCodeButton = this.add.container(width / 2, height - 80);

    const text = this.add.text(0, 0, 'Need a code?', {
      fontSize: '14px',
      color: '#00ffff',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    const underline = this.add.rectangle(0, 10, text.width, 1, 0x00ffff, 0);

    this.needCodeButton.add([text, underline]);

    text.setInteractive({ useHandCursor: true });
    text.on('pointerover', () => underline.setAlpha(1));
    text.on('pointerout', () => underline.setAlpha(0));
    text.on('pointerdown', () => this.showHelpModal());
  }

  // Fix #3: Skip link — larger font, brighter color
  private createSkipLink(): void {
    const width = this.cameras.main.width;

    this.skipLink = this.add.text(
      width - 20,
      20,
      'Skip to projects →',
      {
        fontSize: '16px',
        color: '#bbbbbb',
        fontFamily: 'monospace'
      }
    ).setOrigin(1, 0);

    this.skipLink.setInteractive({ useHandCursor: true });
    this.skipLink.on('pointerover', () => this.skipLink.setColor('#00ffff'));
    this.skipLink.on('pointerout', () => this.skipLink.setColor('#bbbbbb'));
    this.skipLink.on('pointerdown', () => this.navigateToProjects());
  }

  // Fix #6: Clear error on next keypress instead of auto-clearing on timer
  private enableKeyboardInput(): void {
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (this.helpModal) return; // Ignore input when modal is open

      // Clear error on any keypress
      if (this.errorText.text) {
        this.errorText.setText('');
      }

      if (event.key === 'Backspace') {
        this.codeInput = this.codeInput.slice(0, -1);
        this.updateCodeDisplay();
      } else if (event.key === 'Enter') {
        this.submitCode();
      } else if (event.key.length === 1 && this.codeInput.length < 8) {
        this.codeInput += event.key;
        this.updateCodeDisplay();
      }
    });
  }

  private updateCodeDisplay(): void {
    const masked = '*'.repeat(this.codeInput.length);
    const remaining = '_'.repeat(8 - this.codeInput.length);
    this.codeDisplay.setText(masked + remaining);
  }

  private async submitCode(): Promise<void> {
    // Check rate limit
    const now = Date.now();
    if (now < this.rateLimitEndTime) {
      const remaining = Math.ceil((this.rateLimitEndTime - now) / 1000);
      this.showError(`Too many attempts. Try again in ${remaining}s`);
      return;
    }

    if (this.codeInput.length === 0) {
      this.showError('Please enter a code');
      return;
    }

    // Increment attempt count
    this.attemptCount++;

    try {
      // Call validation API
      const response = await fetch(`${environment.apiUrl}/api/passes/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: this.codeInput })
      });

      const data = await response.json();

      if (response.ok && data.token) {
        // Store JWT and transition to game
        localStorage.setItem('guest_token', data.token);
        this.onValidCode();
      } else {
        this.onInvalidCode(data.message || data.error || 'Invalid code');
      }
    } catch (error) {
      this.showError('Network error. Please try again.');
    }

    // Apply rate limiting after 3 attempts
    if (this.attemptCount >= this.maxAttempts) {
      this.rateLimitEndTime = Date.now() + 30000; // 30 seconds
      this.startCooldownTimer();
    }
  }

  private onValidCode(): void {
    this.errorText.setText('');

    // Fix #5: Play door opening sound with graceful degradation
    try {
      if (this.cache.audio.exists('door-open')) {
        this.sound.play('door-open');
      }
    } catch (_) {
      // Audio not available, continue silently
    }

    // Door swing animation
    this.tweens.add({
      targets: this.doorSprite,
      scaleX: 0.3,
      rotation: -0.5,
      x: this.cameras.main.width / 2 - 100,
      duration: 1500,
      ease: 'Power2'
    });

    // Fade to black and transition
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const fadeOut = this.add.rectangle(0, 0, width, height, 0x000000).setOrigin(0, 0);
    fadeOut.setAlpha(0);
    fadeOut.setDepth(1000);

    // Fix #2: Welcome text — tween alpha from 0 to 1
    const welcomeText = this.add.text(width / 2, height / 2, 'Welcome...', {
      fontSize: '32px',
      color: '#00ffff',
      fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(1001).setAlpha(0);

    this.time.delayedCall(800, () => {
      // Fade in welcome text over the darkening screen
      this.tweens.add({
        targets: welcomeText,
        alpha: 1,
        duration: 800,
        ease: 'Power2'
      });

      // Fade screen to black
      this.tweens.add({
        targets: fadeOut,
        alpha: 1,
        duration: 1000,
        ease: 'Power2',
        onComplete: () => {
          // Let the welcome text linger briefly before transitioning
          this.time.delayedCall(800, () => {
            this.scene.start('LoadingScene');
          });
        }
      });
    });
  }

  private onInvalidCode(errorMessage: string): void {
    this.showError(errorMessage);

    // Door rattle animation
    const originalX = this.doorSprite.x;
    this.tweens.add({
      targets: this.doorSprite,
      x: originalX - 5,
      duration: 50,
      yoyo: true,
      repeat: 5,
      ease: 'Power1'
    });

    // Fix #5: Play denial sound with graceful degradation
    try {
      if (this.cache.audio.exists('door-deny')) {
        this.sound.play('door-deny');
      }
    } catch (_) {
      // Audio not available, continue silently
    }

    // Fix #6: Don't auto-clear input or error — error clears on next keypress
  }

  private showError(message: string): void {
    this.errorText.setText(message);
  }

  private startCooldownTimer(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.cooldownText = this.add.text(
      width / 2,
      height / 2 + 150,
      '',
      {
        fontSize: '14px',
        color: '#ff8800',
        fontFamily: 'monospace'
      }
    ).setOrigin(0.5);

    const updateCooldown = () => {
      const remaining = Math.ceil((this.rateLimitEndTime - Date.now()) / 1000);
      if (remaining <= 0) {
        this.attemptCount = 0;
        this.cooldownText?.destroy();
        this.cooldownText = undefined;
      } else {
        this.cooldownText?.setText(`Cooldown: ${remaining}s`);
        this.time.delayedCall(1000, updateCooldown);
      }
    };

    updateCooldown();
  }

  // Fix #4: Modal with clickable contact links via window.open
  private showHelpModal(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Modal container
    this.helpModal = this.add.container(width / 2, height / 2);
    this.helpModal.setDepth(2000);

    // Backdrop
    const backdrop = this.add.rectangle(0, 0, width, height, 0x000000, 0.8);
    backdrop.setOrigin(0.5);
    backdrop.setInteractive();

    // Modal box
    const modalBg = this.add.rectangle(0, 0, 500, 350, 0x1a1a2e);
    modalBg.setStrokeStyle(3, 0x00ffff);

    // Title
    const title = this.add.text(0, -140, 'THIS EXPERIENCE IS INVITE-ONLY', {
      fontSize: '18px',
      color: '#00ffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Description
    const desc = this.add.text(
      0,
      -80,
      'Request an access code by reaching out:',
      {
        fontSize: '14px',
        color: '#ffffff',
        fontFamily: 'monospace',
        align: 'center',
        wordWrap: { width: 450 }
      }
    ).setOrigin(0.5);

    // Contact links — clickable with window.open
    const contacts = [
      { label: 'Email: andres@thisisvillegas.com', url: 'mailto:andres@thisisvillegas.com' },
      { label: 'LinkedIn: linkedin.com/in/andresvillegas', url: 'https://linkedin.com/in/andresvillegas' },
      { label: 'GitHub: github.com/thisisvillegas', url: 'https://github.com/thisisvillegas' }
    ];

    const contactTexts = contacts.map((contact, i) => {
      const text = this.add.text(0, -20 + (i * 35), contact.label, {
        fontSize: '13px',
        color: '#00ffff',
        fontFamily: 'monospace'
      }).setOrigin(0.5);

      text.setInteractive({ useHandCursor: true });
      text.on('pointerover', () => text.setColor('#ffffff'));
      text.on('pointerout', () => text.setColor('#00ffff'));
      text.on('pointerdown', () => window.open(contact.url, '_blank'));

      return text;
    });

    // Hint text
    const hint = this.add.text(0, 75, '(click to open)', {
      fontSize: '11px',
      color: '#666666',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    // Close button
    const closeBtn = this.add.rectangle(0, 120, 120, 40, 0x00ffff, 0.3);
    closeBtn.setStrokeStyle(2, 0x00ffff);
    const closeBtnText = this.add.text(0, 120, 'CLOSE', {
      fontSize: '16px',
      color: '#00ffff',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerover', () => closeBtn.setFillStyle(0x00ffff, 0.5));
    closeBtn.on('pointerout', () => closeBtn.setFillStyle(0x00ffff, 0.3));
    closeBtn.on('pointerdown', () => this.closeHelpModal());

    // Add all elements to modal
    this.helpModal.add([backdrop, modalBg, title, desc, ...contactTexts, hint, closeBtn, closeBtnText]);
  }

  private closeHelpModal(): void {
    this.helpModal?.destroy();
    this.helpModal = undefined;
  }

  private navigateToProjects(): void {
    // Emit event to Angular to navigate
    const navigateCallback = this.game.registry.get('navigateToProjects');
    if (navigateCallback) {
      navigateCallback();
    } else {
      // Fallback: navigate via window.location
      window.location.href = '/projects';
    }
  }

  // Fix #1: Responsive repositioning on resize (mirrors CinematicScene pattern)
  private handleResize(gameSize: Phaser.Structs.Size): void {
    // Guard against resize events after scene shutdown
    if (!this.scene || !this.scene.isActive()) return;

    const width = gameSize.width;
    const height = gameSize.height;

    if (this.background) {
      this.background.setSize(width, height);
    }

    if (this.doorSprite) {
      this.doorSprite.setPosition(width / 2, height / 2 - 50);
    }

    if (this.metalBands.length === 3) {
      this.metalBands[0].setPosition(width / 2, height / 2 - 150);
      this.metalBands[1].setPosition(width / 2, height / 2);
      this.metalBands[2].setPosition(width / 2, height / 2 + 150);
    }

    if (this.keypadBg) {
      this.keypadBg.setPosition(width / 2, height / 2 + 50);
    }

    if (this.codeDisplay) {
      this.codeDisplay.setPosition(width / 2, height / 2 + 20);
    }

    if (this.instructionsText) {
      this.instructionsText.setPosition(width / 2, height / 2 - 20);
    }

    if (this.errorText) {
      this.errorText.setPosition(width / 2, height / 2 + 130);
    }

    if (this.submitButton) {
      this.submitButton.setPosition(width / 2, height / 2 + 90);
    }

    if (this.needCodeButton) {
      this.needCodeButton.setPosition(width / 2, height - 80);
    }

    if (this.skipLink) {
      this.skipLink.setPosition(width - 20, 20);
    }

    if (this.cooldownText) {
      this.cooldownText.setPosition(width / 2, height / 2 + 150);
    }

    // Close modal on resize to avoid mispositioned overlay
    if (this.helpModal) {
      this.closeHelpModal();
    }
  }

  shutdown(): void {
    this.scale.off('resize', this.handleResize, this);
  }
}
