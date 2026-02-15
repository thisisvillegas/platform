import * as Phaser from 'phaser';
import { Theme } from '../models/Theme';

export class ThemeEngine {
  private scene: Phaser.Scene;
  private worldPackPath: string;
  private currentTheme: Theme | null = null;
  private currentAmbientSound: Phaser.Sound.BaseSound | null = null;
  private currentMusicSound: Phaser.Sound.BaseSound | null = null;
  private particleEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private activeDecorationLayers: string[] = [];

  constructor(scene: Phaser.Scene, worldPackPath: string) {
    this.scene = scene;
    this.worldPackPath = worldPackPath;
  }

  async loadTheme(themeId: string): Promise<Theme> {
    try {
      const response = await fetch(`${this.worldPackPath}/themes/${themeId}.json`);

      if (!response.ok) {
        throw new Error(`Failed to load theme: ${themeId} (${response.status})`);
      }

      const theme: Theme = await response.json();
      return theme;
    } catch (error) {
      console.error(`Error loading theme ${themeId}:`, error);
      throw error;
    }
  }

  applyTheme(theme: Theme): void {
    console.log(`Applying theme: ${theme.name} (${theme.id})`);

    // Apply camera color tint/overlay
    const camera = this.scene.cameras.main;
    if (theme.palette.overlay) {
      const overlay = theme.palette.overlay;
      const colorInt = Phaser.Display.Color.HexStringToColor(overlay.color).color;
      const alpha = Math.floor(overlay.alpha * 255);
      const tint = (alpha << 24) | colorInt;
      camera.setTint(tint);
    } else {
      camera.clearTint();
    }

    // Handle particles
    this.applyParticles(theme);

    // Handle decoration layers
    this.toggleDecorationLayers(theme);

    // Handle audio
    this.applyAudio(theme);

    // TODO: Handle lamp lights and window tiles when tilemap integration is complete

    this.currentTheme = theme;
  }

  private applyParticles(theme: Theme): void {
    // Destroy existing particle emitter
    if (this.particleEmitter) {
      this.particleEmitter.stop();
      this.particleEmitter.remove();
      this.particleEmitter = null;
    }

    // Create new particle emitter if theme has particles config
    if (theme.particles) {
      const particles = theme.particles;

      // Create particle texture (colored square)
      const graphics = this.scene.add.graphics();
      const color = Phaser.Display.Color.HexStringToColor(particles.color).color;
      graphics.fillStyle(color, 1);
      graphics.fillRect(0, 0, 4, 4);
      graphics.generateTexture(`particle-${theme.id}`, 4, 4);
      graphics.destroy();

      // Calculate frequency from density
      const frequency = 1000 / particles.density;

      // Get camera bounds for emit zone
      const camera = this.scene.cameras.main;
      const emitZone = new Phaser.Geom.Rectangle(
        camera.scrollX,
        camera.scrollY - 10,
        camera.width,
        10
      );

      // Create particle emitter
      const particleManager = this.scene.add.particles(0, 0, `particle-${theme.id}`, {
        x: { min: emitZone.x, max: emitZone.x + emitZone.width },
        y: emitZone.y,
        speed: { min: particles.speed * 0.8, max: particles.speed * 1.2 },
        gravityY: 50,
        lifespan: 5000,
        scale: { start: 1, end: 0.5 },
        alpha: { start: 1, end: 0 },
        frequency: frequency,
        blendMode: 'ADD'
      });

      this.particleEmitter = particleManager.emitters.getFirst() as Phaser.GameObjects.Particles.ParticleEmitter;

      // Type-specific tweaks
      if (particles.type === 'hearts') {
        this.particleEmitter.setGravityY(30); // Slower fall
        this.particleEmitter.setAngle({ min: -45, max: 45 });
      } else if (particles.type === 'snowflakes') {
        this.particleEmitter.setGravityY(60); // Faster fall
        this.particleEmitter.setFrequency(frequency * 0.7); // Higher density
      } else if (particles.type === 'leaves') {
        this.particleEmitter.setGravityY(40);
        this.particleEmitter.setAngle({ min: -90, max: 90 });
        this.particleEmitter.setSpeedX({ min: -20, max: 20 }); // Drift
      } else if (particles.type === 'fog') {
        this.particleEmitter.setGravityY(10); // Very slow fall
        this.particleEmitter.setScale({ start: 2, end: 3 }); // Larger
        this.particleEmitter.setAlpha({ start: 0.3, end: 0 });
      }

      this.particleEmitter.start();
    }
  }

