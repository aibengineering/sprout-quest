// Static game data: materials, monsters, gear, recipes and zones.

export type MatId =
  | 'goo' | 'fluff' | 'clover'
  | 'cap' | 'bark' | 'pine' | 'fang'
  | 'stone' | 'copper' | 'iron'
  | 'wing' | 'crystal' | 'core'
  | 'ember' | 'horn' | 'scale'
  | 'royaljelly' | 'alphapelt' | 'kingcrystal';

export type Recipe = Partial<Record<MatId, number>>;

export const MATS: Record<MatId, { name: string; icon: string; where: string }> = {
  goo: { name: 'Slime Goo', icon: '🟢', where: 'Slimes · Meadow' },
  fluff: { name: 'Bunny Fluff', icon: '☁️', where: 'Hopbuns · Meadow' },
  clover: { name: 'Lucky Clover', icon: '🍀', where: 'Rare · Meadow & Woods' },
  cap: { name: 'Shroom Cap', icon: '🍄', where: 'Sporecaps · Woods' },
  bark: { name: 'Oak Log', icon: '🪵', where: 'Oak trees · Stone Axe' },
  pine: { name: 'Pine Log', icon: '🌲', where: 'Pine trees · Woods · Fang Axe' },
  stone: { name: 'Stone', icon: '🪨', where: 'Rocks · Meadow & Woods · Stone Pick' },
  copper: { name: 'Copper Ore', icon: '🟠', where: 'Copper veins · Woods & Cave · Copper Pick' },
  iron: { name: 'Iron Ore', icon: '⚙️', where: 'Iron veins · Cave & Peak · Iron Pick' },
  fang: { name: 'Wolf Fang', icon: '🦷', where: 'Woolfs · Woods' },
  wing: { name: 'Bat Wing', icon: '🦇', where: 'Flappers · Cave' },
  crystal: { name: 'Crystal Shard', icon: '💎', where: 'Cave' },
  core: { name: 'Golem Core', icon: '🔮', where: 'Rare · Pebblors & Magma' },
  ember: { name: 'Ember', icon: '🔥', where: 'Ember Peak' },
  horn: { name: 'Imp Horn', icon: '😈', where: 'Impys · Peak' },
  scale: { name: 'Dragon Scale', icon: '🐉', where: 'Emberwyrm' },
  royaljelly: { name: 'Royal Jelly', icon: '👑', where: 'Trophy · Slime King' },
  alphapelt: { name: 'Alpha Pelt', icon: '🐺', where: 'Trophy · Alpha Woolf' },
  kingcrystal: { name: 'King Crystal', icon: '💠', where: 'Trophy · Crystal King' },
};

export const MAT_ORDER = Object.keys(MATS) as MatId[];

export type MonsterKind =
  | 'slime' | 'bunny' | 'shroom' | 'wolf' | 'bat'
  | 'golem' | 'imp' | 'magma' | 'dragon'
  | 'kingslime' | 'alphawolf' | 'crystalking';

export interface Drop { mat: MatId; chance: number; min: number; max: number }

export interface MonsterDef {
  name: string;
  lv: number;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  r: number;
  xp: number;
  drops: Drop[];
  boss?: boolean;
  /** Short title shown on boss bars and gates. */
  title?: string;
}

