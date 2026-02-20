import * as Phaser from 'phaser';

/** Returns true on touch-capable devices (phones, tablets). */
export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Virtual joystick + action/menu buttons for mobile.
 * Only renders on touch devices. Provides dx/dy for movement
 * and event callbacks for action (SPACE/ENTER) and menu (ESC).
 *
 * Usage:
 *   const controls = new MobileControls(scene);
 *   // In update(): controls.dx, controls.dy for movement
 *   // controls.onAction = () => { ... }
 *   // controls.onMenu = () => { ... }
 */
export class MobileControls {
  private scene: Phaser.Scene;

  // Joystick state
  public dx = 0;
  public dy = 0;

  // Action button pressed this frame (edge-detected)
  public actionPressed = false;

  // Callbacks
  public onMenu: (() => void) | null = null;

  // Joystick visuals
  private joystickBase: Phaser.GameObjects.Arc | null = null;
  private joystickThumb: Phaser.GameObjects.Arc | null = null;
  private joystickContainer: Phaser.GameObjects.Container | null = null;
  private readonly JOYSTICK_RADIUS = 50;
  private readonly THUMB_RADIUS = 22;
  private joystickBaseX = 0;
  private joystickBaseY = 0;
  private joystickPointerId: number | null = null;

  // Action button
  private actionBtn: Phaser.GameObjects.Container | null = null;
  private actionPointerId: number | null = null;
  private actionDown = false;
  private actionWasDown = false;

  // Menu button
  private menuBtn: Phaser.GameObjects.Container | null = null;

  // Track if we're active
  private active = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    if (!isTouchDevice()) return;
    this.active = true;
    this.createJoystick();
    this.createActionButton();
    this.createMenuButton();
    this.setupInputHandlers();

