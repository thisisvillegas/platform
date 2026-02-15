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
  private themeToggleButton!: Phaser.GameObjects.Text;
  private spawnX?: number;
  private spawnY?: number;

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

  override update(): void {
    // Handle dialogue input when active
    if (this.dialogueActive) {
      this.dialogueBox.update();
      return;
    }

    // Normal gameplay
    this.playerController.update();
    this.interactionSystem.update();

    const player = this.playerController.sprite;
    this.npcManager.update(player.x, player.y);

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
