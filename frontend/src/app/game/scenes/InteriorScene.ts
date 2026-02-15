import * as Phaser from 'phaser';
import { SceneTransition } from '../systems/SceneTransition';
import { PlayerController } from '../systems/PlayerController';
import { InteriorRenderer, RoomLayout } from '../systems/InteriorRenderer';
import { InteriorConfig } from '../types/WorldPack';
import { DialogueBox } from '../ui/DialogueBox';
import { DialogueTree, DialogueTreeData, DialogueNode } from '../dialogue/DialogueTree';
import { Portal } from '../entities/Portal';

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
 *
 * Two modes:
 * - **Walkable room** (when InteriorConfig exists in manifest): Themed room with
 *   player movement, wall collision, exit door, NPC dialogue, and app portal.
 * - **Legacy text view** (fallback): Original text-only overlay with "Press ENTER
 *   to launch" for buildings without interior config.
 */
export class InteriorScene extends Phaser.Scene {
  private transition!: SceneTransition;

  // ── Building data (from OverworldScene) ─────
  private buildingId = '';
  private buildingName = '';
  private buildingType = 'placeholder';
  private appRoute?: string;
  private appUrl?: string;
  private requiresAuth = false;
  private description = '';
  private returnX = 0;
  private returnY = 0;

  // ── Interior config (null → legacy mode) ────
  private interiorConfig: InteriorConfig | null = null;

  // ── Walkable room systems ───────────────────
  private playerController: PlayerController | null = null;
  private interiorRenderer: InteriorRenderer | null = null;
  private roomLayout: RoomLayout | null = null;

  // ── Input ───────────────────────────────────
  private escKey!: Phaser.Input.Keyboard.Key;
  private enterKey!: Phaser.Input.Keyboard.Key;
  private enterWasDown = false;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private spaceWasDown = false;

  // ── Exit interaction ────────────────────────
  private exitPrompt: Phaser.GameObjects.Text | null = null;

  // ── NPC ───────────────────────────────────
  private npcPrompt: Phaser.GameObjects.Text | null = null;
  private npcX = 0;
  private npcY = 0;
  private npcName = '';
  private npcDialogueId = '';
  private hasNPC = false;

  // ── Portal ────────────────────────────────
  private portal: Portal | null = null;
  private portalPrompt: Phaser.GameObjects.Text | null = null;

  // ── Dialogue ──────────────────────────────
  private dialogueBox: DialogueBox | null = null;
  private currentDialogueTree: DialogueTree | null = null;

  // ── State ───────────────────────────────────
  private dialogueActive = false;

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

    // Reset walkable room state (scene instance is reused across entries)
    this.hasNPC = false;
    this.portal = null;
    this.dialogueBox = null;
    this.currentDialogueTree = null;
    this.dialogueActive = false;

