// Progressive disclosure: systems switch on one at a time as the player reaches them in the story,
// so a brand-new player only has to learn "move" and "attack" first.
import { QUESTS } from './data';
import type { SaveState } from './state';

export type UnlockId = 'journal' | 'bag' | 'skill' | 'forge' | 'village' | 'plots' | 'warpplot';

export interface Unlock {
  id: UnlockId;
  icon: string;
  title: string;
  text: string;
  when: (s: SaveState) => boolean;
}

const reached = (s: SaveState, questId: string) => s.quest >= QUESTS.findIndex((q) => q.id === questId);

export const UNLOCKS: Unlock[] = [
  {
    id: 'journal', icon: '📜', title: 'Journal',
    text: 'Your goals, the world map and the story live here. Tap 📜 or the goal banner anytime.',
    when: (s) => reached(s, 'meadow'),
  },
  {
    id: 'bag', icon: '🎒', title: 'Your Bag',
    text: 'Monsters drop materials! Tap 🎒 to see your gear and everything you have collected. Potions are ready in battle too.',
    when: (s) => s.wins > 0,
  },
  {
    id: 'skill', icon: '✨', title: 'Weapon Skill',
    text: 'Tap ✨ in battle for your weapon’s special move. It recharges after each use.',
    when: (s) => s.wins > 1,
  },
  {
    id: 'forge', icon: '⚒', title: 'The Forge',
    text: 'The Forge is lit! Turn your materials into new weapons and armor.',
    when: (s) => reached(s, 'gear'),
  },
  {
    id: 'village', icon: '🏡', title: 'Village Building',
    text: 'Upgrade your home and build new places for permanent boosts. Look for Build signs in the village!',
    when: (s) => reached(s, 'cottage'),
  },
  {
    id: 'plots', icon: '🌱', title: 'New Building Plots',
    text: 'A Garden and a Training Yard can now be built in the village.',
    when: (s) => s.bosses.includes('kingslime'),
  },
  {
    id: 'warpplot', icon: '🔮', title: 'The Old Warp Stone',
    text: 'Ancient ruins by the village hold a Warp Stone. Rebuild it to fast travel!',
    when: (s) => s.bosses.includes('alphawolf'),
  },
];

export const has = (s: SaveState, id: UnlockId) => s.unlocked.includes(id);

/** Adds any newly earned unlocks and returns them (in order). */
export function checkUnlocks(s: SaveState): Unlock[] {
  const fresh: Unlock[] = [];
  for (const u of UNLOCKS) {
    if (!s.unlocked.includes(u.id) && u.when(s)) {
      s.unlocked.push(u.id);
      s.fresh.push(u.id);
      fresh.push(u);
    }
  }
  return fresh;
}
