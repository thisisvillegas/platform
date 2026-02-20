import { Component, OnInit, OnDestroy, AfterViewInit, NgZone, Input } from '@angular/core';
import { Location } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import * as Phaser from 'phaser';
import { createPhaserConfig } from './phaser-config';
import { PhaserBridgeService } from './services/phaser-bridge.service';
import { WorldNavigationService } from './services/world-navigation.service';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [],
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss'
})
export class GameComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() initialScene: string = 'CinematicScene';

  private game?: Phaser.Game;
  isBootstrapping = true;
  showLandscapePrompt = false;
  private orientationQuery?: MediaQueryList;
  private orientationHandler?: (e: MediaQueryListEvent) => void;
  private isMobile = false;

  constructor(
    private ngZone: NgZone,
    private phaserBridge: PhaserBridgeService,
    private worldNavigation: WorldNavigationService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location
  ) {}

  ngOnInit(): void {
    // Read initial scene from route data
    const routeScene = this.route.snapshot.data['initialScene'];
    if (routeScene) {
      this.initialScene = routeScene;
    }

    // Detect mobile via touch capability + small screen
    this.isMobile = ('ontouchstart' in window || navigator.maxTouchPoints > 0)
      && window.innerWidth < 1024;

    if (this.isMobile) {
      this.setupOrientationPrompt();
    }
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      const config = createPhaserConfig('game-container', this.initialScene);
      this.game = new Phaser.Game(config);

      // Register navigation callback so Phaser scenes can trigger Angular routing
      this.game.registry.set('navigateToApp', (
        buildingId: string, route: string, playerX: number, playerY: number, isExternal: boolean
      ) => {
        this.ngZone.run(() => {
          this.worldNavigation.navigateToApp(buildingId, playerX, playerY, route, isExternal);
        });
      });

      // Register callback for navigating to projects page from DoorScene
      this.game.registry.set('navigateToProjects', () => {
        this.ngZone.run(() => {
          this.router.navigate(['/projects']);
        });
      });

      // Sync browser URL to /world when OverworldScene activates
      // (prevents browser back landing on / and replaying the cinematic)
      this.game.registry.set('syncWorldUrl', () => {
        this.ngZone.run(() => {
          if (this.location.path() !== '/world') {
            this.location.replaceState('/world');
          }
        });
      });

      // Hide bootstrap overlay once Phaser canvas is ready
      setTimeout(() => {
        this.ngZone.run(() => {
          this.isBootstrapping = false;
        });
      }, 100);
    });
  }

  /** Show overlay when mobile is in portrait; auto-dismiss on landscape. */
  private setupOrientationPrompt(): void {
    this.orientationQuery = window.matchMedia('(orientation: portrait)');
    this.showLandscapePrompt = this.orientationQuery.matches;

    this.orientationHandler = (e: MediaQueryListEvent) => {
      this.ngZone.run(() => {
        this.showLandscapePrompt = e.matches;
      });
    };
    this.orientationQuery.addEventListener('change', this.orientationHandler);
  }

  /** Request fullscreen on mobile (called from the landscape prompt tap). */
  requestFullscreen(): void {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {});
    } else if ((elem as any).webkitRequestFullscreen) {
      (elem as any).webkitRequestFullscreen();
    }

    // Also try to lock to landscape if the API is available
    try {
      (screen.orientation as any)?.lock?.('landscape').catch(() => {});
    } catch { /* not supported — ignore */ }
  }

  ngOnDestroy(): void {
    if (this.game) {
      this.game.destroy(true, false);
      this.game = undefined;
    }

    // Clean up orientation listener
    if (this.orientationQuery && this.orientationHandler) {
      this.orientationQuery.removeEventListener('change', this.orientationHandler);
    }

    // Clean up any orphaned canvas elements
    const container = document.getElementById('game-container');
    if (container) {
      const canvases = container.querySelectorAll('canvas');
      canvases.forEach(canvas => canvas.remove());
    }
  }
}
