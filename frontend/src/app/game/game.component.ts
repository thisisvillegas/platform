import { Component, OnInit, OnDestroy, AfterViewInit, NgZone, Input } from '@angular/core';
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

  constructor(
    private ngZone: NgZone,
    private phaserBridge: PhaserBridgeService,
    private worldNavigation: WorldNavigationService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Read initial scene from route data
    const routeScene = this.route.snapshot.data['initialScene'];
    if (routeScene) {
      this.initialScene = routeScene;
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

      // Hide bootstrap overlay once Phaser canvas is ready
      setTimeout(() => {
        this.ngZone.run(() => {
          this.isBootstrapping = false;
        });
      }, 100);
    });
  }

  ngOnDestroy(): void {
    if (this.game) {
      this.game.destroy(true, false);
      this.game = undefined;
    }

    // Clean up any orphaned canvas elements
    const container = document.getElementById('game-container');
    if (container) {
      const canvases = container.querySelectorAll('canvas');
      canvases.forEach(canvas => canvas.remove());
    }
  }
}
