// Progressive disclosure: systems switch on one at a time as the player reaches them in the story,
// so a brand-new player only has to learn "move" and "attack" first.
import { QUESTS, TOOLS } from './data';
import type { SaveState } from './state';

export type UnlockId = 'journal' | 'bag' | 'mend' | 'skill' | 'trick' | 'forge' | 'village' | 'plots' | 'warpplot' | 'kitchen' | 'sawmill' | 'cottage';

export interface Unlock {
  id: UnlockId;
  icon: string;
  title: string;
  text: string;
  /** Keyboard shortcut, mentioned on desktop. */
  key?: string;
  when: (s: SaveState) => boolean;
}

const reached = (s: SaveState, questId: string) => s.quest >= QUESTS.findIndex((q) => q.id === questId);

export const UNLOCKS: Unlock[] = [
  {
    id: 'journal', icon: '📜', title: 'Journal', key: 'Q',
    text: 'Your goals, the world map and the story live here. Tap 📜 or the goal banner anytime.',
    when: (s) => s.flags.includes('village'),
  },
  {
    id: 'bag', icon: '🎒', title: 'Your Bag', key: 'B',
    text: 'Monsters drop materials! Tap 🎒 to see your gear and everything you have collected. Potions are ready in battle too.',
    when: (s) => s.wins > 0,
  },
  {
    id: 'mend', icon: '🪓', title: 'Mend Your Tools',
    text: 'You have enough Slime Goo and Bunny Fluff to fix up an old tool. Open your Bag to mend it.',
    when: (s) => s.flags.includes('oldtools') && TOOLS.some((t) => t.tier === 1 && s.tools[t.skill] < 1 && Object.entries(t.recipe).every(([m, n]) => s.mats[m as keyof typeof s.mats] >= (n ?? 0))),
  },
  {
    id: 'skill', icon: '✨', title: 'Weapon Skill', key: 'L',
    text: 'Your weapon handling unlocked its special move: tap ✨ in battle. It grows stronger as your handling improves.',
    when: (s) => Object.values(s.mastery).some((m) => m.lv >= 2),
  },
  {
    id: 'trick', icon: '🎯', title: 'Class Ability',
    text: "Every weapon class has an ability of its own, and yours just unlocked. Open a class's Path in your Bag's Skills page to see everything its handling brings.",
    when: (s) => Object.values(s.mastery).some((m) => m.lv >= 3),
  },
  {
    id: 'forge', icon: '⚒', title: 'The Forge',
    text: 'The Forge is lit! Turn your materials into new weapons and armor.',
    when: (s) => reached(s, 'gear'),
  },
  {
    id: 'village', icon: '🏡', title: 'Village Building',
    text: 'Repair and build up Sowerby for permanent boosts. Walk up to the old forge or a building plot to start!',
    when: (s) => reached(s, 'repair'),
  },
  {
    id: 'plots', icon: '🌱', title: 'New Building Plots',
    text: 'A Garden and a Training Yard can now be built in the village.',
    when: (s) => s.bosses.includes('kingslime'),
  },
  {
    id: 'warpplot', icon: '🔮', title: "Veyra's Old Waystone",
    text: "Ancient ruins by the village hold one of Veyra's Waystones, older than anyone remembers. Rebuild it to travel out to any campfire you've lit!",
    when: (s) => s.bosses.includes('alphawolf'),
  },
  {
    id: 'kitchen', icon: '🍳', title: "Granny's Kitchen",
    text: 'Granny will cook for you! Visit her at the blue house: meals give you more XP, healing, or keep weak monsters away.',
    when: (s) => (s.stories.poppy ?? 0) >= 6,
  },
  {
    id: 'sawmill', icon: '🪚', title: "Bram's Sawmill",
    text: 'Bram wants to build a Sawmill in Sowerby. Find it in the village plans, beside the Forge.',
    when: (s) => s.flags.includes('bram:home'),
  },
  {
    id: 'cottage', icon: '🏡', title: 'A Guest Cottage',
    text: "Now Bram's mill is running, Sowerby can build a cottage for a newcomer. Find it in the village plans.",
    when: (s) => s.flags.includes('bram:hut') && s.build.sawmill > 0,
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