    scene.scale.on('resize', this.handleResize, this);
  }

  /** Call every frame to update actionPressed edge detection. */
  update(): void {
    if (!this.active) return;
    this.actionPressed = this.actionDown && !this.actionWasDown;
    this.actionWasDown = this.actionDown;
  }

  get isActive(): boolean {
    return this.active;
  }

  private createJoystick(): void {
    const cam = this.scene.cameras.main;
    this.joystickBaseX = 90;
    this.joystickBaseY = cam.height - 90;

    // Outer ring
    this.joystickBase = this.scene.add.circle(0, 0, this.JOYSTICK_RADIUS, 0xffffff, 0.1);
    this.joystickBase.setStrokeStyle(2, 0xffffff, 0.3);

    // Inner thumb
    this.joystickThumb = this.scene.add.circle(0, 0, this.THUMB_RADIUS, 0xffffff, 0.25);

    this.joystickContainer = this.scene.add.container(
      this.joystickBaseX, this.joystickBaseY,
      [this.joystickBase, this.joystickThumb]
    );
    this.joystickContainer.setScrollFactor(0);
    this.joystickContainer.setDepth(5000);
  }

  private createActionButton(): void {
    const cam = this.scene.cameras.main;
    const btnX = cam.width - 70;
    const btnY = cam.height - 80;

    const bg = this.scene.add.circle(0, 0, 30, 0x00ffff, 0.15);
    bg.setStrokeStyle(2, 0x00ffff, 0.5);

    const label = this.scene.add.text(0, 0, 'A', {
      fontSize: '20px',
      color: '#00ffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.actionBtn = this.scene.add.container(btnX, btnY, [bg, label]);
    this.actionBtn.setScrollFactor(0);
    this.actionBtn.setDepth(5000);
    this.actionBtn.setSize(60, 60);
  }

  private createMenuButton(): void {
    const cam = this.scene.cameras.main;
    const btnX = cam.width - 30;
    const btnY = 30;

    const bg = this.scene.add.rectangle(0, 0, 44, 44, 0x000000, 0.5);
    bg.setStrokeStyle(1, 0x888888, 0.5);

    const label = this.scene.add.text(0, 0, '☰', {
      fontSize: '22px',
      color: '#cccccc',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    this.menuBtn = this.scene.add.container(btnX, btnY, [bg, label]);
    this.menuBtn.setScrollFactor(0);
    this.menuBtn.setDepth(5000);
    this.menuBtn.setSize(44, 44);
  }

  private setupInputHandlers(): void {
    const scene = this.scene;

    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Check menu button first (top-right area)
      if (this.menuBtn && this.isPointerInContainer(pointer, this.menuBtn, 22)) {
        if (this.onMenu) this.onMenu();
        return;
      }

      // Check action button
      if (this.actionBtn && this.isPointerInContainer(pointer, this.actionBtn, 30)) {
        this.actionPointerId = pointer.id;
        this.actionDown = true;
        return;
      }

      // Left half of screen = joystick
      const cam = this.scene.cameras.main;
      if (pointer.x < cam.width * 0.5 && this.joystickPointerId === null) {
        this.joystickPointerId = pointer.id;
        this.updateJoystickFromPointer(pointer);
      }
    });

    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.joystickPointerId) {
        this.updateJoystickFromPointer(pointer);
      }
    });

    scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.joystickPointerId) {
        this.joystickPointerId = null;
        this.dx = 0;
        this.dy = 0;
        if (this.joystickThumb) {
          this.joystickThumb.setPosition(0, 0);
        }
      }
      if (pointer.id === this.actionPointerId) {
        this.actionPointerId = null;
        this.actionDown = false;
      }
    });
  }

  private updateJoystickFromPointer(pointer: Phaser.Input.Pointer): void {
    if (!this.joystickContainer || !this.joystickThumb) return;

    const localX = pointer.x - this.joystickBaseX;
    const localY = pointer.y - this.joystickBaseY;
    const dist = Math.sqrt(localX * localX + localY * localY);
    const maxDist = this.JOYSTICK_RADIUS;

    let thumbX = localX;
    let thumbY = localY;

    if (dist > maxDist) {
      thumbX = (localX / dist) * maxDist;
      thumbY = (localY / dist) * maxDist;
    }

    this.joystickThumb.setPosition(thumbX, thumbY);

    // Normalize to -1..1 with a dead zone
    const DEAD_ZONE = 0.2;
    const normX = thumbX / maxDist;
    const normY = thumbY / maxDist;

    this.dx = Math.abs(normX) > DEAD_ZONE ? normX : 0;
    this.dy = Math.abs(normY) > DEAD_ZONE ? normY : 0;
  }

  private isPointerInContainer(pointer: Phaser.Input.Pointer, container: Phaser.GameObjects.Container, radius: number): boolean {
    const dx = pointer.x - container.x;
    const dy = pointer.y - container.y;
    return (dx * dx + dy * dy) <= radius * radius;
  }

  private handleResize(): void {
    const cam = this.scene.cameras.main;
    this.joystickBaseX = 90;
    this.joystickBaseY = cam.height - 90;
    if (this.joystickContainer) {
      this.joystickContainer.setPosition(this.joystickBaseX, this.joystickBaseY);
    }
    if (this.actionBtn) {
      this.actionBtn.setPosition(cam.width - 70, cam.height - 80);
    }
    if (this.menuBtn) {
      this.menuBtn.setPosition(cam.width - 30, 30);
    }
  }

  /** Hide controls (e.g. during dialogue). */
  setVisible(visible: boolean): void {
    if (!this.active) return;
    this.joystickContainer?.setVisible(visible);
    this.actionBtn?.setVisible(visible);
    // Menu always visible
  }

  /** Hide just the joystick (keep buttons). */
  hideJoystick(): void {
    if (!this.active) return;
    this.joystickContainer?.setVisible(false);
    this.dx = 0;
    this.dy = 0;
  }

  /** Show joystick again. */
  showJoystick(): void {
    if (!this.active) return;
    this.joystickContainer?.setVisible(true);
  }

  destroy(): void {
    if (!this.active) return;
    this.scene.scale.off('resize', this.handleResize, this);
    this.joystickContainer?.destroy();
    this.actionBtn?.destroy();
    this.menuBtn?.destroy();
    this.active = false;
  }
}
