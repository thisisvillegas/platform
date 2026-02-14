import Phaser from 'phaser';
import { LoadingScene } from './scenes/loading-scene';
import { BootScene } from './scenes/boot-scene';

export function createPhaserConfig(parent: string): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: parent,
    width: 800,
    height: 600,
    pixelArt: true,
    roundPixels: true,
    backgroundColor: '#000000',
    scene: [LoadingScene, BootScene],
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0, x: 0 },
        debug: false
      }
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    }
  };
}
