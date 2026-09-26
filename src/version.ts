// The game's version and its patch notes, newest first. The version lives only in package.json: bump it there and add
// an entry here with each release (CI checks both); a big release can have a few entries, one per headline change.
// Players who haven't read the newest notes get a dot on them.
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
    version: '0.3.0',
    date: '2026-09-26',
    title: "Poppy's Bunny",
    notes: [
      "🧸 A side story: once you've settled into Sprout Village, explore the far corner of the Sunny Meadow. Someone there needs a hero.",
      '🌳 A new place: the Secret Grove, tucked away off the meadow, with oaks and rocks to gather once it is safe.',
      '💬 People show how they feel with little emoji bubbles you can read from across the map, and talk to you face to face with portraits that change with their mood.',
      '🎬 Story scenes: the camera pans to what matters, and dialogue moves out of the way of the action.',
      '🐰 A new mini-boss with a nasty charge, and its gang guarding the path to it.',
      '📷 The camera can look a little past the edge of the map, so nothing at the edges hides under the buttons.',
      "👢 A new kind of reward: perks. Finish Poppy's story for one that makes getting around a lot quicker.",
      '📔 The Journal lists your side stories, and the Bag your perks.',
    ],
  },
  {
    version: '0.3.0',
    date: '2026-09-26',
    title: 'Chop, crack and crumble',
    notes: [
      "🪓 Chopping and mining look and feel new: a detailed tree or rock close up, the axe or pick for your tool's tier, and every blow showing, with chips, sawdust, leaves, sparks and dust flying.",
      '🌲 Trees topple off their stumps and land with a thud; rocks crack where your pick lands, then split and tumble apart.',
      '🎁 What you earn pops out and flies to your bag: logs and ore from trees and rocks, and every monster drops its loot as it falls.',
    ],
  },
  {
    version: '0.2.1',
    date: '2026-09-25',
    title: 'A sharper look',
    notes: [
      '🧥 Every armor now changes how you look, not just its color: a scarf, a fluffy collar, a leafy crown, a copper circlet, a plumed helm, a golden tiara, crystal spikes, glowing lava cracks and dragon wings.',
      '✨ Your hero is sharper on phone screens, has a bold outline so you always stand out, and is drawn bigger, especially in battle.',
      '🪓 Axes and picks swing right at the tree or rock, with a proper wind-up and chop, and every blow lands when the tool connects.',
    ],
  },
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

/** A release's name: the titles of all its entries (e.g. "Poppy's Bunny · Chop, crack and crumble"). */
export function releaseTitle(version = VERSION): string {
  return PATCH_NOTES.filter((p) => p.version === version).map((p) => p.title).join(' · ');
}
