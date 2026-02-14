import { Injectable, EventEmitter } from '@angular/core';

export interface PhaserEvent {
  type: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class PhaserBridgeService {
  // Angular → Phaser
  public toPhaser$ = new EventEmitter<PhaserEvent>();

  // Phaser → Angular
  public fromPhaser$ = new EventEmitter<PhaserEvent>();

  constructor() {}

  // Send event from Angular to Phaser
  sendToPhaser(type: string, data?: any): void {
    this.toPhaser$.emit({ type, data });
  }

  // Send event from Phaser to Angular
  sendToAngular(type: string, data?: any): void {
    this.fromPhaser$.emit({ type, data });
  }

  // Subscribe to Phaser events from Angular
  onPhaserEvent(callback: (event: PhaserEvent) => void): void {
    this.fromPhaser$.subscribe(callback);
  }

  // Subscribe to Angular events from Phaser
  onAngularEvent(callback: (event: PhaserEvent) => void): void {
    this.toPhaser$.subscribe(callback);
  }
}
