import * as Phaser from 'phaser';
import { isTouchDevice } from '../ui/MobileControls';

interface Interactable {
  x: number;
  y: number;
  data: Record<string, unknown>;
  callback: (data: Record<string, unknown>) => void;
  prompt: Phaser.GameObjects.Text;
}

export class InteractionSystem {
  private scene: Phaser.Scene;
  private player!: Phaser.GameObjects.Sprite;
  private interactables: Interactable[] = [];
  private activeInteractable: Interactable | null = null;
  private enterKey: Phaser.Input.Keyboard.Key;
  private spaceKey: Phaser.Input.Keyboard.Key;
  private enterWasDown = false;
  private spaceWasDown = false;
  private readonly PROXIMITY_RADIUS = 32;

  // External trigger from MobileControls action button
  public externalAction = false;

  constructor(scene: Phaser.Scene, player: Phaser.GameObjects.Sprite) {
    this.scene = scene;
    this.player = player;
    this.enterKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.spaceKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  registerInteractable(
    x: number,
    y: number,
    data: Record<string, unknown>,
    callback: (data: Record<string, unknown>) => void,
    promptText = 'Press Enter'
  ): void {
    // On touch devices, show mobile-friendly prompt
    const displayText = isTouchDevice() ? promptText.replace(/Press Enter/i, 'Tap A') : promptText;
    const prompt = this.scene.add.text(x, y - 24, displayText, {
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 4, y: 2 },
      fontFamily: 'monospace'
    });
    prompt.setOrigin(0.5);
    prompt.setDepth(100);
    prompt.setVisible(false);

    this.interactables.push({ x, y, data, callback, prompt });
  }

  update(): void {
    let closest: Interactable | null = null;
    let closestDist = Infinity;

    for (const interactable of this.interactables) {
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        interactable.x, interactable.y
      );

      if (dist <= this.PROXIMITY_RADIUS && dist < closestDist) {
        closest = interactable;
        closestDist = dist;
      }

      interactable.prompt.setVisible(false);
    }

    if (closest) {
      closest.prompt.setVisible(true);
      this.activeInteractable = closest;
    } else {
      this.activeInteractable = null;
    }

    // Manual edge detection — more reliable than Phaser's JustDown which
    // can miss keypresses when multiple systems share the keyboard plugin
    const enterPressed = this.enterKey.isDown && !this.enterWasDown;
    const spacePressed = this.spaceKey.isDown && !this.spaceWasDown;
    this.enterWasDown = this.enterKey.isDown;
    this.spaceWasDown = this.spaceKey.isDown;

    const triggered = enterPressed || spacePressed || this.externalAction;
    this.externalAction = false;

    if (this.activeInteractable && triggered) {
      this.activeInteractable.callback(this.activeInteractable.data);
    }
  }

  /** Keep key tracking in sync when update() is not being called (e.g. during dialogue). */
  syncKeys(): void {
    this.enterWasDown = this.enterKey.isDown;
    this.spaceWasDown = this.spaceKey.isDown;
  }

  destroy(): void {
    for (const interactable of this.interactables) {
      interactable.prompt.destroy();
    }
    this.interactables = [];
    this.activeInteractable = null;
  }
}
