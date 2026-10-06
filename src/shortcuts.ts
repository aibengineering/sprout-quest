// Optional, local loops opened with Bram's timber. No crossing reaches around a region's guardian gate.
import { BRIDGE_COST, zoneById, type Recipe, type ZoneId } from './data';
import type { SaveState } from './state';

export interface Shortcut {
  id: string; flag: string; name: string; zone: ZoneId; cost: Recipe; mill: number;
  gap: 'water' | 'chasm' | 'lava';
  /** Zone-local tiles covered by the deck, and the two bank approaches. */
  deck: { x: number; y: number; w: number; h: number };
  from: { x: number; y: number }; to: { x: number; y: number };
  marker: { x: number; y: number };
  benefit: string;
}
export const SHORTCUTS: readonly Shortcut[] = [
  { id: 'meadow-pond', flag: 'shortcut:meadow-pond', name: 'Willow Pond Crossing', zone: 'meadow', cost: { plank: 24 }, mill: 1, gap: 'water',
    deck: { x: 23, y: 18, w: 5, h: 2 }, from: { x: 22.5, y: 19.8 }, to: { x: 28.5, y: 19.8 }, marker: { x: 21.2, y: 20.1 },
    benefit: 'Cross Willow Pond directly between the village-side path and the eastern orchard, instead of taking the ridge or Slime Bend.' },
  { id: 'woods-camp', flag: 'bridge:woods', name: "Bram's Bridge", zone: 'woods', cost: BRIDGE_COST, mill: 1, gap: 'water',
    deck: { x: 8, y: 10, w: 2, h: 4 }, from: { x: 8.5, y: 14.8 }, to: { x: 8.5, y: 9.5 }, marker: { x: 10.2, y: 17.1 },
    benefit: 'Take the old logging path straight from the west gate to Bram’s camp, instead of climbing round the whole forest.' },
  { id: 'woods-lake', flag: 'shortcut:woods-lake', name: 'Stillwater Walk', zone: 'woods', cost: { pineplank: 32 }, mill: 2, gap: 'water',
    deck: { x: 19, y: 10, w: 8, h: 2 }, from: { x: 18.5, y: 11.8 }, to: { x: 27.5, y: 11.8 }, marker: { x: 17.3, y: 12.1 },
    benefit: 'Cross Stillwater between the forest’s climbing path and its eastern trail; skip the long climb past the old camp.' },
  { id: 'cave-quarry', flag: 'shortcut:cave-quarry', name: 'Old Quarry Boardwalk', zone: 'cave', cost: { pineplank: 32 }, mill: 2, gap: 'water',
    deck: { x: 13, y: 31, w: 15, h: 2 }, from: { x: 12.5, y: 32.8 }, to: { x: 28.5, y: 32.8 }, marker: { x: 11.2, y: 30.1 },
    benefit: 'Cross the flooded quarry from the iron workings to the eastern galleries, instead of following the wet southern rim.' },
  { id: 'hollow-gorge', flag: 'shortcut:hollow-gorge', name: 'Mirror Gorge Span', zone: 'hollow', cost: { glimplank: 32 }, mill: 3, gap: 'chasm',
    deck: { x: 17, y: 24, w: 5, h: 2 }, from: { x: 16.5, y: 25.8 }, to: { x: 22.5, y: 25.8 }, marker: { x: 15.2, y: 26.1 },
    benefit: 'Link the campfire directly to the lower crystal gardens; return with Glimmerwood without retracing the northern moss beds.' },
  { id: 'peak-cinder', flag: 'shortcut:peak-cinder', name: 'Cinder Span', zone: 'peak', cost: { emberplank: 32 }, mill: 4, gap: 'lava',
    deck: { x: 12, y: 23, w: 7, h: 2 }, from: { x: 11.5, y: 24.8 }, to: { x: 19.5, y: 24.8 }, marker: { x: 10.2, y: 25.1 },
    benefit: 'Heat-hardened Emberwood crosses the lava lake, linking the western ascent to the lair-side ridge.' },
];
export const shortcutById = (id: string) => SHORTCUTS.find((s) => s.id === id);
export const shortcutBuilt = (s: SaveState, p: Shortcut) => s.flags.includes(p.flag);
export const shortcutWorldPoint = (p: Shortcut, at: { x: number; y: number }) => ({ x: zoneById(p.zone).x0 + at.x, y: at.y });
export function shortcutLock(s: SaveState, p: Shortcut): string | null {
  if (!(s.flags.includes('bram:home') || s.flags.includes('bram:hut') || (s.stories.bram ?? 0) >= 8)) return 'Help Bram come home to Sowerby. He’ll teach you how to build timber crossings.';
  if (s.build.sawmill < p.mill) return `Upgrade Bram’s Sawmill to level ${p.mill} to cut the timber for this crossing.`;
  const guardian = zoneById(p.zone).guardian;
  if (guardian && !s.bosses.includes(guardian.kind)) return 'Open the road into this region first.';
  return null;
}
export function canBuildShortcut(s: SaveState, p: Shortcut): 'built' | 'locked' | 'missing' | 'ok' {
  if (shortcutBuilt(s, p)) return 'built';
  if (shortcutLock(s, p)) return 'locked';
  return Object.entries(p.cost).every(([m, n]) => s.mats[m as keyof Recipe] >= n!) ? 'ok' : 'missing';
}
/** Recheck at confirmation; a saved flag charges exactly once, even after reloading during assembly. */
export function buildShortcut(s: SaveState, p: Shortcut): ReturnType<typeof canBuildShortcut> {
  const result = canBuildShortcut(s, p);
  if (result !== 'ok') return result;
  for (const [m, n] of Object.entries(p.cost)) s.mats[m as keyof Recipe] -= n!;
  s.flags.push(p.flag);
  return 'ok';
}