    // Look up interior config from cached manifest (loaded by OverworldScene)
    const manifest = this.cache.json.get('world-manifest') as Record<string, unknown> | undefined;
    const interiors = (manifest as any)?.interiors as Record<string, InteriorConfig> | undefined;
    this.interiorConfig = interiors?.[this.buildingId] ?? null;
  }

  preload(): void {
    // Ensure player spritesheet is available (already in texture cache from OverworldScene)
    if (!this.textures.exists('player')) {
      this.load.spritesheet('player', '/assets/worlds/village/sprites/player.png', {
        frameWidth: 16,
        frameHeight: 16
      });
    }
  }

  create(): void {
    this.transition = new SceneTransition(this);

    if (this.interiorConfig) {
      this.createWalkableRoom();
    } else {
      this.createLegacyView();
    }

    this.transition.fadeIn();
  }

  override update(): void {
    if (this.interiorConfig) {
      this.updateWalkable();
    } else {
      this.updateLegacy();
    }
  }

  // ═══════════════════════════════════════════════
  //  WALKABLE ROOM MODE
  // ═══════════════════════════════════════════════

  private createWalkableRoom(): void {
    const config = this.interiorConfig!;
    const cam = this.cameras.main;
    const accent = parseInt(config.accentColor.replace('#', ''), 16);
    cam.setBackgroundColor('#050508');
    cam.setZoom(1);

    // ── Render room ──────────────────────────
    this.interiorRenderer = new InteriorRenderer(this);
    this.roomLayout = this.interiorRenderer.renderRoom(config, cam.width, cam.height);

    // ── Player (slower speed for small rooms) ─
    this.playerController = new PlayerController(this, 80);
    this.playerController.create(this.roomLayout.playerSpawnX, this.roomLayout.playerSpawnY);
    this.playerController.sprite.setDepth(10);

    // ── Wall collision ───────────────────────
    this.interiorRenderer.setupCollision(this.playerController.sprite);

    // ── Building name HUD ────────────────────
    this.add.text(cam.width / 2, 20, this.buildingName, {
      fontSize: '16px',
      color: '#00ffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

    if (this.description) {
      this.add.text(cam.width / 2, 38, this.description, {
        fontSize: '10px',
        color: '#6666aa',
        fontFamily: 'monospace'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
    }

    // ── Exit prompt (hidden until near door) ─
    this.exitPrompt = this.add.text(
      this.roomLayout.exitDoorX,
      this.roomLayout.exitDoorY + 14,
      'Press ENTER to leave',
      {
        fontSize: '10px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 4, y: 2 },
        fontFamily: 'monospace'
      }
    );
    this.exitPrompt.setOrigin(0.5).setDepth(100).setVisible(false);

    // ── ESC hint (bottom-right corner) ───────
    this.add.text(cam.width - 8, cam.height - 12, 'ESC to exit', {
      fontSize: '9px',
      color: '#444466',
      fontFamily: 'monospace'
    }).setOrigin(1, 1).setScrollFactor(0).setDepth(200);

    // ── NPC (programmatic figure) ─────────────
    if (config.npc) {
      this.hasNPC = true;
      this.npcX = this.roomLayout.npcX;
      this.npcY = this.roomLayout.npcY;
      this.npcName = config.npc.name;
      this.npcDialogueId = config.npc.dialogueId;

      const npcGfx = this.add.graphics();
      npcGfx.setDepth(9);
      // Body
      npcGfx.fillStyle(accent, 0.7);
      npcGfx.fillCircle(this.npcX, this.npcY, 7);
      // Head
      npcGfx.fillStyle(accent, 0.9);
      npcGfx.fillCircle(this.npcX, this.npcY - 9, 4);

      // Name label
      this.add.text(this.npcX, this.npcY - 18, config.npc.name, {
        fontSize: '8px',
        color: config.accentColor,
        fontFamily: 'monospace',
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(9);

      // Talk prompt (hidden until near)
      this.npcPrompt = this.add.text(
        this.npcX, this.npcY + 14,
        'Press SPACE to talk',
        {
          fontSize: '10px',
          color: '#ffffff',
          backgroundColor: '#000000aa',
          padding: { x: 4, y: 2 },
          fontFamily: 'monospace'
        }
      ).setOrigin(0.5).setDepth(100).setVisible(false);

      // Subtle idle bob
      this.tweens.add({
        targets: npcGfx,
        y: -2,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    // ── Portal ──────────────────────────────
    if (config.portal) {
      this.portal = new Portal(this, {
        x: this.roomLayout.portalX,
        y: this.roomLayout.portalY,
        label: config.portal.label,
        glowColor: config.portal.glowColor
      });

      this.portalPrompt = this.add.text(
        this.roomLayout.portalX,
        this.roomLayout.portalY + 18,
        `Press ENTER to launch ${config.portal.label}`,
        {
          fontSize: '10px',
          color: '#ffffff',
          backgroundColor: '#000000aa',
          padding: { x: 4, y: 2 },
          fontFamily: 'monospace'
        }
      ).setOrigin(0.5).setDepth(100).setVisible(false);
    }

    // ── DialogueBox ─────────────────────────
    this.dialogueBox = new DialogueBox(this);

    // ── Input ────────────────────────────────
    this.escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    // Consume initial keypress that triggered building entry
    this.enterWasDown = true;
    this.spaceWasDown = true;
  }

  private updateWalkable(): void {
    if (!this.playerController || !this.roomLayout) return;

    // ── Dialogue mode (DialogueBox handles ESC + input) ──
    if (this.dialogueActive) {
      this.dialogueBox?.update();
      // Keep key state in sync while dialogue is active
      this.enterWasDown = this.enterKey.isDown;
      this.spaceWasDown = this.spaceKey.isDown;
      return;
    }

    // ESC = instant exit
    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.returnToOverworld();
      return;
    }

    // Edge detection for ENTER and SPACE
    const enterPressed = this.enterKey.isDown && !this.enterWasDown;
    const spacePressed = this.spaceKey.isDown && !this.spaceWasDown;
    this.enterWasDown = this.enterKey.isDown;
    this.spaceWasDown = this.spaceKey.isDown;

    // Player movement
    this.playerController.update();

    const player = this.playerController.sprite;

    // ── NPC proximity ───────────────────────
    if (this.hasNPC) {
      const npcDist = Phaser.Math.Distance.Between(
        player.x, player.y, this.npcX, this.npcY
      );
      const nearNPC = npcDist < 32;
      this.npcPrompt?.setVisible(nearNPC);

      if (spacePressed && nearNPC) {
        this.startInteriorDialogue();
        return;
      }
    }

    // ── Portal proximity ────────────────────
    if (this.portal) {
      const portalDist = Phaser.Math.Distance.Between(
        player.x, player.y, this.portal.x, this.portal.y
      );
      const nearPortal = portalDist < 40;
      this.portalPrompt?.setVisible(nearPortal);

      if (enterPressed && nearPortal) {
        if (this.requiresAuth && this.isGuestUser()) {
          this.showAuthWarning();
          return;
        }
        this.launchApp();
        return;
      }
    }

    // ── Exit proximity ──────────────────────
    const exitDist = Phaser.Math.Distance.Between(
      player.x, player.y,
      this.roomLayout.exitDoorX, this.roomLayout.exitDoorY
    );
    const nearExit = exitDist < 28;
    this.exitPrompt!.setVisible(nearExit);

    if (enterPressed && nearExit) {
      this.returnToOverworld();
      return;
    }

    // Auto-exit if player walks through the gap
    if (player.y > this.roomLayout.offsetY + this.roomLayout.roomPixelHeight + 4) {
      this.returnToOverworld();
      return;
    }
  }

  // ── Dialogue methods (mirrors OverworldScene pattern) ──

  private startInteriorDialogue(): void {
    if (!this.dialogueBox) return;

    const cacheKey = `dialogue-${this.npcDialogueId}`;
    const data = this.cache.json.get(cacheKey) as DialogueTreeData | undefined;

    this.dialogueActive = true;
    this.playerController?.sprite.setVelocity(0);
    this.npcPrompt?.setVisible(false);
    this.portalPrompt?.setVisible(false);
    this.exitPrompt?.setVisible(false);

    if (!data) {
      this.dialogueBox.show(
        '...',
        this.npcName,
        () => this.endDialogue()
      );
      return;
    }

    this.currentDialogueTree = DialogueTree.fromJSON(data);
    const startNode = this.currentDialogueTree.getStartNode();
    if (!startNode) {
      this.endDialogue();
      return;
    }

    this.showDialogueNode(startNode);
  }

  private showDialogueNode(node: DialogueNode): void {
    if (!this.currentDialogueTree || !this.dialogueBox) return;

    const text = node.text;
    const availableChoices = this.currentDialogueTree.getAvailableChoices(node);

    const boxChoices = availableChoices.map(c => ({
      text: c.text,
      nextNodeId: c.nextNodeId
    }));

    if (boxChoices.length > 0) {
      this.dialogueBox.show(
        text,
        node.speaker,
        () => this.endDialogue(),
        boxChoices,
        (choice) => {
          const nextNode = this.currentDialogueTree?.getNode(choice.nextNodeId);
          if (nextNode) {
            this.showDialogueNode(nextNode);
          } else {
            this.endDialogue();
          }
        }
      );
    } else if (node.nextNodeId) {
      this.dialogueBox.show(
        text,
        node.speaker,
        () => {
          const nextNode = this.currentDialogueTree?.getNode(node.nextNodeId!);
          if (nextNode) {
            this.showDialogueNode(nextNode);
          } else {
            this.endDialogue();
          }
        }
      );
    } else {
      this.dialogueBox.show(
        text,
        node.speaker,
        () => this.endDialogue()
      );
    }
  }

  private endDialogue(): void {
    this.dialogueActive = false;
    this.currentDialogueTree = null;
    this.dialogueBox?.hide();
  }

  private showAuthWarning(): void {
    if (!this.dialogueBox) return;
    this.dialogueActive = true;
    this.playerController?.sprite.setVelocity(0);
    this.dialogueBox.show(
      'This app requires the owner to be logged in. Owner access only.',
      'System',
      () => this.endDialogue()
    );
  }

  // ═══════════════════════════════════════════════
  //  LEGACY TEXT-ONLY MODE (fallback for buildings
  //  without interior config)
  // ═══════════════════════════════════════════════

  private createLegacyView(): void {
    this.cameras.main.setBackgroundColor('#0a0a14');

    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    this.add.text(centerX, centerY - 80, this.buildingName, {
      fontSize: '24px',
      color: '#00ffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    if (this.description) {
      this.add.text(centerX, centerY - 40, this.description, {
        fontSize: '12px',
        color: '#aaaacc',
        fontFamily: 'monospace',
        wordWrap: { width: 500 },
        align: 'center'
      }).setOrigin(0.5);
    }

    switch (this.buildingType) {
      case 'app':
        this.createLegacyAppContent(centerX, centerY);
        break;
      case 'external':
        this.createLegacyExternalContent(centerX, centerY);
        break;
      case 'info':
        this.createLegacyInfoContent(centerX, centerY);
        break;
      case 'placeholder':
      default:
        this.createLegacyPlaceholderContent(centerX, centerY);
        break;
    }

    this.add.text(centerX, centerY + 120, 'Press ESC to go back outside', {
      fontSize: '14px',
      color: '#8888bb',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    this.escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.enterWasDown = false;
  }

  private updateLegacy(): void {
    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.returnToOverworld();
    }

    const enterPressed = this.enterKey.isDown && !this.enterWasDown;
    this.enterWasDown = this.enterKey.isDown;

    if (enterPressed && (this.buildingType === 'app' || this.buildingType === 'external')) {
      if (this.requiresAuth && this.isGuestUser()) return;
      this.launchApp();
    }
  }

  // ── Legacy content helpers ──────────────────

  private createLegacyAppContent(cx: number, cy: number): void {
    if (this.requiresAuth && this.isGuestUser()) {
      this.add.text(cx, cy + 10, 'Owner access only', {
        fontSize: '16px',
        color: '#ff8844',
        fontFamily: 'monospace',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.add.text(cx, cy + 35, 'This app requires the owner to be logged in.', {
        fontSize: '11px',
        color: '#887766',
        fontFamily: 'monospace'
      }).setOrigin(0.5);
      return;
    }

    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x00ffff, 0.3);
    graphics.strokeRect(cx - 180, cy + 5, 360, 60);

    this.add.text(cx, cy + 35, `Press ENTER to launch`, {
      fontSize: '16px',
      color: '#00ff88',
      fontFamily: 'monospace'
    }).setOrigin(0.5);
  }

  private createLegacyExternalContent(cx: number, cy: number): void {
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

  private createLegacyInfoContent(cx: number, cy: number): void {
    this.add.text(cx, cy + 20, 'Welcome! Take a look around.', {
      fontSize: '14px',
      color: '#88aacc',
      fontFamily: 'monospace',
      wordWrap: { width: 500 },
      align: 'center'
    }).setOrigin(0.5);
  }

  private createLegacyPlaceholderContent(cx: number, cy: number): void {
    this.add.text(cx, cy + 20, 'Something is being built here...', {
      fontSize: '14px',
      color: '#666688',
      fontFamily: 'monospace',
      fontStyle: 'italic'
    }).setOrigin(0.5);

    this.add.text(cx, cy + 60, '[ Under Construction ]', {
      fontSize: '12px',
      color: '#444466',
      fontFamily: 'monospace'
    }).setOrigin(0.5);
  }

  // ═══════════════════════════════════════════════
  //  SHARED METHODS (used by both modes)
  // ═══════════════════════════════════════════════

  private isGuestUser(): boolean {
    return !!localStorage.getItem('guest_token');
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
