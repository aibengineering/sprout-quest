// Preset saves for testing (dev builds only, see devtools.ts): jump straight to a point in the game, with the gear,
// levels and progress a player would have there. Gear follows the balance checkpoints (src/balance.ts), so a preset
// plays the way the balance model expects.
import { CHECKPOINTS } from '../balance';
import { GEAR, MAX_POTIONS, forgeLevelFor, MAT_ORDER, PROJECTS, QUESTS, TOOLS, ZONES, zoneById, zoneAtX, type MatId, type ZoneId } from '../data';
import { playerStats } from '../rules';
import { newState, type SaveState } from '../state';
import { GATE_Y, World } from '../world';

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
  s.tips.push('moved', 'chopped', 'mined', 'coach-skill', 'coach-potion', ...QUESTS.slice(0, i + 1).map((q) => `elder:${q.id}`));
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

export const PRESETS: Preset[] = [
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
    id: 'kingslime', name: 'Slime King', desc: 'Lv 4, Stone Sword and Fluff Vest, at the Whisper Woods gate.',
    make: () => base('kingslime', 'woods', gate('woods').x, gate('woods').y, (s) => tools(s, 1, 1)),
  },
  {
    id: 'alphawolf', name: 'Alpha Woolf', desc: 'Lv 8 in copper gear with a Smithy, at the Echo Cavern gate.',
    make: () => base('alphawolf', 'cave', gate('cave').x, gate('cave').y, (s) => tools(s, 2, 2)),
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
      // Past the last chapter, so nothing pops up.
      s.quest = QUESTS.length;
    }),
  },
];
