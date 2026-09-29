// Climbing the Battle Tower (src/tower.ts has its floors): one fight per floor, a full heal and a choice between each,
// and nothing that touches the story. Fights go through fights.ts like any other; it hands tower wins and losses here.
import type { BattleOutcome } from '../battle/battle';
import { playerStats } from '../rules';
import { TOWER } from '../tower';
import { G, backToWorld, transition } from './context';
import { startBattle } from './fights';

/** The floor you're on, while climbing. */
let floor = 0;

export const climbing = () => floor > 0;

/** Starts the climb at a floor (1-based). */
export function climbTower(n: number) {
  floor = Math.max(1, Math.min(TOWER.length, n));
  fight();
}

function fight() {
  const f = TOWER[floor - 1];
  G.save.hp = playerStats(G.save).maxHp;
  G.ui.toast(`🗼 Floor ${f.n}: ${f.label}`);
  startBattle(f.zone, f.foes.map((x) => ({ ...x, golden: false })), f.boss);
}

/** After a tower fight's result screens: on to the next floor, or back out to where you were. */
export async function towerEnd(o: BattleOutcome) {
  const top = floor >= TOWER.length;
  const next = TOWER[floor];
  const up = o.result === 'win' && !top && next
    ? (await G.ui.dialog(
        `<div class="big" style="font-size:22px">🗼 Floor ${floor} cleared!</div><p>Next: <b>Floor ${next.n}, ${next.label}</b> (Lv ${next.foes[0].lv}). You'll be healed first.</p>`,
        [['leave', 'Leave'], ['next', 'Next floor']],
      )) === 'next'
    : false;
  if (o.result === 'win' && top) await G.ui.message('🗼 The top of the tower!', 'You beat every floor.');
  if (up) {
    floor++;
    fight();
    return;
  }
  floor = 0;
  transition(() => {
    G.save.hp = playerStats(G.save).maxHp;
    backToWorld();
  });
}
