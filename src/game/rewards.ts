// What you get and what it unlocks: loot rows, level-up screens, and gear the Forge reveals when you reach a level.
import { GEAR, GEAR_ORDER, MATS, MONSTERS, SKILL_NAMES, STYLE_NAMES, TOOLS, ZONES, type MatId, type SkillId, type Style } from '../data';
import { masteryXpToNext, playerStats, revealed, type PlayerStats } from '../rules';
import { logEvent } from '../stats';
import { handlingGain as handlingGainText, icon, type HandlingGain } from '../ui';
import { handlingStep } from '../weapons';
import { previewUnlocked } from './preview';
import { G, paused } from './context';

/** Loot rows; `what` (a skill or weapon class) names whose XP it is, and is dropped on phones where the icon says it. */
export function lootLines(drops: Partial<Record<MatId, number>>, xp: { n: number; what?: string; emo?: string }[]) {
  return [
    ...xp.filter((x) => x.n > 0).map((x) => ({ icon: `<span class="emo">${x.emo ?? '⭐'}</span>`, text: `+${x.n}`, name: x.what, suffix: 'XP' })),
    ...Object.entries(drops).map(([m, n]) => ({ icon: icon(m, MATS[m as MatId].icon, 'icon sm'), text: `+${n}`, name: MATS[m as MatId].name })),
  ];
}

/**
 * Gear and tools a level just revealed in the Forge (everything shown now that wasn't in `before`). Lights the Forge's
 * "new" dot so you go and look.
 */
export function newlyRevealed(before: Set<string>) {
  const now = revealed(G.save);
  const items = [
    ...TOOLS.filter((t) => now.has(t.id) && !before.has(t.id)).map((t) => ({ id: t.id, name: t.name, emoji: t.icon })),
    ...GEAR_ORDER.map((id) => GEAR[id]).filter((g) => now.has(g.id) && !before.has(g.id)).map((g) => ({ id: g.id, name: g.name, emoji: g.icon })),
  ];
  if (items.length && !G.save.fresh.includes('forge')) G.save.fresh.push('forge');
  return items;
}

/** Where you stood before a win's XP went in, so the level-up screens can show what changed. */
export interface LevelMark { fromLv: number; fromXp: number; before: PlayerStats; style: Style; fromHandling: number; fromHandlingXp: number; shown: Set<string> }

export function markLevels(style: Style): LevelMark {
  const s = G.save;
  return { fromLv: s.lv, fromXp: s.xp, before: playerStats(s), style, fromHandling: s.mastery[style].lv, fromHandlingXp: s.mastery[style].xp, shown: revealed(s) };
}

/** The handling XP a win brought (catch-up included), for its bar to fill: from where you were to where you are. */
export function handlingGain(m: LevelMark): HandlingGain {
  const now = G.save.mastery[m.style];
  const total = (lv: number, xp: number) => Array.from({ length: lv - 1 }, (_, i) => masteryXpToNext(i + 1)).reduce((a, b) => a + b, 0) + xp;
  return { style: m.style, from: { lv: m.fromHandling, xp: m.fromHandlingXp }, to: { lv: now.lv, xp: now.xp }, gained: total(now.lv, now.xp) - total(m.fromHandling, m.fromHandlingXp) };
}

export const leveledUp = (m: LevelMark) => G.save.lv > m.fromLv || G.save.mastery[m.style].lv > m.fromHandling;

/** Combat and weapon handling level-up screens, one after another, with the game waiting behind them. */
export async function celebrate(m: LevelMark) {
  const s = G.save;
  if (s.lv > m.fromLv) {
    logEvent(s, { kind: 'level', track: 'combat', lv: s.lv });
    await G.ui.levelUp(s.lv, m.before, playerStats(s), readyFor(m.fromLv, s.lv));
  }
  const lv = s.mastery[m.style].lv;
  if (lv > m.fromHandling) {
    logEvent(s, { kind: 'level', track: `handling:${m.style}`, lv });
    // What each level gained gives: a skill rank (the big ones) or a step in attack speed.
    const gains = Array.from({ length: lv - m.fromHandling }, (_, i) => m.fromHandling + 1 + i).map((l) => handlingGainText(m.style, l).replace(/^Lv \d+: /, ''));
    const step = handlingStep(lv), mark = step === 'skill' ? '✨' : step === 'trick' ? '🎯' : '⚡';
    await G.ui.skillUp(`${STYLE_NAMES[m.style]} handling`, lv, mark, `${mark} ${gains.join(' · ')}`, newlyRevealed(m.shown));
    // Each new special rank or trick: watch it in action (again any time from the Skills menu).
    await previewUnlocked(m.style, m.fromHandling, lv);
  }
}

/** A gathering skill level: a screen with what it unlocks (the game waits behind it). */
export async function celebrateSkill(skill: SkillId, shown: Set<string>) {
  const lv = G.save.skills[skill].lv;
  logEvent(G.save, { kind: 'level', track: skill, lv });
  await paused(() => G.ui.skillUp(SKILL_NAMES[skill], lv, skill === 'wood' ? '🪓' : '⛏️', 'The sweet spot grows a little wider.', newlyRevealed(shown)));
}

/** What a new combat level makes you ready for: guardians at your level, areas that match it, the dragon. */
function readyFor(from: number, to: number): string[] {
  const out: string[] = [];
  for (const z of ZONES) {
    const g = z.guardian;
    if (g && !G.save.bosses.includes(g.kind) && g.lv > from && g.lv <= to) out.push(`Strong enough for the ${MONSTERS[g.kind].name} (Lv ${g.lv}) guarding ${z.name}!`);
    if (z.monsters.length && z.rec > from && z.rec <= to) out.push(`${z.name} (monsters Lv ${z.lv[0]}–${z.lv[1]}) is your speed now.`);
  }
  if (from < 17 && to >= 17) out.push('Ready to face the Emberwyrm (Lv 20)? Bring potions!');
  return out;
}
