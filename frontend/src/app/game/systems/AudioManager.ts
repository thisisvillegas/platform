import * as Phaser from 'phaser';

/**
 * Manages background music and sound effects with graceful degradation.
 * Silently handles missing audio files — the game works fine without audio.
 */
export class AudioManager {
  private scene: Phaser.Scene;
  private music: Phaser.Sound.BaseSound | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Play background music by key. Loops by default. */
  playMusic(key: string, volume = 0.4): void {
    try {
      if (!this.scene.cache.audio.exists(key)) return;
      this.stopMusic();
      this.music = this.scene.sound.add(key, { loop: true, volume });
      this.music.play();
    } catch {
      // Audio not available — continue silently
    }
  }

  /** Stop current background music. */
  stopMusic(): void {
    if (this.music) {
      this.music.stop();
      this.music.destroy();
      this.music = null;
    }
  }

  /** Play a one-shot sound effect. */
  playSFX(key: string, volume = 0.5): void {
    try {
      if (!this.scene.cache.audio.exists(key)) return;
      this.scene.sound.play(key, { volume });
    } catch {
      // Audio not available — continue silently
    }
  }

  destroy(): void {
    this.stopMusic();
  }
}
