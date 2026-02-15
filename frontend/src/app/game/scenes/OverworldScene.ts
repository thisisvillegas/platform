import * as Phaser from 'phaser';
import { PlayerController } from '../systems/PlayerController';
import { WorldLoader } from '../systems/WorldLoader';
import { CameraController } from '../systems/CameraController';
import { CollisionSystem } from '../systems/CollisionSystem';
import { InteractionSystem } from '../systems/InteractionSystem';
import { SceneTransition } from '../systems/SceneTransition';

export class OverworldScene extends Phaser.Scene {
  private playerController!: PlayerController;
  private worldLoader!: WorldLoader;
  private cameraController!: CameraController;
  private collisionSystem!: CollisionSystem;
  private interactionSystem!: InteractionSystem;
  private transition!: SceneTransition;
  private spawnX?: number;
  private spawnY?: number;

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
  }

  create(): void {
    this.transition = new SceneTransition(this);

    // Build tilemap with all layers
    this.worldLoader.create();

    // Determine spawn position (returning from interior overrides default)
    const defaultSpawn = this.worldLoader.getSpawnPoint();
    const startX = this.spawnX ?? defaultSpawn.x;
    const startY = this.spawnY ?? defaultSpawn.y;

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
        this.interactionSystem.registerInteractable(
          door.x, door.y,
          { buildingId },
          (data) => {
            this.transition.transitionTo('InteriorScene', {
              buildingId: data['buildingId'],
              returnX: player.x,
              returnY: player.y
            });
          }
        );
      }
    }

    this.transition.fadeIn();
  }

  override update(): void {
    this.playerController.update();
    this.interactionSystem.update();
  }

  private getDoorProperty(door: Phaser.Types.Tilemaps.TiledObject, name: string): string | undefined {
    if (!door.properties) return undefined;
    const props = door.properties as Array<{ name: string; value: unknown }>;
    const prop = props.find(p => p.name === name);
    return prop?.value as string | undefined;
  }
}
