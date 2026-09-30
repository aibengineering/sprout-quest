// Sound settings: a mute for everything, and volumes for the music and the sound effects. They belong to the device,
// not the save (so every save slot, the Battle Tower's and presets' too, sounds the same), kept in their own
// localStorage entry.

export interface SoundSettings {
  muted: boolean;
  /** 0 (off) to 1. With the music off, its recordings aren't downloaded at all. */
  music: number;
  effects: number;
}

const KEY = 'sprout-quest-sound';
/**
 * The slider's meaning changed in version 2 (a much quieter scale, squared): music set before then goes back to the
 * default rather than meaning something else.
 */
const VERSION = 2;

/** The saved settings, or the defaults (saves from before these settings carry their old mute over). */
export function loadSound(oldMute = false): SoundSettings {
  const d: SoundSettings = { muted: oldMute, music: 0.7, effects: 1 };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return d;
    const s = JSON.parse(raw) as Partial<SoundSettings> & { v?: number };
    const vol = (v: unknown, def: number) => (typeof v === 'number' && v >= 0 && v <= 1 ? v : def);
    return { muted: s.muted === true, music: s.v === VERSION ? vol(s.music, d.music) : d.music, effects: vol(s.effects, d.effects) };
  } catch {
    return d;
  }
}

export function saveSound(s: SoundSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...s, v: VERSION }));
  } catch {
    // Storage full or blocked: the settings still apply for this visit.
  }
}
