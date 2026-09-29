// Climbing the Battle Tower (src/tower.ts has its floors). A run lives in a save slot of its own (dev builds start it
// from the dev panel): you fight a floor, collect its XP, drops and supplies, and come back to the camp, where you can
// forge, change gear or weapon class, set the XP rate, and take on the next floor. Losing sends you back to the camp to
// try that floor again. Nothing in the tower touches the story; fights.ts hands tower fights here when they end.
import type { BattleOutcome } from '../battle/battle';
import { GEAR, MAX_POTIONS, STYLE_NAMES } from '../data';
import { playerStats } from '../rules';
import { TOWER, checkpointFor, towerSupplies, type TowerFloor } from '../tower';
import { skillAt, MOVESETS } from '../weapons';
import { activeSlot } from '../slots';
import { G, backToWorld, menuCtx, persist, transition } from './context';
import { startBattle } from './fights';

/** The XP rate lasts across reloads on this device. */
const RATE = 'sprout-quest-dev-xp-rate';
export const XP_RATES = [1, 5, 25, 100];

export function loadXpRate() {
  try {
    G.xpRate = Number(localStorage.getItem(RATE)) || 1;
  } catch {
    G.xpRate = 1;
  }
}

export function setXpRate(n: number) {
  // Never on your real save (the combat lab and the tower only run in dev slots anyway).
  if (activeSlot() === null) return;
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
  const r = await G.ui.dialog(
    `<div class="big" style="font-size:22px">🗼 Battle Tower</div>
     ${f
      ? `<p><b>Floor ${f.n} of ${TOWER.length}: ${esc(f.label)}</b><br><small>Lv ${f.foes[0].lv} · ${esc(foes)}${f.boss ? ' · 👑 guardian' : ''}</small></p>`
      : '<p><b>You beat every floor!</b></p>'}
     <p><small>You: <b>Lv ${s.lv}</b> · ${esc(w?.name ?? '')} · ${STYLE_NAMES[style]} handling <b>${hand}</b>${skill ? ` (${esc(skill.name)})` : ''}</small></p>
     <div class="tower-acts">
       <button class="go ghost" data-dialog="forge">⚒ Forge</button>
       <button class="go ghost" data-dialog="bag">🎒 Bag</button>
       <button class="go ghost" data-dialog="rate">⚡ XP ×${G.xpRate}</button>
     </div>`,
    f ? [['rest', 'Rest'], ['fight', `Fight floor ${f.n}`]] : [['rest', 'Rest'], ['again', 'Climb again']],
    'tower-camp',
  );
  switch (r) {
    case 'fight':
      return fight();
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

function fight() {
  const f = current()!;
  G.save.hp = playerStats(G.save).maxHp;
  // The fight itself carries its floor, so nothing outside it can be mistaken for a tower fight.
  startBattle(f.zone, f.foes.map((x) => ({ ...x, golden: false })), f.boss, undefined, { tower: f.n });
}

/** The wood, stone and ore the floor being fought hands over when it's won (fights.ts adds them to the drops). */
export const floorSupplies = () => {
  const f = current();
  return f ? towerSupplies(f) : {};
};

/** After a tower fight's result screens: up a floor if you won, then back to the camp either way. */
export async function towerEnd(o: BattleOutcome) {
  if (o.result === 'win') {
    setFloor(towerFloor() + 1);
    if (!current()) await G.ui.message('🗼 The top of the tower!', 'You beat every floor, the Emberwyrm included.');
  } else {
    G.save.hp = playerStats(G.save).maxHp;
    G.save.potions = MAX_POTIONS;
  }
  transition(() => {
    backToWorld();
    void openCamp();
  });
}
