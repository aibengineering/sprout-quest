// Preset saves for testing (dev builds only, see devtools.ts): jump straight to a point in the game, with the gear,
// levels and progress a player would have there. Gear follows the balance checkpoints (src/balance.ts), so a preset
// plays the way the balance model expects.
import { CHECKPOINTS } from '../balance';
import { GEAR, MAX_POTIONS, forgeLevelFor, MAT_ORDER, PROJECTS, QUESTS, TOOLS, ZONES, zoneById, zoneAtX, type MatId, type ZoneId } from '../data';
import { playerStats } from '../rules';
import { newState, type SaveState } from '../state';
import { FIELD, GATE_Y, World } from '../world';

export interface Preset {
  id: string;
  name: string;
  desc: string;
  make: () => SaveState;
}

let world: World | null = null;
const map = () => (world ??= new World());
const M = zoneById('meadow').x0;

/** Completes every chapter before `questId` the way playing would have: flags, buildings, guardians and campfires. */
function reach(s: SaveState, questId: string) {
  const i = QUESTS.findIndex((q) => q.id === questId);
  if (i < 0) throw new Error(`no quest ${questId}`);
  for (const q of QUESTS.slice(0, i)) {
    const g = q.goal;
    if (g.type === 'flag') s.flags.push(g.flag);
    if (g.type === 'build') s.build[g.project] = Math.max(s.build[g.project], g.level);
    if (g.type === 'craft') s.crafted = Math.max(s.crafted, 1);
    if (g.type === 'mend') s.tools = { wood: Math.max(1, s.tools.wood), mine: Math.max(1, s.tools.mine) };
    if (g.type === 'boss') {
      s.bosses.push(g.kind);
      const z = ZONES.find((z) => z.guardian?.kind === g.kind);
      if (z) s.camps.push(z.id);
      if (g.kind === 'dragon') s.bossWins++;
    }
  }
  s.quest = i;
  if (s.flags.includes('village')) s.flags.push('oldtools');
  // No tutorial popups or chapter intros you'd have seen already.
  s.tips.push('moved', 'chopped', 'mined', 'coach-potion', ...QUESTS.slice(0, i + 1).map((q) => `elder:${q.id}`));
  s.wins = Math.max(s.wins, 3 + i * 4);
}

/** The gear and level from a balance checkpoint. */
function kit(s: SaveState, checkpoint: string) {
  const c = CHECKPOINTS.find((c) => c.id === checkpoint)!;
  s.lv = c.lv;
  s.equip = { weapon: c.weapon, armor: c.armor, charm: c.charm ?? null };
  s.owned = [...new Set([...s.owned, c.weapon, c.armor, ...(c.charm ? [c.charm] : [])])];
  s.build.training = Math.max(s.build.training, c.training ?? 0);
  s.build.home = Math.max(s.build.home, c.home ?? 1);
  // Enough gathering skill for the gear you're wearing, and handling for your weapon's class.
  for (const id of s.owned) for (const [k, n] of Object.entries(GEAR[id]?.needs ?? {})) s.skills[k as 'wood' | 'mine'].lv = Math.max(s.skills[k as 'wood' | 'mine'].lv, n);
  const w = GEAR[c.weapon];
  if (w.style) s.mastery[w.style].lv = Math.max(s.mastery[w.style].lv, 1 + (w.tier ?? 0) * 2);
  // A Forge good enough to have made what you're wearing (starter gear like the Twig Sword wasn't forged, so the
  // Forge stays in ruins until the story repairs it).
  const forged = [c.weapon, c.armor, c.charm].filter((id): id is string => !!id && (GEAR[id]?.tier ?? 0) > 0);
  s.build.forge = Math.max(s.build.forge, ...forged.map((id) => forgeLevelFor(GEAR[id])));
}

/** Tool tiers for chopping and mining. */
function tools(s: SaveState, wood: number, mine: number) {
  s.tools = { wood, mine };
  s.skills.wood.lv = Math.max(s.skills.wood.lv, wood * 2);
  s.skills.mine.lv = Math.max(s.skills.mine.lv, mine * 2);
}

