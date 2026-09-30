import type { Gear } from '../data';
import type { Moveset } from '../weapons';
import { HERO_BATTLE_UNIT, hammerHead, heldPoint, projectWeaponPoint, weaponHand, weaponLength, type Held } from '../weaponPose';
import { pose } from './pose';
import { clamp01, easeIn, easeOut, type Swing } from './types';

interface FighterPose { face: number; moving: boolean; swing: Swing | null; whirlT: number; whirlAng: number; castT?: number; castAng?: number }

export function battleWeapon(g: Gear, moves: Moveset, reach: number, p: FighterPose, t: number) {
  const sw = p.swing, casting = (p.castT ?? 0) > 0, idle = !sw && p.whirlT <= 0 && !casting;
  const side = Math.sin(p.face) < -0.5 ? 1 : Math.sin(p.face) > 0.5 ? -1 : Math.cos(p.face) >= 0 ? 1 : -1;
  const rest = g.style === 'hammer' ? 0.5 : 0.75;
  const ps = sw ? pose(sw, reach) : { ang: casting ? p.castAng ?? p.face : idle ? side > 0 ? rest : Math.PI - rest : p.whirlAng, off: 0, scale: 1 };
  const held: Held = {
    id: `wpn_${g.id}`, at: 'hand', ang: ps.ang, lift: idle ? 0.35 : 0.15,
    scale: (34 * moves.size) / HERO_BATTLE_UNIT,
    off: ps.off / HERO_BATTLE_UNIT,
    uncoiled: g.style === 'whip' && !idle,
  };
  if (casting || sw?.s.anim === 'thrust' || sw?.s.anim === 'cast') held.lift = 0.1;
  if (sw && ['slam', 'chop', 'backchop'].includes(sw.s.anim)) {
    const s = sw.s, qw = clamp01(sw.t / Math.max(0.001, s.windup));
    const qa = clamp01((sw.t - s.windup) / s.active);
    const qr = clamp01((sw.t - s.windup - s.active) / Math.max(0.001, s.recover));
    // Solve the head's height at contact instead of burying every hammer at the same -0.8-radian lift.
    const contact: Held = { ...held, lift: -0.25 };
    for (let i = 0; i < 5; i++) {
      const hand = weaponHand(contact, p.face, false, t);
      contact.lift = Math.asin(Math.max(-0.9, Math.min(0, -hand.y / (hammerHead(g) * held.scale))));
    }
    const down = contact.lift!;
    held.lift = sw.t < s.windup ? 1.3 * easeOut(qw)
      : qa < 1 ? qa < 0.35 ? 1.3 + (Math.PI / 2 - 1.3) * qa / 0.35 : Math.PI / 2 - (Math.PI / 2 - down) * easeIn((qa - 0.35) / 0.65)
      : down + (0.1 - down) * easeOut(qr);
  }
  const moving = p.moving && !sw;
  const hand = projectWeaponPoint(weaponHand(held, p.face, moving, t), HERO_BATTLE_UNIT);
  const tip = projectWeaponPoint(heldPoint(held, p.face, moving, t, weaponLength(g)), HERO_BATTLE_UNIT);
  const head = projectWeaponPoint(heldPoint(held, p.face, moving, t, hammerHead(g)), HERO_BATTLE_UNIT);
  return { held, hand, tip, head, idle };
}
