import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

export interface SavedWorldPosition {
  x: number;
  y: number;
  buildingId: string;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class WorldNavigationService {
  private static readonly STORAGE_KEY = 'worldPosition';

  constructor(private router: Router) {}

  /**
   * Save player position and navigate to an app route.
   * For internal routes, uses Angular Router.
   * For external URLs, opens in a new tab.
   */
  navigateToApp(
    buildingId: string,
    playerX: number,
    playerY: number,
    route: string,
    isExternal: boolean
  ): void {
    this.savePosition(buildingId, playerX, playerY);

    if (isExternal) {
      window.open(route, '_blank');
    } else {
      this.router.navigate([route]);
    }
  }

  /** Navigate back to the game world. Position is restored from sessionStorage by OverworldScene. */
  returnToWorld(): void {
    this.router.navigate(['/world']);
  }

  getSavedPosition(): SavedWorldPosition | null {
    const data = sessionStorage.getItem(WorldNavigationService.STORAGE_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data) as SavedWorldPosition;
    } catch {
      return null;
    }
  }

  clearSavedPosition(): void {
    sessionStorage.removeItem(WorldNavigationService.STORAGE_KEY);
  }

  hasWorldSession(): boolean {
    return this.getSavedPosition() !== null;
  }

  private savePosition(buildingId: string, x: number, y: number): void {
    const position: SavedWorldPosition = { x, y, buildingId, timestamp: Date.now() };
    sessionStorage.setItem(WorldNavigationService.STORAGE_KEY, JSON.stringify(position));
  }
}