export const MONSTERS: Record<MonsterKind, MonsterDef> = {
  slime: {
    name: 'Slime', lv: 1, hp: 20, atk: 5, def: 0, spd: 70, r: 14, xp: 5,
    drops: [{ mat: 'goo', chance: 0.9, min: 1, max: 2 }, { mat: 'clover', chance: 0.15, min: 1, max: 1 }],
  },
  bunny: {
    name: 'Hopbun', lv: 2, hp: 20, atk: 6, def: 1, spd: 80, r: 13, xp: 7,
    drops: [{ mat: 'fluff', chance: 0.85, min: 1, max: 2 }, { mat: 'clover', chance: 0.15, min: 1, max: 1 }],
  },
  shroom: {
    name: 'Sporecap', lv: 5, hp: 36, atk: 10, def: 3, spd: 45, r: 15, xp: 15,
    drops: [{ mat: 'cap', chance: 0.85, min: 1, max: 2 }, { mat: 'clover', chance: 0.1, min: 1, max: 1 }],
  },
  wolf: {
    name: 'Woolf', lv: 6, hp: 46, atk: 12, def: 4, spd: 95, r: 15, xp: 20,
    drops: [{ mat: 'fang', chance: 0.8, min: 1, max: 2 }],
  },
  bat: {
    name: 'Flapper', lv: 9, hp: 52, atk: 15, def: 5, spd: 110, r: 13, xp: 28,
    drops: [{ mat: 'wing', chance: 0.8, min: 1, max: 2 }, { mat: 'crystal', chance: 0.3, min: 1, max: 1 }],
  },
  golem: {
    name: 'Pebblor', lv: 11, hp: 90, atk: 22, def: 12, spd: 38, r: 22, xp: 48,
    drops: [{ mat: 'crystal', chance: 0.85, min: 1, max: 3 }, { mat: 'core', chance: 0.4, min: 1, max: 1 }],
  },
  imp: {
    name: 'Impy', lv: 14, hp: 88, atk: 30, def: 10, spd: 90, r: 14, xp: 58,
    drops: [{ mat: 'ember', chance: 0.8, min: 1, max: 2 }, { mat: 'horn', chance: 0.7, min: 1, max: 1 }],
  },
  magma: {
    name: 'Magma Slime', lv: 15, hp: 120, atk: 34, def: 14, spd: 80, r: 16, xp: 62,
    drops: [{ mat: 'ember', chance: 0.9, min: 1, max: 3 }, { mat: 'core', chance: 0.3, min: 1, max: 1 }],
  },
  dragon: {
    name: 'Emberwyrm', lv: 20, hp: 2000, atk: 46, def: 18, spd: 70, r: 44, xp: 600, boss: true, title: 'Dragon of Ember Peak',
    drops: [{ mat: 'scale', chance: 1, min: 3, max: 4 }, { mat: 'ember', chance: 1, min: 3, max: 5 }],
  },
  kingslime: {
    name: 'Slime King', lv: 5, hp: 280, atk: 11, def: 3, spd: 60, r: 34, xp: 120, boss: true, title: 'Guardian of the Woods Road',
    drops: [{ mat: 'royaljelly', chance: 1, min: 2, max: 2 }, { mat: 'goo', chance: 1, min: 4, max: 6 }],
  },
  alphawolf: {
    name: 'Alpha Woolf', lv: 9, hp: 560, atk: 17, def: 6, spd: 110, r: 26, xp: 260, boss: true, title: 'Guardian of the Cave Road',
    drops: [{ mat: 'alphapelt', chance: 1, min: 2, max: 2 }, { mat: 'fang', chance: 1, min: 3, max: 5 }],
  },
  crystalking: {
    name: 'Crystal King', lv: 14, hp: 820, atk: 31, def: 14, spd: 45, r: 38, xp: 520, boss: true, title: 'Guardian of the Peak Road',
    drops: [{ mat: 'kingcrystal', chance: 1, min: 2, max: 2 }, { mat: 'crystal', chance: 1, min: 4, max: 6 }, { mat: 'core', chance: 1, min: 1, max: 1 }],
  },
};

export type Slot = 'weapon' | 'armor' | 'charm';
export type Style = 'sword' | 'spear' | 'axe' | 'hammer' | 'wand';
/** Elemental flavor: fire burns, crystal crits, dragon adds explosions; the rest are cosmetic. */
export type Fx = 'none' | 'nature' | 'jelly' | 'crystal' | 'stone' | 'fire' | 'dragon';

export interface Gear {
  id: string;
  name: string;
  slot: Slot;
  icon: string;
  desc: string;
  atk?: number;
  def?: number;
  hp?: number;
  spd?: number;
  luck?: number;
  regen?: number;
  style?: Style;
  /** Weapon power tier 0–5: bigger reach, flashier trails and heavier impacts. */
  tier?: number;
  /** Gathering skill levels needed to craft it (the gatherer track). */
  needs?: Partial<Record<SkillId, number>>;
  fx?: Fx;
  /** Slash trail color. */
  trail?: string;
  color?: string;
  recipe?: Recipe;
}

