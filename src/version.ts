// The game's version and its patch notes, newest first. The version lives only in package.json: bump it there and add
// an entry here with each release (CI checks both). Players who haven't read the newest notes get a dot on them.
import { version } from '../package.json';

export const VERSION: string = version;

export interface PatchNote {
  version: string;
  /** Release day, YYYY-MM-DD. */
  date: string;
  title: string;
  notes: string[];
}

export const PATCH_NOTES: PatchNote[] = [
  {
    version: '0.2.0',
    date: '2026-09-25',
    title: 'Gather, forge and fight smarter',
    notes: [
      '💎 New area: Glimmer Hollow, between the cavern and Ember Peak, home of the Glimmer Slime. Crystal is mined there now.',
      '🪓 Woodcutting and Mining: craft axes and picks, then chop trees and mine rocks with timing minigames. Each tool gathers its own tier fast and the next tier slowly.',
      '🗺️ Every area is now a hand-drawn route with tall grass to cross, and you can see the monsters roaming it.',
      '⚔️ A new weapon lineup: swords, hammers, whips and wands at every tier. Ore weapons hit harder; monster weapons carry tricks like slow, poison, life drain and chain sparks. The legendary Wyrmbreaker breathes dragonfire.',
      '🎖️ Weapon handling: win fights with a weapon class to unlock its better weapons.',
      '💨 Every weapon has a small stamina meter now, so no more endless spamming (sorry, Jelly Slingshot).',
      '❓ The Forge keeps gear a mystery until you reach the level it needs, and level-up screens show what you just unlocked.',
      '⭐ Level-ups get their own screen with your new stats and what you are ready for.',
      '📜 The quest tracker shows material progress, and loot and XP stack up on the right.',
      '🎯 You attack the way you last moved, with a small nudge onto enemies right ahead.',
      '📊 Play report (More tab): share the file or copy a summary to help balance the game.',
      '🔧 Old weapons were retired, and your save swaps them for the closest new one. Fixes: the New Game check on the title screen can be tapped again, and the loading screen shows real progress.',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-09-23',
    title: 'First release',
    notes: [
      '🌱 Wake up in the Quiet Glade, find a sword, and make your way to Sprout Village.',
      '🗺️ Explore the Sunny Meadow, Whisper Woods, Crystal Cave and Ember Peak.',
      '⚔️ Real-time arena battles with swords, spears, axes, hammers and wands, each with its own combo and skill.',
      '👑 Guardians block the roads east, and the Emberwyrm waits at the end.',
      '🏡 Rebuild the village: repair the Forge, and build your home, a garden, a training yard and a warp stone.',
      '⚒️ Craft weapons, armor, charms and potions from monster materials.',
      '📱 Cute 3D art, touch controls, and keyboard controls on a computer.',
    ],
  },
];
