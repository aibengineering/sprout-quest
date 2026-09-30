// Chopping and mining: starting the timing minigame at a tree or rock, playing it, paying out, and node labels.
import { NODES, SKILL_NAMES, SKILL_VERB, TOOLS, type NodeKind } from '../data';
import { Chop, GatherView, type Look } from '../gather';
import { isTreeKind, type RockColors, type RockKind, type TreeKind } from '../nodeart';
import { usingKeyboard } from '../input';
import { canGather, harvest, hasOldTools, revealed, sweetWidth, toolPower, type GatherReward } from '../rules';
import { logEvent } from '../stats';
import type { WorldObj } from '../world';
import { G, persist } from './context';
import { celebrateSkill, lootLines } from './rewards';
import { progressQuests } from './story';
import { storyFelled, storyNoisy, storyTooLoud } from './stories';
import { sweetBoost } from '../kitchen';

/** The minigame in progress, if any, and what it paid out once the node gave way. */
export let chop: { game: Chop; obj: WorldObj; view: GatherView; reward?: GatherReward; fromLv?: number; shown?: ReturnType<typeof revealed>; noise?: number } | null = null;

/** How much noise each kind of strike makes, where a story is listening (Bram's camp): 1 brings trouble. */
const NOISE: Record<'perfect' | 'hit' | 'miss', number> = { perfect: 0, hit: 0.12, miss: 0.4 };
let chopStart = 0;

/** Colors for each kind of rock in the mining minigame: its face on the bar, and the chips that fly off it. */
const ROCK_COLORS: Record<RockKind, RockColors> = {
  rock: { body: '#9a9aa8', dark: '#6a6a78', fleck: '#d8d8e0' },
  copper: { body: '#8a7a6a', dark: '#5e5048', fleck: '#ff9a4a' },
  iron: { body: '#5e6272', dark: '#40434f', fleck: '#c8d8f0' },
  crystal: { body: '#7a6a9a', dark: '#4e4468', fleck: '#9af0ff' },
  obsidian: { body: '#3a3248', dark: '#1c1822', fleck: '#ff8a3a' },
};
/** Every gathering node has close-up art: a tree in nodeart's TREES, or a rock kind with colors above. */
const everyNodeHasArt: Exclude<NodeKind, TreeKind | RockKind> extends never ? true : false = true;
void everyNodeHasArt;

const timeLeft = (ms: number) => {
  const secs = Math.ceil(ms / 1000);
  return secs >= 60 ? `${Math.floor(secs / 60)}m ${secs % 60}s` : `${secs}s`;
};

/** Walk up to a tree or rock and start the timing minigame, if you have the tool for it. */
export function tryGather(o: WorldObj) {
  const s = G.save, n = NODES[o.node!];
  const why = canGather(s, o.node!, o.id!);
  if (why === 'tool') {
    const t = TOOLS.find((t) => t.skill === n.skill && t.tier === n.tier)!;
    const what = n.skill === 'wood' ? 'chop trees' : 'break rocks';
    G.ui.toast(s.tools[n.skill] === 0
      ? hasOldTools(s)
        ? `${t.icon} Mend your old ${n.skill === 'wood' ? 'axe' : 'pick'} in the Bag (Skills) first, then you can ${what}.`
        : `${t.icon} You need ${n.skill === 'wood' ? 'an axe' : 'a pick'} to ${what}.`
      : `${t.icon} ${n.name} is too tough for your ${n.skill === 'wood' ? 'axe' : 'pick'}. Craft a ${t.name} (${SKILL_NAMES[n.skill]} ${t.level}).`, 3200);
    return;
  }
  if (why === 'regrowing') {
    const left = timeLeft((s.nodes[o.id!] ?? 0) - Date.now());
    G.ui.toast(n.skill === 'wood' ? `🌱 Regrowing… back in ${left}.` : `🪨 Nothing left to break… it builds back up in ${left}.`);
    return;
  }
  const tool = s.tools[n.skill];
  const look: Look = isTreeKind(o.node!)
    ? { kind: 'wood', tree: o.node, tool }
    : { kind: 'mine', rock: o.node as RockKind, tool, ...ROCK_COLORS[o.node as RockKind] };
  const view = new GatherView(look);
  view.onSound = (sfx) => G.audio.play(sfx);
  // Woodcutter's Stew (Granny's) widens the sweet spot on trees.
  const width = sweetWidth(s.skills[n.skill].lv) * (n.skill === 'wood' ? sweetBoost(s) : 1);
  chop = { game: new Chop(n.hp, toolPower(tool, n.tier), width), obj: o, view, noise: storyNoisy(o) ? 0 : undefined };
  chopStart = performance.now();
  G.over.startChop(o);
  G.mode = 'gather';
  G.input.reset();
}

/** Stops the minigame without paying out (walking away, or a monster jumping you). */
export function cancelGather() {
  if (!chop) return;
  chop = null;
  G.over.chopping = null;
}

