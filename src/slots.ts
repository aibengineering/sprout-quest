// Save slots. The published game only ever uses the one; dev builds (src/dev/) can switch between several, so trying
// a preset or a risky change never touches your real playthrough. Each slot keeps its own save and play report.

const ACTIVE = 'sprout-quest-slot';

/** The slot in use (null: the main one). */
export function activeSlot(): string | null {
  try {
    return localStorage.getItem(ACTIVE);
  } catch {
    return null;
  }
}

export function setActiveSlot(slot: string | null) {
  try {
    if (slot) localStorage.setItem(ACTIVE, slot);
    else localStorage.removeItem(ACTIVE);
  } catch {
    // ignore
  }
}

/** A storage key for the active slot (or for `slot`): the main slot keeps the original, unsuffixed keys. */
export function slotKey(key: string, slot = activeSlot()): string {
  return slot ? `${key}:${slot}` : key;
}
