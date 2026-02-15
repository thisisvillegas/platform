import * as Phaser from 'phaser';
import { LoadingScene } from './scenes/loading-scene';
import { OverworldScene } from './scenes/OverworldScene';
import { InteriorScene } from './scenes/InteriorScene';

export function createPhaserConfig(parent: string): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: parent,
    width: 800,
    height: 600,
    pixelArt: true,
    roundPixels: true,
    backgroundColor: '#000000',
    scene: [LoadingScene, OverworldScene, InteriorScene],
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0, x: 0 },
        debug: false
      }
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      min: {
        width: 400,
        height: 300
      },
      max: {
        width: 1600,
        height: 1200
      }
    }
  };
}
