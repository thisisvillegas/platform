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

  constructor(
    private ngZone: NgZone,
    private phaserBridge: PhaserBridgeService
  ) {}

  ngOnInit(): void {
    // Component initialization
  }

  ngAfterViewInit(): void {
    // Run Phaser outside Angular zone to prevent 60fps change detection
    this.ngZone.runOutsideAngular(() => {
      const config = createPhaserConfig('game-container');
      this.game = new Phaser.Game(config);
    });
  }

  ngOnDestroy(): void {
    // Critical: Destroy Phaser instance to prevent memory leaks
    if (this.game) {
      this.game.destroy(true);
      this.game = undefined;
    }
  }
}
