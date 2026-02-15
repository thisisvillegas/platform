import * as Phaser from 'phaser';
import { Achievement } from '../systems/AchievementEngine';
import { Collectible } from '../systems/SecretsManager';

export interface PanelData {
  collectibles: {
    found: Collectible[];
    total: number;
  };
  achievements: {
    unlocked: Achievement[];
    all: Achievement[];
  };
  stats: {
    buildingsVisited: number;
    totalBuildings: number;
    npcsInteracted: number;
    totalNPCs: number;
    timeSpent: number; // in seconds
  };
}

export class CollectiblesPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private isVisible = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  toggle(data: PanelData): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show(data);
    }
  }

  show(data: PanelData): void {
    if (this.isVisible) return;

    this.isVisible = true;
    const camera = this.scene.cameras.main;
    const width = camera.width;
    const height = camera.height;

    // Create panel container
    this.container = this.scene.add.container(width / 2, height / 2);
    this.container.setScrollFactor(0);
    this.container.setDepth(2500);

    // Backdrop
    const backdrop = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.9);
    backdrop.setOrigin(0.5);

    // Panel box
    const panelWidth = Math.min(700, width - 40);
    const panelHeight = Math.min(550, height - 40);
    const panelBg = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x1a1a2e);
    panelBg.setStrokeStyle(3, 0x00ffff);

    // Title
    const title = this.scene.add.text(0, -panelHeight / 2 + 30, 'COLLECTIBLES & ACHIEVEMENTS', {
      fontSize: '20px',
      color: '#00ffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Close hint
    const closeHint = this.scene.add.text(0, -panelHeight / 2 + 55, 'Press C or ESC to close', {
      fontSize: '10px',
      color: '#888888',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    // Sections
    let yOffset = -panelHeight / 2 + 90;

    // 1. Collectibles section
    const collectiblesTitle = this.scene.add.text(-panelWidth / 2 + 20, yOffset, `CODE FRAGMENTS: ${data.collectibles.found.length}/${data.collectibles.total}`, {
      fontSize: '14px',
      color: '#00ffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    });
    yOffset += 25;

    // List collected fragments (clickable to re-read code)
    const collectibleItems: Phaser.GameObjects.GameObject[] = [];
    const maxVisible = 8;
    const toShow = data.collectibles.found.slice(0, maxVisible);
    for (const collectible of toShow) {
      const item = this.scene.add.text(-panelWidth / 2 + 30, yOffset, `✓ ${collectible.title}`, {
        fontSize: '11px',
        color: '#00ff00',
        fontFamily: 'monospace'
      });
      item.setInteractive({ useHandCursor: true });
      item.on('pointerover', () => item.setColor('#00ffff'));
      item.on('pointerout', () => item.setColor('#00ff00'));
      item.on('pointerdown', () => {
        this.hide();
        this.scene.events.emit('collectible-view', collectible);
      });
      collectibleItems.push(item);
      yOffset += 18;
    }

    if (data.collectibles.found.length > maxVisible) {
      const more = this.scene.add.text(-panelWidth / 2 + 30, yOffset, `... and ${data.collectibles.found.length - maxVisible} more`, {
        fontSize: '10px',
        color: '#888888',
        fontFamily: 'monospace',
        fontStyle: 'italic'
      });
      collectibleItems.push(more);
      yOffset += 18;
    }

    yOffset += 15;

    // 2. Achievements section
    const achievementsTitle = this.scene.add.text(-panelWidth / 2 + 20, yOffset, `ACHIEVEMENTS: ${data.achievements.unlocked.length}/${data.achievements.all.length}`, {
      fontSize: '14px',
      color: '#00ffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    });
    yOffset += 25;

    // Grid of achievement badges (3 per row)
    const achievementItems: Phaser.GameObjects.GameObject[] = [];
    const startX = -panelWidth / 2 + 50;
    let gridX = startX;
    let gridY = yOffset;
    const spacing = 100;

    for (let i = 0; i < data.achievements.all.length; i++) {
      const achievement = data.achievements.all[i];
      const isUnlocked = data.achievements.unlocked.some(u => u.id === achievement.id);

      // Badge icon
      const badge = this.scene.add.text(gridX, gridY, achievement.icon, {
        fontSize: '24px'
      }).setOrigin(0.5).setAlpha(isUnlocked ? 1.0 : 0.3);

      // Badge name
      const badgeName = this.scene.add.text(gridX, gridY + 20, achievement.name, {
        fontSize: '9px',
        color: isUnlocked ? '#ffffff' : '#444444',
        fontFamily: 'monospace',
        align: 'center',
        wordWrap: { width: 80 }
      }).setOrigin(0.5, 0);

      achievementItems.push(badge, badgeName);

      gridX += spacing;
      if ((i + 1) % 3 === 0) {
        gridX = startX;
        gridY += 60;
      }
    }

    yOffset = gridY + 60;

    // 3. Exploration stats section
    const statsTitle = this.scene.add.text(-panelWidth / 2 + 20, yOffset, 'EXPLORATION STATS', {
      fontSize: '14px',
      color: '#00ffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    });
    yOffset += 25;

    const buildingStat = this.scene.add.text(-panelWidth / 2 + 30, yOffset, `Buildings visited: ${data.stats.buildingsVisited}/${data.stats.totalBuildings}`, {
      fontSize: '11px',
      color: '#ffffff',
      fontFamily: 'monospace'
    });
    yOffset += 18;

    const npcStat = this.scene.add.text(-panelWidth / 2 + 30, yOffset, `NPCs talked to: ${data.stats.npcsInteracted}/${data.stats.totalNPCs}`, {
      fontSize: '11px',
      color: '#ffffff',
      fontFamily: 'monospace'
    });
    yOffset += 18;

    const minutes = Math.floor(data.stats.timeSpent / 60);
    const seconds = data.stats.timeSpent % 60;
    const timeStat = this.scene.add.text(-panelWidth / 2 + 30, yOffset, `Time spent: ${minutes}m ${seconds}s`, {
      fontSize: '11px',
      color: '#ffffff',
      fontFamily: 'monospace'
    });

    // Add all elements to container
    this.container.add([
      backdrop,
      panelBg,
      title,
      closeHint,
      collectiblesTitle,
      ...collectibleItems,
      achievementsTitle,
      statsTitle,
      buildingStat,
      npcStat,
      timeStat,
      ...achievementItems
    ]);

    // Make backdrop clickable to close
    backdrop.setInteractive();
    backdrop.on('pointerdown', () => this.hide());
  }

  hide(): void {
    if (!this.isVisible) return;

    this.isVisible = false;
    this.container?.destroy();
    this.container = null;
  }

  getIsVisible(): boolean {
    return this.isVisible;
  }
}