const GEAR_LIST: Gear[] = [
  // Weapons
  { id: 'twig', name: 'Twig Sword', slot: 'weapon', icon: '🗡️', style: 'sword', tier: 0, fx: 'nature', trail: '#fff6d0', atk: 3, color: '#b98a5a', desc: 'A trusty stick. Pointy-ish.' },
  { id: 'jelly', name: 'Jelly Blade', slot: 'weapon', icon: '🗡️', style: 'sword', tier: 1, fx: 'jelly', trail: '#9af0a0', atk: 7, color: '#6fdc7a', desc: 'Wobbly but surprisingly sharp.', recipe: { goo: 6, fluff: 2 } },
  { id: 'cloverhatchet', name: 'Clover Hatchet', slot: 'weapon', icon: '🪓', style: 'axe', tier: 1, fx: 'nature', trail: '#c8f0a0', atk: 9, color: '#a8e8b0', desc: 'Heavy cleaves. Lucky, too.', needs: { wood: 2 }, recipe: { bark: 5, stone: 3 } },
  { id: 'fangspear', name: 'Fang Spear', slot: 'weapon', icon: '🔱', style: 'spear', tier: 2, fx: 'none', trail: '#fff0e0', atk: 13, color: '#e8e2d0', desc: 'Long reach. Skill: lunge!', recipe: { fang: 6, cap: 3 } },
  { id: 'timberaxe', name: 'Timber Axe', slot: 'weapon', icon: '🪓', style: 'axe', tier: 2, fx: 'none', trail: '#e0e8ff', atk: 16, color: '#dfe6f0', desc: 'Wide cleave. Skill: whirlwind!', needs: { wood: 5 }, recipe: { pine: 6, bark: 3, copper: 2 } },
  { id: 'mushmallet', name: 'Mushroom Mallet', slot: 'weapon', icon: '🔨', style: 'hammer', tier: 2, fx: 'jelly', trail: '#ffb4b4', atk: 17, color: '#e8505a', desc: 'Slams send shockwaves forward.', recipe: { cap: 7, fang: 2 } },
  { id: 'crystalwand', name: 'Crystal Wand', slot: 'weapon', icon: '🪄', style: 'wand', tier: 3, fx: 'crystal', trail: '#9ae6ff', atk: 18, color: '#9ae6ff', desc: 'Shoots sparkles. Skill: nova!', recipe: { crystal: 5, wing: 4, cap: 3 } },
  { id: 'geode', name: 'Geode Sword', slot: 'weapon', icon: '🗡️', style: 'sword', tier: 3, fx: 'crystal', trail: '#c8b0ff', atk: 22, color: '#b8a0ff', desc: 'Crystal edge: extra crits.', recipe: { crystal: 6, wing: 4 } },
  { id: 'boulder', name: 'Boulder Hammer', slot: 'weapon', icon: '🔨', style: 'hammer', tier: 3, fx: 'stone', trail: '#e0d8c8', atk: 27, color: '#9aa0b0', desc: 'Miner-forged from stone and ore. Skill: quake!', needs: { mine: 7 }, recipe: { stone: 8, iron: 3, copper: 2 } },
  { id: 'emberblade', name: 'Ember Blade', slot: 'weapon', icon: '🗡️', style: 'sword', tier: 4, fx: 'fire', trail: '#ffb03a', atk: 36, color: '#ff8a3a', desc: 'Sets foes ablaze.', recipe: { ember: 8, horn: 4, core: 1 } },
  { id: 'magmacleaver', name: 'Magma Cleaver', slot: 'weapon', icon: '🪓', style: 'axe', tier: 4, fx: 'fire', trail: '#ff7a2a', atk: 42, color: '#ff7a2a', desc: 'Molten cleaves that burn.', needs: { wood: 8 }, recipe: { pine: 8, iron: 6, stone: 4 } },
  { id: 'wyrmfang', name: 'Wyrmfang', slot: 'weapon', icon: '🔱', style: 'spear', tier: 5, fx: 'dragon', trail: '#ff5a4a', atk: 55, color: '#ff5a4a', desc: 'Dragonfire bursts on every hit!', needs: { wood: 9 }, recipe: { scale: 3, ember: 6, pine: 8, iron: 4 } },
  { id: 'wyrmbreaker', name: 'Wyrmbreaker', slot: 'weapon', icon: '🔨', style: 'hammer', tier: 5, fx: 'dragon', trail: '#ffb03a', atk: 64, color: '#c83a3a', desc: 'Legendary. Shakes the earth.', needs: { mine: 9 }, recipe: { scale: 4, core: 2, iron: 8, stone: 6 } },
  // Armor
  { id: 'tunic', name: 'Cozy Tunic', slot: 'armor', icon: '👕', def: 1, color: '#6fa8ff', desc: 'Smells like home.' },
  { id: 'fluffvest', name: 'Fluffy Vest', slot: 'armor', icon: '🧥', def: 3, hp: 6, color: '#fff1e6', desc: 'Soft and bouncy.', recipe: { fluff: 6, goo: 2 } },
  { id: 'barkvest', name: 'Timber Vest', slot: 'armor', icon: '🪵', def: 4, hp: 4, color: '#9a6a44', desc: 'Sturdy oak and stone buttons.', needs: { wood: 2 }, recipe: { bark: 6, stone: 2 } },
  { id: 'shroomhood', name: 'Shroom Hood', slot: 'armor', icon: '🥋', def: 6, hp: 12, color: '#e8505a', desc: 'Spotty and stylish.', recipe: { cap: 6, fang: 2 } },
  { id: 'batcloak', name: 'Bat Cloak', slot: 'armor', icon: '🧣', def: 10, spd: 12, color: '#7a5ab8', desc: 'Swoosh! +speed.', recipe: { wing: 6, fang: 3 } },
  { id: 'coppermail', name: 'Copper Mail', slot: 'armor', icon: '🟠', def: 8, hp: 10, color: '#e8904a', desc: 'Warm, bright and clanky.', needs: { mine: 4 }, recipe: { copper: 6, stone: 4, bark: 2 } },
  { id: 'crystalmail', name: 'Crystal Mail', slot: 'armor', icon: '🛡️', def: 15, hp: 20, color: '#8ad8f0', desc: 'Shiny and tough.', recipe: { crystal: 8, core: 1 } },
  { id: 'ironplate', name: 'Iron Plate', slot: 'armor', icon: '🛡️', def: 17, hp: 18, color: '#aab4c8', desc: 'Heavy, honest iron.', needs: { mine: 7 }, recipe: { iron: 8, copper: 4, pine: 4 } },
  { id: 'magmamail', name: 'Magma Mail', slot: 'armor', icon: '🦺', def: 21, hp: 30, color: '#e8703a', desc: 'Toasty protection.', recipe: { ember: 8, horn: 3, crystal: 4 } },
  { id: 'dragonmail', name: 'Dragon Mail', slot: 'armor', icon: '🐲', def: 30, hp: 50, color: '#c83a3a', desc: 'The ultimate cozy armor.', needs: { wood: 8, mine: 8 }, recipe: { scale: 4, core: 2, pine: 6, iron: 6 } },
  // Charms
  { id: 'clovercharm', name: 'Clover Charm', slot: 'charm', icon: '🍀', luck: 0.25, desc: '+25% luck: more drops & crits.', recipe: { clover: 3, goo: 3 } },
  { id: 'toothcharm', name: 'Tooth Necklace', slot: 'charm', icon: '📿', atk: 4, desc: '+4 attack. Rawr.', recipe: { fang: 4, cap: 2 } },
  { id: 'crystalheart', name: 'Crystal Heart', slot: 'charm', icon: '💖', hp: 30, regen: 1, desc: '+30 HP, heal slowly in battle.', recipe: { crystal: 4, wing: 3, clover: 1 } },
  { id: 'impring', name: 'Imp Ring', slot: 'charm', icon: '💍', atk: 8, spd: 10, desc: '+8 attack, +speed.', recipe: { horn: 4, ember: 3 } },
];

