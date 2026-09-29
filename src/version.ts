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
    version: '0.3.1',
    date: '2026-09-29',
    title: 'Weapons With Character',
    notes: [
      "🗡️ Swords are Blades now, and they're the combo class: three quick, flowing strikes. Their trick is the Riposte: dodge through an attack and your next strike is a sure, harder critical hit. Their dodge can cancel a wind-up too.",
      "🔨 Hammers, whips and magic strike once and rest, so every blow counts and your special weaves in between. Early fights are more deliberate, and weapon handling speeds you up much more on the way to Mastery.",
      "💥 Hammers Sunder: a slammed foe takes 20% more from your hits for a few seconds, so the next slam or a Quake lands harder.",
      "🪢 Whips Snare: a crack at the tip yanks the foe in toward you, so nothing keeps its distance.",
      "🪄 Wands are Magic now. Magic's dodge is a Blink, a short teleport, and its special is Scatter, a shotgun blast of bolts where you aim, instead of a ring all around you.",
      "🟢 The Jelly Slingshot is now the Jelly Wand. If you had the slingshot, you have the wand.",
      "🌀 Special attacks start small and grow with your weapon handling: Rank I is a quick taste, and each rank adds more, up to a Mastery finisher that really is over the top.",
      "🌪️ The whip's Whirl no longer spins you round three times at the start: Rank I is three quick lashes, and it spins longer, wider and faster on your feet as it ranks up, to a roaming Tempest at Mastery.",
      "🎯 Each class's ability (Riposte, Sunder, Snare, Blink) unlocks at handling Lv 3, one step after its special, so every early level brings something new.",
      "🗺️ Every weapon class has a Path to explore (Bag → Skills → Path): all ten handling levels, what each one brings, the weapons it lets you wield, and how close you are to the next.",
      "🎒 A \"New unlocked\" card no longer sits over a fight you walk straight into: it steps aside and comes back after.",
      "⚔️ Weapon handling levels a little slower: your first fight in the meadow unlocks your weapon's special, and the levels after take a good few fights each.",
      "✨ The XP bar sparkles as it fills: a notch pops onto the bar with every bubble you hear, sparks fly off it, the +XP counts up in time, and a level-up bursts with stars.",
      "⭐ XP pays best for a fair fight: monsters at or above your level give the most, and ones you've outgrown settle to a lower base rate. Following the story, you'll meet each guardian a little under its level; farm longer if you want an easy fight.",
      "🪓 Bram is at his old logging camp from the first time you find it, grumbling at you to go away, instead of only turning up once Granny has a pie for him.",
    ],
  },
  {
    version: '0.3.0',
    date: '2026-09-28',
    title: 'Tales of Sowerby',
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
      '📐 Building plans show what you have now next to what you will build, what it gives you and exactly what you are still missing; ones you can build right away glow and sit at the top.',
      '⭐ Winning feels like growing stronger: after a fight "+XP" pops up and your XP bar fills with bubbly chirps that climb faster as it nears the top, rings with a bright bell when it tops out, and keeps filling into the next level.',
      "👑 A new guardian: the Echo Queen holds the road from Echo Cavern to Glimmer Hollow. She shrieks rings of sound (slip through the gap!), dives from the dark and calls her Flappers when she's hurt. Her Echo Wing fires the Crystal Kiln.",
      "👵 Granny Clover lives in Sowerby from the day you arrive, worrying about her granddaughter. Once Poppy's safe home, Granny's Kitchen opens: Fluff Pancakes for more XP, Clover Tea to heal after fights, and Goo Jelly to keep weak monsters away. Each meal lasts a few minutes; a little plate on your health bar shows what's left.",
      "🧔 A new side story, Bram's Sawmill: Granny sends you to an old friend, a grumpy lumberjack in Whisper Woods. Chop quietly (misses are loud!), defend his camp from a Woolf pack and its scarred leader, then help him home.",
      "🪚 Bram's Sawmill in Sowerby: hand him Oak Logs and his copper blade saws them into Planks, even while you're away. Upgrade to an Iron Sawmill to saw Pine Logs too, and faster. He brings a new recipe for Granny's Kitchen too.",
      "🧭 Faint while walking someone home and they'll wait for you at the last checkpoint you reached, instead of magically appearing beside you.",
      '🏗️ New building plots open in story order (the Garden and Training Yard after the Slime King), and anything you built early now shows up in the village.',
      "😊 Faces are evenly lit, so nobody looks like they're wearing a beard any more (sorry, Poppy).",
      "🪵 Planks go into the village's later upgrades (Berry Garden, Bloom Garden, Dojo and Manor), so the Sawmill keeps paying off.",
      "🌉 Build Bram's Bridge over a creek in Whisper Woods: a shortcut from the west gate straight up to his old logging camp.",
      '🔔 Winning a regular fight rings a quick bell, then your XP bar fills right after it, so you hear both.',
      "🪓 A better start in Sowerby: Elder Oswin hands you his old axe and pick. Mend them with monster drops, then gather stone and logs to rebuild the forge.",
      '❤️ Levelling up raises your max HP, and adds the same to your health, but no longer heals you fully: rest at Veyra\'s Spring or a campfire for that.',
      '🛡️ Monsters are tougher: at your level a fight takes a real exchange of blows, and guardians are proper battles. The level gap counts both ways: outlevel an area and its monsters drop fast and barely scratch you; wander in underlevelled and they hit hard. Monsters give a little more XP for it.',
      '⚔️ Weapon handling matters: every swing and shot has a moment before the next, and a full combo a short rest. The more you fight with a kind of weapon, the quicker you get with it. This replaces the stamina meter.',
      "✨ Each weapon's handling has a path: its special move unlocks at Lv 2 and grows at 5, 8 and 10 (Spin → Cyclone, Quake → Earthshaker, Whirl → Tempest, Nova → Starburst), and the levels between make you attack faster. The Skills tab shows the path and what's next. Special moves are rebalanced so no weapon's outshines the rest.",
      '🏁 Fights end smoothly: the moment the last monster falls, your loot and XP come in under "Victory!", then the camera swoops you back to the map.',
      '🎉 Level ups, treasure, new gear, new quests and finished chapters get proper celebrations: a ribbon banner, your prize spinning in on rays of light, your new level ringing in, and each stat ticking up with its own sound.',
      '⚒ The Forge has five levels now, one per star tier: Forge, Smithy, Iron Smithy, Crystal Kiln and Master Forge. Each area\'s materials upgrade it to work them, so every upgrade unlocks gear you can make straight away. Your forge keeps every recipe it had.',
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
