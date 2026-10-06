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

/**
 * Patch notes stay snappy: one short line per change saying what changed, not how or why (the game shows the rest).
 * Big releases list their highlights and lump the small stuff ("Fixes: …"). Checked by the tests and the release check.
 */
export const NOTE_STYLE = { maxLength: 80, maxPatchNotes: 10, maxReleaseNotes: 15 };

/** What's wrong with a release's notes, if anything: a note too long, a second sentence, or too many notes. */
export function noteProblems(p: PatchNote): string[] {
  const out: string[] = [];
  // A patch release (0.3.1) gets fewer lines than a bigger one (0.3.0).
  const patch = !p.version.endsWith('.0');
  const max = patch ? NOTE_STYLE.maxPatchNotes : NOTE_STYLE.maxReleaseNotes;
  if (p.notes.length > max) out.push(`${p.version} has ${p.notes.length} notes (at most ${max}): keep the highlights and lump the rest`);
  for (const n of p.notes) {
    const len = [...n].length;
    if (len > NOTE_STYLE.maxLength) out.push(`${p.version}: ${len} characters (at most ${NOTE_STYLE.maxLength}): "${n}"`);
    if (/[.;!?] \S/.test(n)) out.push(`${p.version}: one sentence per note: "${n}"`);
  }
  return out;
}