/** Where you stand, and the areas you've been through to get there. */
function standAt(s: SaveState, x: number, y: number) {
  s.pos = { x, y };
  const here = zoneAtX(Math.floor(x));
  s.visited = ZONES.filter((z) => z.x0 <= here.x0).map((z) => z.id);
  const lastCamp = [...s.camps].pop();
  s.respawn = lastCamp ?? 'village';
}

/** In front of a guardian's gate (on the road just west of it). */
const gate = (id: ZoneId) => ({ x: zoneById(id).x0 - 1.5, y: GATE_Y + 2.4 });

function finish(s: SaveState) {
  // A preset has seen everything it can make (no wall of "New" badges in the Forge).
  delete s.forgeSeen;
  s.potions = MAX_POTIONS;
  s.hp = playerStats(s).maxHp;
  return s;
}

/** A save that's just finished the prologue and a bit of the first chapter. */
function base(questId: string, checkpoint: string, x: number, y: number, then?: (s: SaveState) => void) {
  const s = newState();
  reach(s, questId);
  kit(s, checkpoint);
  standAt(s, x, y);
  then?.(s);
  return finish(s);
}

/** Poppy's story at a step: in the meadow with a first ★ weapon, the story flags up to that point. */
function poppy(step: number, flags: string[], x: number, y: number, then?: (s: SaveState) => void) {
  return base('cottage', 'meadow-gear', x, y, (s) => {
    tools(s, 1, 1);
    s.stories.poppy = step;
    s.flags.push(...flags);
    then?.(s);
  });
}

const bossFlags = ['poppy:rescue', 'poppy:pack1', 'poppy:pack2', 'poppy:bigbun'];

const W = zoneById('woods').x0;

/** Bram's story at a step: the Slime King beaten, Poppy's story done, a copper axe for the camp's pines. */
function bram(step: number, flags: string[], x: number, y: number, then?: (s: SaveState) => void) {
  return base('smithy', 'woods', x, y, (s) => {
    tools(s, 2, 1);
    s.lv = Math.max(s.lv, 5);
    s.stories.poppy = 6;
    s.perks.push('trailboots');
    s.flags.push(...bossFlags, 'poppy:returned');
    s.stories.bram = step;
    s.flags.push(...flags);
    then?.(s);
  });
}

const BRAM_DONE = ['bram:pie', 'bram:met', 'bram:wave1', 'bram:wave2', 'bram:scar', 'bram:ambush1', 'bram:ambush2', 'bram:home', 'bram:hut', 'bram:stew'];

/** Pip's story at a step: Bram's story done (his Sawmill and cabin built), by the Guest Cottage's plot. */
function pip(step: number, then?: (s: SaveState) => void) {
  return bram(9, BRAM_DONE, zoneById('village').x0 + 19.9, 6.7, (s) => {
    tools(s, 2, 2);
    s.build.sawmill = 1;
    s.unlocked.push('sawmill', 'cottage');
    s.stories.pip = step;
    then?.(s);
  });
}

const C = zoneById('cave').x0;

/** The drums in the dark (Echo Cavern's Pebblors) at a step: the Cavern open, Poppy's and Bram's stories done, in copper gear. */
function drums(step: number, x: number, y: number, then?: (s: SaveState) => void) {
  return base('warp', 'cave', x, y, (s) => {
    tools(s, 2, 2);
    s.stories.poppy = 6;
    s.perks.push('trailboots');
    s.flags.push(...bossFlags, 'poppy:returned', ...BRAM_DONE);
    s.stories.bram = 9;
    s.build.sawmill = 1;
    s.unlocked.push('sawmill');
    s.stories.drums = step;
    then?.(s);
  });
}

