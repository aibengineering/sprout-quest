// Climbing the Battle Tower (src/tower.ts has its floors). A run lives in a save slot of its own (dev builds start it
// from the dev panel): you fight a floor, collect its XP, drops and supplies, and come back to the camp, where you can
// forge, change gear or weapon class, set the XP rate, train on any floor you've cleared, and take on the next. A first
// clear hands over a crate of the materials its tier's gear needs. Running from any fight (guardians too) or losing
// sends you back to the camp. Nothing in the tower touches the story; fights.ts hands tower fights here when they end.
import type { BattleOutcome } from '../battle/battle';
import { handlingFor } from '../balance';
import { GEAR, MAX_POTIONS, STYLE_NAMES } from '../data';
import { playerStats } from '../rules';
import { TOWER, checkpointFor, towerSupplies, type TowerFloor } from '../tower';
import { skillAt, MOVESETS } from '../weapons';
import { activeSlot } from '../slots';
import { G, backToWorld, menuCtx, persist, transition } from './context';
import { startBattle } from './fights';

/** The Battle Tower run's save slot. The raised XP rate only ever applies there. */
export const TOWER_SLOT = 'tower';

/** The XP rate lasts across reloads on this device. */
export const XP_RATE_KEY = 'sprout-quest-dev-xp-rate';
const RATE = XP_RATE_KEY;
export const XP_RATES = [1, 5, 25, 100];

export function loadXpRate() {
  // Every other save, story slots made for a fresh playthrough included, always plays at ×1.
  if (activeSlot() !== TOWER_SLOT) {
    G.xpRate = 1;
    return;
  }
  try {
    G.xpRate = Number(localStorage.getItem(RATE)) || 1;
  } catch {
    G.xpRate = 1;
  }
}

