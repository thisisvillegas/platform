import * as Phaser from 'phaser';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: AchievementCondition;
}

export interface AchievementCondition {
  type: string;
  target?: string;
  count?: number;
  theme?: string;
  seconds?: number;
}

export interface GameState {
  collectiblesFound: number;
  collectiblesTotal: number;
  buildingsVisited: Set<string>;
  npcsInteracted: Set<string>;
  dialogueCount: number;
  timeSpent: number;
  currentTheme: string;
  panelOpened: boolean;
  konamiEntered: boolean;
}

export class AchievementEngine extends Phaser.Events.EventEmitter {
  private achievements: Achievement[] = [];
  private unlocked: Set<string> = new Set();

  constructor() {
    super();
  }

  async loadAchievements(): Promise<void> {
    try {
      const response = await fetch('/assets/worlds/village/secrets/achievements.json');
      this.achievements = await response.json();
    } catch (error) {
      console.error('Failed to load achievements:', error);
      this.achievements = [];
    }
  }

  checkUnlock(achievement: Achievement, state: GameState): boolean {
    if (this.unlocked.has(achievement.id)) {
      return false; // Already unlocked
    }

    const condition = achievement.condition;
    let unlocked = false;

    switch (condition.type) {
      case 'collectAll':
        unlocked = state.collectiblesFound >= state.collectiblesTotal && state.collectiblesTotal > 0;
        break;

      case 'visitAll':
        unlocked = state.buildingsVisited.size >= (condition.count ?? 10);
        break;

      case 'interactAll':
        // Check if all NPCs have been talked to (we'll track this in scene)
        unlocked = state.npcsInteracted.size >= 3; // Assuming 3 NPCs for now
        break;

      case 'themeVisit':
        unlocked = state.currentTheme === condition.theme;
        break;

      case 'konamiCode':
        unlocked = state.konamiEntered;
        break;

      case 'openPanel':
        unlocked = state.panelOpened;
        break;

      case 'visitBuilding':
        unlocked = state.buildingsVisited.size >= (condition.count ?? 1);
        break;

      case 'dialogueCount':
        unlocked = state.dialogueCount >= (condition.count ?? 10);
        break;

      case 'timeSpent':
        unlocked = state.timeSpent >= (condition.seconds ?? 1800);
        break;
    }

    if (unlocked) {
      this.unlocked.add(achievement.id);
      this.emit('achievement-unlocked', achievement);
      return true;
    }

    return false;
  }

  checkAll(state: GameState): Achievement[] {
    const newlyUnlocked: Achievement[] = [];

    for (const achievement of this.achievements) {
      if (this.checkUnlock(achievement, state)) {
        newlyUnlocked.push(achievement);
      }
    }

    return newlyUnlocked;
  }

  getUnlocked(): string[] {
    return Array.from(this.unlocked);
  }

  getAll(): Achievement[] {
    return [...this.achievements];
  }

  isUnlocked(id: string): boolean {
    return this.unlocked.has(id);
  }

  // For progress restoration
  setUnlocked(achievementIds: string[]): void {
    this.unlocked = new Set(achievementIds);
  }
}
