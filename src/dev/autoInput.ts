// Dev playtesting only. Decisions feed Input; the battle and gathering rules still do all the work.
import type { Battle } from '../battle/battle';
import { angDiff } from '../battle/types';
import type { Chop } from '../gather';
import type { Action, Input } from '../input';

export interface Controls {
  move: { x: number; y: number };
  press: Set<Action>;
  hold: Set<Action>;
}

const idle = (): Controls => ({ move: { x: 0, y: 0 }, press: new Set(), hold: new Set() });
const vector = (x: number, y: number, magnitude = 1) => {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length * magnitude, y: y / length * magnitude };
};

/** A frame of synthetic controls, scoped to this Input instance and cleared by its normal reset/flush. */
export class AutoInput {
  private controls: Controls | null = null;

  constructor(input: Input) {
    const axis = input.axis.bind(input), consume = input.consume.bind(input), held = input.isHeld.bind(input);
    const reset = input.reset.bind(input), flush = input.flush.bind(input);
    input.axis = () => input.enabled && this.controls ? this.controls.move : axis();
    input.consume = (action) => {
      const automatic = input.enabled && !!this.controls?.press.delete(action);
      const manual = consume(action);
      return automatic || manual;
    };
    input.isHeld = (action) => input.enabled && this.controls ? this.controls.hold.has(action) : held(action);
    input.reset = () => { this.clear(); reset(); };
    input.flush = () => { this.controls?.press.clear(); flush(); };
  }

  set(controls: Controls) { this.controls = controls; }
  clear() { this.controls = null; }
}

/** Chase into weapon range, turn before swinging, and leave nearby telegraphed danger. Not an invincible bot. */
export function combatControls(b: Battle): Controls {
  const controls = idle(), p = b.p;
  if (b.intro > 0 || b.endT >= 0 || b.outcome || p.hp <= 0) return controls;
  const foes = b.enemies.filter((e) => !e.dead);
  const target = foes.sort((a, c) => Math.hypot(a.x - p.x, a.y - p.y) + a.hp * 0.15 - Math.hypot(c.x - p.x, c.y - p.y) - c.hp * 0.15)[0];
  if (!target) return controls;
  const ranged = b.moves.combo[0].shape === 'shot';

  if (p.hp <= b.stats.maxHp * 0.55 && b.save.potions > 0 && p.potionCd <= 0) controls.press.add('potion');
  // Avoid a landing, charge, or imminent slam. Projectiles are checked a short time ahead, too.
  let escapeX = 0, escapeY = 0, danger = false;
  const avoid = (x: number, y: number) => {
    danger = true;
    const away = vector(p.x - x, p.y - y);
    escapeX += away.x; escapeY += away.y;
  };
  for (const e of foes) {
    const distance = Math.hypot(e.x - p.x, e.y - p.y);
    const charging = ['charge', 'dash', 'dive', 'swoop'].includes(e.state);
    if (distance < e.r + p.r + 28 || (distance < 120 && e.windup > 0 && e.t < 0.22) || (distance < 100 && charging)) avoid(e.x, e.y);
  }
  for (const h of b.hazards) {
    if (!h.done && h.delay - h.t < 0.35 && Math.hypot(p.x - h.x, p.y - h.y) < h.r + p.r + 12) avoid(h.x, h.y);
  }
  for (const shot of b.projs) {
    if (shot.owner !== 'e') continue;
    const speed2 = shot.vx ** 2 + shot.vy ** 2;
    const rx = p.x - shot.x, ry = p.y - shot.y;
    const time = speed2 ? (rx * shot.vx + ry * shot.vy) / speed2 : 0;
    if (time < 0 || time > 0.5 || Math.hypot(rx - shot.vx * time, ry - shot.vy * time) > shot.r + p.r + 18) continue;
    // Step across an incoming shot's path, including while the dodge is recharging.
    // Running straight away from it leaves you on the same line, and most shots are faster than you.
    let side = vector(-shot.vy, shot.vx);
    const offset = rx * side.x + ry * side.y;
    if (offset < 0 || (Math.abs(offset) < 1 && (p.x + side.x * 70) ** 2 + (p.y + side.y * 70) ** 2 > (p.x - side.x * 70) ** 2 + (p.y - side.y * 70) ** 2)) side = { x: -side.x, y: -side.y };
    danger = true;
    escapeX += side.x; escapeY += side.y;
  }
  if (danger && p.dodgeT <= 0 && p.iframes <= 0 && b.dodgesReady > 0) {
    let away = vector(escapeX, escapeY);
    if (!away.x && !away.y) away = vector(p.x - target.x, p.y - target.y);
    // If retreat would run into the arena edge, dodge sideways toward its center instead.
    if (!b.arena.inside(p.x + away.x * 90, p.y + away.y * 90, -p.r)) {
      const side = { x: -away.y, y: away.x };
      away = (p.x + side.x * 90) ** 2 + (p.y + side.y * 90) ** 2 < (p.x - side.x * 90) ** 2 + (p.y - side.y * 90) ** 2
        ? side : { x: -side.x, y: -side.y };
    }
    controls.move = away;
    controls.press.add('dodge');
    return controls;
  }
  if (p.dodgeT > 0) return controls;
  if (danger && ranged) {
    controls.move = vector(escapeX, escapeY);
    return controls;
  }

  const dx = target.x - p.x, dy = target.y - target.r * 0.6 - (p.y - 10);
  const distance = Math.hypot(dx, dy), direction = Math.atan2(dy, dx);
  const reach = ranged ? 320 : Math.max(...b.moves.combo.map((s) => s.shape === 'circle' ? (s.reach ?? 0) + s.size : s.range)) * b.reach;
  const stand = ranged ? (target.def.boss ? 240 : 150) : Math.max(target.r + p.r + 10, reach * 0.7);
  const retreat = ranged && distance < stand - 50;
  if (retreat) controls.move = vector(-dx, -dy);
  else if (distance > stand + 5) controls.move = vector(dx, dy);
  else if (!p.swing && Math.abs(angDiff(direction, p.face)) > 0.1) controls.move = vector(dx, dy, 0.15);

  if (!retreat && distance <= reach + target.r * 0.5) controls.hold.add('attack');
  if (!retreat && b.skillNow && p.skillCd <= 0 && distance < (ranged ? 320 : 120 * b.reach)) controls.press.add('skill');
  return controls;
}

/** Predict the marker after this frame's normal update, rather than moving it into the sweet spot. */
export class GatherControls {
  private game: Chop | null = null;
  private previous = 0;
  private direction = 1;

  clear() { this.game = null; }

  frame(game: Chop, dt: number): Controls {
    const controls = idle();
    // Observe one step first, including when enabled midway through an existing minigame.
    if (game !== this.game) { this.game = game; this.previous = game.pos; return controls; }
    else if (game.pos !== this.previous) this.direction = Math.sign(game.pos - this.previous);
    this.previous = game.pos;
    if (game.done || game.lock > dt) return controls;
    let next = game.pos + this.direction * game.speed * dt;
    if (next > 1) next = 2 - next;
    if (next < 0) next = -next;
    // Aim for the perfect core; at low frame rates take a clean hit if the next step would skip the core.
    const off = Math.abs(next - game.center), step = game.speed * dt;
    if (off <= game.width * 0.18 || (off <= game.width * 0.45 && off <= step / 2)) controls.press.add('act');
    return controls;
  }
}