export const GEAR: Record<string, Gear> = Object.fromEntries(GEAR_LIST.map((g) => [g.id, g]));
export const GEAR_ORDER = GEAR_LIST.map((g) => g.id);

export const MAX_POTIONS = 5;
export const POTION_HEAL = 0.5;

export const POTION_RECIPES: { id: string; name: string; recipe: Recipe }[] = [
  { id: 'jellypot', name: 'Jelly Potion', recipe: { goo: 2, fluff: 1 } },
  { id: 'shroombrew', name: 'Shroom Brew', recipe: { cap: 2 } },
  { id: 'embertonic', name: 'Ember Tonic', recipe: { ember: 2 } },
];

export type ZoneId = 'glade' | 'village' | 'meadow' | 'woods' | 'cave' | 'peak';

export interface Theme {
  ground: string;
  ground2: string;
  grass: string;
  grassTip: string;
  path: string;
  obstacle: 'tree' | 'pine' | 'crystal' | 'rock';
  pool: 'water' | 'lava' | null;
  decor: 'flower' | 'mush' | 'gem' | 'pebble';
  outside: string;
}

export interface Guardian {
  kind: MonsterKind;
  lv: number;
  /** What the roadblock looks like until the guardian is beaten. */
  gate: 'bramble' | 'crystal' | 'rock';
}

export interface Zone {
  id: ZoneId;
  /** Boss blocking the road into this zone. */
  guardian?: Guardian;
  name: string;
  x0: number;
  w: number;
  rec: number;
  lv: [number, number];
  maxEnemies: number;
  monsters: { kind: MonsterKind; w: number }[];
  theme: Theme;
}