export function updateGather(dt: number) {
  const c = chop!, input = G.input;
  c.game.update(dt);
  c.view.update(dt, c.game);
  // Once it gives way you've earned it (the view pops out exactly that), then the tree topples or the rock breaks
  // before the loot and any level up show.
  if (c.game.done) {
    input.flush();
    if (!c.reward) collect(c);
    if (c.view.finished) finishGather();
    return;
  }
  const a = input.axis();
  // Walking away (or Esc) cancels; the node stays as it was.
  if (Math.hypot(a.x, a.y) > 0.6 || input.consume('menu')) {
    cancelGather();
    G.mode = 'world';
    input.reset();
    return;
  }
  if (input.consume('act') || input.consume('attack') || input.consume('tap')) {
    const r = c.game.strike();
    if (r) {
      G.audio.play('swing');
      G.over.chopHit(r === 'perfect' ? 2 : r === 'hit' ? 1 : 0.3);
      if (c.noise !== undefined) {
        c.noise += NOISE[r];
        if (c.noise >= 1) {
          // Too loud: whatever was listening comes running, and the tree waits.
          const o = c.obj;
          cancelGather();
          G.mode = 'world';
          input.reset();
          storyTooLoud(o);
          return;
        }
      }
      const seen = NODES[c.obj.node!].skill === 'wood' ? 'chopped' : 'mined';
      if (!G.save.tips.includes(seen)) G.save.tips.push(seen);
    }
  }
}

/** Pays out the moment the node gives way: materials, skill XP, and the regrowth timer. */
function collect(c: NonNullable<typeof chop>) {
  const s = G.save, n = NODES[c.obj.node!];
  c.fromLv = s.skills[n.skill].lv;
  c.shown = revealed(s);
  c.reward = harvest(s, c.obj.node!, c.obj.id!, !!c.obj.grass, c.game.flawless);
  c.view.reward(c.reward.drops);
  persist();
}

function finishGather() {
  const { game, obj, reward: r, fromLv, shown } = chop!;
  chop = null;
  const s = G.save, n = NODES[obj.node!];
  G.over.felled();
  logEvent(s, {
    kind: 'gather', node: obj.node!, grass: !!obj.grass, seconds: Math.round((performance.now() - chopStart) / 100) / 10, strikes: game.strikes,
    misses: game.misses, perfects: game.perfects, tool: s.tools[n.skill], skillLv: fromLv!, got: r!.drops as Record<string, number>,
  });
  const toolIcon = TOOLS.find((t) => t.skill === n.skill)!.icon;
  G.ui.loot([...(game.flawless ? [{ icon: '<span class="emo">✨</span>', text: 'Flawless!' }] : []), ...lootLines(r!.drops, [{ n: r!.xp, what: SKILL_NAMES[n.skill], emo: toolIcon }])]);
  G.mode = 'world';
  G.input.reset();
  persist();
  storyFelled(obj);
  if (r!.levels) void celebrateSkill(n.skill, shown!).then(() => progressQuests());
  else void progressQuests();
}

/** The minigame panel over the map, with a hint until you've got the hang of it. */
export function drawGather(ctx: CanvasRenderingContext2D, vw: number, vh: number) {
  if (!chop) return;
  const n = NODES[chop.obj.node!];
  const mine = n.skill === 'mine';
  const seen = G.save.tips.includes(mine ? 'mined' : 'chopped');
  const how = mine ? 'when the pick lines up with the seam!' : 'in the green!';
  const hint = seen ? 'Walk away to stop' : usingKeyboard() ? `Press E or Space ${how}` : `Tap ${how}`;
  const icon = TOOLS.find((t) => t.skill === n.skill)!.icon;
  chop.view.draw(ctx, chop.game, vw, vh, `${icon} ${chop.obj.grass ? 'Wild ' : ''}${n.name}`, chop.noise !== undefined ? 'Clean hits are quiet. Misses are loud!' : hint);
  if (chop.noise !== undefined) drawNoise(ctx, vw, chop.noise);
}

/** The noise meter over the minigame: fills with every sloppy strike, red as it nears the top. */
function drawNoise(ctx: CanvasRenderingContext2D, vw: number, noise: number) {
  const w = Math.min(260, vw - 80), h = 16, x = (vw - w) / 2, y = 64;
  ctx.save();
  ctx.fillStyle = 'rgba(42, 26, 48, 0.75)';
  ctx.beginPath();
  ctx.roundRect(x - 44, y - 6, w + 56, h + 12, 12);
  ctx.fill();
  ctx.font = '800 14px ui-rounded, "Nunito", system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.fillText('🔊', x - 36, y + h / 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  const q = Math.min(1, noise);
  ctx.fillStyle = q > 0.7 ? '#ff5a4a' : q > 0.35 ? '#ffb03a' : '#8ad85a';
  ctx.beginPath();
  ctx.roundRect(x, y, Math.max(h, w * q), h, 8);
  ctx.fill();
  ctx.restore();
}

/** The action button's label while gathering ("Chop!" / "Mine!"). */
export const gatherVerb = () => (chop ? `${SKILL_VERB[NODES[chop.obj.node!].skill]}!` : null);

/** Nodes say "Chop" or "Mine" when ready, and what they're doing while they come back. */
export function syncNodes() {
  const now = Date.now();
  for (const o of G.world.objs) {
    if (o.kind !== 'node') continue;
    const skill = NODES[o.node!].skill;
    o.label = (G.save.nodes[o.id!] ?? 0) <= now ? SKILL_VERB[skill] : skill === 'wood' ? 'Regrowing' : 'Rubble';
  }
}
