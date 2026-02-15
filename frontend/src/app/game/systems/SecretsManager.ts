import * as Phaser from 'phaser';

export interface Collectible {
  id: string;
  position: { x: number; y: number };
  title: string;
  language: string;
  codeSnippet: string;
  explanation: string;
}

export class SecretsManager {
  private collectibles: Collectible[] = [];
  private collected: string[] = [];
  private collectibleSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  async loadCollectibles(): Promise<void> {
    try {
      const response = await fetch('/assets/worlds/village/secrets/collectibles.json');
      this.collectibles = await response.json();
    } catch (error) {
      console.error('Failed to load collectibles:', error);
      this.collectibles = [];
    }
  }

  renderCollectibles(): void {
    this.collectibles.forEach(collectible => {
      if (this.collected.includes(collectible.id)) {
        return; // Skip already collected items
      }

      // Create glowing collectible sprite
      const container = this.scene.add.container(collectible.position.x, collectible.position.y);

      // Background glow
      const glow = this.scene.add.circle(0, 0, 8, 0x00ffff, 0.3);

      // Code icon (</> symbol)
      const icon = this.scene.add.text(0, 0, '</>', {
        fontSize: '12px',
        color: '#00ffff',
        fontFamily: 'monospace',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      container.add([glow, icon]);
      container.setDepth(10); // Above map, below UI

      // Pulse animation
      this.scene.tweens.add({
        targets: container,
        scaleX: 1.2,
        scaleY: 1.2,
        alpha: 0.7,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      this.collectibleSprites.set(collectible.id, container);
    });
  }

  checkPickup(playerX: number, playerY: number): Collectible | null {
    const pickupRadius = 20; // Collision distance

    for (const collectible of this.collectibles) {
      if (this.collected.includes(collectible.id)) {
        continue; // Skip already collected
      }

      const distance = Phaser.Math.Distance.Between(
        playerX,
        playerY,
        collectible.position.x,
        collectible.position.y
      );

      if (distance < pickupRadius) {
        this.collectItem(collectible.id);
        return collectible;
      }
    }

    return null;
  }

  private collectItem(id: string): void {
    this.collected.push(id);

    // Remove sprite
    const sprite = this.collectibleSprites.get(id);
    if (sprite) {
      sprite.destroy();
      this.collectibleSprites.delete(id);
    }
  }

  getCollected(): string[] {
    return [...this.collected];
  }

  getTotalCount(): number {
    return this.collectibles.length;
  }

  getCollectedCount(): number {
    return this.collected.length;
  }

  getCollectibleById(id: string): Collectible | undefined {
    return this.collectibles.find(c => c.id === id);
  }

  getAllCollectibles(): Collectible[] {
    return [...this.collectibles];
  }

  // For progress restoration
  setCollected(collectedIds: string[]): void {
    this.collected = [...collectedIds];
  }
}