  private toggleDecorationLayers(theme: Theme): void {
    // Hide previously active decoration layers
    for (const layerName of this.activeDecorationLayers) {
      const tilemap = (this.scene as any).tilemap;
      if (tilemap) {
        const layer = tilemap.getLayer(layerName);
        if (layer) {
          layer.tilemapLayer.setVisible(false);
        }
      }
    }

    // Show new theme decoration layers
    if (theme.decorationLayers) {
      for (const layerName of theme.decorationLayers) {
        const tilemap = (this.scene as any).tilemap;
        if (tilemap) {
          const layer = tilemap.getLayer(layerName);
          if (layer) {
            layer.tilemapLayer.setVisible(true);
          } else {
            console.warn(`Decoration layer not found: ${layerName}`);
          }
        }
      }
      this.activeDecorationLayers = theme.decorationLayers;
    } else {
      this.activeDecorationLayers = [];
    }
  }

  private applyAudio(theme: Theme): void {
    // Fade out and stop current ambient sound
    if (this.currentAmbientSound) {
      this.scene.tweens.add({
        targets: this.currentAmbientSound,
        volume: 0,
        duration: 1000,
        onComplete: () => {
          this.currentAmbientSound?.stop();
          this.currentAmbientSound = null;
        }
      });
    }

    // Fade out and stop current music sound
    if (this.currentMusicSound) {
      this.scene.tweens.add({
        targets: this.currentMusicSound,
        volume: 0,
        duration: 1000,
        onComplete: () => {
          this.currentMusicSound?.stop();
          this.currentMusicSound = null;
        }
      });
    }

    // Load and fade in new audio if specified
    if (theme.audio) {
      // Ambient track
      if (theme.audio.ambient) {
        try {
          const ambientSound = this.scene.sound.add(theme.audio.ambient, {
            loop: true,
            volume: 0
          });
          ambientSound.play();

          this.scene.tweens.add({
            targets: ambientSound,
            volume: 0.6,
            duration: 1000
          });

          this.currentAmbientSound = ambientSound;
        } catch (error) {
          console.warn(`Failed to load ambient audio: ${theme.audio.ambient}`, error);
        }
      }

      // Music track
      if (theme.audio.music) {
        try {
          const musicSound = this.scene.sound.add(theme.audio.music, {
            loop: true,
            volume: 0
          });
          musicSound.play();

          this.scene.tweens.add({
            targets: musicSound,
            volume: 0.4,
            duration: 1000
          });

          this.currentMusicSound = musicSound;
        } catch (error) {
          console.warn(`Failed to load music audio: ${theme.audio.music}`, error);
        }
      }
    }
  }

  getCurrentTheme(): Theme | null {
    return this.currentTheme;
  }

  async switchTheme(themeId: string): Promise<void> {
    try {
      const theme = await this.loadTheme(themeId);
      this.applyTheme(theme);
    } catch (error) {
      console.error(`Failed to switch to theme ${themeId}:`, error);
    }
  }

  destroy(): void {
    // Clean up resources
    if (this.particleEmitter) {
      this.particleEmitter.stop();
      this.particleEmitter.remove();
    }

    if (this.currentAmbientSound) {
      this.currentAmbientSound.stop();
      this.currentAmbientSound.destroy();
    }

    if (this.currentMusicSound) {
      this.currentMusicSound.stop();
      this.currentMusicSound.destroy();
    }
  }
}
