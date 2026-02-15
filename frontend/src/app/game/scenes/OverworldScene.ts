import * as Phaser from 'phaser';
import { PlayerController } from '../systems/PlayerController';
import { WorldLoader } from '../systems/WorldLoader';
import { CameraController } from '../systems/CameraController';
import { CollisionSystem } from '../systems/CollisionSystem';
import { InteractionSystem } from '../systems/InteractionSystem';
import { SceneTransition } from '../systems/SceneTransition';
import { AudioManager } from '../systems/AudioManager';
import { NPCManager } from '../managers/NPCManager';
import { DialogueBox } from '../ui/DialogueBox';
import { DialogueTree, DialogueNode, DialogueTreeData } from '../dialogue/DialogueTree';
import { DialogueChoice } from '../ui/DialogueBox';
import { WorldPackBuilding } from '../types/WorldPack';
import { ThemeEngine } from '../systems/ThemeEngine';
import { SecretsManager, Collectible } from '../systems/SecretsManager';
import { AchievementEngine, GameState } from '../systems/AchievementEngine';
import { AchievementToast } from '../ui/AchievementToast';
import { CollectiblesPanel } from '../ui/CollectiblesPanel';

interface ManifestJSON {
  buildings?: WorldPackBuilding[];
}

export class OverworldScene extends Phaser.Scene {
  private playerController!: PlayerController;
  private worldLoader!: WorldLoader;
  private cameraController!: CameraController;
  private collisionSystem!: CollisionSystem;
  private interactionSystem!: InteractionSystem;
  private transition!: SceneTransition;
  private npcManager!: NPCManager;
  private dialogueBox!: DialogueBox;
  private audioManager!: AudioManager;
  private themeEngine!: ThemeEngine;
  private secretsManager!: SecretsManager;
  private achievementEngine!: AchievementEngine;
  private achievementToast!: AchievementToast;
  private collectiblesPanel!: CollectiblesPanel;
  private themeToggleButton!: Phaser.GameObjects.Text;
  private spawnX?: number;
  private spawnY?: number;
  private codeModal: Phaser.GameObjects.Container | null = null;

  // Achievement tracking
  private buildingsVisited = new Set<string>();
  private npcsInteracted = new Set<string>();
  private dialogueCountTotal = 0;
  private timeSpentTotal = 0;
  private sessionStartTime = 0;
  private konamiSequence: string[] = [];
  private konamiTarget = ['UP', 'UP', 'DOWN', 'DOWN', 'LEFT', 'RIGHT', 'LEFT', 'RIGHT', 'B', 'A'];
  private panelOpened = false;

  // Public tilemap for ThemeEngine decoration layer access
  public tilemap!: Phaser.Tilemaps.Tilemap;

  // Building config from manifest
  private buildingConfigs = new Map<string, WorldPackBuilding>();

  // Dialogue state
  private dialogueActive = false;
  private currentDialogueTree: DialogueTree | null = null;
  private gameState: Record<string, unknown> = {};

  // NPC interaction prompt
  private npcPrompt: Phaser.GameObjects.Text | null = null;

  // Key for NPC interaction (separate from dialogue advance keys)
  private interactKey!: Phaser.Input.Keyboard.Key;
  private interactWasDown = false;

  constructor() {
    super({ key: 'OverworldScene' });
  }

  init(data?: { spawnX?: number; spawnY?: number }): void {
    if (data) {
      this.spawnX = data.spawnX;
      this.spawnY = data.spawnY;
    }
  }

  preload(): void {
    this.worldLoader = new WorldLoader(this);
    this.worldLoader.preload();

    this.playerController = new PlayerController(this);
    this.playerController.preload();

    this.npcManager = new NPCManager(this);
    this.npcManager.preload();

    // Load world manifest for building metadata
    this.load.json('world-manifest', '/assets/worlds/village/manifest.json');

    // Load dialogue JSON files
    this.load.json('dialogue-claude-townsquare', '/assets/worlds/village/dialogue/claude-townsquare.json');
    this.load.json('dialogue-signpost', '/assets/worlds/village/dialogue/signpost.json');
    this.load.json('dialogue-villager-01', '/assets/worlds/village/dialogue/villager-01.json');
  }