export const PATCH_NOTES: PatchNote[] = [
  {
    version: '0.3.7',
    date: '2026-10-05',
    title: 'Rooms, Hunts and Hidden Tunnels',
    notes: [
      "🦊 Find the masked fox and earn her Shadow Scarf and hidden training lessons",
      "🪚 Carry logs to Bram's saw, pull its lever and collect the planks",
      "🍳 Pick Granny's recipes, carry one plate to the pot and watch it cook",
      "🗺️ Explore route forks, richer gathering stops and quest-opened secret groves",
      "🏘️ Walk new neighbours home, then ask Bram to build and improve their places",
      "🔨 Softer hammer slams, with one stronger Fracture hit per enemy",
      "🌉 Help Bram, then build timber shortcuts from oak through Emberwood",
      "⛏️ Help Pip break a boulder, discover mixed ore and open tunnels home",
      "🏹 Find Rook after the Emberwyrm and take scaled hunts for trophy rewards",
      "🐛 Fixes: Granny's reunion freeze and crowded village paths and plots",
    ],
  },
  {
    version: '0.3.6',
    date: '2026-09-30',
    title: 'Made by Hand',
    notes: [
      "🔨 Crafting shows your materials building each piece, for all gear and meals",
      "🎬 New moves play a preview when unlocked, and again any time from Skills",
      "🎵 Each region has its own battle music",
      "💥 Fracture hits each monster once per slam, so guardians no longer melt",
      "✨ Glimmer gear is icy glass and glowing jelly, made without Bat Wings",
      "🪢 Whips are easy to spot when carried",
      "🛡️ Armor clasps, studs and gems are chunky and easy to see",
      "🪄 The Jelly Wand is a solid goo rod with a fluffy grip",
      "🐉 The Dragontail Whip needs 2 Pine Logs, not 6",
      "🗡️ Weapons in fights match their new designs",
    ],
  },
  {
    version: '0.3.5',
    date: '2026-09-30',
    title: 'Strike Up the Band',
    notes: [
      "🎻 Music: a real orchestra, with its own theme for every area and fight",
      "🔊 Sound settings: mute, plus separate music and effects volume sliders",
      "🪓 Chops and clinks sound right as you tap",
      "🔥 Light each campfire yourself, to a warm little fanfare",
      "🧭 Campfires take you home, and Sowerby's Waystone to any lit campfire",
      "🗝️ Key items like the Twig Sword and Granny's gifts get their own fanfare",
      "🍄 Whisper Woods eases off: shorter spore poison, fewer packs of three",
      "🐾 A group marked ×3 now really brings all three monsters",
    ],
  },
  {
    version: '0.3.4',
    date: '2026-09-29',
    title: 'Learn the Fight',
    notes: [
      "🔨 Hammer slams hit harder and daze, with no more rocks on every swing",
      "💥 Hammers can Stagger: a slam knocks a monster out of its attack",
      "🪨 The hammer's special is Fracture: a fan of rock spikes bursts forward",
      "🎓 A newly unlocked move is taught the first time you can use it",
      "👻 Fainting now costs a walk back to where you fell",
      "🐺 Monsters past the meadow have new tricks: learn their tells",
      "🦇 Flappers screech to dizzy you, and Pebblors shrug off hits until they slam",
      "⚡ The game loads much faster: its scenery download is a seventh of the size",
      "🎵 Weapon handling has its own XP bar, with its own sound as it fills",
    ],
  },
  {
    version: '0.3.3',
    date: '2026-09-29',
    title: 'Fights with substance',
    notes: [
      "⚔️ Fights have more substance: monsters take a few real blows",
      "🪵 The Twig Sword hits a little harder",
      "🛡️ Armor costs about twice as much to craft",
      "🗺️ Weapon Paths only reveal your next two levels",
      "🎒 Unlock cards step aside for what you're doing, and go once you've looked",
      "📜 Story fights no longer stop on a Victory screen",
      "💬 Tap anywhere to move story dialogue on",
      "📊 A richer play report",
      "🐛 Fixes: Granny missing on a new game, and the level-up health bar",
    ],
  },
  {
    version: '0.3.2',
    date: '2026-09-29',
    title: 'Short and sweet',
    notes: [
      "📰 Shorter, snappier patch notes",
    ],
  },
  {
    version: '0.3.1',
    date: '2026-09-29',
    title: "Weapons With Character",
    notes: [
      "🗡️ Swords are now Blades, the only combo class",
      "🔨 Hammers, whips and magic strike once, with specials woven in between",
      "🎯 Every class has its own ability: Riposte, Sunder, Snare and Blink",
      "🪄 Wands are now Magic, and the Jelly Slingshot is the Jelly Wand",
      "🌀 Specials start small and grow into big Mastery finishers",
      "🗺️ A Path screen for every weapon class (Bag → Skills)",
      "⚔️ Handling lasts the whole story, and second classes train 2× faster",
      "⭐ Levelling is slower, and fair fights give the most XP",
      "✨ A sparklier XP bar",
      "🐛 Fixes: unlock cards over fights, and Bram missing from his camp",
    ],
  },
  {
    version: '0.3.0',
    date: '2026-09-28',
    title: "Tales of Sowerby",
    notes: [
      "🧸 Side story: Poppy's Bunny, with the Secret Grove and Big Bun",
      "🧔 Side story: Bram's Sawmill, with planks and Bram's Bridge",
      "👵 Granny's Kitchen: meals that give short buffs",
      "👑 New guardian: the Echo Queen, on the road to Glimmer Hollow",
      "🌾 Sowerby gets its name, its goddess Veyra and Elder Oswin",
      "✨ Everyone is now in real-time 3D",
      "🎬 Story scenes, mood bubbles and character portraits",
      "🎒 New menus: a satchel Bag, a smithy Forge and a notebook Journal",
      "⚒ The Forge has five levels, one per gear tier",
      "⚔️ Weapon handling paths, and cooldowns in place of stamina",
      "〰️ Whips crack at the tip",
      "🛡️ Tougher monsters, and the level gap counts both ways",
      "🎉 Bigger celebrations for level-ups, loot and new gear",
      "🪓 Mend Elder Oswin's old tools, and gathering looks all new",
      "❤️ Levelling up no longer heals you fully",
    ],
  },
  {
    version: '0.2.1',
    date: '2026-09-25',
    title: "A sharper look",
    notes: [
      "🧥 Every armor changes how you look",
      "✨ A sharper, bigger hero with a bold outline",
      "🪓 Axes and picks swing right at what you're gathering",
    ],
  },
  {
    version: '0.2.0',
    date: '2026-09-25',
    title: "Gather, forge and fight smarter",
    notes: [
      "💎 New area: Glimmer Hollow, home of crystal and the Glimmer Slime",
      "🪓 Woodcutting and mining, with timing minigames",
      "🗺️ Hand-drawn routes with tall grass and roaming monsters",
      "⚔️ New weapons: swords, hammers, whips and wands at every tier",
      "🎖️ Weapon handling unlocks each class's better weapons",
      "💨 A stamina meter ends endless spamming",
      "❓ The Forge keeps gear a mystery until you're ready for it",
      "⭐ Level-ups get their own screen",
      "📜 The quest tracker shows material progress",
      "🎯 You attack the way you last moved",
      "📊 A play report to help balance the game (More tab)",
      "🔧 Old weapons swap for new ones, plus title and loading fixes",
    ],
  },
  {
    version: '0.1.0',
    date: '2026-09-23',
    title: "First release",
    notes: [
      "🌱 Wake in the Quiet Glade, find a sword and head for the village",
      "🗺️ Explore the Sunny Meadow, Whisper Woods, Crystal Cave and Ember Peak",
      "⚔️ Real-time arena battles, each weapon with its own combo and skill",
      "👑 Guardians block the roads east, and the Emberwyrm waits at the end",
      "🏡 Rebuild the village, from the Forge to a warp stone",
      "⚒️ Craft weapons, armor, charms and potions from monster materials",
      "📱 Cute 3D art, touch controls, and keyboard controls on a computer",
    ],
  },
];
