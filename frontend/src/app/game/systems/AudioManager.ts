import * as Phaser from 'phaser';

/**
 * Manages background music and sound effects with graceful degradation.
 * Silently handles missing audio files — the game works fine without audio.
 *
 * Features:
 * - Autoplay policy compliance (starts muted on first visit)
 * - Mute state persistence via localStorage
 * - Global mute/unmute controls affecting all audio
 * - Event emission for UI updates
 *
 * Expected audio files (graceful degradation if missing):
 * - assets/worlds/village/audio/ambient.mp3 - background music
 * - assets/worlds/village/audio/door-enter.wav - building entry SFX
 * - assets/worlds/village/audio/npc-talk.wav - dialogue start SFX
 * - assets/worlds/village/audio/collectible-pickup.wav - collectible SFX
 */
export class AudioManager {
  private scene: Phaser.Scene;
  private music: Phaser.Sound.BaseSound | null = null;
  private isMuted: boolean = false;
  private musicKey: string | null = null;
  private musicVolume: number = 0.3;

  private static readonly MUTE_STORAGE_KEY = 'world-audio-muted';
  private static readonly FIRST_VISIT_KEY = 'world-audio-first-visit';

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.loadMuteState();
  }

  /** Initialize audio system with autoplay compliance */
  initialize(): void {
    const isFirstVisit = !localStorage.getItem(AudioManager.FIRST_VISIT_KEY);

    if (isFirstVisit) {
      // Browser autoplay policy: start muted on first visit
      this.isMuted = true;
      localStorage.setItem(AudioManager.FIRST_VISIT_KEY, 'false');
      localStorage.setItem(AudioManager.MUTE_STORAGE_KEY, 'true');
    }
  }

  /** Load mute state from localStorage */
  private loadMuteState(): void {
    const stored = localStorage.getItem(AudioManager.MUTE_STORAGE_KEY);
    this.isMuted = stored === 'true';
  }

  /** Save mute state to localStorage */
  private saveMuteState(): void {
    localStorage.setItem(AudioManager.MUTE_STORAGE_KEY, String(this.isMuted));
  }

  /** Check if this is the first visit (for unmute prompt) */
  isFirstVisit(): boolean {
    return !localStorage.getItem(AudioManager.FIRST_VISIT_KEY);
  }

  /** Get current mute state */
  getMuted(): boolean {
    return this.isMuted;
  }

  /** Toggle mute/unmute for all audio */
  toggleMute(): void {
    this.isMuted = !this.isMuted;
    this.saveMuteState();

    if (this.isMuted) {
      this.pauseMusic();
    } else {
      this.resumeMusic();
    }

    // Emit event for UI updates
    this.scene.events.emit('audio-mute-changed', this.isMuted);
  }

  /** Play background music by key. Loops by default. */
  playMusic(key: string, volume = 0.3): void {
    try {
      if (!this.scene.cache.audio.exists(key)) return;

      this.musicKey = key;
      this.musicVolume = volume;

      if (this.isMuted) return; // Don't play if muted

      this.stopMusic();
      this.music = this.scene.sound.add(key, { loop: true, volume });
      this.music.play();
    } catch {
      // Audio not available — continue silently
    }
  }

  /** Pause current background music (maintains state for resume) */
  pauseMusic(): void {
    if (this.music && this.music.isPlaying) {
      this.music.pause();
    }
  }

  /** Resume paused background music */
  resumeMusic(): void {
    if (this.music && this.music.isPaused) {
      this.music.resume();
    } else if (this.musicKey && !this.music) {
      // Music was stopped, restart it
      this.playMusic(this.musicKey, this.musicVolume);
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
      if (this.isMuted) return; // Respect global mute
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
