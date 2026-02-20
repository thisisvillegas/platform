import * as Phaser from 'phaser';
import { CinematicScene } from './scenes/CinematicScene';
import { LoadingScene } from './scenes/loading-scene';
import { OverworldScene } from './scenes/OverworldScene';
import { InteriorScene } from './scenes/InteriorScene';

export function createPhaserConfig(parent: string, initialScene?: string): Phaser.Types.Core.GameConfig {
  const sceneMap: Record<string, typeof Phaser.Scene> = {
    CinematicScene: CinematicScene as unknown as typeof Phaser.Scene,
    LoadingScene: LoadingScene as unknown as typeof Phaser.Scene,
    OverworldScene: OverworldScene as unknown as typeof Phaser.Scene,
    InteriorScene: InteriorScene as unknown as typeof Phaser.Scene,
  };

  // Put the desired initial scene first — Phaser 3 auto-starts the first scene in the array
  const initial = sceneMap[initialScene ?? 'CinematicScene'] ?? CinematicScene;
  const others = Object.values(sceneMap).filter(s => s !== initial);
  const scenes = [initial, ...others];

  return {
    type: Phaser.AUTO,
    parent: parent,
    width: 800,
    height: 600,
    pixelArt: true,
    roundPixels: true,
    backgroundColor: '#000000',
    scene: scenes,
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
