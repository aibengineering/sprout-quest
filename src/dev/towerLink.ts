// Links straight into a Battle Tower run at a given point (dev builds only): a floor, and the level, gear, handling,
// materials and XP rate to go with it. With just a floor, you're geared up the way the balance model expects there;
// anything else in the link overrides that. The lab's "Copy link" makes one from the run you're in.
//
//   ?tower&floor=8                                    floor 8, geared up for it (Blades)
//   ?tower&floor=8&style=hammer                       …with the Hammer of that tier instead
//   ?tower&floor=4&lv=3&weapon=twig                   the Slime King, under-geared on purpose
//   &armor=coppermail&charm=toothcharm                other gear
//   &h=hammer:3,whip:4                                handling per class
//   &mats=goo:20,fluff:10   or   &mats=all:50         materials
//   &xp=25                                            the tower's XP rate
import { CHECKPOINTS, handlingFor } from '../balance';
import { GEAR, GEAR_ORDER, MAT_ORDER, forgeLevelFor, type MatId, type Style } from '../data';
import { playerStats } from '../rules';
import type { SaveState } from '../state';
import { TOWER, checkpointFor } from '../tower';
import { towerRun } from './presets';

const STYLES: Style[] = ['sword', 'hammer', 'whip', 'wand'];

/**
 * A balance checkpoint's level, armor and charm, with the weapon of `style` at its tier, the handling the model
 * expects for it, the buildings, and a Forge that could have made it.
 */
export function kitSave(s: SaveState, checkpoint: string, style: Style) {
  const c = CHECKPOINTS.find((c) => c.id === checkpoint)!;
  const tier = GEAR[c.weapon].tier ?? 0;
  const weapon = tier === 0 ? c.weapon : GEAR_ORDER.find((id) => GEAR[id].slot === 'weapon' && GEAR[id].style === style && GEAR[id].tier === tier) ?? c.weapon;
  s.lv = c.lv;
  s.xp = 0;
  s.equip = { weapon, armor: c.armor, charm: c.charm ?? null };
  s.owned = [...new Set([...s.owned, weapon, c.armor, ...(c.charm ? [c.charm] : [])])];
  s.build.training = Math.max(s.build.training, c.training ?? 0);
  s.build.home = Math.max(s.build.home, c.home ?? 1);
  const w = GEAR[weapon];
  if (w.style) s.mastery[w.style].lv = Math.max(s.mastery[w.style].lv, handlingFor(tier));
  if ((w.tier ?? 0) > 0) s.build.forge = Math.max(s.build.forge, forgeLevelFor(w));
  s.hp = playerStats(s).maxHp;
}

/** A tower run save from a link's settings (see the top of this file). Unknown ids are ignored. */
export function towerSaveFromLink(q: URLSearchParams): SaveState {
  const s = towerRun();
  const floor = Math.max(1, Math.min(TOWER.length, Number(q.get('floor')) || 1));
  const weapon = q.get('weapon'), w = weapon ? GEAR[weapon] : undefined;
  const style = (w?.style ?? (STYLES.includes(q.get('style') as Style) ? q.get('style') : 'sword')) as Style;
  s.tower = { floor };
  if (floor > 1 || q.has('floor')) kitSave(s, checkpointFor(TOWER[floor - 1]).id, style);
  const lv = Number(q.get('lv'));
  if (lv >= 1) {
    s.lv = Math.min(30, Math.round(lv));
    s.xp = 0;
  }
  for (const [slot, id] of [['weapon', weapon], ['armor', q.get('armor')], ['charm', q.get('charm')]] as const) {
    if (!id || GEAR[id]?.slot !== slot) continue;
    s.equip[slot] = id;
    if (!s.owned.includes(id)) s.owned.push(id);
  }
  for (const part of (q.get('h') ?? '').split(',')) {
    const [k, v] = part.split(':');
    if (STYLES.includes(k as Style) && Number(v) >= 1) s.mastery[k as Style] = { lv: Math.min(10, Math.round(Number(v))), xp: 0 };
  }
  for (const part of (q.get('mats') ?? '').split(',')) {
    const [k, v] = part.split(':'), n = Math.max(0, Math.round(Number(v) || 0));
    if (k === 'all') for (const m of MAT_ORDER) s.mats[m as MatId] = n;
    else if (k in s.mats) s.mats[k as MatId] = n;
  }
  s.hp = playerStats(s).maxHp;
  return s;
}

/** A link that recreates this tower run: its floor, level, gear, handling and materials (and the XP rate). */
export function towerLink(s: SaveState, xpRate: number, base = `${location.origin}${location.pathname}`): string {
  const p: string[] = ['tower', `floor=${s.tower?.floor ?? 1}`, `lv=${s.lv}`, `weapon=${s.equip.weapon}`, `armor=${s.equip.armor}`];
  if (s.equip.charm) p.push(`charm=${s.equip.charm}`);
  const h = STYLES.filter((k) => s.mastery[k].lv > 1).map((k) => `${k}:${s.mastery[k].lv}`);
  if (h.length) p.push(`h=${h.join(',')}`);
  const mats = (MAT_ORDER as MatId[]).filter((m) => s.mats[m] > 0).map((m) => `${m}:${s.mats[m]}`);
  if (mats.length) p.push(`mats=${mats.join(',')}`);
  if (xpRate !== 1) p.push(`xp=${xpRate}`);
  return `${base}?${p.join('&')}`;
}