export const ZONES: Zone[] = [
  {
    id: 'glade', name: 'Quiet Glade', x0: 0, w: 16, rec: 1, lv: [1, 1], maxEnemies: 0, monsters: [],
    theme: { ground: '#8fd672', ground2: '#88cf6a', grass: '#5fbf4a', grassTip: '#86dc5e', path: '#e4d2a4', obstacle: 'tree', pool: 'water', decor: 'flower', outside: '#4f9a42' },
  },
  {
    id: 'village', name: 'Sprout Village', x0: 16, w: 22, rec: 1, lv: [1, 1], maxEnemies: 0, monsters: [],
    theme: { ground: '#9be07a', ground2: '#93d872', grass: '#5fbf4a', grassTip: '#86dc5e', path: '#ecd9aa', obstacle: 'tree', pool: 'water', decor: 'flower', outside: '#5fae4c' },
  },
  {
    id: 'meadow', name: 'Sunny Meadow', x0: 38, w: 40, rec: 1, lv: [1, 3], maxEnemies: 2,
    monsters: [{ kind: 'slime', w: 3 }, { kind: 'bunny', w: 2 }],
    theme: { ground: '#a8e27f', ground2: '#9fd975', grass: '#4fb043', grassTip: '#86dc5e', path: '#ecd9aa', obstacle: 'tree', pool: 'water', decor: 'flower', outside: '#62b451' },
  },
  {
    id: 'woods', name: 'Whisper Woods', guardian: { kind: 'kingslime', lv: 5, gate: 'bramble' }, x0: 78, w: 40, rec: 4, lv: [4, 7], maxEnemies: 3,
    monsters: [{ kind: 'shroom', w: 3 }, { kind: 'wolf', w: 2.5 }, { kind: 'bunny', w: 0.5 }],
    theme: { ground: '#72ad5e', ground2: '#6aa556', grass: '#3a8a3e', grassTip: '#5aa84a', path: '#cdb88c', obstacle: 'pine', pool: 'water', decor: 'mush', outside: '#3f7a3c' },
  },
  {
    id: 'cave', name: 'Crystal Cave', guardian: { kind: 'alphawolf', lv: 9, gate: 'crystal' }, x0: 118, w: 40, rec: 8, lv: [8, 12], maxEnemies: 3,
    monsters: [{ kind: 'bat', w: 3 }, { kind: 'golem', w: 1.5 }, { kind: 'shroom', w: 0.7 }],
    theme: { ground: '#8e89ad', ground2: '#8581a4', grass: '#6a5fb0', grassTip: '#a898f0', path: '#b8b2cc', obstacle: 'crystal', pool: null, decor: 'gem', outside: '#4a4566' },
  },
  {
    id: 'peak', name: 'Ember Peak', guardian: { kind: 'crystalking', lv: 14, gate: 'rock' }, x0: 158, w: 44, rec: 13, lv: [13, 17], maxEnemies: 3,
    monsters: [{ kind: 'imp', w: 3 }, { kind: 'magma', w: 2 }, { kind: 'golem', w: 0.8 }],
    theme: { ground: '#b8806a', ground2: '#ae775f', grass: '#8a4a3a', grassTip: '#e0804a', path: '#dcbb96', obstacle: 'rock', pool: 'lava', decor: 'pebble', outside: '#6a3a30' },
  },
];

export const WORLD_W = ZONES[ZONES.length - 1].x0 + ZONES[ZONES.length - 1].w;
export const WORLD_H = 26;

export function zoneById(id: ZoneId): Zone {
  return ZONES.find((z) => z.id === id)!;
}

export function zoneAtX(x: number): Zone {
  for (let i = ZONES.length - 1; i >= 0; i--) if (x >= ZONES[i].x0) return ZONES[i];
  return ZONES[0];
}

// ----------------------------------------------------------------------------- forge gating

/** Forge level needed to craft each recipe — keeps gear upgrades in step with the story. */
export function forgeLevelFor(g: Gear): number {
  if (g.slot === 'weapon') return (g.tier ?? 0) >= 4 ? 3 : (g.tier ?? 0) >= 3 ? 2 : 1;
  return ({ batcloak: 2, crystalmail: 2, ironplate: 2, crystalheart: 2, magmamail: 3, dragonmail: 3, impring: 3 } as Record<string, number>)[g.id] ?? 1;
}

// ----------------------------------------------------------------------------- gathering

export type SkillId = 'wood' | 'mine';
export const SKILL_NAMES: Record<SkillId, string> = { wood: 'Woodcutting', mine: 'Mining' };
/** What you do to a node with each skill (button labels, toasts). */
export const SKILL_VERB: Record<SkillId, string> = { wood: 'Chop', mine: 'Mine' };
export const SKILL_MAX = 10;

export interface Tool {
  id: string;
  name: string;
  skill: SkillId;
  /** Nodes up to this tier can be gathered, and higher tiers work faster. */
  tier: number;
  icon: string;
  desc: string;
  recipe: Recipe;
  /** Skill level needed to craft it. */
  level: number;
}

