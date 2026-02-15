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
  private overlay: Phaser.GameObjects.Rectangle | null = null;

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

    // Apply camera color overlay using a rectangle
    const camera = this.scene.cameras.main;

    // Remove existing overlay
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }

    // Create new overlay if specified
    if (theme.palette.overlay) {
      const overlayData = theme.palette.overlay;
      const color = Phaser.Display.Color.HexStringToColor(overlayData.color).color;

      this.overlay = this.scene.add.rectangle(
        0, 0,
        camera.width, camera.height,
        color,
        overlayData.alpha
      );
      this.overlay.setOrigin(0, 0);
      this.overlay.setScrollFactor(0);
      this.overlay.setDepth(500); // Above game world, below UI

      // Update overlay size on camera resize
      this.scene.scale.on('resize', () => {
        if (this.overlay) {
          this.overlay.setSize(camera.width, camera.height);
        }
      });
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
      this.particleEmitter.destroy();
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

      // Base emitter config
      const emitterConfig: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
        x: { min: 0, max: camera.width },
        y: -10,
        speed: { min: particles.speed * 0.8, max: particles.speed * 1.2 },
        gravityY: 50,
        lifespan: 5000,
        scale: { start: 1, end: 0.5 },
        alpha: { start: 1, end: 0 },
        frequency: frequency,
        blendMode: 'ADD'
      };

      // Type-specific configs
      if (particles.type === 'hearts') {
        emitterConfig.gravityY = 30; // Slower fall
        emitterConfig.angle = { min: -45, max: 45 };
      } else if (particles.type === 'snowflakes') {
        emitterConfig.gravityY = 60; // Faster fall
        emitterConfig.frequency = frequency * 0.7; // Higher density
      } else if (particles.type === 'leaves') {
        emitterConfig.gravityY = 40;
        emitterConfig.angle = { min: -90, max: 90 };
        emitterConfig.speedX = { min: -20, max: 20 }; // Drift
      } else if (particles.type === 'fog') {
        emitterConfig.gravityY = 10; // Very slow fall
        emitterConfig.scale = { start: 2, end: 3 }; // Larger
        emitterConfig.alpha = { start: 0.3, end: 0 };
      }

      // Create particle emitter
      this.particleEmitter = this.scene.add.particles(0, 0, `particle-${theme.id}`, emitterConfig);
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
    if (this.overlay) {
      this.overlay.destroy();
    }

    if (this.particleEmitter) {
      this.particleEmitter.stop();
      this.particleEmitter.destroy();
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
