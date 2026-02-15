import * as Phaser from 'phaser';

export interface DialogueChoice {
  text: string;
  nextNodeId: string;
}

/**
 * RPG-style dialogue box rendered at the bottom of the screen.
 * Supports typewriter text, multi-page dialogue, and branching choices.
 *
 * Uses camera scrollFactor(0) so it stays fixed on screen.
 * Input: SPACE/ENTER to advance or instant-complete text.
 * Choices: arrow keys or number keys (1-4) to select.
 */
export class DialogueBox {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Rectangle;
  private border: Phaser.GameObjects.Rectangle;
  private nameText: Phaser.GameObjects.Text;
  private bodyText: Phaser.GameObjects.Text;
  private continueIndicator: Phaser.GameObjects.Text;
  private pageIndicator: Phaser.GameObjects.Text;

  // Choice UI
  private choiceTexts: Phaser.GameObjects.Text[] = [];
  private selectedChoiceIndex = 0;
  private choices: DialogueChoice[] = [];

  // Typewriter state
  private fullText = '';
  private revealedCount = 0;
  private typewriterTimer: Phaser.Time.TimerEvent | null = null;
  private readonly CHAR_DELAY = 30;

  // Multi-page state
  private pages: string[] = [];
  private currentPageIndex = 0;

  // Input (manual edge detection)
  private spaceKey: Phaser.Input.Keyboard.Key;
  private enterKey: Phaser.Input.Keyboard.Key;
  private upKey: Phaser.Input.Keyboard.Key;
  private downKey: Phaser.Input.Keyboard.Key;
  private key1: Phaser.Input.Keyboard.Key;
  private key2: Phaser.Input.Keyboard.Key;
  private key3: Phaser.Input.Keyboard.Key;
  private key4: Phaser.Input.Keyboard.Key;
  private escKey: Phaser.Input.Keyboard.Key;
  private spaceWasDown = false;
  private enterWasDown = false;
  private upWasDown = false;
  private downWasDown = false;

  // State
  private isVisible = false;
  private isTextComplete = false;
  private isShowingChoices = false;

  // Callbacks
  private onComplete: (() => void) | null = null;
  private onChoiceSelected: ((choice: DialogueChoice) => void) | null = null;

  // Dimensions
  private readonly BOX_HEIGHT = 120;
  private readonly PADDING = 12;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const cam = scene.cameras.main;
    const boxY = cam.height - this.BOX_HEIGHT;

    // Border (slightly larger, lighter)
    this.border = scene.add.rectangle(
      cam.width / 2, boxY + this.BOX_HEIGHT / 2,
      cam.width - 16, this.BOX_HEIGHT - 4,
      0x444466
    );
    this.border.setStrokeStyle(2, 0x8888aa);

    // Background
    this.background = scene.add.rectangle(
      cam.width / 2, boxY + this.BOX_HEIGHT / 2,
      cam.width - 20, this.BOX_HEIGHT - 8,
      0x111122, 0.92
    );

    // NPC name label
    this.nameText = scene.add.text(16, boxY + 6, '', {
      fontSize: '12px',
      color: '#fbbf24',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    });

    // Body text
    this.bodyText = scene.add.text(16, boxY + 24, '', {
      fontSize: '11px',
      color: '#e0e0e0',
      fontFamily: 'monospace',
      wordWrap: { width: cam.width - 48 },
      lineSpacing: 4
    });

    // Continue indicator
    this.continueIndicator = scene.add.text(
      cam.width - 24, boxY + this.BOX_HEIGHT - 18,
      '▼', { fontSize: '12px', color: '#8888aa', fontFamily: 'monospace' }
    );

    // Page indicator
    this.pageIndicator = scene.add.text(
      cam.width - 60, boxY + 6,
      '', { fontSize: '10px', color: '#666688', fontFamily: 'monospace' }
    );

    // Build container
    this.container = scene.add.container(0, 0, [
      this.border,
      this.background,
      this.nameText,
      this.bodyText,
      this.continueIndicator,
      this.pageIndicator
    ]);
    this.container.setDepth(200);
    this.container.setScrollFactor(0);
    this.container.setVisible(false);