export const TOOLS: Tool[] = [
  { id: 'axe1', name: 'Stone Axe', skill: 'wood', tier: 1, icon: '🪓', desc: 'Chops oak trees.', recipe: { goo: 3, fluff: 2 }, level: 1 },
  { id: 'axe2', name: 'Fang Axe', skill: 'wood', tier: 2, icon: '🪓', desc: 'Bites through pine, and chops oak faster.', recipe: { bark: 6, fang: 3, copper: 2 }, level: 5 },
  { id: 'pick1', name: 'Stone Pick', skill: 'mine', tier: 1, icon: '⛏️', desc: 'Breaks rocks for stone.', recipe: { goo: 2, fluff: 3 }, level: 1 },
  { id: 'pick2', name: 'Copper Pick', skill: 'mine', tier: 2, icon: '⛏️', desc: 'Cracks copper veins, and breaks rocks faster.', recipe: { stone: 6, bark: 4, fang: 2 }, level: 4 },
  { id: 'pick3', name: 'Iron Pick', skill: 'mine', tier: 3, icon: '⛏️', desc: 'Splits iron veins. Nothing is too tough now.', recipe: { copper: 6, bark: 4, crystal: 2 }, level: 7 },
];

export type NodeKind = 'oak' | 'pine' | 'rock' | 'copper' | 'iron';

export interface NodeDef {
  name: string;
  skill: SkillId;
  /** Tool tier needed. */
  tier: number;
  mat: MatId;
  /** Strike damage needed to fell or break it (a tier-1 tool does 1 per clean hit). */
  hp: number;
  /** Nodes on open ground: safe to reach, but slow to regrow and give less. */
  safe: { yield: number; xp: number; regrow: number };
  /** Nodes out in the tall grass: you brave monsters to reach them, for more, faster regrowth and a rare find. */
  grass: { yield: number; xp: number; regrow: number; rare: { mat: MatId; chance: number } };
}

export const NODES: Record<NodeKind, NodeDef> = {
  oak: {
    name: 'Oak', skill: 'wood', tier: 1, mat: 'bark', hp: 4,
    safe: { yield: 1, xp: 10, regrow: 180 },
    grass: { yield: 2, xp: 15, regrow: 75, rare: { mat: 'clover', chance: 0.12 } },
  },
  pine: {
    name: 'Pine', skill: 'wood', tier: 2, mat: 'pine', hp: 6,
    safe: { yield: 1, xp: 25, regrow: 180 },
    grass: { yield: 2, xp: 35, regrow: 75, rare: { mat: 'clover', chance: 0.1 } },
  },
  rock: {
    name: 'Rock', skill: 'mine', tier: 1, mat: 'stone', hp: 4,
    safe: { yield: 1, xp: 10, regrow: 180 },
    grass: { yield: 2, xp: 15, regrow: 75, rare: { mat: 'crystal', chance: 0.1 } },
  },
  copper: {
    name: 'Copper Vein', skill: 'mine', tier: 2, mat: 'copper', hp: 6,
    safe: { yield: 1, xp: 25, regrow: 180 },
    grass: { yield: 2, xp: 35, regrow: 75, rare: { mat: 'crystal', chance: 0.12 } },
  },
  iron: {
    name: 'Iron Vein', skill: 'mine', tier: 3, mat: 'iron', hp: 8,
    safe: { yield: 1, xp: 40, regrow: 180 },
    grass: { yield: 2, xp: 55, regrow: 75, rare: { mat: 'core', chance: 0.1 } },
  },
};

/** How many nodes of each kind each zone has, on open ground and out in the grass (placed by the route maps). */
export const NODE_SPAWNS: Partial<Record<ZoneId, { kind: NodeKind; safe: number; grass: number }[]>> = {
  meadow: [{ kind: 'oak', safe: 3, grass: 5 }, { kind: 'rock', safe: 2, grass: 3 }],
  woods: [{ kind: 'oak', safe: 2, grass: 2 }, { kind: 'pine', safe: 2, grass: 5 }, { kind: 'rock', safe: 1, grass: 2 }, { kind: 'copper', safe: 2, grass: 3 }],
  cave: [{ kind: 'copper', safe: 2, grass: 3 }, { kind: 'iron', safe: 2, grass: 3 }],
  peak: [{ kind: 'iron', safe: 2, grass: 4 }],
};

// ----------------------------------------------------------------------------- village construction

export type ProjectId = 'home' | 'forge' | 'garden' | 'training' | 'warp';

export interface ProjectLevel {
  name: string;
  cost: Recipe;
  perk: string;
}

export interface Project {
  name: string;
  icon: string;
  /** levels[0] is level 1. */
  levels: ProjectLevel[];
}

