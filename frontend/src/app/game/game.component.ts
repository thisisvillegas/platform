import { Component, OnInit, OnDestroy, AfterViewInit, NgZone } from '@angular/core';
import Phaser from 'phaser';
import { createPhaserConfig } from './phaser-config';
import { PhaserBridgeService } from './services/phaser-bridge.service';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [],
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss'
})
export class GameComponent implements OnInit, AfterViewInit, OnDestroy {
  private game?: Phaser.Game;
  isBootstrapping = true;

  constructor(
    private ngZone: NgZone,
    private phaserBridge: PhaserBridgeService
  ) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      const config = createPhaserConfig('game-container');
      this.game = new Phaser.Game(config);

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
