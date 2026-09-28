// The game's version and its patch notes, newest first. The version lives only in package.json: bump it there and add
// an entry here with each release (CI checks both). While a release is being built up on dev, keep adding to its one
// entry and move its date to the latest work. Players who haven't read the newest notes get a dot on them.
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
    date: '2026-09-27',
    title: "Poppy's Bunny",
    notes: [
      "🧸 A side story: once you've settled into Sowerby, explore the far corner of the Sunny Meadow. Someone there needs a hero.",
      '🌳 A new place: the Secret Grove, tucked away off the meadow, with oaks and rocks to gather once it is safe.',
      '💬 People show how they feel with little emoji bubbles you can read from across the map, and talk to you face to face with portraits that change with their mood.',
      '🎬 Story scenes: the camera pans to what matters, and dialogue moves out of the way of the action.',
      '🐰 A new mini-boss with a nasty charge, and its gang guarding the path to it.',
      '📷 The camera can look a little past the edge of the map, so nothing at the edges hides under the buttons.',
      "🌾 The village has a name, Sowerby, and a goddess: Veyra, the Sower. Look for her mossy statue in the glade and her shrine in the village, her Spring, and the little shrine stones by every campfire.",
      '🧙 The village elder has a proper name, Elder Oswin, and is dressed as Veyra\'s priest now; the Warp Stone is her ancient Waystone, and the guardians carry their true titles.',
      '🎒 The menus are things from the world now: your Bag is a stitched satchel with gear in sockets and a slot for everything you carry, the Forge is the smithy\'s workbench with work orders, building plans are blueprints pinned to a board, and the Journal is your notebook. New rounded fonts are built in, so it looks the same on every phone.',
      '🔍 The Forge only shows what you have discovered, newest and strongest first, with a "New" badge on anything you just unlocked (tap to peek at the undiscovered outlines if you like). Unlock cards wait until you are back from a fight, and take you straight there when you tap them.',
      '〰️ Whips feel like whips: the rope trails your hand, unrolls and cracks at the tip. Tip hits crack for full damage (the rest of the rope only grazes), the third lash is an overhead crack that stuns, and the whip hangs coiled at your hip between swings.',
      '🗡️ Your weapon is really in your hand now: your arm swings with every attack, and on the map swords and hammers ride across your back, whips coil at your hip and wands sit in your belt.',
      "👢 A new kind of reward: perks. Finish Poppy's story for one that makes getting around a lot quicker.",
      '📔 The Journal lists your side stories, and the Bag your perks.',
      "🪓 Chopping and mining look and feel new: a detailed tree or rock close up, the axe or pick for your tool's tier, and every blow showing, with chips, sawdust, leaves, sparks and dust flying.",
      '🌲 Trees topple off their stumps and land with a thud; rocks crack where your pick lands, then split and tumble apart.',
      '🎁 What you earn pops out and flies to your bag: logs and ore from trees and rocks, and every monster drops its loot as it falls.',
      '✨ Everyone is now in real-time 3D: the hero, the villagers and every monster turn smoothly, stay crisp up close, and are properly lit with a sunny side and a shadow side. The scenery got the same brighter lighting.',
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