export const PROJECTS: Record<ProjectId, Project> = {
  home: {
    name: 'Home', icon: '🏠',
    levels: [
      { name: 'Tent', cost: {}, perk: 'A cozy tent to call your own.' },
      { name: 'Cottage', cost: { bark: 8, stone: 4, clover: 1 }, perk: '+10% max HP' },
      { name: 'Manor', cost: { pine: 10, iron: 6, crystal: 6, ember: 6 }, perk: '+20% max HP' },
    ],
  },
  forge: {
    name: 'Forge', icon: '⚒',
    levels: [
      { name: 'Forge', cost: { goo: 4, fluff: 3 }, perk: 'Repaired! Craft ★ and ★★ gear' },
      { name: 'Smithy', cost: { royaljelly: 1, bark: 4, copper: 4 }, perk: 'Craft ★★★ gear' },
      { name: 'Master Forge', cost: { kingcrystal: 1, pine: 6, iron: 6 }, perk: 'Craft ★★★★ and legendary gear' },
    ],
  },
  garden: {
    name: 'Garden', icon: '🌱',
    levels: [
      { name: 'Sprout Patch', cost: { bark: 4, clover: 1 }, perk: 'Fountain refills potions to 3' },
      { name: 'Berry Garden', cost: { cap: 4, pine: 4, stone: 4 }, perk: 'Fountain refills potions to 4' },
      { name: 'Bloom Garden', cost: { pine: 6, ember: 4 }, perk: 'Fountain refills potions to 5' },
    ],
  },
  training: {
    name: 'Training Yard', icon: '🎯',
    levels: [
      { name: 'Straw Dummy', cost: { bark: 5, fluff: 3 }, perk: '+5% attack' },
      { name: 'Training Yard', cost: { fang: 6, royaljelly: 1, copper: 3 }, perk: '+10% attack' },
      { name: 'Dojo', cost: { pine: 6, horn: 4, iron: 4 }, perk: '+15% attack' },
    ],
  },
  warp: {
    name: 'Warp Stone', icon: '🔮',
    levels: [{ name: 'Warp Stone', cost: { alphapelt: 1, pine: 4, copper: 3, crystal: 3 }, perk: 'Fast travel to any campfire you have lit' }],
  },
};

export const PROJECT_ORDER: ProjectId[] = ['home', 'forge', 'garden', 'training', 'warp'];

// ----------------------------------------------------------------------------- story

export type Goal =
  | { type: 'talk' }
  | { type: 'flag'; flag: string; label: string }
  | { type: 'kills'; zone: ZoneId; count: number }
  /** Have these materials in the bag (monsters in `zone` drop them). */
  | { type: 'mats'; zone: ZoneId; need: Recipe }
  | { type: 'craft' }
  | { type: 'build'; project: ProjectId; level: number }
  | { type: 'boss'; kind: MonsterKind };

export interface Quest {
  id: string;
  /** Skip the "chapter complete" fanfare (for tiny tutorial steps). */
  quiet?: boolean;
  chapter: string;
  title: string;
  goal: Goal;
  /** What Elder Bloom says about this step. */
  text: string;
  hint: string;
  reward?: { mats?: Recipe; potions?: number };
}

