// Fainting: you come back as a spirit at your last checkpoint (Veyra's Spring, or the last campfire you lit) and walk back
// to your body, lying where you fell, to wake up again. The walk is the cost. Nothing says so in words: you're see-through,
// the waypoint points at your body, and touching it brings you back. (In the story, it's Veyra, the Sower, who keeps
// bringing you back to carry on: see the story bible.)
//
// While you're a spirit, nothing fights you or talks to you, and stories wait: main.ts checks `spirit()`. Your body is
// laid clear of any monsters guarding a spot (a story fight's trigger), so waking up can't drop you straight back into
// the fight you lost.
import { playerStats } from '../rules';
import { G, backToWorld, persist, showZoneBanner, transition } from './context';
import { storyFainted } from './stories';

/** Are you walking as a spirit? */
export const spirit = () => !!G.save.spirit;

/** Where your body lies: where you fell, nudged clear of any monsters guarding a spot, on ground you can reach. */
function bodySpot(): { x: number; y: number } {
  const w = G.world, x0 = G.over.x, y0 = G.over.y;
  const foes = w.objs.filter((o) => o.kind === 'foe' && !o.hidden);
  const gap = (x: number, y: number) => Math.min(99, ...foes.map((o) => Math.hypot(Math.max(o.x - x, 0, x - (o.x + o.w)), Math.max(o.y - y, 0, y - (o.y + o.h + 0.3)))));
  if (gap(x0, y0) >= 1.6) return { x: x0, y: y0 };
  // Step back along the way away from the nearest guard, then try around, until there's room.
  const near = foes.sort((a, b) => Math.hypot(a.x + a.w / 2 - x0, a.y + a.h / 2 - y0) - Math.hypot(b.x + b.w / 2 - x0, b.y + b.h / 2 - y0))[0];
  const away = Math.atan2(y0 - (near.y + near.h / 2), x0 - (near.x + near.w / 2));
  for (let r = 0.5; r <= 5; r += 0.5) {
    for (const turn of [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8, Math.PI]) {
      const x = x0 + Math.cos(away + turn) * r, y = y0 + Math.sin(away + turn) * r;
      if (!w.solidAt(x, y) && gap(x, y) >= 1.6) return { x, y };
    }
  }
  return { x: x0, y: y0 };
}

/** You lost a fight: your body stays where you fell, and your spirit wakes at your last checkpoint. */
export function faint() {
  const s = G.save;
  s.spirit = bodySpot();
  s.hp = 0;
  persist();
  transition(() => {
    const p = s.respawn === 'village' || s.respawn === 'glade' ? G.world.entryPoint(s.respawn) : G.world.campPoint(s.respawn);
    G.over.teleport(p.x, p.y);
    backToWorld();
    showZoneBanner(G.over.currentZone);
    // Anyone you were walking home stays behind, at the last checkpoint you reached.
    storyFainted();
  }, 1.4);
}

/** Your spirit reached your body: you wake, with half your health. */
export function revive() {
  const s = G.save;
  s.spirit = undefined;
  s.hp = Math.max(1, Math.round(playerStats(s).maxHp / 2));
  G.audio.play('levelup');
  G.over.revived();
  G.over.resetGrace(3);
  persist();
}