  create(): void {
    this.transition = new SceneTransition(this);

    // Parse building configs from manifest
    const manifest = this.cache.json.get('world-manifest') as ManifestJSON | undefined;
    this.buildingConfigs.clear();
    if (manifest?.buildings) {
      for (const b of manifest.buildings) {
        this.buildingConfigs.set(b.id, b);
      }
    }

    // Build tilemap with all layers
    this.worldLoader.create();
    this.tilemap = this.worldLoader.tilemap;

    // Determine spawn position: sessionStorage (returning from app) > scene data (returning from interior) > default
    const defaultSpawn = this.worldLoader.getSpawnPoint();
    let startX = this.spawnX ?? defaultSpawn.x;
    let startY = this.spawnY ?? defaultSpawn.y;

    const savedStr = sessionStorage.getItem('worldPosition');
    if (savedStr) {
      try {
        const saved = JSON.parse(savedStr);
        if (saved.x != null && saved.y != null) {
          startX = saved.x;
          startY = saved.y;
        }
        sessionStorage.removeItem('worldPosition');
      } catch { /* ignore corrupt data */ }
    }

    // Create player at spawn point
    this.playerController.create(startX, startY);
    const player = this.playerController.sprite;

    // Camera: follow player, clamp to map bounds, play arrival zoom
    const bounds = this.worldLoader.getMapBounds();
    this.cameraController = new CameraController(this);
    this.cameraController.startFollow(player, bounds.width, bounds.height);
    this.cameraController.playArrivalZoom();

    // Collision between player and collision layer
    this.collisionSystem = new CollisionSystem(this);
    if (this.worldLoader.collisionLayer) {
      this.collisionSystem.create(player, this.worldLoader.collisionLayer, bounds.width, bounds.height);
    }

    // Interaction system for door zones
    this.interactionSystem = new InteractionSystem(this, player);
    const doors = this.worldLoader.getDoorZones();
    for (const door of doors) {
      if (door.x != null && door.y != null) {
        const buildingId = this.getDoorProperty(door, 'buildingId') ?? door.name ?? 'building';
        const buildingConfig = this.buildingConfigs.get(buildingId);
        const buildingName = buildingConfig?.name ?? buildingId;
        this.interactionSystem.registerInteractable(
          door.x, door.y,
          { buildingId },
          (data) => {
            const id = data['buildingId'] as string;
            const config = this.buildingConfigs.get(id);

            // Track building visit
            this.buildingsVisited.add(id);
            this.checkAchievements();

            this.transition.transitionTo('InteriorScene', {
              buildingId: id,
              buildingName: config?.name ?? id,
              buildingType: config?.type ?? 'placeholder',
              appRoute: config?.appRoute,
              appUrl: config?.appUrl,
              requiresAuth: config?.requiresAuth ?? false,
              description: config?.description ?? '',
              returnX: player.x,
              returnY: player.y
            });
          },
          `Enter ${buildingName}`
        );
      }
    }

    // NPC system
    this.npcManager.create(this.worldLoader.tilemap, player);

    // Dialogue box
    this.dialogueBox = new DialogueBox(this);

    // NPC interaction prompt (shown/hidden based on proximity)
    this.npcPrompt = this.add.text(0, 0, 'Press SPACE to talk', {
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 4, y: 2 },
      fontFamily: 'monospace'
    });
    this.npcPrompt.setOrigin(0.5);
    this.npcPrompt.setDepth(100);
    this.npcPrompt.setVisible(false);

    // Separate interact key for starting conversations
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Audio (graceful degradation — works silently with no audio files)
    this.audioManager = new AudioManager(this);
    this.audioManager.playMusic('village-bgm');

    // SecretsManager: code fragment collectibles
    this.secretsManager = new SecretsManager(this);
    this.initializeSecrets();

    // Achievement system
    this.achievementEngine = new AchievementEngine();
    this.achievementToast = new AchievementToast(this);
    this.collectiblesPanel = new CollectiblesPanel(this);
    this.initializeAchievements();

    // Theme Engine: auto-detect day/night from local time
    this.themeEngine = new ThemeEngine(this, '/assets/worlds/village');
    this.initializeTheme();

