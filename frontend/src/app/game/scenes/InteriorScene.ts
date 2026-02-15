import * as Phaser from 'phaser';
import { SceneTransition } from '../systems/SceneTransition';

interface InteriorData {
  buildingId: string;
  buildingName: string;
  buildingType: string;
  appRoute?: string;
  appUrl?: string;
  requiresAuth: boolean;
  description: string;
  returnX: number;
  returnY: number;
}

/**
 * Interior scene shown when entering a building.
 * Displays building info and offers app launch for 'app'/'external' types.
 */
export class InteriorScene extends Phaser.Scene {
  private transition!: SceneTransition;
  private buildingId = '';
  private buildingName = '';
  private buildingType = 'placeholder';
  private appRoute?: string;
  private appUrl?: string;
  private requiresAuth = false;
  private description = '';
  private returnX = 0;
  private returnY = 0;
  private escKey!: Phaser.Input.Keyboard.Key;
  private enterKey!: Phaser.Input.Keyboard.Key;
  private enterWasDown = false;

  constructor() {
    super({ key: 'InteriorScene' });
  }

  init(data: InteriorData): void {
    this.buildingId = data.buildingId || 'unknown';
    this.buildingName = data.buildingName || data.buildingId || 'Unknown';
    this.buildingType = data.buildingType || 'placeholder';
    this.appRoute = data.appRoute;
    this.appUrl = data.appUrl;
    this.requiresAuth = data.requiresAuth ?? false;
    this.description = data.description || '';
    this.returnX = data.returnX || 0;
    this.returnY = data.returnY || 0;
  }

  create(): void {
    this.transition = new SceneTransition(this);
    this.cameras.main.setBackgroundColor('#0a0a14');

    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    // Building name header
    this.add.text(centerX, centerY - 80, this.buildingName, {
      fontSize: '24px',
      color: '#00ffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Description
    if (this.description) {
      this.add.text(centerX, centerY - 40, this.description, {
        fontSize: '12px',
        color: '#aaaacc',
        fontFamily: 'monospace',
        wordWrap: { width: 500 },
        align: 'center'
      }).setOrigin(0.5);
    }

    // Type-specific content
    switch (this.buildingType) {
      case 'app':
        this.createAppContent(centerX, centerY);
        break;
      case 'external':
        this.createExternalContent(centerX, centerY);
        break;
      case 'info':
        this.createInfoContent(centerX, centerY);
        break;
      case 'placeholder':
      default:
        this.createPlaceholderContent(centerX, centerY);
        break;
    }

    // Exit prompt (always shown)
    this.add.text(centerX, centerY + 120, 'Press ESC to go back outside', {
      fontSize: '14px',
      color: '#8888bb',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    this.escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.enterWasDown = false;

    this.transition.fadeIn();
  }

  override update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.returnToOverworld();
    }

    // Manual edge detection for ENTER (app/external launch)
    const enterPressed = this.enterKey.isDown && !this.enterWasDown;
    this.enterWasDown = this.enterKey.isDown;

    if (enterPressed && (this.buildingType === 'app' || this.buildingType === 'external')) {
      this.launchApp();
    }
  }

  private createAppContent(cx: number, cy: number): void {
    // Auth warning for guest visitors
    if (this.requiresAuth && this.isGuestUser()) {
      this.add.text(cx, cy - 5, 'Owner access only — requires login', {
        fontSize: '12px',
        color: '#ff8844',
        fontFamily: 'monospace'
      }).setOrigin(0.5);
    }

    // Decorative border box
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x00ffff, 0.3);
    graphics.strokeRect(cx - 180, cy + 5, 360, 60);

    this.add.text(cx, cy + 35, `Press ENTER to launch`, {
      fontSize: '16px',
      color: '#00ff88',
      fontFamily: 'monospace'
    }).setOrigin(0.5);
  }

  private isGuestUser(): boolean {
    // Guest visitors enter via the pass system and have a guest_token
    return !!localStorage.getItem('guest_token');
  }

  private createExternalContent(cx: number, cy: number): void {
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x00ffff, 0.3);
    graphics.strokeRect(cx - 180, cy - 10, 360, 60);

    this.add.text(cx, cy + 20, `Press ENTER to visit`, {
      fontSize: '16px',
      color: '#ffcc00',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    this.add.text(cx, cy + 50, '(opens in new tab)', {
      fontSize: '10px',
      color: '#666688',
      fontFamily: 'monospace'
    }).setOrigin(0.5);
  }

  private createInfoContent(cx: number, cy: number): void {
    this.add.text(cx, cy + 20, 'Welcome! Take a look around.', {
      fontSize: '14px',
      color: '#88aacc',
      fontFamily: 'monospace',
      wordWrap: { width: 500 },
      align: 'center'
    }).setOrigin(0.5);
  }

  private createPlaceholderContent(cx: number, cy: number): void {
    this.add.text(cx, cy + 20, 'Something is being built here...', {
      fontSize: '14px',
      color: '#666688',
      fontFamily: 'monospace',
      fontStyle: 'italic'
    }).setOrigin(0.5);

    // Construction icon
    this.add.text(cx, cy + 60, '[ Under Construction ]', {
      fontSize: '12px',
      color: '#444466',
      fontFamily: 'monospace'
    }).setOrigin(0.5);
  }

  private launchApp(): void {
    const navigateToApp = this.game.registry.get('navigateToApp') as
      ((buildingId: string, route: string, playerX: number, playerY: number, isExternal: boolean) => void) | undefined;

    if (!navigateToApp) {
      console.warn('InteriorScene: navigateToApp callback not found in game registry');
      return;
    }

    const isExternal = this.buildingType === 'external';
    const route = isExternal ? (this.appUrl ?? '') : (this.appRoute ?? '');

    if (!route) {
      console.warn(`InteriorScene: No route configured for building ${this.buildingId}`);
      return;
    }

    navigateToApp(this.buildingId, route, this.returnX, this.returnY, isExternal);
  }

  private returnToOverworld(): void {
    this.transition.transitionTo('OverworldScene', {
      spawnX: this.returnX,
      spawnY: this.returnY
    });
  }
}