export function setXpRate(n: number) {
  // Only in the tower run: never your real save, and never a story slot.
  if (activeSlot() !== TOWER_SLOT) return;
  G.xpRate = n;
  try {
    localStorage.setItem(RATE, String(n));
  } catch {
    // Fine: it just won't be remembered.
  }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&${{ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot' }[c]};`);

/** The floor you're on in this save's run (1-based; past the top once it's beaten). */
export const towerFloor = () => G.save.tower?.floor ?? 1;
const current = (): TowerFloor | undefined => TOWER[towerFloor() - 1];

/** Moves the run to a floor, with the buildings the game expects by then (the training yard and home's stat boosts). */
export function setFloor(n: number) {
  const s = G.save;
  s.tower = { floor: Math.max(1, Math.min(TOWER.length + 1, n)) };
  const f = current();
  if (f) {
    const c = checkpointFor(f);
    s.build.training = Math.max(s.build.training, c.training ?? 0);
    s.build.home = Math.max(s.build.home, c.home ?? 1);
  }
  s.potions = MAX_POTIONS;
  s.hp = playerStats(s).maxHp;
  persist();
}

/**
 * The camp between floors: what's next, where you stand, and what you can do about it. The Forge and Bag open over it
 * and it comes back when they close.
 */
export async function openCamp(): Promise<void> {
  const s = G.save, f = current();
  G.mode = 'dialog';
  G.input.reset();
  const w = GEAR[s.equip.weapon], style = w?.style ?? 'sword', hand = s.mastery[style].lv;
  const skill = skillAt(MOVESETS[style].skill, hand);
  const foes = f ? f.foes.map((x) => x.kind).join(', ') : '';
  // What the game expects by this floor (its balance checkpoint), ticked off against you.
  const ready = f ? readiness(f) : '';
  const cleared = TOWER.slice(0, towerFloor() - 1);
  const train = cleared.length
    ? `<div class="tower-train"><select id="tower-floor">${cleared.map((c) => `<option value="${c.n}"${c.n === lastTrain ? ' selected' : ''}>${c.n}. ${esc(c.label)} (Lv ${c.foes[0].lv})</option>`).join('')}</select>
       <button class="go ghost" data-dialog="train">Train here</button></div>`
    : '';
  const r = await G.ui.dialog(
    `<div class="big" style="font-size:22px">🗼 Battle Tower</div>
     ${f
      ? `<p><b>Floor ${f.n} of ${TOWER.length}: ${esc(f.label)}</b><br><small>Lv ${f.foes[0].lv} · ${esc(foes)}${f.boss ? ' · 👑 guardian' : ''}</small></p>${ready}`
      : '<p><b>You beat every floor!</b></p>'}
     <p><small>You: <b>Lv ${s.lv}</b> · ${esc(w?.name ?? '')} · ${STYLE_NAMES[style]} handling <b>${hand}</b>${skill ? ` (${esc(skill.name)})` : ''}</small></p>
     ${train}
     <div class="tower-acts">
       <button class="go ghost" data-dialog="forge">⚒ Forge</button>
       <button class="go ghost" data-dialog="bag">🎒 Bag</button>
       <button class="go ghost" data-dialog="rate">⚡ XP ×${G.xpRate}</button>
     </div>`,
    f ? [['rest', 'Rest'], ['fight', `Fight floor ${f.n}`]] : [['rest', 'Rest'], ['again', 'Climb again']],
    'tower-camp',
  );
  if (r === 'train') lastTrain = Number((document.getElementById('tower-floor') as HTMLSelectElement | null)?.value) || 1;
  switch (r) {
    case 'fight':
      return fight(towerFloor());
    case 'train':
      return fight(lastTrain);
    case 'again':
      setFloor(1);
      return openCamp();
    case 'rate':
      setXpRate(XP_RATES[(XP_RATES.indexOf(G.xpRate) + 1) % XP_RATES.length]);
      return openCamp();
    case 'forge':
    case 'bag':
      G.afterMenu = () => void openCamp();
      G.mode = 'dialog';
      G.ui.openMenu(menuCtx(true), r === 'forge' ? 'forge' : 'items');
      return;
    default:
      // Walk around Sowerby; the dev panel brings the camp back.
      G.mode = 'world';
      G.input.reset();
  }
}

/** The cleared floor you last trained on, so the camp's picker remembers it. */
let lastTrain = 1;

/**
 * The next floor's expectations (its balance checkpoint: level, weapon tier, handling for it), each ticked or crossed
 * against where you are, so you can tell whether you're ready or testing the stage under-geared on purpose.
 */
function readiness(f: TowerFloor): string {
  const s = G.save, c = checkpointFor(f), tier = GEAR[c.weapon].tier ?? 0;
  const w = GEAR[s.equip.weapon], hand = s.mastery[w?.style ?? 'sword'].lv, need = handlingFor(tier);
  const mark = (ok: boolean, text: string) => `<span class="${ok ? 'ok' : 'no'}">${ok ? '✓' : '✗'} ${text}</span>`;
  return `<p class="tower-ready"><small>Suggested:</small> ${[
    mark(s.lv >= c.lv, `Lv ${c.lv}`),
    tier > 0 ? mark((w?.tier ?? 0) >= tier, `a ${'★'.repeat(tier)} weapon`) : '',
    need > 1 ? mark(hand >= need, `handling ${need}`) : '',
  ].filter(Boolean).join(' ')}</p>`;
}

/** Fights a floor: the next one to climb, or one you've cleared to train on (which doesn't move the run). */
function fight(n: number) {
  const f = TOWER[n - 1];
  G.save.hp = playerStats(G.save).maxHp;
  // The fight itself carries its floor, so nothing outside it can be mistaken for a tower fight.
  startBattle(f.zone, f.foes.map((x) => ({ ...x, golden: false })), f.boss, undefined, { tower: f.n });
}

/** What floor `n` hands over besides the monsters' drops: a full crate the first time, wood and ore on a replay. */
export const floorSupplies = (n: number) => {
  const f = TOWER[n - 1];
  return f ? towerSupplies(f, n === towerFloor()) : {};
};

/** After a tower fight's result screens: up a floor if you won the next one, then back to the camp either way. */
export async function towerEnd(o: BattleOutcome, n: number) {
  if (o.result === 'win' && n === towerFloor()) {
    setFloor(towerFloor() + 1);
    if (!current()) await G.ui.message('🗼 The top of the tower!', 'You beat every floor, the Emberwyrm included.');
  } else {
    // A replay, a run or a faint: rested and ready at the camp, on the same floor.
    G.save.hp = playerStats(G.save).maxHp;
    G.save.potions = MAX_POTIONS;
  }
  transition(() => {
    backToWorld();
    void openCamp();
  });
}
