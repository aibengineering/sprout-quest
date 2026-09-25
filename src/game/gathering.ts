// Chopping and mining: starting the timing minigame at a tree or rock, playing it, paying out, and node labels.
import { NODES, SKILL_NAMES, SKILL_VERB, TOOLS, type NodeKind } from '../data';
import { Chop, GatherView, type Look } from '../gather';
import { usingKeyboard } from '../input';
import { canGather, harvest, revealed, sweetWidth, toolPower } from '../rules';
import { logEvent } from '../stats';
import type { WorldObj } from '../world';
import { G, persist } from './context';
import { celebrateSkill, lootLines } from './rewards';
import { progressQuests } from './story';

/** The minigame in progress, if any. */
export let chop: { game: Chop; obj: WorldObj; view: GatherView } | null = null;
let chopStart = 0;

/** Colors for each kind of rock face in the mining minigame. */
const ROCK_LOOKS: Record<Exclude<NodeKind, 'oak' | 'pine'>, Look> = {
  rock: { kind: 'mine', rock: '#9a9aa8', dark: '#6a6a78', fleck: '#d8d8e0' },
  copper: { kind: 'mine', rock: '#8a7a6a', dark: '#5e5048', fleck: '#ff9a4a' },
  iron: { kind: 'mine', rock: '#5e6272', dark: '#40434f', fleck: '#c8d8f0' },
  crystal: { kind: 'mine', rock: '#7a6a9a', dark: '#4e4468', fleck: '#9af0ff' },
};

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
      ? `${t.icon} You need a ${t.name} to ${what}. Craft one at the Forge (Tools)!`
      : `${t.icon} ${n.name} is too tough for your ${n.skill === 'wood' ? 'axe' : 'pick'}. Craft a ${t.name} (${SKILL_NAMES[n.skill]} ${t.level}).`, 3200);
    return;
  }
  if (why === 'regrowing') {
    const left = timeLeft((s.nodes[o.id!] ?? 0) - Date.now());
    G.ui.toast(n.skill === 'wood' ? `🌱 Regrowing… back in ${left}.` : `🪨 Nothing left to break… it builds back up in ${left}.`);
    return;
  }
  const look: Look = n.skill === 'mine' ? ROCK_LOOKS[o.node as keyof typeof ROCK_LOOKS] : { kind: 'wood', pine: o.node === 'pine' };
  chop = { game: new Chop(n.hp, toolPower(s.tools[n.skill], n.tier), sweetWidth(s.skills[n.skill].lv)), obj: o, view: new GatherView(look) };
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
  // Once it gives way, let the tree topple (or the rock split) before paying out.
  if (c.game.done) {
    input.flush();
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
      G.audio.play(r === 'perfect' ? 'crit' : r === 'hit' ? 'hit' : 'dodge');
      G.over.chopHit(r === 'perfect' ? 2 : r === 'hit' ? 1 : 0.3);
      const seen = NODES[c.obj.node!].skill === 'wood' ? 'chopped' : 'mined';
      if (!G.save.tips.includes(seen)) G.save.tips.push(seen);
    }
  }
}

function finishGather() {
  const { game, obj } = chop!;
  chop = null;
  const s = G.save, n = NODES[obj.node!];
  const fromLv = s.skills[n.skill].lv, shown = revealed(s);
  const r = harvest(s, obj.node!, obj.id!, !!obj.grass, game.flawless);
  G.audio.play(n.skill === 'mine' ? 'boom' : 'kill');
  G.over.felled();
  logEvent(s, {
    kind: 'gather', node: obj.node!, grass: !!obj.grass, seconds: Math.round((performance.now() - chopStart) / 100) / 10, strikes: game.strikes,
    misses: game.misses, perfects: game.perfects, tool: s.tools[n.skill], skillLv: fromLv, got: r.drops as Record<string, number>,
  });
  const toolIcon = TOOLS.find((t) => t.skill === n.skill)!.icon;
  G.ui.loot([...(game.flawless ? [{ icon: '<span class="emo">✨</span>', text: 'Flawless!' }] : []), ...lootLines(r.drops, [{ n: r.xp, what: SKILL_NAMES[n.skill], emo: toolIcon }])]);
  G.mode = 'world';
  G.input.reset();
  persist();
  if (r.levels) void celebrateSkill(n.skill, shown).then(() => progressQuests());
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
  chop.view.draw(ctx, chop.game, vw, vh, `${icon} ${chop.obj.grass ? 'Wild ' : ''}${n.name}`, hint);
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
