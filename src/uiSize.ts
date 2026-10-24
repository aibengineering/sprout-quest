// How big the menus, HUD and buttons are, on top of their automatic fit to the screen (see resize in main.ts).
export type UiSize = 'small' | 'auto' | 'large';
const KEY = 'sprout-quest-ui-size';
const SCALE: Record<UiSize, number> = { small: 0.85, auto: 1, large: 1.2 };

export function loadUiSize(): UiSize {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'small' || v === 'large' ? v : 'auto';
  } catch {
    return 'auto';
  }
}
export function saveUiSize(v: UiSize) {
  try { localStorage.setItem(KEY, v); } catch { /* private mode: it just won't stick */ }
}
export const uiSize = () => SCALE[loadUiSize()];