export const QUESTS: Quest[] = [
  {
    id: 'wake', quiet: true, chapter: 'Prologue', title: 'A Quiet Glade', goal: { type: 'flag', flag: 'sword', label: 'Find something to fight with' },
    hint: 'Pick up the glowing sword', text: 'You wake up in a quiet glade. Your head is fuzzy… but something glints in the grass nearby.',
  },
  {
    id: 'firstfight', quiet: true, chapter: 'Prologue', title: 'A Slime in the Way', goal: { type: 'flag', flag: 'glade1', label: 'Defeat the slime' },
    hint: 'Defeat the slime blocking the path', text: 'A grumpy slime is blocking the forest path. Time to try out that sword!',
  },
  {
    id: 'dodge', quiet: true, chapter: 'Prologue', title: 'Hop to It', goal: { type: 'flag', flag: 'glade2', label: 'Defeat the Hopbun' },
    hint: 'Defeat the Hopbun. Dodge its charge!', text: 'A Hopbun! They wind up and charge. Watch it closely and dodge out of the way.',
  },
  {
    id: 'village', quiet: true, chapter: 'Prologue', title: 'Smoke on the Horizon', goal: { type: 'flag', flag: 'village', label: 'Follow the path east' },
    hint: 'Follow the path east', text: 'The path leads east, toward chimney smoke. There must be a village!',
  },
  {
    id: 'meadow', chapter: 'Chapter 1', title: 'Gather Materials', goal: { type: 'mats', zone: 'meadow', need: { goo: 4, fluff: 3 } }, hint: 'Collect 4 Slime Goo and 3 Bunny Fluff',
    text: 'To fix our forge we need Slime Goo and Bunny Fluff. Monsters in Sunny Meadow, just east of here, drop them. They hide in the tall grass!',
    reward: { potions: 1 },
  },
  {
    id: 'repair', chapter: 'Chapter 1', title: 'Rekindle the Forge', goal: { type: 'build', project: 'forge', level: 1 }, hint: 'Repair the Forge',
    text: "Wonderful! Bring those materials to the old forge and let's get it burning again.",
    reward: { mats: { goo: 2, fluff: 1 } },
  },
  {
    id: 'gear', chapter: 'Chapter 1', title: 'Gear Up', goal: { type: 'craft' }, hint: 'Craft any gear at the Forge',
    text: "Listen to it roar! Now craft yourself something better than that old twig: gear from monster bits, or (once you've made tools) from wood and stone.",
    reward: { mats: { goo: 3, fluff: 2 } },
  },
  {
    id: 'cottage', chapter: 'Chapter 1', title: 'A Real Home', goal: { type: 'build', project: 'home', level: 2 }, hint: 'Craft an axe and a pick, gather logs and stone, build a Cottage',
    text: "A hero can't sleep in a tent forever! A cottage needs Oak Logs and Stone: craft a Stone Axe and a Stone Pick at the Forge (Tools), then chop the oaks and break the rocks around the meadow. The ones out in the tall grass give more, if you dare.",
    reward: { potions: 1 },
  },
  {
    id: 'kingslime', chapter: 'Chapter 2', title: 'The Slime King', goal: { type: 'boss', kind: 'kingslime' }, hint: 'Defeat the Slime King at the Whisper Woods gate',
    text: "The Slime King has plopped himself in front of Whisper Woods. He's bouncy and he brings friends. Be at least level 5!",
  },
  {
    id: 'smithy', chapter: 'Chapter 2', title: 'A Hotter Forge', goal: { type: 'build', project: 'forge', level: 2 }, hint: 'Mine Copper (Copper Pick), upgrade the Forge to a Smithy',
    text: "That Royal Jelly is just what the forge needs, with some copper for the anvil! There are copper veins in Whisper Woods: you'll want a Copper Pick for those. Then upgrade the forge to craft ★★★ gear.",
    reward: { mats: { bark: 2 } },
  },
  {
    id: 'alphawolf', chapter: 'Chapter 3', title: 'Howl in the Woods', goal: { type: 'boss', kind: 'alphawolf' }, hint: 'Defeat the Alpha Woolf at the Crystal Cave gate',
    text: "Deep in Whisper Woods, the Alpha Woolf guards the road to Crystal Cave. It's fast, and its pack comes when it howls. Level 9 or so, please!",
  },
  {
    id: 'warp', chapter: 'Chapter 3', title: 'The Warp Stone', goal: { type: 'build', project: 'warp', level: 1 }, hint: 'Build the Warp Stone in the village',
    text: "With an Alpha Pelt we can wake the old Warp Stone. Then you can zip to any campfire you've lit!",
    reward: { potions: 1 },
  },
  {
    id: 'crystalking', chapter: 'Chapter 4', title: 'The Crystal King', goal: { type: 'boss', kind: 'crystalking' }, hint: 'Defeat the Crystal King at the Ember Peak gate',
    text: 'The Crystal King sits on the road to Ember Peak. Its crystals burst out of the ground, so watch for the red marks! Level 14 would be wise.',
  },
  {
    id: 'master', chapter: 'Chapter 4', title: 'Master Forge', goal: { type: 'build', project: 'forge', level: 3 }, hint: 'Upgrade the Forge to a Master Forge',
    text: 'A King Crystal! Now the forge can work ember and dragon steel. Upgrade it and gear up for the peak.',
    reward: { mats: { ember: 3 } },
  },
  {
    id: 'dragon', chapter: 'Finale', title: 'Calm the Emberwyrm', goal: { type: 'boss', kind: 'dragon' }, hint: 'Defeat the Emberwyrm in its lair',
    text: 'This is it, little sprout. The Emberwyrm waits at the far end of Ember Peak. The whole village believes in you!',
  },
  {
    id: 'legend', chapter: 'Epilogue', title: 'Village Legend', goal: { type: 'build', project: 'home', level: 3 }, hint: 'Build yourself a Manor',
    text: "You did it! The skies are clear again. Now let's make Sprout Village the coziest place in the world. Build yourself a Manor!",
    reward: { potions: 2 },
  },
];