export const PRESETS: Preset[] = [
  {
    id: 'fluffy-craft', name: 'Make a Fluffy Vest', desc: 'At the Forge with 36 Bunny Fluff and 12 Slime Goo. Try the automatic crafting reveal.',
    make: () => base('cottage', 'meadow', zoneById('village').x0 + 7, 10.7, (s) => {
      s.build.forge = 1;
      s.lv = 4;
      s.equip.armor = 'tunic';
      s.owned = s.owned.filter((id) => id !== 'fluffvest');
      Object.assign(s.mats, { fluff: GEAR.fluffvest.recipe!.fluff, goo: GEAR.fluffvest.recipe!.goo });
    }),
  },
  {
    id: 'village', name: 'Just reached the village', desc: 'Prologue done, Lv 2, Twig Sword. The first chapter starts.',
    make: () => base('meadow', 'meadow', zoneById('village').x0 + 4.5, 13.5, (s) => (s.lv = 2)),
  },
  {
    id: 'poppy', name: "Poppy: before meeting her", desc: "Lv 3 with a Stone Sword, on the path down to the meadow's south-east pocket.",
    make: () => poppy(0, [], M + 33.5, 19.6),
  },
  {
    id: 'poppy-escort', name: 'Poppy: walking her home', desc: 'The slimes are beaten; Poppy follows you home.',
    make: () => poppy(2, ['poppy:rescue'], M + 30.5, 22.6),
  },
  {
    id: 'poppy-chase', name: 'Poppy: the chase', desc: 'Big Bun ran into the Secret Grove; his gang guards the way.',
    make: () => poppy(4, ['poppy:rescue'], M + 30, 23.4),
  },
  {
    id: 'poppy-return', name: 'Poppy: bringing him home', desc: 'Mr. Floppers is back; talk to Poppy by the blue house.',
    make: () => poppy(5, bossFlags, 29.4, 12),
  },
  {
    id: 'poppy-done', name: 'Poppy: story finished', desc: 'Trail Boots on, and the Secret Grove free to gather in.',
    make: () => poppy(6, [...bossFlags, 'poppy:returned'], M + 29, 23.4, (s) => s.perks.push('trailboots')),
  },
  {
    id: 'bram', name: "Bram: Granny's favour", desc: 'Slime King beaten and Poppy home: Granny has a pie for Bram. Lv 5, copper axe.',
    make: () => bram(0, [], 31.8, 11.4),
  },
  {
    id: 'bram-contest', name: 'Bram: the quiet chop', desc: "At Bram's camp with the pie delivered: fell three pines, quietly.",
    make: () => bram(2, ['bram:pie', 'bram:met'], W + 9.5, 6.4),
  },
  {
    id: 'bram-escort', name: 'Bram: the walk home', desc: 'The raid is over and Bram is hurt: help him back to Sowerby.',
    make: () => bram(6, ['bram:pie', 'bram:met', 'bram:wave1', 'bram:wave2', 'bram:scar'], W + 9.2, 6.5),
  },
  {
    id: 'bram-mill', name: 'Bram: the Sawmill', desc: 'Bram lives in Sowerby now: build his Sawmill, then saw planks for his cabin.',
    make: () => bram(7, ['bram:pie', 'bram:met', 'bram:wave1', 'bram:wave2', 'bram:scar', 'bram:ambush1', 'bram:ambush2', 'bram:home'], zoneById('village').x0 + 4.5, 12.5, (s) => {
      Object.assign(s.mats, { pine: 24, stone: 24, copper: 12, bark: 48 });
    }),
  },
  {
    id: 'pip-cottage', name: 'Pip: the Guest Cottage', desc: "Bram's settled in, with his Sawmill and cabin: build the Guest Cottage and see who moves in.",
    make: () => pip(0, (s) => Object.assign(s.mats, { bark: 12, plank: 32, stone: 12, copper: 6 })),
  },
  {
    id: 'pip-home', name: 'Pip: moved in', desc: 'Pip lives in the Guest Cottage and Granny knows his Rock Candy. A copper pick, and stone and copper to cook with.',
    make: () => pip(1, (s) => {
      s.build.cottage = 1;
      s.flags.push('pip:candy');
      Object.assign(s.mats, { stone: 36, copper: 18 });
    }),
  },
  {
    id: 'kitchen', name: "Granny's Kitchen", desc: 'Inside Granny\'s Kitchen with Bram\'s and Pip\'s recipes known, and plenty to cook with: pick a recipe, fetch, stir and serve.',
    make: () => pip(1, (s) => {
      s.build.cottage = 1;
      s.flags.push('pip:candy');
      Object.assign(s.mats, { fluff: 45, goo: 60, clover: 6, pine: 27, cap: 18, stone: 36, copper: 18 });
      const o = map().obj('house')!;
      s.pos = { x: o.x + o.w / 2 - 0.4, y: o.y + o.h + 0.7 };
      s.room = 'kitchen';
    }),
  },
  {
    id: 'sawmill', name: "Bram's Sawmill", desc: "Inside Bram's Sawmill with an Iron Blade (Oak and Pine), piles of logs to carry to the bench, and a few planks already sawn.",
    make: () => pip(1, (s) => {
      s.build.cottage = 1;
      s.build.sawmill = 2;
      s.flags.push('pip:candy');
      Object.assign(s.mats, { bark: 40, pine: 24 });
      s.sawmill = { queue: [], ready: { plank: 8 }, since: 0 };
      const o = map().objs.find((o) => o.project === 'sawmill')!;
      s.pos = { x: o.x + o.w / 2, y: o.y + o.h + 0.7 };
      s.room = 'sawmill';
    }),
  },
  {
    id: 'drums', name: 'Drums: Granny is worried', desc: "The Alpha Woolf is beaten and Poppy's home: walk up to Granny, and Poppy's gone after the drums in Echo Cavern.",
    make: () => drums(0, 29.4, 12.6),
  },
  {
    id: 'drums-tail', name: 'Drums: the procession', desc: 'In Echo Cavern, just along from the side tunnels: walk up to the shaft and tail the Pebblors.',
    make: () => drums(1, C + 23.5, 12.6),
  },
  {
    id: 'drums-done', name: 'Drums: the Echo Anklet', desc: "Poppy's home and the Pebblors gave you the Echo Anklet: two dodges in a row. In their chamber.",
    make: () => drums(4, C + 25.6, 3.4, (s) => s.perks.push('echoanklet')),
  },
  ...[1, 2, 3].map((lv) => ({
    id: lv === 2 ? 'garden' : `garden${lv}`,
    name: `Poppy's Garden: ${PROJECTS.garden.levels[lv - 1].name}`,
    desc: [
      "The Sprout Patch just built: walk in at the field's gate and Poppy hands over the Berry Seeds she saved for its six plots.",
      "Poppy tends the Berry Garden's twelve plots: all empty to work by hand, a handful of every seed, and Bunny Fluff for a Berry Tart.",
      "The Bloom Garden's twenty plots mid-season: sprouts, growing crops, a thirsty plot, a weedy one and a ripe row to pick.",
    ][lv - 1],
    make: () => base('smithy', 'woods', zoneById('village').x0 + FIELD.x + 2.5, FIELD.y - 0.3, (s) => {
      tools(s, 2, 1);
      s.stories.poppy = 6;
      s.perks.push('trailboots');
      s.flags.push(...bossFlags, 'poppy:returned', ...(lv > 1 ? ['garden:welcome'] : []));
      s.build.garden = lv;
      if (lv > 1) Object.assign(s.mats, { berryseed: 8, herbseed: 6, flowerseed: 4, fluff: 18 });
      // Mid-season: what's in each plot, as of when the save is made (grown seconds, at full speed).
      if (lv === 3) {
        const now = Date.now(), crops = ['berry', 'berry', 'berry', 'herb', 'herb', 'herb', 'flower', 'flower', 'flower', 'berry', 'herb', 'flower'] as const;
        s.garden = {
          gift: now,
          plots: crops.map((crop, i) => ({ crop, at: now, grown: [9999, 9999, 9999, 30, 200, 90, 40, 300, 150, 10, 100, 250][i], ...(i === 4 ? { thirsty: true } : i === 7 ? { weeds: true } : {}) })),
        };
        s.flags.push('garden:berries');
      }
    }),
  })),
  {
    id: 'kingslime', name: 'Slime King', desc: 'Lv 4, Stone Sword and Fluff Vest, at the Whisper Woods gate.',
    make: () => base('kingslime', 'woods', gate('woods').x, gate('woods').y, (s) => tools(s, 1, 1)),
  },
  {
    id: 'alphawolf', name: 'Alpha Woolf', desc: 'Lv 8 in copper gear with a Smithy, at the Echo Cavern gate.',
    make: () => base('alphawolf', 'cave', gate('cave').x, gate('cave').y, (s) => tools(s, 2, 2)),
  },
  {
    id: 'echoqueen', name: 'Echo Queen', desc: 'Lv 11 in iron gear, at the far end of Echo Cavern, before the Glimmer Hollow gate.',
    make: () => base('echoqueen', 'hollow', gate('hollow').x, gate('hollow').y, (s) => tools(s, 2, 3)),
  },
  {
    id: 'hollow', name: 'Glimmer Hollow', desc: 'Lv 11 in iron gear with an Iron Pick, arriving in the Hollow.',
    make: () => base('hollow', 'hollow', map().entryPoint('hollow').x, map().entryPoint('hollow').y, (s) => tools(s, 2, 3)),
  },
  {
    id: 'crystalking', name: 'Crystal King', desc: 'Lv 13 in crystal gear, at the Ember Peak gate.',
    make: () => base('crystalking', 'peak', gate('peak').x, gate('peak').y, (s) => tools(s, 2, 4)),
  },
  {
    id: 'dragon', name: 'Emberwyrm', desc: 'Lv 18 in magma gear with a Master Forge, outside the lair.',
    make: () => {
      const lair = map().obj('lair')!;
      return base('dragon', 'dragon', lair.x + lair.w / 2, lair.y + lair.h + 0.8, (s) => tools(s, 2, 4));
    },
  },
  {
    id: 'sandbox', name: 'Sandbox', desc: 'Everything built and owned, Lv 20, a big pile of every material. For trying gear and crafting.',
    make: () => base('legend', 'dragon', zoneById('village').x0 + 4.5, 13.5, (s) => {
      s.lv = 20;
      s.owned = [...new Set([...s.owned, ...Object.keys(GEAR)])];
      tools(s, Math.max(...TOOLS.filter((t) => t.skill === 'wood').map((t) => t.tier)), Math.max(...TOOLS.filter((t) => t.skill === 'mine').map((t) => t.tier)));
      for (const m of MAT_ORDER) s.mats[m as MatId] = 99;
      for (const st of Object.values(s.mastery)) st.lv = 10;
      for (const [id, p] of Object.entries(PROJECTS)) s.build[id as keyof typeof s.build] = p.levels.length;
      // With the Guest Cottage built, Pip lives in it (rather than arriving the moment you start).
      s.stories.pip = 1;
      s.flags.push('pip:candy');
      // Past the last chapter, so nothing pops up.
      s.quest = QUESTS.length;
    }),
  },
];

/**
 * A fresh Battle Tower run (src/game/tower.ts): Lv 1 with the Twig Sword, standing by the Forge in a finished Sowerby
 * with the Forge fully built and every gathering skill high enough for any recipe, so the gear you make is limited only
 * by your level, your handling and the materials the floors hand you.
 */
export function towerRun(): SaveState {
  return base('legend', 'meadow', zoneById('village').x0 + 4.5, 13.5, (s) => {
    s.quest = QUESTS.length;
    tools(s, Math.max(...TOOLS.filter((t) => t.skill === 'wood').map((t) => t.tier)), Math.max(...TOOLS.filter((t) => t.skill === 'mine').map((t) => t.tier)));
    s.skills.wood.lv = s.skills.mine.lv = 10;
    s.build.forge = PROJECTS.forge.levels.length;
    for (const m of MAT_ORDER) s.mats[m as MatId] = 0;
    s.tower = { floor: 1 };
  });
}
