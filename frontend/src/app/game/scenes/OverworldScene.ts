import * as Phaser from 'phaser';
import { PlayerController } from '../systems/PlayerController';
import { WorldLoader } from '../systems/WorldLoader';
import { CameraController } from '../systems/CameraController';
import { CollisionSystem } from '../systems/CollisionSystem';
import { InteractionSystem } from '../systems/InteractionSystem';
import { SceneTransition } from '../systems/SceneTransition';
import { AudioManager } from '../systems/AudioManager';
import { AudioControlsUI } from '../ui/AudioControlsUI';
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
import { MobileControls, isTouchDevice } from '../ui/MobileControls';
import { environment } from '../../../environments/environment';

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
  private audioControls!: AudioControlsUI;
  private themeEngine!: ThemeEngine;
  private secretsManager!: SecretsManager;
  private achievementEngine!: AchievementEngine;
  private achievementToast!: AchievementToast;
  private collectiblesPanel!: CollectiblesPanel;
  private themeToggleButton!: Phaser.GameObjects.Text;
  private mobileControls!: MobileControls;
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
  private lastAutoSave = 0;
  private achievementsReady = false;
  private lastAchievementCheckTime = 0;

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
  private escKey!: Phaser.Input.Keyboard.Key;

  // Stored handler references for cleanup on shutdown
  private beforeUnloadHandler: (() => void) | null = null;
  private konamiHandler: ((event: KeyboardEvent) => void) | null = null;
  private achievementHandler: ((achievement: any) => void) | null = null;

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

    // Load dialogue JSON files (overworld NPCs)
    this.load.json('dialogue-claude-townsquare', '/assets/worlds/village/dialogue/claude-townsquare.json');
    this.load.json('dialogue-signpost', '/assets/worlds/village/dialogue/signpost.json');
    this.load.json('dialogue-villager-01', '/assets/worlds/village/dialogue/villager-01.json');

    // Load interior dialogue JSON files (shared cache, available in InteriorScene)
    const dialogueBase = '/assets/worlds/village/dialogue';
    const interiorIds = [
      'interior-smart-home', 'interior-war-room',
      'interior-greenhouse', 'interior-desaogo',
      'interior-gridup', 'interior-server-shack', 'interior-about-house',
      'interior-plaza', 'interior-holochronicle'
    ];
    for (const id of interiorIds) {
      this.load.json(`dialogue-${id}`, `${dialogueBase}/${id}.json`);
    }

    // Load audio assets
    const audioBase = '/assets/worlds/village/audio';
    this.load.audio('ambient', `${audioBase}/ambient.wav`);
    this.load.audio('door-enter', `${audioBase}/door-enter.wav`);
    this.load.audio('npc-talk', `${audioBase}/npc-talk.wav`);
    this.load.audio('collectible-pickup', `${audioBase}/collectible-pickup.wav`);
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

            // Play door entry sound effect
            this.audioManager.playSFX('door-enter', 0.5);

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

    // Mobile controls (only renders on touch devices)
    this.mobileControls = new MobileControls(this);
    this.mobileControls.onMenu = () => this.toggleCollectiblesPanel();

    // NPC interaction prompt (shown/hidden based on proximity)
    const promptText = isTouchDevice() ? 'Tap A to talk' : 'Press SPACE to talk';
    this.npcPrompt = this.add.text(0, 0, promptText, {
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
    this.escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    // Audio (graceful degradation — works silently with no audio files)
    this.audioManager = new AudioManager(this);
    this.audioManager.initialize(); // Autoplay compliance
    this.audioManager.playMusic('ambient', 0.3);

    // Audio controls UI (mute/unmute button)
    this.audioControls = new AudioControlsUI(this, this.audioManager);

    // SecretsManager: code fragment collectibles
    this.secretsManager = new SecretsManager(this);
    this.initializeSecrets();

    // Achievement system
    this.achievementEngine = new AchievementEngine();
    this.achievementToast = new AchievementToast(this);
    this.collectiblesPanel = new CollectiblesPanel(this);
    this.initializeAchievements();

    // Listen for collectible re-view requests from panel
    this.events.on('collectible-view', (collectible: Collectible) => {
      this.showCodeModal(collectible);
    });

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

    // Tooltip for theme toggle
    const themeTooltip = this.add.text(0, 0, 'Change theme', {
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: '#000000cc',
      padding: { x: 6, y: 3 },
      fontFamily: 'monospace'
    });
    themeTooltip.setOrigin(1, 0);
    themeTooltip.setScrollFactor(0);
    themeTooltip.setDepth(1001);
    themeTooltip.setVisible(false);
    this.themeToggleButton.on('pointerover', () => {
      themeTooltip.setPosition(this.themeToggleButton.x, this.themeToggleButton.y + 34);
      themeTooltip.setVisible(true);
    });
    this.themeToggleButton.on('pointerout', () => themeTooltip.setVisible(false));

    // Handle canvas resize for UI elements
    this.scale.on('resize', this.handleResize, this);
    this.handleResize();

    this.transition.fadeIn();

    // Bind shutdown to Phaser's scene lifecycle so cleanup actually runs
    this.events.once('shutdown', this.shutdown, this);

    // Sync Angular URL to /world so browser back doesn't replay the cinematic
    const syncUrl = this.game.registry.get('syncWorldUrl') as (() => void) | undefined;
    if (syncUrl) syncUrl();

    // Onboarding: show 3-step tooltip on first spawn
    if (!localStorage.getItem('onboardingCompleted')) {
      this.showOnboarding();
    }
  }

  private showOnboarding(): void {
    const touch = isTouchDevice();
    const steps = touch ? [
      'Use the joystick to move',
      'Walk to NPCs and tap A to talk',
      'Explore buildings by walking to doors'
    ] : [
      'Use WASD or arrow keys to move',
      'Walk to NPCs and press SPACE to talk',
      'Explore buildings by walking to doors'
    ];

    const camera = this.cameras.main;
    let stepIndex = 0;

    const container = this.add.container(camera.width / 2, camera.height - 60);
    container.setScrollFactor(0);
    container.setDepth(3000);

    const bg = this.add.rectangle(0, 0, 340, 40, 0x000000, 0.85);
    bg.setStrokeStyle(1, 0x00ffff, 0.6);
    const label = this.add.text(0, 0, steps[0], {
      fontSize: '13px',
      color: '#00ffcc',
      fontFamily: 'monospace',
      align: 'center'
    }).setOrigin(0.5);
    const hint = this.add.text(0, 18, 'press any key to continue', {
      fontSize: '9px',
      color: '#666688',
      fontFamily: 'monospace'
    }).setOrigin(0.5);
    container.add([bg, label, hint]);

    // Gentle pulse
    this.tweens.add({
      targets: container,
      alpha: { from: 0, to: 1 },
      duration: 400,
      ease: 'Sine.easeIn'
    });

    const advance = () => {
      stepIndex++;
      if (stepIndex >= steps.length) {
        // Onboarding complete
        container.destroy();
        localStorage.setItem('onboardingCompleted', '1');
        this.input.keyboard!.off('keydown', advance);
        return;
      }
      label.setText(steps[stepIndex]);
      // Brief flash effect on advance
      this.tweens.add({
        targets: label,
        alpha: { from: 0.3, to: 1 },
        duration: 200
      });
    };

    this.input.keyboard!.on('keydown', advance);

    // Auto-advance fallback: 4 seconds per step
    let autoTimer: Phaser.Time.TimerEvent;
    const scheduleAuto = () => {
      autoTimer = this.time.delayedCall(4000, () => {
        advance();
        if (stepIndex < steps.length) {
          scheduleAuto();
        }
      });
    };
    scheduleAuto();
  }

  private handleResize(): void {
    const camera = this.cameras.main;
    // Theme toggle sits below the audio mute button (audio is at y=20, ~40px tall)
    this.themeToggleButton.setPosition(camera.width - 10, 60);
    this.audioControls.resize(camera.width, camera.height);
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

    // Create modal container (centered, so scale 1/zoom counteracts camera zoom)
    this.codeModal = this.add.container(width / 2, height / 2);
    this.codeModal.setScrollFactor(0);
    this.codeModal.setDepth(2000);
    this.codeModal.setScale(1 / camera.zoom);

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
    // ESC/SPACE close is handled centrally in update() to prevent stale key state
  }

  private closeCodeModal(): void {
    if (this.codeModal) {
      this.codeModal.destroy();
      this.codeModal = null;
    }
  }

  private async initializeAchievements(): Promise<void> {
    this.achievementsReady = false;
    await this.achievementEngine.loadAchievements();
    this.sessionStartTime = Date.now();

    // Load saved progress (server first, localStorage fallback)
    await this.loadProgress();

    // Mark achievements as ready AFTER progress is loaded — prevents re-triggering
    this.achievementsReady = true;

    // Listen for achievement unlocks (store ref for cleanup)
    this.achievementHandler = (achievement: any) => {
      this.achievementToast.show(achievement);
      // Persist immediately on unlock so it's never lost
      this.saveProgressLocal();
    };
    this.achievementEngine.on('achievement-unlocked', this.achievementHandler);

    // C key for collectibles panel (avoids hijacking TAB for accessibility)
    const collectiblesKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    collectiblesKey.on('down', () => {
      if (!this.dialogueActive && !this.codeModal) {
        this.toggleCollectiblesPanel();
      }
    });

    // ESC close for collectibles panel is handled centrally in update()

    // Konami code detection (store ref for cleanup)
    this.konamiHandler = (event: KeyboardEvent) => {
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
    };
    this.input.keyboard!.on('keydown', this.konamiHandler);

    // Setup auto-save on beforeunload
    this.setupAutoSave();
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
    if (!this.achievementsReady) return; // Don't check until progress is loaded
    const state = this.getGameState();
    this.achievementEngine.checkAll(state);
  }

  override update(): void {
    // Theme particles must track camera every frame regardless of dialogue state
    this.themeEngine?.update();

    // Update mobile controls edge detection
    this.mobileControls.update();

    // Feed joystick input to player controller
    this.playerController.joystickDx = this.mobileControls.dx;
    this.playerController.joystickDy = this.mobileControls.dy;

    // Dialogue mode: DialogueBox handles all input including its own ESC
    if (this.dialogueActive) {
      // Feed mobile action button to dialogue advance
      if (this.mobileControls.actionPressed) {
        this.dialogueBox.externalAdvance = true;
      }
      this.dialogueBox.update();
      this.interactionSystem.syncKeys();
      this.mobileControls.setVisible(false);
      return;
    }

    // Code modal: close on ESC or SPACE or mobile action
    if (this.codeModal) {
      if (Phaser.Input.Keyboard.JustDown(this.escKey) ||
          Phaser.Input.Keyboard.JustDown(this.interactKey) ||
          this.mobileControls.actionPressed) {
        this.closeCodeModal();
      }
      this.interactionSystem.syncKeys();
      this.mobileControls.setVisible(false);
      return;
    }

    // Collectibles panel: close on ESC or mobile menu
    if (this.collectiblesPanel.getIsVisible()) {
      if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
        this.collectiblesPanel.hide();
      }
      this.interactionSystem.syncKeys();
      this.mobileControls.setVisible(false);
      return;
    }

    // Show mobile controls during normal gameplay
    this.mobileControls.setVisible(true);

    // Normal gameplay — feed mobile action to interaction system for door entry
    if (this.mobileControls.actionPressed) {
      this.interactionSystem.externalAction = true;
    }
    this.playerController.update();
    this.interactionSystem.update();

    const player = this.playerController.sprite;
    this.npcManager.update(player.x, player.y);

    // Collectible pickup check
    const pickedCollectible = this.secretsManager.checkPickup(player.x, player.y);
    if (pickedCollectible) {
      this.playerController.sprite.setVelocity(0); // Stop player movement
      this.audioManager.playSFX('collectible-pickup', 0.5); // Play pickup sound
      this.showCodeModal(pickedCollectible);
      this.checkAchievements(); // Check for source_diver achievement
      return; // Don't check NPC interaction when picking up collectible
    }

    // Time-based achievement check (every 2 seconds, using elapsed delta)
    if (this.time.now - this.lastAchievementCheckTime > 2000) {
      this.lastAchievementCheckTime = this.time.now;
      this.checkAchievements();
    }

    // Auto-save progress every 30 seconds
    if (this.time.now - this.lastAutoSave > 30000) {
      this.lastAutoSave = this.time.now;
      this.saveProgress();
    }

    // NPC proximity check — only show prompt for NPCs with dialogue
    const closestNPC = this.npcManager.getClosestNPC(player.x, player.y);
    if (closestNPC && !this.dialogueActive && closestNPC.dialogueId) {
      this.npcPrompt!.setPosition(closestNPC.x, closestNPC.y - 20);
      this.npcPrompt!.setVisible(true);

      // Check for interaction key press (keyboard or mobile action button)
      const interactPressed = (this.interactKey.isDown && !this.interactWasDown) || this.mobileControls.actionPressed;
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
      // Show a generic fallback line for NPCs without dialogue data
      this.dialogueActive = true;
      this.playerController.sprite.setVelocity(0);
      this.audioManager.playSFX('npc-talk', 0.5);
      this.dialogueBox.show(
        '...',
        npcName,
        () => this.endDialogue()
      );
      return;
    }

    // Track NPC interaction
    this.npcsInteracted.add(dialogueId);

    // Play NPC talk sound effect
    this.audioManager.playSFX('npc-talk', 0.5);

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

  private applyProgressData(p: Record<string, unknown>): void {
    // Restore collectibles
    if (p['collectibles'] && Array.isArray(p['collectibles'])) {
      this.secretsManager.setCollected(p['collectibles'] as string[]);
    }

    // Restore achievements
    if (p['achievements'] && Array.isArray(p['achievements'])) {
      this.achievementEngine.setUnlocked(p['achievements'] as string[]);
    }

    // Restore tracking data
    if (p['buildingsVisited'] && Array.isArray(p['buildingsVisited'])) {
      this.buildingsVisited = new Set(p['buildingsVisited'] as string[]);
    }
    if (p['npcsInteracted'] && Array.isArray(p['npcsInteracted'])) {
      this.npcsInteracted = new Set(p['npcsInteracted'] as string[]);
    }
    if (typeof p['dialogueCount'] === 'number') {
      this.dialogueCountTotal = p['dialogueCount'];
    }
    if (typeof p['timeSpent'] === 'number') {
      this.timeSpentTotal = p['timeSpent'];
    }
    if (typeof p['panelOpened'] === 'boolean') {
      this.panelOpened = p['panelOpened'];
    }
  }

  private async loadProgress(): Promise<void> {
    const token = localStorage.getItem('guest_token');

    // Try server first if we have a token
    if (token) {
      try {
        const response = await fetch(`${environment.apiUrl}/api/world/progress`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.progress) {
            this.applyProgressData(data.progress);
            console.log('Progress loaded from server');
            return;
          }
        } else {
          console.warn('Failed to load progress from server:', response.status);
        }
      } catch (error) {
        console.error('Error loading server progress:', error);
      }
    }

    // Fallback: load from localStorage
    try {
      const saved = localStorage.getItem('worldProgress');
      if (saved) {
        const p = JSON.parse(saved);
        this.applyProgressData(p);
        console.log('Progress loaded from localStorage');
      }
    } catch (error) {
      console.error('Error loading localStorage progress:', error);
    }
  }

  private getProgressData(): Record<string, unknown> {
    const player = this.playerController.sprite;
    return {
      collectibles: this.secretsManager.getCollected(),
      achievements: this.achievementEngine.getUnlocked(),
      buildingsVisited: Array.from(this.buildingsVisited),
      npcsInteracted: Array.from(this.npcsInteracted),
      dialogueCount: this.dialogueCountTotal,
      timeSpent: this.getTimeSpent(),
      panelOpened: this.panelOpened,
      lastPosition: { x: Math.round(player.x), y: Math.round(player.y) }
    };
  }

  /** Save progress to localStorage (synchronous, always available). */
  private saveProgressLocal(): void {
    try {
      localStorage.setItem('worldProgress', JSON.stringify(this.getProgressData()));
    } catch { /* quota exceeded or private browsing — ignore */ }
  }

  private async saveProgress(): Promise<void> {
    const progressData = this.getProgressData();

    // Always persist to localStorage as a reliable fallback
    this.saveProgressLocal();

    // Also persist to server if we have a guest token
    const token = localStorage.getItem('guest_token');
    if (!token) return;

    try {
      const response = await fetch(`${environment.apiUrl}/api/world/progress`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(progressData)
      });

      if (response.ok) {
        this.showSaveToast();
      } else {
        console.warn('Failed to save progress:', response.status);
      }
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }

  private showSaveToast(): void {
    const camera = this.cameras.main;
    const toast = this.add.text(camera.width / 2, camera.height - 30, '✓ Progress saved', {
      fontSize: '11px',
      color: '#00ff00',
      backgroundColor: '#000000cc',
      padding: { x: 8, y: 4 },
      fontFamily: 'monospace'
    });
    toast.setOrigin(0.5);
    toast.setScrollFactor(0);
    toast.setDepth(3000);
    toast.setAlpha(0);

    this.tweens.add({
      targets: toast,
      alpha: 1,
      duration: 300,
      yoyo: true,
      hold: 1500,
      onComplete: () => toast.destroy()
    });
  }

  private setupAutoSave(): void {
    // Save progress when leaving the page (store ref for cleanup)
    this.beforeUnloadHandler = () => {
      this.saveProgress();
    };
    window.addEventListener('beforeunload', this.beforeUnloadHandler);
  }

  /** Clean up all external listeners when the scene shuts down or restarts. */
  shutdown(): void {
    // Remove window-level listener
    if (this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      this.beforeUnloadHandler = null;
    }

    // Remove Konami keyboard listener
    if (this.konamiHandler) {
      this.input.keyboard?.off('keydown', this.konamiHandler);
      this.konamiHandler = null;
    }

    // Remove AchievementEngine EventEmitter listener
    if (this.achievementHandler) {
      this.achievementEngine?.off('achievement-unlocked', this.achievementHandler);
      this.achievementHandler = null;
    }

    // Remove scale resize listener
    this.scale.off('resize', this.handleResize, this);

    // Remove collectible-view event
    this.events.off('collectible-view');

    // Clean up ThemeEngine (its own resize handler + particles + audio)
    this.themeEngine?.destroy();

    // Clean up mobile controls
    this.mobileControls?.destroy();

    // Close any open modal
    this.closeCodeModal();

    // Final progress save
    this.saveProgress();
  }
}
