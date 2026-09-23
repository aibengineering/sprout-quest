// Touch-first input: a floating joystick anywhere on the canvas, DOM buttons for actions, keyboard fallback.

export type Action = 'attack' | 'skill' | 'dodge' | 'potion' | 'act' | 'menu' | 'run' | 'bag' | 'journal';

const KEY_ACTIONS: Record<string, Action> = {
  Space: 'attack', KeyJ: 'attack', KeyK: 'dodge', ShiftLeft: 'dodge', KeyL: 'skill', KeyH: 'potion',
  KeyE: 'act', Enter: 'act', KeyM: 'menu', Escape: 'menu', KeyR: 'run', KeyB: 'bag', KeyQ: 'journal',
};

/**
 * Keyboard vs touch: show key hints when a keyboard is in use. Starts from "does this device have a fine pointer
 * (mouse/trackpad)?", then follows whatever the player actually uses last.
 */
export function trackInputDevice() {
  const set = (kbd: boolean) => document.body.classList.toggle('kbd', kbd);
  set(window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false);
  window.addEventListener('keydown', (e) => {
    if (!['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) set(true);
  }, true);
  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') set(false);
  }, true);
}

export const usingKeyboard = () => document.body.classList.contains('kbd');

const JOY_RADIUS = 56;

export class Input {
  move = { x: 0, y: 0 };
  private keys = new Set<string>();
  private pressed = new Set<Action>();
  private held = new Set<Action>();
  private joy = { id: -1, ox: 0, oy: 0, x: 0, y: 0 };
  enabled = true;

  constructor(
    surface: HTMLElement,
    private joyBase: HTMLElement,
    private joyKnob: HTMLElement,
  ) {
    surface.addEventListener('pointerdown', (e) => {
      if (!this.enabled || this.joy.id !== -1) return;
      this.joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
      surface.setPointerCapture?.(e.pointerId);
      this.showJoy(true);
      this.updateJoy();
    });
    surface.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.joy.id) return;
      this.joy.x = e.clientX;
      this.joy.y = e.clientY;
      // Let the stick "follow" the thumb when dragged past the edge, like most mobile games.
      const dx = this.joy.x - this.joy.ox, dy = this.joy.y - this.joy.oy;
      const d = Math.hypot(dx, dy);
      if (d > JOY_RADIUS * 1.4) {
        this.joy.ox = this.joy.x - (dx / d) * JOY_RADIUS * 1.4;
        this.joy.oy = this.joy.y - (dy / d) * JOY_RADIUS * 1.4;
      }
      this.updateJoy();
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== this.joy.id) return;
      this.joy.id = -1;
      this.showJoy(false);
    };
    surface.addEventListener('pointerup', end);
    surface.addEventListener('pointercancel', end);

    window.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      this.keys.add(e.code);
      const a = KEY_ACTIONS[e.code];
      if (a && !e.repeat) {
        this.pressed.add(a);
        this.held.add(a);
      }
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      const a = KEY_ACTIONS[e.code];
      if (a) this.held.delete(a);
    });
    window.addEventListener('blur', () => this.reset());
  }

  bindButton(el: HTMLElement, action: Action) {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.pressed.add(action);
      this.held.add(action);
      el.classList.add('down');
    });
    const up = () => {
      this.held.delete(action);
      el.classList.remove('down');
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private showJoy(on: boolean) {
    this.joyBase.style.display = on ? 'block' : 'none';
    if (!on) this.move = { x: 0, y: 0 };
  }

  private updateJoy() {
    const dx = this.joy.x - this.joy.ox, dy = this.joy.y - this.joy.oy;
    const d = Math.hypot(dx, dy);
    const k = d > JOY_RADIUS ? JOY_RADIUS / d : 1;
    this.joyBase.style.transform = `translate(${this.joy.ox}px, ${this.joy.oy}px)`;
    this.joyKnob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    const mag = Math.min(1, d / JOY_RADIUS);
    this.move = mag < 0.18 ? { x: 0, y: 0 } : { x: (dx / (d || 1)) * mag, y: (dy / (d || 1)) * mag };
  }

  /** Movement vector (length ≤ 1) from joystick or keyboard. */
  axis(): { x: number; y: number } {
    if (!this.enabled) return { x: 0, y: 0 };
    let x = 0, y = 0;
    const k = this.keys;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (k.has('KeyW') || k.has('ArrowUp')) y -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y += 1;
    if (x || y) {
      const d = Math.hypot(x, y);
      return { x: x / d, y: y / d };
    }
    return this.move;
  }

  consume(a: Action): boolean {
    if (!this.enabled) return false;
    const had = this.pressed.has(a);
    this.pressed.delete(a);
    return had;
  }

  isHeld(a: Action): boolean {
    return this.enabled && this.held.has(a);
  }

  /** Drop presses queued during pauses/transitions so they don't fire later. */
  flush() {
    this.pressed.clear();
  }

  reset() {
    this.keys.clear();
    this.pressed.clear();
    this.held.clear();
    this.joy.id = -1;
    this.showJoy(false);
  }
}