    // Input keys
    const kb = scene.input.keyboard!;
    this.spaceKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.enterKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.upKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.downKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.key1 = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    this.key2 = kb.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    this.key3 = kb.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);
    this.key4 = kb.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR);
    this.escKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  /** Show dialogue with text pages and optional speaker name. */
  show(
    text: string | string[],
    npcName: string,
    onComplete: () => void,
    choices?: DialogueChoice[],
    onChoiceSelected?: (choice: DialogueChoice) => void
  ): void {
    this.pages = Array.isArray(text) ? text : [text];
    this.currentPageIndex = 0;
    this.onComplete = onComplete;
    this.onChoiceSelected = onChoiceSelected ?? null;
    this.choices = choices ?? [];

    this.nameText.setText(npcName);
    this.updatePageIndicator();
    this.container.setVisible(true);
    this.isVisible = true;

    // Reset key state to avoid instant-trigger from the key that opened dialogue
    this.spaceWasDown = true;
    this.enterWasDown = true;

    this.showCurrentPage();
  }

  /** Hide the dialogue box. */
  hide(): void {
    this.stopTypewriter();
    this.clearChoices();
    this.container.setVisible(false);
    this.isVisible = false;
    this.pages = [];
    this.choices = [];
    this.onComplete = null;
    this.onChoiceSelected = null;
  }

  get visible(): boolean {
    return this.isVisible;
  }

  /** Must be called in scene update(). Handles input. */
  update(): void {
    if (!this.isVisible) return;

    const spacePressed = this.spaceKey.isDown && !this.spaceWasDown;
    const enterPressed = this.enterKey.isDown && !this.enterWasDown;
    const upPressed = this.upKey.isDown && !this.upWasDown;
    const downPressed = this.downKey.isDown && !this.downWasDown;
    this.spaceWasDown = this.spaceKey.isDown;
    this.enterWasDown = this.enterKey.isDown;
    this.upWasDown = this.upKey.isDown;
    this.downWasDown = this.downKey.isDown;

    const advance = spacePressed || enterPressed;

    // ESC closes dialogue immediately
    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.hide();
      if (this.onComplete) this.onComplete();
      return;
    }

    if (this.isShowingChoices) {
      this.handleChoiceInput(advance, upPressed, downPressed);
      return;
    }

    if (advance) {
      if (!this.isTextComplete) {
        // Instant-complete current text
        this.instantComplete();
      } else {
        // Advance to next page
        this.advancePage();
      }
    }
  }

  // --- Private methods ---

  private showCurrentPage(): void {
    const text = this.pages[this.currentPageIndex];
    this.fullText = text;
    this.revealedCount = 0;
    this.isTextComplete = false;
    this.isShowingChoices = false;
    this.bodyText.setText('');
    this.continueIndicator.setVisible(false);
    this.clearChoices();
    this.updatePageIndicator();
    this.startTypewriter();
  }

  private startTypewriter(): void {
    this.stopTypewriter();
    this.typewriterTimer = this.scene.time.addEvent({
      delay: this.CHAR_DELAY,
      callback: () => {
        this.revealedCount++;
        this.bodyText.setText(this.fullText.substring(0, this.revealedCount));
        if (this.revealedCount >= this.fullText.length) {
          this.onTextFinished();
        }
      },
      repeat: this.fullText.length - 1
    });
  }

  private stopTypewriter(): void {
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
      this.typewriterTimer = null;
    }
  }

  private instantComplete(): void {
    this.stopTypewriter();
    this.revealedCount = this.fullText.length;
    this.bodyText.setText(this.fullText);
    this.onTextFinished();
  }

  private onTextFinished(): void {
    this.stopTypewriter();
    this.isTextComplete = true;

    const isLastPage = this.currentPageIndex >= this.pages.length - 1;

    // Show choices on last page if we have them
    if (isLastPage && this.choices.length > 0) {
      this.showChoices();
    } else {
      this.continueIndicator.setVisible(true);
      // Pulse the continue indicator
      this.scene.tweens.add({
        targets: this.continueIndicator,
        alpha: { from: 1, to: 0.3 },
        duration: 600,
        yoyo: true,
        repeat: -1
      });
    }
  }

  private advancePage(): void {
    this.currentPageIndex++;
    if (this.currentPageIndex < this.pages.length) {
      this.showCurrentPage();
    } else {
      // Dialogue complete
      const cb = this.onComplete;
      this.hide();
      if (cb) cb();
    }
  }

  private showChoices(): void {
    this.isShowingChoices = true;
    this.selectedChoiceIndex = 0;
    this.continueIndicator.setVisible(false);

    const cam = this.scene.cameras.main;
    const boxY = cam.height - this.BOX_HEIGHT;
    const startY = boxY + 60;

    for (let i = 0; i < this.choices.length && i < 4; i++) {
      const choiceText = this.scene.add.text(
        32, startY + i * 16,
        `${i + 1}. ${this.choices[i].text}`,
        {
          fontSize: '11px',
          color: i === 0 ? '#fbbf24' : '#aaaacc',
          fontFamily: 'monospace'
        }
      );
      choiceText.setScrollFactor(0);
      choiceText.setDepth(201);
      this.choiceTexts.push(choiceText);
    }

    this.highlightChoice(0);
  }

  private handleChoiceInput(advance: boolean, up: boolean, down: boolean): void {
    if (up && this.selectedChoiceIndex > 0) {
      this.selectedChoiceIndex--;
      this.highlightChoice(this.selectedChoiceIndex);
    }
    if (down && this.selectedChoiceIndex < this.choices.length - 1) {
      this.selectedChoiceIndex++;
      this.highlightChoice(this.selectedChoiceIndex);
    }

    // Number key direct select
    const numKeys = [this.key1, this.key2, this.key3, this.key4];
    for (let i = 0; i < this.choices.length && i < 4; i++) {
      if (Phaser.Input.Keyboard.JustDown(numKeys[i])) {
        this.selectChoice(i);
        return;
      }
    }

    if (advance) {
      this.selectChoice(this.selectedChoiceIndex);
    }
  }

  private highlightChoice(index: number): void {
    for (let i = 0; i < this.choiceTexts.length; i++) {
      if (i === index) {
        this.choiceTexts[i].setColor('#fbbf24');
        this.choiceTexts[i].setText(`▸ ${i + 1}. ${this.choices[i].text}`);
      } else {
        this.choiceTexts[i].setColor('#aaaacc');
        this.choiceTexts[i].setText(`  ${i + 1}. ${this.choices[i].text}`);
      }
    }
  }

  private selectChoice(index: number): void {
    if (index >= this.choices.length) return;
    const choice = this.choices[index];
    const cb = this.onChoiceSelected;
    this.clearChoices();
    if (cb) cb(choice);
  }

  private clearChoices(): void {
    for (const t of this.choiceTexts) {
      t.destroy();
    }
    this.choiceTexts = [];
    this.isShowingChoices = false;
    this.selectedChoiceIndex = 0;
  }

  private updatePageIndicator(): void {
    if (this.pages.length > 1) {
      this.pageIndicator.setText(`${this.currentPageIndex + 1}/${this.pages.length}`);
      this.pageIndicator.setVisible(true);
    } else {
      this.pageIndicator.setVisible(false);
    }
  }

  destroy(): void {
    this.stopTypewriter();
    this.clearChoices();
    this.container.destroy();
  }
}