    // Day/night toggle button in top-right corner
    this.themeToggleButton = this.add.text(0, 0, '', {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 8, y: 4 }
    });
    this.themeToggleButton.setOrigin(1, 0);
    this.themeToggleButton.setScrollFactor(0);
    this.themeToggleButton.setDepth(1000);
    this.themeToggleButton.setInteractive({ useHandCursor: true });
    this.themeToggleButton.on('pointerdown', () => this.toggleTheme());

    // Position button in top-right corner
    this.scale.on('resize', this.positionThemeButton, this);
    this.positionThemeButton();

    this.transition.fadeIn();
  }

  private positionThemeButton(): void {
    const camera = this.cameras.main;
    this.themeToggleButton.setPosition(camera.width - 10, 10);
  }

  private async initializeTheme(): Promise<void> {
    // Check for manual theme override in sessionStorage
    const storedTheme = sessionStorage.getItem('worldTheme');

    if (storedTheme) {
      try {
        await this.themeEngine.switchTheme(storedTheme);
        this.updateThemeButtonText(storedTheme);
        return;
      } catch (error) {
        console.warn('Failed to load stored theme, falling back to auto-detection', error);
      }
    }

    // Auto-detect based on local time (6 AM - 6 PM = day, else = night)
    const hour = new Date().getHours();
    const themeId = (hour >= 6 && hour < 18) ? 'default' : 'night';

    try {
      const theme = await this.themeEngine.loadTheme(themeId);
      this.themeEngine.applyTheme(theme);
      this.updateThemeButtonText(themeId);
    } catch (error) {
      console.error('Failed to load auto-detected theme:', error);
    }
  }

  private toggleTheme(): void {
    const themes = ['default', 'night', 'valentine', 'christmas', 'autumn', 'halloween'];
    const currentTheme = this.themeEngine.getCurrentTheme();
    const currentIndex = themes.indexOf(currentTheme?.id ?? 'default');
    const nextIndex = (currentIndex + 1) % themes.length;
    const newThemeId = themes[nextIndex];

    this.themeEngine.switchTheme(newThemeId);
    this.updateThemeButtonText(newThemeId);

    // Persist theme choice in sessionStorage
    sessionStorage.setItem('worldTheme', newThemeId);
  }

  private updateThemeButtonText(themeId: string): void {
    const icons: Record<string, string> = {
      'default': '☀️',
      'night': '🌙',
      'valentine': '💝',
      'christmas': '🎄',
      'autumn': '🍂',
      'halloween': '🎃'
    };
    this.themeToggleButton.setText(icons[themeId] ?? '☀️');
  }

  private async initializeSecrets(): Promise<void> {
    await this.secretsManager.loadCollectibles();
    this.secretsManager.renderCollectibles();
  }

  private showCodeModal(collectible: Collectible): void {
    if (this.codeModal) {
      this.codeModal.destroy();
    }

    const camera = this.cameras.main;
    const width = camera.width;
    const height = camera.height;

    // Create modal container
    this.codeModal = this.add.container(width / 2, height / 2);
    this.codeModal.setScrollFactor(0);
    this.codeModal.setDepth(2000);

    // Backdrop
    const backdrop = this.add.rectangle(0, 0, width, height, 0x000000, 0.85);
    backdrop.setOrigin(0.5);

    // Modal box
    const boxWidth = Math.min(600, width - 40);
    const boxHeight = Math.min(500, height - 40);
    const modalBg = this.add.rectangle(0, 0, boxWidth, boxHeight, 0x1a1a2e);
    modalBg.setStrokeStyle(3, 0x00ffff);

    // Title
    const title = this.add.text(0, -boxHeight / 2 + 30, collectible.title, {
      fontSize: '18px',
      color: '#00ffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Language label
    const langLabel = this.add.text(0, -boxHeight / 2 + 60, `Language: ${collectible.language}`, {
      fontSize: '12px',
      color: '#888888',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    // Code snippet box
    const codeText = this.add.text(0, -boxHeight / 2 + 100, collectible.codeSnippet, {
      fontSize: '11px',
      color: '#00ff00',
      fontFamily: 'monospace',
      backgroundColor: '#0a0a0a',
      padding: { x: 10, y: 10 },
      wordWrap: { width: boxWidth - 60 }
    }).setOrigin(0.5, 0);

    // Explanation
    const explanation = this.add.text(0, boxHeight / 2 - 80, collectible.explanation, {
      fontSize: '13px',
      color: '#ffffff',
      fontFamily: 'monospace',
      wordWrap: { width: boxWidth - 40 },
      align: 'center'
    }).setOrigin(0.5);

    // Close button
    const closeBtn = this.add.rectangle(0, boxHeight / 2 - 30, 120, 35, 0x00ffff, 0.3);
    closeBtn.setStrokeStyle(2, 0x00ffff);
    const closeBtnText = this.add.text(0, boxHeight / 2 - 30, 'CLOSE', {
      fontSize: '14px',
      color: '#00ffff',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerover', () => closeBtn.setFillStyle(0x00ffff, 0.5));
    closeBtn.on('pointerout', () => closeBtn.setFillStyle(0x00ffff, 0.3));
    closeBtn.on('pointerdown', () => this.closeCodeModal());

    // Add all elements
    this.codeModal.add([backdrop, modalBg, title, langLabel, codeText, explanation, closeBtn, closeBtnText]);

    // Close on ESC or SPACE key
    const escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    const spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    const closeHandler = () => {
      this.closeCodeModal();
      escKey.off('down', closeHandler);
      spaceKey.off('down', closeHandler);
    };

    escKey.once('down', closeHandler);
    spaceKey.once('down', closeHandler);
  }

  private closeCodeModal(): void {
    if (this.codeModal) {
      this.codeModal.destroy();
      this.codeModal = null;
    }
  }

  private async initializeAchievements(): Promise<void> {
    await this.achievementEngine.loadAchievements();
    this.sessionStartTime = Date.now();

    // Listen for achievement unlocks
    this.achievementEngine.on('achievement-unlocked', (achievement: any) => {
      this.achievementToast.show(achievement);
    });

    // Tab key for collectibles panel
    const tabKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
    tabKey.on('down', () => {
      this.toggleCollectiblesPanel();
    });

    // Konami code detection
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      const key = event.key.toUpperCase();
      const keyMap: Record<string, string> = {
        'ARROWUP': 'UP',
        'ARROWDOWN': 'DOWN',
        'ARROWLEFT': 'LEFT',
        'ARROWRIGHT': 'RIGHT'
      };

      const mappedKey = keyMap[key] || key;
      this.konamiSequence.push(mappedKey);

      // Keep only last 10 keys
      if (this.konamiSequence.length > 10) {
        this.konamiSequence.shift();
      }

      // Check if sequence matches
      if (this.konamiSequence.length === 10) {
        const match = this.konamiSequence.every((k, i) => k === this.konamiTarget[i]);
        if (match) {
          this.triggerKonamiEffect();
        }
      }
    });
  }

  private toggleCollectiblesPanel(): void {
    if (!this.panelOpened) {
      this.panelOpened = true;
      this.checkAchievements(); // Check curious achievement
    }

    const data = {
      collectibles: {
        found: this.secretsManager.getCollected().map(id =>
          this.secretsManager.getCollectibleById(id)!
        ).filter(c => c !== undefined),
        total: this.secretsManager.getTotalCount()
      },
      achievements: {
        unlocked: this.achievementEngine.getAll().filter(a =>
          this.achievementEngine.isUnlocked(a.id)
        ),
        all: this.achievementEngine.getAll()
      },
      stats: {
        buildingsVisited: this.buildingsVisited.size,
        totalBuildings: 10,
        npcsInteracted: this.npcsInteracted.size,
        totalNPCs: 3,
        timeSpent: this.getTimeSpent()
      }
    };

    this.collectiblesPanel.toggle(data);
  }

  private triggerKonamiEffect(): void {
    // Visual effect: camera shake and flash
    this.cameras.main.shake(500, 0.01);
    this.cameras.main.flash(500, 100, 200, 255);

    // Check achievement
    this.checkAchievements();
  }

  private getTimeSpent(): number {
    const elapsed = Math.floor((Date.now() - this.sessionStartTime) / 1000);
    return this.timeSpentTotal + elapsed;
  }

  private getGameState(): GameState {
    return {
      collectiblesFound: this.secretsManager.getCollectedCount(),
      collectiblesTotal: this.secretsManager.getTotalCount(),
      buildingsVisited: this.buildingsVisited,
      npcsInteracted: this.npcsInteracted,
      dialogueCount: this.dialogueCountTotal,
      timeSpent: this.getTimeSpent(),
      currentTheme: this.themeEngine.getCurrentTheme()?.id || 'default',
      panelOpened: this.panelOpened,
      konamiEntered: this.konamiSequence.length === 10 &&
        this.konamiSequence.every((k, i) => k === this.konamiTarget[i])
    };
  }

  private checkAchievements(): void {
    const state = this.getGameState();
    this.achievementEngine.checkAll(state);
  }

  override update(): void {
    // Handle dialogue input when active or modal is open
    if (this.dialogueActive || this.codeModal) {
      if (this.dialogueActive) {
        this.dialogueBox.update();
      }
      return;
    }

    // Normal gameplay
    this.playerController.update();
    this.interactionSystem.update();

    const player = this.playerController.sprite;
    this.npcManager.update(player.x, player.y);

    // Collectible pickup check
    const pickedCollectible = this.secretsManager.checkPickup(player.x, player.y);
    if (pickedCollectible) {
      this.playerController.sprite.setVelocity(0); // Stop player movement
      this.showCodeModal(pickedCollectible);
      this.checkAchievements(); // Check for source_diver achievement
      return; // Don't check NPC interaction when picking up collectible
    }

    // Time-based achievement check (every second)
    if (this.time.now % 1000 < 16) { // Approximately every second
      this.checkAchievements();
    }

    // NPC proximity check
    const closestNPC = this.npcManager.getClosestNPC(player.x, player.y);
    if (closestNPC && !this.dialogueActive) {
      this.npcPrompt!.setPosition(closestNPC.x, closestNPC.y - 20);
      this.npcPrompt!.setVisible(true);

      // Check for interaction key press
      const interactPressed = this.interactKey.isDown && !this.interactWasDown;
      this.interactWasDown = this.interactKey.isDown;

      if (interactPressed) {
        this.startDialogue(closestNPC.dialogueId, closestNPC.name);
      }
    } else {
      this.npcPrompt!.setVisible(false);
      this.interactWasDown = this.interactKey.isDown;
    }
  }

  private startDialogue(dialogueId: string, npcName: string): void {
    const cacheKey = `dialogue-${dialogueId}`;
    const data = this.cache.json.get(cacheKey) as DialogueTreeData | undefined;
    if (!data) {
      console.warn(`No dialogue data found for key: ${cacheKey}`);
      return;
    }

    // Track NPC interaction
    this.npcsInteracted.add(dialogueId);

    this.dialogueActive = true;
    this.playerController.sprite.setVelocity(0);
    this.currentDialogueTree = DialogueTree.fromJSON(data);

    const startNode = this.currentDialogueTree.getStartNode();
    if (!startNode) {
      this.endDialogue();
      return;
    }

    this.showDialogueNode(startNode);
  }

  private showDialogueNode(node: DialogueNode): void {
    if (!this.currentDialogueTree) return;

    const text = node.text;
    const availableChoices = this.currentDialogueTree.getAvailableChoices(node, this.gameState);

    // Process triggers
    if (node.triggers) {
      for (const trigger of node.triggers) {
        if (trigger.type === 'setFlag' && trigger.data['flag']) {
          this.gameState[trigger.data['flag'] as string] = true;
        }
      }
    }

    // Convert DialogueTree choices to DialogueBox choices
    const boxChoices: DialogueChoice[] = availableChoices.map(c => ({
      text: c.text,
      nextNodeId: c.nextNodeId
    }));

    if (boxChoices.length > 0) {
      // Node with choices
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
      // Linear node — advance to next on completion
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
      // Terminal node
      this.dialogueBox.show(
        text,
        node.speaker,
        () => this.endDialogue()
      );
    }
  }

  private endDialogue(): void {
    this.dialogueActive = false;

    // Track dialogue completion for achievements
    if (this.currentDialogueTree) {
      this.dialogueCountTotal++;
      // Track which NPC was talked to (extract from dialogue tree ID if possible)
      this.checkAchievements();
    }

    this.currentDialogueTree = null;
    this.dialogueBox.hide();
  }

  private getDoorProperty(door: Phaser.Types.Tilemaps.TiledObject, name: string): string | undefined {
    if (!door.properties) return undefined;
    const props = door.properties as Array<{ name: string; value: unknown }>;
    const prop = props.find(p => p.name === name);
    return prop?.value as string | undefined;
  }
}
