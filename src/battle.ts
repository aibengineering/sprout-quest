// Real-time arena battles. Units are "arena pixels"; the arena is a circle of radius ARENA_R centered at (0, 0).
import { drawFrame, drawHero, frame } from './assets';
import type { Audio } from './audio';
import { vibrate } from './audio';
import { GEAR, MATS, MONSTERS, POTION_HEAL, type Fx as Element, type Gear, type MatId, type MonsterDef, type MonsterKind, type Zone } from './data';
import { Fx } from './fx';
import type { Input } from './input';
import { calcDamage, mergeDrops, playerStats, rollDrops, scaleMonster, type PlayerStats } from './rules';
import { drawMonster, drawPlayer, drawWeapon, rrect, shadow } from './sprites';
import type { SaveState } from './state';
import { MOVESETS, tierScale, type Moveset, type Strike } from './weapons';
import { hash2 } from './world';

const TAU = Math.PI * 2;
export const ARENA_R = 210;
const SKILL_CD = 4.5;
/** Arena units per Blender unit for sprites (drawn a little larger than their hitboxes so they read on phones). */
const UNIT = 34;

const easeOut = (q: number) => 1 - (1 - q) ** 3;
const easeIn = (q: number) => q * q * q;
const easeInOut = (q: number) => (q < 0.5 ? 4 * q * q * q : 1 - (-2 * q + 2) ** 3 / 2);
const clamp01 = (q: number) => Math.max(0, Math.min(1, q));
const angDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

type EState =
  | 'idle' | 'hop' | 'windup' | 'charge' | 'move' | 'puff' | 'circle' | 'dash' | 'recover'
  | 'flutter' | 'swoop' | 'retreat' | 'walk' | 'slam' | 'float' | 'cast'
  | 'ring' | 'triple' | 'stomp';

interface Enemy {
  kind: MonsterKind;
  def: MonsterDef;
  lv: number;
  golden: boolean;
  hp: number;
  maxHp: number;
  atk: number;
  dfn: number;
  xp: number;
  spd: number;
  x: number; y: number; vx: number; vy: number; kx: number; ky: number;
  r: number;
  z: number;
  state: EState;
  t: number;
  dir: number;
  face: number;
  orb: number;
  sub: number;
  last: EState | null;
  windup: number;
  flash: number;
  stun: number;
  dead: boolean;
  deathT: number;
  seed: number;
  hitId: number;
  burn: number;
  burnDmg: number;
  burnTick: number;
  squash: number;
}

interface Proj {
  x: number; y: number; vx: number; vy: number; r: number;
  atk: number; mult: number; owner: 'p' | 'e'; life: number; color: string;
}

interface Hazard { x: number; y: number; r: number; t: number; delay: number; atk: number; mult: number; done: boolean }
interface Ring { x: number; y: number; r0: number; r1: number; t: number; dur: number; color: string; width?: number }

/** A strike in progress. Hitboxes sweep with the weapon, so what you see is what you hit. */
interface Swing {
  s: Strike;
  t: number;
  aim: number;
  id: number;
  prevAng: number | null;
  impacted: boolean;
  skill: boolean;
  /** Recent weapon angles during the active frames, for drawing the slash trail. */
  trail: { ang: number; t: number }[];
}

/** Traveling shockwave from hammer slams. */
interface Wave { x: number; y: number; dir: number; dist: number; range: number; width: number; speed: number; mult: number; id: number; spikeAt: number }
interface Spike { x: number; y: number; t: number; life: number; size: number; tilt: number }
interface Crack { pts: [number, number][]; t: number }
interface Spark { x: number; y: number; t: number; size: number; color: string; rot: number }

export interface Foe { kind: MonsterKind; lv: number; golden: boolean }

export interface BattleSetup {
  zone: Zone;
  foes: Foe[];
  boss: boolean;
}

export interface BattleOutcome {
  result: 'win' | 'lose' | 'run';
  hp: number;
  xp: number;
  drops: Partial<Record<MatId, number>>;
  defeated: string[];
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** Per-monster display scale so every model reads at a similar size to its hitbox. */
const SPRITE_SCALE: Partial<Record<MonsterKind, number>> = { wolf: 1.4, bunny: 1.25, bat: 1.2, imp: 1.2, shroom: 1.1, dragon: 1.1 };

const SKILLS: Record<'spin' | 'quake', Strike> = {
  spin: { anim: 'spin', shape: 'arc', windup: 0.06, active: 0.3, recover: 0.16, range: 100, size: TAU, mult: 1.7, kb: 260, turns: 1.5, shake: 7, hitstop: 0.06, move: 0.6, stun: 0.3 },
  quake: { anim: 'slam', shape: 'circle', windup: 0.36, active: 0.1, recover: 0.42, range: 0, reach: 0, size: 150, mult: 2.2, kb: 360, shake: 16, hitstop: 0.12, move: 0.1, stun: 1.3 },
};

const ELEMENT_COLORS: Record<Element, string[]> = {
  none: ['#ffffff', '#e8eef8'],
  nature: ['#8ad85a', '#c8f0a0'],
  jelly: ['#8af09a', '#ffb4c8'],
  crystal: ['#c8b0ff', '#9af0ff'],
  stone: ['#c8b8a0', '#9aa0b0'],
  fire: ['#ffb03a', '#ff5a2a'],
  dragon: ['#ff5a4a', '#ffd35a'],
};

export class Battle {
  t = 0;
  intro = 1.2;
  private endT = -1;
  private done = false;
  private outcome: BattleOutcome | null = null;
  readonly stats: PlayerStats;
  readonly weapon: Gear;
  readonly moves: Moveset;
  private tier: number;
  private reach: number;
  private element: Element;
  readonly p = {
    x: 0, y: 120, vx: 0, vy: 0, kx: 0, ky: 0, r: 12,
    hp: 0, face: -Math.PI / 2, moving: false,
    atkBuffer: 0, skillCd: 1, dodgeCd: 0, dodgeT: 0, dodgeDir: 0, iframes: 0, hurtT: 0,
    lungeT: 0, lungeDir: 0, lungeId: 0, potionCd: 0, regenAcc: 0,
    whirlT: 0, whirlTick: 0, whirlAng: 0,
    swing: null as Swing | null,
    combo: 0,
    comboT: 0,
  };
  enemies: Enemy[] = [];
  private projs: Proj[] = [];
  private hazards: Hazard[] = [];
  private rings: Ring[] = [];
  private waves: Wave[] = [];
  private spikes: Spike[] = [];
  private cracks: Crack[] = [];
  private sparks: Spark[] = [];
  private fx = new Fx();
  private shake = 0;
  private hitstop = 0;
  private punch = 0;
  private runCd = 0;
  private xp = 0;
  private drops: Partial<Record<MatId, number>> = {};
  private defeated: string[] = [];
  private hitCounter = 1;
  private burstIds = new Set<number>();
  private weaponColor: string;
  private armorColor: string;

  constructor(
    readonly setup: BattleSetup,
    private save: SaveState,
    private input: Input,
    private audio: Audio,
    private onEnd: (o: BattleOutcome) => void,
  ) {
    this.stats = playerStats(save);
    this.p.hp = save.hp;
    this.weapon = GEAR[save.equip.weapon] ?? GEAR.twig;
    this.moves = MOVESETS[this.weapon.style ?? 'sword'];
    this.tier = this.weapon.tier ?? 0;
    this.reach = tierScale(this.tier);
    this.element = this.weapon.fx ?? 'none';
    this.weaponColor = this.weapon.color ?? '#ccc';
    this.armorColor = GEAR[save.equip.armor]?.color ?? '#6fa8ff';
    const n = setup.foes.length;
    setup.foes.forEach((f, i) => {
      const def = MONSTERS[f.kind];
      const s = scaleMonster(def, f.lv, f.golden);
      const a = n === 1 ? -Math.PI / 2 : -Math.PI * 0.8 + (i / (n - 1)) * Math.PI * 0.6;
      const dist = def.boss ? 90 : 120;
      this.enemies.push({
        kind: f.kind, def, lv: f.lv, golden: f.golden,
        hp: s.hp, maxHp: s.hp, atk: s.atk, dfn: s.def, xp: s.xp, spd: def.spd * (f.golden ? 1.1 : 1),
        x: Math.cos(a) * dist, y: Math.sin(a) * dist - 10, vx: 0, vy: 0, kx: 0, ky: 0,
        r: def.r, z: 0, state: initialState(f.kind), t: rand(0.3, 1.2), dir: 0, face: 1, orb: a, sub: 0, last: null,
        windup: 0, flash: 0, stun: 0, dead: false, deathT: 0, seed: Math.random() * 10, hitId: 0,
        burn: 0, burnDmg: 0, burnTick: 0, squash: 0,
      });
    });
  }

  get skillFrac() { return Math.max(0, this.p.skillCd) / SKILL_CD; }
  get dodgeFrac() { return Math.max(0, this.p.dodgeCd) / 0.7; }
  get boss(): Enemy | undefined { return this.enemies.find((e) => e.def.boss); }

  update(dt: number) {
    this.t += dt;
    this.fx.update(dt);
    this.shake = Math.max(0, this.shake - dt * 30);
    this.punch = Math.max(0, this.punch - dt * 0.25);
    for (const r of this.rings) r.t += dt;
    this.rings = this.rings.filter((r) => r.t < r.dur);
    for (const s of this.spikes) s.t += dt;
    this.spikes = this.spikes.filter((s) => s.t < s.life);
    for (const c of this.cracks) c.t += dt;
    this.cracks = this.cracks.filter((c) => c.t < 1.2);
    for (const s of this.sparks) s.t += dt;
    this.sparks = this.sparks.filter((s) => s.t < 0.22);
    for (const e of this.enemies) if (e.dead) e.deathT -= dt;
    if (this.done) return;
    if (this.intro > 0) {
      this.intro -= dt;
      this.input.flush();
      return;
    }
    if (this.endT >= 0) {
      this.endT -= dt;
      this.p.moving = false;
      if (this.endT < 0 && !this.done && this.outcome) {
        this.done = true;
        this.onEnd(this.outcome);
      }
      return;
    }
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      return;
    }
    this.updatePlayer(dt);
    for (const e of this.enemies) this.updateEnemy(e, dt);
    this.separate();
    this.updateProjs(dt);
    this.updateWaves(dt);
    this.updateHazards(dt);
    this.checkEnd();
  }

  // ---------------------------------------------------------------- player

  private updatePlayer(dt: number) {
    const p = this.p, st = this.stats, inp = this.input;
    p.skillCd -= dt; p.dodgeCd -= dt; p.iframes -= dt; p.hurtT -= dt;
    p.potionCd -= dt; p.atkBuffer -= dt; p.comboT -= dt; this.runCd -= dt;
    if (p.comboT <= 0 && !p.swing) p.combo = 0;
    if (st.regen && p.hp < st.maxHp) {
      p.regenAcc += st.regen * dt;
      if (p.regenAcc >= 1) {
        p.hp = Math.min(st.maxHp, p.hp + Math.floor(p.regenAcc));
        p.regenAcc %= 1;
      }
    }
    const a = inp.axis();
    p.moving = Math.hypot(a.x, a.y) > 0.1;
    const busy = !!p.swing || p.whirlT > 0;
    if (p.moving && !busy) p.face = Math.atan2(a.y, a.x);
    let speed = 150 * (1 + st.spd / 100);
    if (p.swing) {
      const sw = p.swing;
      // Heavy weapons root you while they swing; recovery lets you move again.
      speed *= sw.t < sw.s.windup + sw.s.active ? sw.s.move : 0.5 + sw.s.move * 0.5;
    }
    if (p.whirlT > 0) speed *= 0.75;
    if (p.dodgeT > 0) {
      p.dodgeT -= dt;
      p.vx = Math.cos(p.dodgeDir) * speed * 3;
      p.vy = Math.sin(p.dodgeDir) * speed * 3;
      if (Math.random() < 0.6) this.fx.burst(p.x, p.y - 4, 'rgba(255,255,255,0.8)', 1, 30, { size: 4, grav: 0, life: 0.3 });
    } else if (p.lungeT > 0) {
      p.lungeT -= dt;
      p.vx = Math.cos(p.lungeDir) * 150 * 4.8;
      p.vy = Math.sin(p.lungeDir) * 150 * 4.8;
      this.trailPuff(p.x, p.y - 12);
      for (const e of this.enemies) {
        if (e.dead || e.hitId === p.lungeId) continue;
        if (Math.hypot(e.x - p.x, e.y - e.r * 0.6 - (p.y - 10)) < e.r + 30 * this.reach) {
          e.hitId = p.lungeId;
          this.hitEnemy(e, 2.1, p.lungeDir, 220, 0.2, p.lungeId, 0.07);
        }
      }
    } else {
      p.vx = a.x * speed;
      p.vy = a.y * speed;
    }
    const decay = Math.exp(-10 * dt);
    p.x += (p.vx + p.kx) * dt;
    p.y += (p.vy + p.ky) * dt;
    p.kx *= decay;
    p.ky *= decay;
    this.clampPlayer();

    if (p.swing) this.updateSwing(dt);
    if (p.whirlT > 0) this.updateWhirl(dt);

    if (inp.consume('dodge') && p.dodgeCd <= 0 && p.lungeT <= 0) {
      // Dodging cancels a swing's recovery — but not a committed windup.
      if (!p.swing || p.swing.t > p.swing.s.windup) {
        p.swing = null;
        p.dodgeDir = p.moving ? Math.atan2(a.y, a.x) : p.face + Math.PI;
        p.dodgeT = 0.2;
        p.iframes = Math.max(p.iframes, 0.32);
        p.dodgeCd = 0.7;
        this.audio.play('dodge');
      }
    }
    if (inp.consume('attack')) p.atkBuffer = 0.25;
    const wantAttack = p.atkBuffer > 0 || inp.isHeld('attack');
    if (wantAttack && this.canStrike() && p.dodgeT <= 0 && p.whirlT <= 0 && p.lungeT <= 0) {
      p.atkBuffer = 0;
      const combo = this.moves.combo;
      const idx = p.combo % combo.length;
      p.combo = idx + 1;
      this.startSwing(combo[idx], false, idx === combo.length - 1);
    }
    // Skills cancel whatever swing is in progress, so they always come out when pressed.
    if (inp.consume('skill') && p.skillCd <= 0 && p.dodgeT <= 0 && p.whirlT <= 0 && p.lungeT <= 0) this.skill();
    if (inp.consume('potion')) this.drinkPotion();
    if (inp.consume('run')) this.tryRun();
  }

  private clampPlayer() {
    const p = this.p;
    const d = Math.hypot(p.x, p.y);
    const maxD = ARENA_R - p.r;
    if (d > maxD) {
      p.x *= maxD / d;
      p.y *= maxD / d;
    }
  }

  /** You can chain into the next strike once the current one is into its recovery. */
  private canStrike() {
    const sw = this.p.swing;
    if (!sw) return true;
    return sw.t >= sw.s.windup + sw.s.active + sw.s.recover * 0.35;
  }

  private nearestEnemy(maxD = 320): Enemy | null {
    let best: Enemy | null = null, bd = maxD;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - this.p.x, e.y - this.p.y) - e.r;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  private aim(): number {
    const e = this.nearestEnemy();
    return e ? Math.atan2(e.y - e.r * 0.6 - (this.p.y - 10), e.x - this.p.x) : this.p.face;
  }

  private startSwing(s: Strike, skill: boolean, finisher: boolean) {
    const p = this.p;
    const aim = this.aim();
    p.face = aim;
    p.swing = { s, t: 0, aim, id: ++this.hitCounter, prevAng: null, impacted: false, skill, trail: [] };
    if (finisher && !skill) this.punch = Math.max(this.punch, 0.02);
  }

  /** The weapon's angle, forward offset and scale at this moment of the swing — drives both visuals and hitboxes. */
  private pose(sw: Swing): { ang: number; off: number; scale: number } {
    const s = sw.s, aim = sw.aim;
    const qw = clamp01(sw.t / Math.max(0.001, s.windup));
    const qa = clamp01((sw.t - s.windup) / s.active);
    const inActive = sw.t >= s.windup;
    const arc = s.size;
    switch (s.anim) {
      case 'slashR':
      case 'slashL': {
        const d = s.anim === 'slashR' ? 1 : -1;
        const a0 = aim - (arc / 2) * d, a1 = aim + (arc / 2) * d;
        if (!inActive) return { ang: a0 - 0.45 * d * easeOut(qw), off: 0, scale: 1 };
        return { ang: a0 - 0.45 * d + (a1 - a0 + 0.45 * d) * easeOut(qa), off: 0, scale: 1 };
      }
      case 'chop':
      case 'backchop': {
        // Heavy overhead: lift way back (sprite grows to read as "raised"), then accelerate through.
        const d = s.anim === 'chop' ? 1 : -1;
        const a0 = aim - (arc / 2) * d, a1 = aim + (arc / 2) * d;
        if (!inActive) return { ang: a0 - 0.9 * d * easeOut(qw), off: -4 * qw, scale: 1 + 0.25 * easeOut(qw) };
        return { ang: a0 - 0.9 * d + (a1 - a0 + 0.9 * d) * easeIn(qa), off: 6 * qa, scale: 1.25 - 0.25 * qa };
      }
      case 'thrust': {
        if (!inActive) return { ang: aim, off: -12 * easeOut(qw), scale: 1 };
        const rec = clamp01((sw.t - s.windup - s.active) / Math.max(0.001, s.recover));
        return { ang: aim, off: -12 + (s.range * 0.32 * this.reach + 12) * easeOut(qa) * (1 - rec * 0.7), scale: 1 };
      }
      case 'slam': {
        // Over the top: swing from behind the head down onto the target.
        const side = Math.cos(aim) >= 0 ? -1 : 1;
        const back = aim + Math.PI * side;
        if (!inActive) return { ang: aim + (back - aim) * easeOut(qw) * 0.95, off: 0, scale: 1 + 0.4 * easeOut(qw) };
        return { ang: aim + (back - aim) * 0.95 * (1 - easeIn(qa)), off: 6 * qa, scale: 1.4 - 0.5 * easeIn(qa) };
      }
      case 'spin': {
        const turns = s.turns ?? 1;
        if (!inActive) return { ang: aim - 0.7 * easeOut(qw), off: 0, scale: 1 };
        return { ang: aim - 0.7 + (turns * TAU + 0.7) * easeInOut(qa), off: 0, scale: 1.05 };
      }
      case 'cast':
        return { ang: aim, off: inActive ? 10 * Math.sin(qa * Math.PI) : -4 * qw, scale: 1 };
    }
  }

  private updateSwing(dt: number) {
    const p = this.p, sw = p.swing!, s = sw.s;
    const wasWindup = sw.t < s.windup;
    sw.t += dt;
    const total = s.windup + s.active + s.recover;
    const activeEnd = s.windup + s.active;
    if (wasWindup && sw.t >= s.windup) this.onActiveStart(sw);
    if (sw.t >= s.windup && sw.t - dt < activeEnd) {
      const pose = this.pose(sw);
      if (s.lunge) {
        const step = (s.lunge / s.active) * dt;
        p.x += Math.cos(sw.aim) * step;
        p.y += Math.sin(sw.aim) * step;
        this.clampPlayer();
      }
      if (s.shape === 'arc') {
        sw.trail.push({ ang: pose.ang, t: this.t });
        if (sw.prevAng !== null) this.sweepHit(sw, sw.prevAng, pose.ang);
        sw.prevAng = pose.ang;
      } else if (s.shape === 'line') {
        const q = clamp01((sw.t - s.windup) / s.active);
        this.lineHit(sw, s.range * this.reach * easeOut(q), s.size * this.reach);
      }
    }
    if (s.shape === 'circle' && !sw.impacted && sw.t >= activeEnd) this.impact(sw);
    sw.trail = sw.trail.filter((k) => this.t - k.t < 0.14);
    if (sw.t >= total) {
      p.swing = null;
      p.comboT = this.moves.window;
    }
  }

  private onActiveStart(sw: Swing) {
    const s = sw.s, p = this.p;
    const heavy = s.mult >= 1.5 || this.moves.combo[0].windup > 0.12;
    this.audio.play(s.shape === 'shot' ? 'shoot' : heavy ? 'heavy' : 'swing');
    if (s.shape === 'shot') {
      for (const off of s.shots ?? [0]) this.shoot(sw.aim + off, s.mult, s.size * (1 + this.tier * 0.06));
    }
    if (s.lunge) this.fx.burst(p.x, p.y, '#e8dcc8', 5, 60, { size: 3, grav: 0, life: 0.3 });
  }

  /** Hits every enemy whose direction falls inside the angle swept this frame. */
  private sweepHit(sw: Swing, a0: number, a1: number) {
    const p = this.p, s = sw.s;
    const range = s.range * this.reach;
    const lo = Math.min(a0, a1), hi = Math.max(a0, a1);
    const full = hi - lo >= TAU - 0.01;
    for (const e of this.enemies) {
      if (e.dead || e.hitId === sw.id) continue;
      const ex = e.x - p.x, ey = e.y - e.r * 0.6 - (p.y - 10);
      const d = Math.hypot(ex, ey) - e.r;
      if (d > range) continue;
      let ea = Math.atan2(ey, ex);
      while (ea < lo) ea += TAU;
      while (ea - TAU >= lo) ea -= TAU;
      // Enemies hugging you count too (their angle is unreliable up close).
      if (!full && ea > hi + e.r / Math.max(20, d + e.r) && d > 8) continue;
      e.hitId = sw.id;
      this.hitEnemy(e, s.mult, Math.atan2(ey, ex), s.kb, s.stun ?? 0, sw.id, s.hitstop);
    }
  }

  private lineHit(sw: Swing, reach: number, width: number) {
    const p = this.p, s = sw.s;
    const cx = Math.cos(sw.aim), cy = Math.sin(sw.aim);
    for (const e of this.enemies) {
      if (e.dead || e.hitId === sw.id) continue;
      const ex = e.x - p.x, ey = e.y - e.r * 0.6 - (p.y - 10);
      const along = ex * cx + ey * cy;
      const perp = Math.abs(-ex * cy + ey * cx);
      if (along < -e.r || along > reach + e.r || perp > width / 2 + e.r) continue;
      e.hitId = sw.id;
      this.hitEnemy(e, s.mult, sw.aim, s.kb, s.stun ?? 0, sw.id, s.hitstop);
    }
  }

  /** Hammer impact: damage ring at the head, dust, cracks and a traveling shockwave. */
  private impact(sw: Swing) {
    sw.impacted = true;
    const p = this.p, s = sw.s;
    const reach = (s.reach ?? 0) * this.reach;
    const ix = p.x + Math.cos(sw.aim) * reach, iy = p.y + Math.sin(sw.aim) * reach;
    const radius = s.size * this.reach;
    for (const e of this.enemies) {
      if (e.dead || e.hitId === sw.id) continue;
      if (Math.hypot(e.x - ix, e.y - iy) > radius + e.r) continue;
      e.hitId = sw.id;
      this.hitEnemy(e, s.mult, Math.atan2(e.y - iy, e.x - ix), s.kb, s.stun ?? 0, sw.id, s.hitstop);
    }
    const col = ELEMENT_COLORS[this.element];
    this.rings.push({ x: ix, y: iy, r0: 8, r1: radius * 1.2, t: 0, dur: 0.35, color: '255,245,220', width: 8 });
    this.fx.burst(ix, iy, '#c8b8a0', 14 + this.tier * 3, 200, { size: 5, life: 0.5 });
    this.fx.burst(ix, iy, col[0], 6 + this.tier * 2, 160, { size: 4, star: true, life: 0.5 });
    this.addCrack(ix, iy, sw.aim, radius * 1.4);
    this.shake = Math.max(this.shake, s.shake * (1 + this.tier * 0.1));
    this.audio.play('boom');
    vibrate(30);
    if (s.wave) {
      const w = s.wave;
      const width = w.width * this.reach * (this.element === 'stone' ? 1.25 : 1);
      this.waves.push({ x: ix, y: iy, dir: sw.aim, dist: 0, range: w.range * this.reach, width, speed: w.speed, mult: w.mult, id: ++this.hitCounter, spikeAt: 0 });
    }
    if (sw.skill) {
      // Quake: shockwaves burst out in every direction.
      for (let i = 0; i < 8; i++) {
        const dir = sw.aim + (i / 8) * TAU;
        this.waves.push({ x: ix, y: iy, dir, dist: 0, range: 190 * this.reach, width: 40, speed: 560, mult: 0.9, id: ++this.hitCounter, spikeAt: 0 });
      }
    }
  }

  private addCrack(x: number, y: number, dir: number, len: number) {
    for (let k = 0; k < 3; k++) {
      const a = dir + (k - 1) * 0.9 + rand(-0.3, 0.3);
      const pts: [number, number][] = [[x, y]];
      let cx = x, cy = y;
      for (let i = 0; i < 4; i++) {
        const aa = a + rand(-0.5, 0.5);
        cx += Math.cos(aa) * (len / 4);
        cy += Math.sin(aa) * (len / 4) * 0.7;
        pts.push([cx, cy]);
      }
      this.cracks.push({ pts, t: 0 });
    }
  }

  private updateWaves(dt: number) {
    for (const w of this.waves) {
      w.dist += w.speed * dt;
      const cx = Math.cos(w.dir), cy = Math.sin(w.dir);
      while (w.spikeAt < Math.min(w.dist, w.range)) {
        const sx = w.x + cx * w.spikeAt, sy = w.y + cy * w.spikeAt;
        this.spikes.push({ x: sx + rand(-4, 4), y: sy + rand(-3, 3), t: 0, life: 0.5, size: w.width * rand(0.32, 0.45), tilt: rand(-0.3, 0.3) });
        if (Math.random() < 0.5) this.fx.burst(sx, sy, '#c8b8a0', 2, 90, { size: 3, life: 0.4 });
        w.spikeAt += 15;
      }
      for (const e of this.enemies) {
        if (e.dead || e.hitId === w.id) continue;
        const ex = e.x - w.x, ey = e.y - w.y;
        const along = ex * cx + ey * cy, perp = Math.abs(-ex * cy + ey * cx);
        if (along < w.dist - 40 || along > w.dist + e.r || perp > w.width / 2 + e.r) continue;
        e.hitId = w.id;
        this.hitEnemy(e, w.mult, w.dir, 200, 0.25, w.id, 0.04);
      }
    }
    this.waves = this.waves.filter((w) => w.dist < w.range);
  }

  private skill() {
    const p = this.p;
    p.skillCd = SKILL_CD;
    p.swing = null;
    this.audio.play('skill');
    const ang = this.aim();
    const col = ELEMENT_COLORS[this.element];
    switch (this.moves.skill) {
      case 'spin':
        this.startSwing(SKILLS.spin, true, true);
        this.rings.push({ x: p.x, y: p.y - 10, r0: 20, r1: 110 * this.reach, t: 0, dur: 0.35, color: '255,255,200' });
        if (this.element === 'fire' || this.element === 'dragon') {
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * TAU;
            this.fx.burst(p.x + Math.cos(a) * 80, p.y + Math.sin(a) * 60, col[i % 2], 2, 80, { size: 5, grav: -80, life: 0.6 });
          }
        }
        break;
      case 'lunge':
        p.lungeT = 0.24;
        p.lungeDir = ang;
        p.lungeId = ++this.hitCounter;
        p.iframes = Math.max(p.iframes, 0.38);
        p.face = ang;
        break;
      case 'whirl':
        p.whirlT = 1.2;
        p.whirlTick = 0;
        p.whirlAng = ang;
        break;
      case 'quake':
        this.startSwing(SKILLS.quake, true, true);
        break;
      case 'nova':
        for (let i = 0; i < 14; i++) this.shoot(ang + (i / 14) * TAU, 1.1, 8);
        this.rings.push({ x: p.x, y: p.y - 10, r0: 10, r1: 70, t: 0, dur: 0.3, color: '160,230,255' });
        break;
    }
  }

  private updateWhirl(dt: number) {
    const p = this.p;
    p.whirlT -= dt;
    p.whirlTick -= dt;
    p.whirlAng += dt * 20;
    p.face = p.whirlAng;
    if (p.whirlTick <= 0) {
      p.whirlTick = 0.16;
      const id = ++this.hitCounter;
      const range = 92 * this.reach;
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.x - p.x, e.y - e.r * 0.6 - (p.y - 10)) - e.r > range) continue;
        this.hitEnemy(e, 0.8, Math.atan2(e.y - p.y, e.x - p.x), 160, 0.1, id, 0.02);
      }
      this.audio.play('swing');
    }
  }

  private shoot(ang: number, mult: number, r: number) {
    const p = this.p;
    this.projs.push({
      x: p.x + Math.cos(ang) * 16, y: p.y - 12 + Math.sin(ang) * 16,
      vx: Math.cos(ang) * 400, vy: Math.sin(ang) * 400, r,
      atk: 0, mult, owner: 'p', life: 1.2, color: this.weapon.trail ?? this.weaponColor,
    });
  }

  private trailPuff(x: number, y: number) {
    if (Math.random() < 0.7) this.fx.burst(x, y, this.weapon.trail ?? '#fff', 1, 40, { size: 5, grav: 0, life: 0.3 });
  }

  private drinkPotion() {
    const p = this.p;
    if (p.potionCd > 0) return;
    if (this.save.potions <= 0) {
      this.fx.text(p.x, p.y - 40, 'No potions!', '#ffd0d0', 13);
      return;
    }
    if (p.hp >= this.stats.maxHp) {
      this.fx.text(p.x, p.y - 40, 'HP is full', '#e0f0ff', 13);
      return;
    }
    this.save.potions--;
    const heal = Math.round(this.stats.maxHp * POTION_HEAL);
    p.hp = Math.min(this.stats.maxHp, p.hp + heal);
    p.potionCd = 0.8;
    this.fx.text(p.x, p.y - 40, `+${heal}`, '#7aff9a', 18);
    this.fx.burst(p.x, p.y - 15, '#7aff9a', 14, 90, { star: true, size: 4, grav: -40 });
    this.audio.play('heal');
  }

  private tryRun() {
    const p = this.p;
    if (this.setup.boss) {
      this.fx.text(p.x, p.y - 40, "Can't run!", '#ffd0d0', 14);
      return;
    }
    if (this.runCd > 0) return;
    if (Math.random() < 0.7) {
      this.fx.text(p.x, p.y - 40, 'Got away!', '#ffffff', 16);
      this.finish({ result: 'run', hp: p.hp, xp: 0, drops: {}, defeated: [] }, 0.5);
    } else {
      this.fx.text(p.x, p.y - 40, 'Blocked!', '#ffd0d0', 16);
      this.runCd = 1.5;
    }
  }

  private hitEnemy(e: Enemy, mult: number, ang: number, kb: number, stun = 0, strikeId = 0, hitstop = 0.035) {
    if (e.dead) return;
    const st = this.stats;
    const critChance = 0.08 + st.luck * 0.2 + (this.element === 'crystal' ? 0.12 : 0);
    const { dmg, crit } = calcDamage(st.atk, e.dfn, mult, critChance);
    e.hp -= dmg;
    e.flash = 0.12;
    e.squash = 0.18;
    const kbk = e.def.boss ? 0.12 : 1;
    e.kx += Math.cos(ang) * kb * kbk;
    e.ky += Math.sin(ang) * kb * kbk;
    if (stun) e.stun = Math.max(e.stun, e.def.boss ? stun * 0.3 : stun);
    const hx = e.x, hy = e.y - e.r * 0.8 - e.z;
    const heavy = mult >= 1.5;
    const size = (crit ? 22 : 17) * (heavy ? 1.2 : 1);
    this.fx.text(e.x, e.y - e.r * 2 - e.z, crit ? `${dmg}!` : `${dmg}`, crit ? '#ffd84a' : '#ffffff', size);
    const col = ELEMENT_COLORS[this.element];
    this.sparks.push({ x: hx, y: hy, t: 0, size: (14 + this.tier * 3) * (heavy ? 1.35 : 1) * (crit ? 1.3 : 1), color: col[0], rot: Math.random() * TAU });
    this.fx.burst(hx, hy, '#ffffff', crit ? 9 : 5, 140, { size: 3 });
    if (this.tier >= 1) this.fx.burst(hx, hy, col[1], 2 + this.tier, 120, { size: 3, star: this.tier >= 3 });
    switch (this.element) {
      case 'fire':
      case 'dragon':
        e.burn = 1.6;
        e.burnDmg = Math.max(1, Math.round(dmg * 0.12));
        this.fx.burst(hx, hy, '#ff9a3a', 5, 120, { size: 4, grav: -60 });
        break;
      case 'crystal':
        if (crit) this.fx.burst(hx, hy, '#c8f0ff', 10, 200, { size: 4, star: true });
        break;
    }
    // Dragon weapons: once per strike, dragonfire erupts at the first enemy hit.
    if (this.element === 'dragon' && strikeId && !this.burstIds.has(strikeId)) {
      this.burstIds.add(strikeId);
      this.dragonBurst(e.x, e.y, e);
    }
    this.audio.play(crit ? 'crit' : 'hit');
    this.hitstop = Math.max(this.hitstop, hitstop * (crit ? 1.4 : 1));
    this.shake = Math.max(this.shake, (crit ? 5 : 3) * (heavy ? 1.6 : 1) * (1 + this.tier * 0.08));
    if (e.hp <= 0) this.kill(e);
  }

  private dragonBurst(x: number, y: number, skip: Enemy) {
    this.rings.push({ x, y, r0: 10, r1: 55, t: 0, dur: 0.3, color: '255,140,60', width: 7 });
    this.fx.burst(x, y - 10, '#ff7a3a', 16, 180, { size: 6, grav: -120, life: 0.6 });
    this.fx.burst(x, y - 10, '#ffd35a', 8, 120, { size: 5, star: true });
    for (const o of this.enemies) {
      if (o === skip || o.dead) continue;
      if (Math.hypot(o.x - x, o.y - y) > 55 + o.r) continue;
      const { dmg } = calcDamage(this.stats.atk, o.dfn, 0.5, 0);
      o.hp -= dmg;
      o.flash = 0.1;
      o.burn = 1.6;
      o.burnDmg = Math.max(1, Math.round(dmg * 0.12));
      this.fx.text(o.x, o.y - o.r * 2, `${dmg}`, '#ffb03a', 15);
      if (o.hp <= 0) this.kill(o);
    }
  }

  private kill(e: Enemy) {
    e.dead = true;
    e.hp = 0;
    e.deathT = 0.45;
    e.windup = 0;
    e.burn = 0;
    const cols: Record<MonsterKind, string> = {
      slime: '#6fdc7a', magma: '#ff7a3a', bunny: '#ffffff', shroom: '#e8505a', wolf: '#9aa4c8',
      bat: '#7a5ab8', golem: '#9aa0b0', imp: '#e8505a', dragon: '#e8603c',
    };
    this.fx.burst(e.x, e.y - e.r * 0.7, e.golden ? '#ffd84a' : cols[e.kind], 18, 180, { size: 5 });
    this.fx.burst(e.x, e.y - e.r * 0.7, '#fff6a0', 8, 120, { star: true, size: 5, grav: -30 });
    this.audio.play('kill');
    this.xp += e.xp;
    this.defeated.push(e.def.name);
    const d = rollDrops(e.def, this.stats.luck, e.golden);
    mergeDrops(this.drops, d);
    let i = 0;
    for (const m in d) this.fx.text(e.x + (i++ - 0.5) * 18, e.y - e.r * 2.6, MATS[m as MatId].icon, '#fff', 18);
    if (e.def.boss) {
      this.shake = 20;
      this.audio.play('boom');
      for (let k = 0; k < 4; k++) this.fx.burst(e.x + rand(-40, 40), e.y - rand(20, 90), '#ffb03a', 20, 220, { size: 6 });
    }
  }

  private hurtPlayer(atk: number, mult: number, fx: number, fy: number) {
    const p = this.p;
    if (p.iframes > 0 || p.dodgeT > 0 || p.lungeT > 0 || this.endT >= 0) return;
    const { dmg } = calcDamage(atk, this.stats.def, mult, 0.04);
    p.hp -= dmg;
    p.iframes = 0.8;
    p.hurtT = 0.25;
    const ang = Math.atan2(p.y - fy, p.x - fx);
    p.kx = Math.cos(ang) * 240;
    p.ky = Math.sin(ang) * 240;
    this.fx.text(p.x, p.y - 42, `-${dmg}`, '#ff6a7a', 18);
    this.fx.burst(p.x, p.y - 14, '#ff8a9a', 8, 140, { size: 3 });
    this.audio.play('hurt');
    vibrate(40);
    this.shake = Math.max(this.shake, 7);
    this.hitstop = 0.05;
    if (p.hp <= 0) p.hp = 0;
  }

  private finish(o: BattleOutcome, delay: number) {
    if (this.endT >= 0) return;
    this.outcome = o;
    this.endT = delay;
  }

  private checkEnd() {
    if (this.endT >= 0) return;
    if (this.p.hp <= 0) {
      this.audio.play('lose');
      this.finish({ result: 'lose', hp: 0, xp: 0, drops: {}, defeated: this.defeated }, 1.4);
    } else if (this.enemies.every((e) => e.dead)) {
      this.audio.play('victory');
      this.finish({ result: 'win', hp: this.p.hp, xp: this.xp, drops: this.drops, defeated: this.defeated }, 1.1);
    }
  }

  // ---------------------------------------------------------------- enemies

  private enemyShoot(e: Enemy, ang: number, speed: number, r: number, color: string, mult = 1) {
    this.projs.push({
      x: e.x + Math.cos(ang) * e.r, y: e.y - e.r * 0.8 - e.z + Math.sin(ang) * e.r,
      vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, r, atk: e.atk, mult, owner: 'e', life: 3, color,
    });
  }

  private updateEnemy(e: Enemy, dt: number) {
    if (e.dead) return;
    const p = this.p;
    e.flash -= dt;
    e.squash = Math.max(0, e.squash - dt);
    if (e.burn > 0) {
      e.burn -= dt;
      e.burnTick -= dt;
      if (e.burnTick <= 0) {
        e.burnTick = 0.4;
        e.hp -= e.burnDmg;
        e.flash = 0.05;
        this.fx.text(e.x + rand(-8, 8), e.y - e.r * 2 - e.z, `${e.burnDmg}`, '#ffb03a', 13);
        if (e.hp <= 0) {
          this.kill(e);
          return;
        }
      }
    }
    const decay = Math.exp(-8 * dt);
    e.x += e.kx * dt;
    e.y += e.ky * dt;
    e.kx *= decay;
    e.ky *= decay;
    const dx = p.x - e.x, dy = p.y - e.y;
    const dist = Math.hypot(dx, dy);
    const toP = Math.atan2(dy, dx);
    if (e.stun > 0) {
      e.stun -= dt;
      e.windup = 0;
      e.vx = e.vy = 0;
    } else {
      e.t -= dt;
      this.ai(e, dt, dist, toP);
    }
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (Math.abs(e.vx) > 5) e.face = Math.sign(e.vx);
    else if (Math.abs(dx) > 4) e.face = Math.sign(dx);
    // Stay in the arena; charging enemies bounce off the wall.
    const d = Math.hypot(e.x, e.y), maxD = ARENA_R - e.r;
    if (d > maxD) {
      const nx = e.x / d, ny = e.y / d;
      e.x = nx * maxD;
      e.y = ny * maxD;
      if (e.state === 'charge' || e.state === 'dash' || e.state === 'swoop') {
        const dot = e.vx * nx + e.vy * ny;
        e.vx -= 2 * dot * nx;
        e.vy -= 2 * dot * ny;
        this.shake = Math.max(this.shake, e.def.boss ? 8 : 2);
      }
    }
    // Contact damage (slimes mid-hop sail over you).
    const airborne = (e.kind === 'slime' || e.kind === 'magma') && e.z > 10;
    if (!airborne && Math.hypot(p.x - e.x, p.y - e.y) < p.r + e.r * 0.85) {
      const fast = e.state === 'charge' || e.state === 'dash' || e.state === 'swoop';
      this.hurtPlayer(e.atk, (e.def.boss ? 0.8 : 1) * (fast ? 1.2 : 1), e.x, e.y);
    }
  }

  private moveToward(e: Enemy, ang: number, speed: number) {
    e.vx = Math.cos(ang) * speed;
    e.vy = Math.sin(ang) * speed;
  }

  private ai(e: Enemy, dt: number, dist: number, toP: number) {
    const p = this.p;
    const rage = e.def.boss && e.hp < e.maxHp * 0.5 ? 0.72 : 1;
    switch (e.kind) {
      case 'slime':
      case 'magma': {
        if (e.state === 'idle') {
          e.vx = e.vy = 0;
          e.z = 0;
          e.windup = e.t < 0.2 ? 1 - e.t / 0.2 : 0;
          if (e.t <= 0) {
            e.state = 'hop';
            e.t = 0.5;
            e.windup = 0;
            this.moveToward(e, toP + rand(-0.4, 0.4), e.spd * (e.kind === 'magma' ? 2.2 : 1.9));
          }
        } else {
          e.z = Math.sin((1 - Math.max(0, e.t) / 0.5) * Math.PI) * 20;
          if (e.t <= 0) {
            e.state = 'idle';
            e.t = rand(0.45, 1.0);
            e.z = 0;
            e.vx = e.vy = 0;
            this.fx.burst(e.x, e.y, e.kind === 'slime' ? '#a8f0a8' : '#ffb07a', 4, 60, { size: 3 });
            if (e.kind === 'magma' && Math.random() < 0.5) {
              const off = Math.random() * TAU;
              for (let i = 0; i < 4; i++) this.enemyShoot(e, off + (i / 4) * TAU, 120, 7, '#ff9a3a', 0.7);
            }
          }
        }
        break;
      }
      case 'bunny': {
        if (e.state === 'idle') {
          const wa = e.orb + Math.sin(this.t + e.seed) * 1.5;
          this.moveToward(e, wa, e.spd * 0.45);
          if (e.t <= 0) { e.state = 'windup'; e.t = 0.55; e.dir = toP; }
        } else if (e.state === 'windup') {
          e.vx = e.vy = 0;
          e.windup = 1 - e.t / 0.55;
          if (e.t > 0.15) e.dir = toP;
          if (e.t <= 0) { e.state = 'charge'; e.t = 0.5; e.windup = 0; this.moveToward(e, e.dir, e.spd * 3.4); }
        } else if (e.state === 'charge') {
          if (e.t <= 0) { e.state = 'idle'; e.t = rand(1.1, 2.0); e.orb = Math.random() * TAU; e.vx = e.vy = 0; }
        }
        break;
      }
      case 'shroom': {
        if (e.state === 'move') {
          const strafe = toP + (Math.sin(e.seed) > 0 ? 1 : -1) * Math.PI / 2;
          if (dist < 130) this.moveToward(e, toP + Math.PI, e.spd);
          else if (dist > 230) this.moveToward(e, toP, e.spd);
          else this.moveToward(e, strafe, e.spd * 0.6);
          if (e.t <= 0) { e.state = 'puff'; e.t = 0.6; }
        } else {
          e.vx = e.vy = 0;
          e.windup = 1 - e.t / 0.6;
          if (e.t <= 0) {
            e.windup = 0;
            for (const s of [-0.3, 0, 0.3]) this.enemyShoot(e, toP + s, 140, 7, '#c08ae0');
            this.audio.play('shoot');
            e.state = 'move';
            e.t = rand(1.4, 2.4);
          }
        }
        break;
      }
      case 'wolf': {
        if (e.state === 'circle') {
          e.orb += dt * 0.9 * (Math.sin(e.seed) > 0 ? 1 : -1);
          const tx = p.x + Math.cos(e.orb) * 130, ty = p.y + Math.sin(e.orb) * 130;
          this.moveToward(e, Math.atan2(ty - e.y, tx - e.x), e.spd * Math.min(1, Math.hypot(tx - e.x, ty - e.y) / 30));
          if (e.t <= 0) { e.state = 'windup'; e.t = 0.45; }
        } else if (e.state === 'windup') {
          e.vx = e.vy = 0;
          e.windup = 1 - e.t / 0.45;
          if (e.t > 0.12) e.dir = toP;
          if (e.t <= 0) { e.state = 'dash'; e.t = 0.35; e.windup = 0; this.moveToward(e, e.dir, e.spd * 4.2); }
        } else if (e.state === 'dash') {
          if (e.t <= 0) { e.state = 'recover'; e.t = 0.5; e.vx = e.vy = 0; }
        } else if (e.t <= 0) {
          e.state = 'circle';
          e.t = rand(1.2, 2.2);
          e.orb = Math.atan2(e.y - p.y, e.x - p.x);
        }
        break;
      }
      case 'bat': {
        e.z = 12 + Math.sin(this.t * 5 + e.seed) * 4;
        if (e.state === 'flutter') {
          const wob = Math.sin(this.t * 4 + e.seed) * 1.2;
          this.moveToward(e, dist < 110 ? toP + Math.PI + wob : toP + wob, e.spd * 0.7);
          if (e.t <= 0) { e.state = 'windup'; e.t = 0.35; }
        } else if (e.state === 'windup') {
          e.vx = e.vy = 0;
          e.windup = 1 - e.t / 0.35;
          e.dir = toP;
          if (e.t <= 0) { e.state = 'swoop'; e.t = 0.45; e.windup = 0; this.moveToward(e, e.dir, e.spd * 2.8); }
        } else if (e.state === 'swoop') {
          if (e.t <= 0) { e.state = 'retreat'; e.t = 0.5; this.moveToward(e, toP + Math.PI, e.spd); }
        } else if (e.t <= 0) {
          e.state = 'flutter';
          e.t = rand(1, 1.8);
        }
        break;
      }
      case 'golem': {
        if (e.state === 'walk') {
          this.moveToward(e, toP, dist > 40 ? e.spd : 0);
          if (dist < 105 && e.t <= 0) {
            e.state = 'slam';
            e.t = 1.0;
            e.vx = e.vy = 0;
            this.hazards.push({ x: e.x, y: e.y, r: 95, t: 0, delay: 0.9, atk: e.atk, mult: 1.3, done: false });
          }
        } else {
          e.windup = 1 - e.t / 1.0;
          if (e.t <= 0) { e.state = 'walk'; e.t = 1.3; e.windup = 0; }
        }
        break;
      }
      case 'imp': {
        e.z = 10;
        if (e.state === 'float') {
          e.orb += dt * 0.5;
          const tx = p.x + Math.cos(e.orb) * 170, ty = p.y + Math.sin(e.orb) * 170;
          this.moveToward(e, Math.atan2(ty - e.y, tx - e.x), e.spd * 0.8 * Math.min(1, Math.hypot(tx - e.x, ty - e.y) / 40));
          if (e.t <= 0) {
            if (Math.random() < 0.35) {
              this.fx.burst(e.x, e.y - 20, '#c878ff', 12, 100, { size: 4 });
              const a = Math.random() * TAU, r = rand(150, 190);
              let nx = p.x + Math.cos(a) * r, ny = p.y + Math.sin(a) * r;
              const nd = Math.hypot(nx, ny);
              if (nd > ARENA_R - 30) { nx *= (ARENA_R - 30) / nd; ny *= (ARENA_R - 30) / nd; }
              e.x = nx; e.y = ny;
              this.fx.burst(e.x, e.y - 20, '#c878ff', 12, 100, { size: 4 });
              e.t = rand(0.4, 0.7);
            } else {
              e.state = 'cast';
              e.t = 0.55;
            }
          }
        } else {
          e.vx = e.vy = 0;
          e.windup = 1 - e.t / 0.55;
          if (e.t <= 0) {
            e.windup = 0;
            const spread = e.lv >= 15 || e.golden ? [-0.25, 0, 0.25] : [0];
            for (const s of spread) this.enemyShoot(e, toP + s, 190, 8, '#ff9a3a');
            this.audio.play('shoot');
            e.state = 'float';
            e.t = rand(1.2, 2);
          }
        }
        break;
      }
      case 'dragon':
        this.dragonAi(e, dt, dist, toP, rage);
        break;
    }
  }

  private dragonAi(e: Enemy, _dt: number, dist: number, toP: number, rage: number) {
    const p = this.p;
    switch (e.state) {
      case 'walk': {
        this.moveToward(e, toP, dist > 90 ? e.spd * 0.6 : 0);
        if (e.t <= 0) {
          const opts: EState[] = ['ring', 'triple', 'charge', 'stomp'].filter((s) => s !== e.last) as EState[];
          e.state = opts[Math.floor(Math.random() * opts.length)];
          e.last = e.state;
          e.vx = e.vy = 0;
          e.sub = 0;
          e.t = e.state === 'charge' ? 0.7 * rage : e.state === 'ring' ? 0.8 * rage : 0.3;
          if (e.state === 'charge') e.state = 'windup';
        }
        break;
      }
      case 'ring': {
        e.windup = e.sub === 0 ? 1 - e.t / (0.8 * rage) : 0.5;
        if (e.t <= 0) {
          const off = e.sub * (Math.PI / 14);
          for (let i = 0; i < 14; i++) this.enemyShoot(e, off + (i / 14) * TAU, 150, 9, '#ff7a3a');
          this.audio.play('boom');
          e.sub++;
          e.t = 0.35;
          if (e.sub >= (rage < 1 ? 3 : 2)) { e.state = 'walk'; e.t = 1.3 * rage; e.windup = 0; }
        }
        break;
      }
      case 'triple': {
        e.windup = 0.6;
        if (e.t <= 0) {
          for (const s of [-0.22, 0, 0.22]) this.enemyShoot(e, toP + s, 220, 9, '#ffb03a');
          this.audio.play('shoot');
          e.sub++;
          e.t = 0.35 * rage;
          if (e.sub >= 3) { e.state = 'walk'; e.t = 1.2 * rage; e.windup = 0; }
        }
        break;
      }
      case 'windup': {
        e.windup = 1 - e.t / (0.7 * rage);
        if (e.t > 0.15) e.dir = toP;
        if (e.t <= 0) { e.state = 'charge'; e.t = 0.6; e.windup = 0; this.moveToward(e, e.dir, e.spd * 4.5); }
        break;
      }
      case 'charge': {
        if (Math.random() < 0.5) this.fx.burst(e.x, e.y, '#ffb03a', 1, 40, { size: 5, grav: -20 });
        if (e.t <= 0) { e.state = 'recover'; e.t = 0.6; e.vx = e.vy = 0; }
        break;
      }
      case 'recover': {
        if (e.t <= 0) { e.state = 'walk'; e.t = 1.0 * rage; }
        break;
      }
      case 'stomp': {
        e.windup = 0.4;
        if (e.t <= 0) {
          this.hazards.push({ x: p.x + p.vx * 0.3, y: p.y + p.vy * 0.3, r: 60, t: 0, delay: 0.8, atk: e.atk, mult: 1.1, done: false });
          e.sub++;
          e.t = 0.45 * rage;
          if (e.sub >= (rage < 1 ? 5 : 3)) { e.state = 'walk'; e.t = 1.4 * rage; e.windup = 0; }
        }
        break;
      }
      default:
        e.state = 'walk';
    }
  }

  private separate() {
    const es = this.enemies;
    for (let i = 0; i < es.length; i++) {
      const a = es[i];
      if (a.dead) continue;
      for (let j = i + 1; j < es.length; j++) {
        const b = es[j];
        if (b.dead) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.01, min = a.r + b.r;
        if (d < min) {
          const push = (min - d) / 2;
          a.x -= (dx / d) * push; a.y -= (dy / d) * push;
          b.x += (dx / d) * push; b.y += (dy / d) * push;
        }
      }
    }
  }

  private updateProjs(dt: number) {
    const p = this.p;
    for (const pr of this.projs) {
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.life -= dt;
      if (Math.hypot(pr.x, pr.y) > ARENA_R + 30) pr.life = 0;
      if (pr.life <= 0) continue;
      if (Math.random() < 0.4) this.fx.burst(pr.x, pr.y, pr.color, 1, 20, { size: pr.r * 0.4, grav: 0, life: 0.3 });
      if (pr.owner === 'e') {
        if (Math.hypot(pr.x - p.x, pr.y - (p.y - 10)) < pr.r + p.r) {
          if (p.iframes <= 0 && p.dodgeT <= 0 && p.lungeT <= 0) {
            this.hurtPlayer(pr.atk, pr.mult, pr.x, pr.y);
            pr.life = 0;
          }
        }
      } else {
        for (const e of this.enemies) {
          if (e.dead) continue;
          if (Math.hypot(pr.x - e.x, pr.y - (e.y - e.r * 0.7 - e.z)) < pr.r + e.r) {
            this.hitEnemy(e, pr.mult, Math.atan2(pr.vy, pr.vx), 70, 0, 0, 0.025);
            this.fx.burst(pr.x, pr.y, pr.color, 6, 100, { star: true, size: 3 });
            pr.life = 0;
            break;
          }
        }
      }
    }
    this.projs = this.projs.filter((pr) => pr.life > 0);
  }

  private updateHazards(dt: number) {
    const p = this.p;
    for (const h of this.hazards) {
      h.t += dt;
      if (!h.done && h.t >= h.delay) {
        h.done = true;
        if (Math.hypot(p.x - h.x, p.y - h.y) < h.r + p.r * 0.5) this.hurtPlayer(h.atk, h.mult, h.x, h.y);
        this.fx.burst(h.x, h.y, '#c8a080', 16, 200, { size: 5 });
        this.rings.push({ x: h.x, y: h.y, r0: h.r * 0.3, r1: h.r * 1.1, t: 0, dur: 0.3, color: '255,160,100' });
        this.shake = Math.max(this.shake, 8);
        this.audio.play('boom');
      }
    }
    this.hazards = this.hazards.filter((h) => h.t < h.delay + 0.1);
  }

  // ---------------------------------------------------------------- rendering

  private layout(vw: number, vh: number) {
    const span = ARENA_R * 2 + 24;
    if (vh > vw * 1.15) {
      const top = 84, bottom = 220;
      const k = Math.min(vw / span, (vh - top - bottom) / span);
      return { k, cx: vw / 2, cy: top + (vh - top - bottom) / 2 };
    }
    const top = 64;
    const k = Math.min(vw / span, (vh - top - 8) / span);
    return { k, cx: vw / 2, cy: top + (vh - top) / 2 };
  }

  render(ctx: CanvasRenderingContext2D, vw: number, vh: number) {
    const th = this.setup.zone.theme;
    const { k: k0, cx, cy } = this.layout(vw, vh);
    const k = k0 * (1 + this.punch);
    ctx.fillStyle = th.outside;
    ctx.fillRect(0, 0, vw, vh);
    const sx = (Math.random() - 0.5) * this.shake, sy = (Math.random() - 0.5) * this.shake;
    ctx.save();
    ctx.translate(cx + sx, cy + sy);
    ctx.scale(k, k);
    this.drawArena(ctx, vw / k, vh / k);

    // Ground cracks from hammer impacts
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const c of this.cracks) {
      ctx.strokeStyle = `rgba(60,35,50,${0.45 * (1 - c.t / 1.2)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      c.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    }

    // Telegraphed danger zones
    for (const h of this.hazards) {
      const prog = Math.min(1, h.t / h.delay);
      ctx.fillStyle = `rgba(255,70,60,${0.12 + prog * 0.12})`;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,70,60,0.25)';
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.r * prog, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,90,70,${0.6 + Math.sin(this.t * 30) * 0.3})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.r, 0, TAU);
      ctx.stroke();
    }

    // Auto-aim target marker
    const tgt = this.endT < 0 ? this.nearestEnemy() : null;
    if (tgt) {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = -this.t * 20;
      ctx.beginPath();
      ctx.ellipse(tgt.x, tgt.y, tgt.r * 1.3, tgt.r * 0.5, 0, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Y-sorted actors
    const actors: { y: number; draw: () => void }[] = [];
    for (const e of this.enemies) {
      if (e.dead && e.deathT <= 0) continue;
      actors.push({ y: e.y, draw: () => this.drawEnemy(ctx, e) });
    }
    for (const s of this.spikes) actors.push({ y: s.y, draw: () => this.drawSpike(ctx, s) });
    actors.push({ y: this.p.y, draw: () => this.drawHero(ctx) });
    actors.sort((a, b) => a.y - b.y);
    for (const a of actors) a.draw();

    for (const pr of this.projs) {
      ctx.fillStyle = pr.color;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, pr.r * 1.7, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, pr.r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(pr.x - pr.r * 0.3, pr.y - pr.r * 0.3, pr.r * 0.4, 0, TAU);
      ctx.fill();
    }
    for (const r of this.rings) {
      const q = r.t / r.dur;
      const rad = r.r0 + (r.r1 - r.r0) * easeOut(q);
      ctx.strokeStyle = `rgba(${r.color},${1 - q})`;
      ctx.lineWidth = (r.width ?? 6) * (1 - q) + 1;
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, rad, rad * 0.62, 0, 0, TAU);
      ctx.stroke();
    }
    for (const s of this.sparks) this.drawSpark(ctx, s);
    this.fx.draw(ctx);
    ctx.restore();

    this.drawOverlay(ctx, vw, vh);
  }

  private drawArena(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const th = this.setup.zone.theme;
    const R = ARENA_R;
    const tuft = frame(`env/grass_${this.setup.zone.id}`) ?? frame('env/grass_meadow');
    // Scenery tufts outside the ring.
    ctx.fillStyle = th.grass;
    for (let i = 0; i < 90; i++) {
      const x = (hash2(i, 1, 3) - 0.5) * w * 1.1, y = (hash2(i, 2, 3) - 0.5) * h * 1.1;
      if (Math.hypot(x, y) < R + 30) continue;
      const sway = Math.sin(this.t * 2 + i) * 2;
      if (tuft) {
        drawFrame(ctx, tuft, x, y, 30, { rot: sway * 0.02 });
        continue;
      }
      ctx.beginPath();
      ctx.moveTo(x - 7, y);
      ctx.lineTo(x - 3 + sway, y - 14);
      ctx.lineTo(x, y);
      ctx.lineTo(x + 4 + sway, y - 16);
      ctx.lineTo(x + 7, y);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 10, R + 16, R + 12, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = th.ground2;
    ctx.beginPath();
    ctx.arc(0, 0, R + 12, 0, TAU);
    ctx.fill();
    ctx.fillStyle = th.ground;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.55, 0, TAU);
    ctx.fill();
    // Stone rim
    const stones = 36;
    for (let i = 0; i < stones; i++) {
      const a = (i / stones) * TAU;
      const x = Math.cos(a) * (R + 6), y = Math.sin(a) * (R + 6);
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.12)';
      ctx.beginPath();
      ctx.ellipse(x, y, 11, 8, a, 0, TAU);
      ctx.fill();
    }
    // Little decor inside
    for (let i = 0; i < 14; i++) {
      const a = hash2(i, 5, 9) * TAU, r = 40 + hash2(i, 6, 9) * (R - 60);
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      ctx.fillStyle = th.grassTip;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(x - 4, y);
      ctx.lineTo(x - 1, y - 8);
      ctx.lineTo(x + 1, y);
      ctx.lineTo(x + 3, y - 7);
      ctx.lineTo(x + 5, y);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  private drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy) {
    const alpha = e.dead ? Math.max(0, e.deathT / 0.45) : 1;
    const fi = Math.floor(this.t * (e.def.boss ? 5 : 7) + e.seed) % 6;
    const f = frame(`mon/${e.kind}${e.golden ? '_gold' : ''}/${fi}`);
    const flying = e.kind === 'bat' || e.kind === 'imp';
    if (f) {
      shadow(ctx, e.x, e.y, e.r * (flying ? 0.7 : 1.05) * (1 - Math.min(0.4, e.z / 60)));
      let sxk = 1, syk = 1;
      if (e.squash > 0) {
        sxk = 1 + e.squash * 1.3;
        syk = 1 - e.squash * 0.9;
      }
      if (e.windup > 0) {
        sxk *= 1 + e.windup * 0.12;
        syk *= 1 - e.windup * 0.1;
      }
      if ((e.kind === 'slime' || e.kind === 'magma') && e.z > 2) {
        sxk *= 0.9;
        syk *= 1.12;
      }
      if (e.dead) {
        const s = 1 + (1 - alpha) * 0.5;
        sxk *= s;
        syk /= s;
      }
      const shake = e.windup > 0 ? Math.sin(this.t * 60) * e.r * 0.08 * e.windup : 0;
      drawFrame(ctx, f, e.x + shake, e.y - e.z, UNIT * (SPRITE_SCALE[e.kind] ?? 1), {
        flip: e.face < 0, alpha, sx: sxk, sy: syk,
        flash: e.flash > 0 || (e.dead && alpha > 0.7) ? 1 : 0,
        tint: e.burn > 0 ? '#ff7a2a' : e.windup > 0.5 ? '#ff4a4a' : undefined,
        tintAmount: e.burn > 0 ? 0.25 + Math.sin(this.t * 20) * 0.1 : (e.windup - 0.5) * 0.5,
      });
    } else {
      ctx.save();
      if (e.dead) {
        const s = 1 + (1 - alpha) * 0.4;
        ctx.translate(e.x, e.y);
        ctx.scale(s, 1 / s);
        ctx.translate(-e.x, -e.y);
      }
      drawMonster(ctx, e.kind, e.x, e.y, e.r, {
        t: this.t, flash: e.flash > 0 || (e.dead && alpha > 0.7), golden: e.golden, dir: e.face,
        z: e.z, windup: e.windup, seed: e.seed, alpha,
      });
      ctx.restore();
    }
    if (e.golden && !e.dead && Math.random() < 0.15) this.fx.burst(e.x + rand(-e.r, e.r), e.y - rand(0, e.r * 2), '#fff6a0', 1, 20, { star: true, size: 3, grav: -20 });
    if (e.burn > 0 && !e.dead && Math.random() < 0.3) this.fx.burst(e.x + rand(-e.r, e.r) * 0.6, e.y - rand(0, e.r * 1.5) - e.z, Math.random() < 0.5 ? '#ffb03a' : '#ff5a2a', 1, 30, { size: 4, grav: -90, life: 0.5 });
    if (e.stun > 0 && !e.dead) {
      for (let i = 0; i < 3; i++) {
        const a = this.t * 5 + (i / 3) * TAU;
        ctx.fillStyle = '#ffe04a';
        ctx.beginPath();
        ctx.arc(e.x + Math.cos(a) * e.r * 0.8, e.y - e.r * 2.4 - e.z + Math.sin(a) * 4, 3, 0, TAU);
        ctx.fill();
      }
    }
    if (!e.dead && !e.def.boss && e.hp < e.maxHp) {
      const w = Math.max(26, e.r * 2), y = e.y - e.r * 2.6 - e.z - 6;
      ctx.fillStyle = 'rgba(40,20,50,0.7)';
      rrect(ctx, e.x - w / 2 - 1.5, y - 1.5, w + 3, 7, 3.5);
      ctx.fill();
      ctx.fillStyle = e.hp / e.maxHp > 0.3 ? '#7aee8a' : '#ff6a6a';
      rrect(ctx, e.x - w / 2, y, w * (e.hp / e.maxHp), 4, 2);
      ctx.fill();
    }
  }

  private drawSpike(ctx: CanvasRenderingContext2D, s: Spike) {
    const grow = s.t < 0.07 ? s.t / 0.07 : s.t > s.life - 0.18 ? Math.max(0, (s.life - s.t) / 0.18) : 1;
    const h = s.size * 1.5 * easeOut(grow), w = s.size * 0.55;
    const pal: Record<string, [string, string]> = {
      jelly: ['#ff9ab0', '#e8505a'], fire: ['#ff9a4a', '#c8402a'], dragon: ['#ff7a3a', '#b8302a'], stone: ['#c8b8a0', '#8a7a68'],
    };
    const [light, dark] = pal[this.element] ?? ['#d8c8b0', '#9a8a78'];
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.tilt);
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(-w, 0);
    ctx.lineTo(0, -h);
    ctx.lineTo(w, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.moveTo(-w, 0);
    ctx.lineTo(0, -h);
    ctx.lineTo(w * 0.1, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(58,36,72,0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-w, 0);
    ctx.lineTo(0, -h);
    ctx.lineTo(w, 0);
    ctx.stroke();
    if (this.element === 'fire' || this.element === 'dragon') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,150,50,0.35)';
      ctx.beginPath();
      ctx.arc(0, -h * 0.4, w * 1.2, 0, TAU);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  private drawSpark(ctx: CanvasRenderingContext2D, s: Spark) {
    const q = s.t / 0.22;
    const r = s.size * (0.5 + easeOut(q) * 0.8);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    ctx.globalAlpha = 1 - q;
    for (const [col, k] of [[s.color, 1], ['#ffffff', 0.55]] as const) {
      ctx.fillStyle = col;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const rr = (i % 2 ? r * 0.18 : r) * k;
        const a = (i / 8) * TAU;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.fill();
    }
    ctx.restore();
  }

  /** Crescent slash trail following the recorded weapon angles. */
  private drawArcTrail(ctx: CanvasRenderingContext2D, sw: Swing) {
    if (sw.trail.length < 2) return;
    const p = this.p;
    const cx = p.x, cy = p.y - 10;
    const R = sw.s.range * this.reach + 4;
    const Ri = R * 0.3;
    const pts: { a: number; k: number }[] = [];
    for (let i = 0; i < sw.trail.length - 1; i++) {
      const a0 = sw.trail[i].ang, a1 = sw.trail[i + 1].ang;
      for (let j = 0; j < 4; j++) pts.push({ a: a0 + ((a1 - a0) * j) / 4, k: (i + j / 4) / (sw.trail.length - 1) });
    }
    pts.push({ a: sw.trail[sw.trail.length - 1].ang, k: 1 });
    const col = this.weapon.trail ?? '#ffffff';
    const layers = this.tier >= 3 ? 2 : 1;
    for (let L = 0; L < layers; L++) {
      ctx.save();
      if (L === 1) ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = L === 1 ? 0.35 : 0.75;
      ctx.fillStyle = col;
      ctx.beginPath();
      const grow = L === 1 ? 1.12 : 1;
      for (const { a, k } of pts) ctx.lineTo(cx + Math.cos(a) * R * grow, cy + Math.sin(a) * R * grow * 0.9);
      for (let i = pts.length - 1; i >= 0; i--) {
        const { a, k } = pts[i];
        const r = R - (R - Ri) * (0.25 + 0.75 * k);
        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2 + this.tier * 0.4;
    ctx.beginPath();
    for (const { a } of pts.slice(Math.floor(pts.length * 0.4))) ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.9);
    ctx.stroke();
  }

  private drawThrustTrail(ctx: CanvasRenderingContext2D, sw: Swing) {
    const s = sw.s, p = this.p;
    const q = (sw.t - s.windup) / s.active;
    if (q < 0 || q > 1.8) return;
    const fade = q > 1 ? 1 - (q - 1) / 0.8 : 1;
    const reach = s.range * this.reach * easeOut(Math.min(1, q));
    const w = s.size * this.reach * 0.5;
    const cx = p.x, cy = p.y - 10, dx = Math.cos(sw.aim), dy = Math.sin(sw.aim);
    ctx.save();
    ctx.globalAlpha = 0.7 * fade;
    ctx.fillStyle = this.weapon.trail ?? '#fff';
    ctx.beginPath();
    ctx.moveTo(cx - dy * w, cy + dx * w);
    ctx.lineTo(cx + dx * reach, cy + dy * reach);
    ctx.lineTo(cx + dy * w, cy - dx * w);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.9 * fade;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cx - dy * w * 0.3, cy + dx * w * 0.3);
    ctx.lineTo(cx + dx * reach, cy + dy * reach);
    ctx.lineTo(cx + dy * w * 0.3, cy - dx * w * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawHero(ctx: CanvasRenderingContext2D) {
    const p = this.p;
    const style = this.weapon.style ?? 'sword';
    const blink = p.iframes > 0 && p.dodgeT <= 0 && p.lungeT <= 0 && Math.floor(this.t * 20) % 2 === 0;
    const alpha = blink ? 0.35 : 1;
    const cosF = Math.cos(p.face);
    const heavy = style === 'axe' || style === 'hammer';
    let ang = cosF >= 0 ? (heavy ? -1.35 : -1.05) : Math.PI + (heavy ? 1.35 : 1.05);
    let off = 0, scale = 1, flipY = cosF >= 0 ? 1 : -1;
    const sw = p.swing;
    if (sw) {
      ({ ang, off, scale } = this.pose(sw));
      if (sw.s.shape === 'arc') {
        const d = sw.s.anim === 'slashL' || sw.s.anim === 'backchop' ? -1 : 1;
        flipY = d > 0 ? -1 : 1;
        if (sw.s.anim === 'spin') flipY = -1;
      } else flipY = Math.cos(ang) >= 0 ? 1 : -1;
      if (sw.s.shape === 'arc') this.drawArcTrail(ctx, sw);
      if (sw.s.shape === 'line') this.drawThrustTrail(ctx, sw);
    } else if (p.whirlT > 0) {
      ang = p.whirlAng;
      flipY = -1;
      scale = 1.05;
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = this.weapon.trail ?? '#fff';
      ctx.lineWidth = 16;
      const R = 80 * this.reach;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.ellipse(p.x, p.y - 10, R, R * 0.8, 0, ang - 1.4 + (k * TAU) / 3, ang + (k * TAU) / 3);
        ctx.stroke();
      }
      ctx.restore();
    } else if (p.lungeT > 0) {
      ang = p.lungeDir;
      off = 16;
      flipY = Math.cos(ang) >= 0 ? 1 : -1;
    }
    const handX = p.x + Math.cos(ang) * (7 + off), handY = p.y - 17 + Math.sin(ang) * (4 + off * 0.8);
    const behind = Math.sin(ang) < -0.35 && !(sw && sw.s.anim === 'slam' && sw.t > sw.s.windup);
    const wf = frame(`wpn/${this.weapon.id}`);
    const weaponUnit = 34 * this.moves.size * scale;
    const drawW = () => {
      if (wf) drawFrame(ctx, wf, handX, handY, weaponUnit, { rot: ang, sy: flipY, alpha });
      else drawWeapon(ctx, style === 'axe' ? 'hammer' : style, handX, handY, ang, 12 * scale, this.weaponColor);
    };
    shadow(ctx, p.x, p.y, 14);
    if (behind) drawW();
    const armor = this.save.equip.armor;
    const ok = drawHero(ctx, armor, p.x, p.y, UNIT, p.face, p.moving && !sw, this.t, {
      alpha, flash: p.hurtT > 0 ? 0.7 : 0, sx: p.dodgeT > 0 ? 1.2 : 1, sy: p.dodgeT > 0 ? 0.82 : 1,
    });
    if (!ok) {
      drawPlayer(ctx, p.x, p.y, 12, {
        t: this.t, moving: p.moving, face: p.face, armor: this.armorColor, hurt: p.hurtT > 0,
        squash: p.dodgeT > 0 ? 1.25 : 1, alpha,
      });
    }
    if (!behind) drawW();
  }

  private drawOverlay(ctx: CanvasRenderingContext2D, vw: number, vh: number) {
    const boss = this.boss;
    if (boss) {
      const w = Math.min(420, vw * 0.8), x = (vw - w) / 2, y = vh > vw * 1.15 ? 92 : 70;
      ctx.fillStyle = 'rgba(40,20,50,0.75)';
      rrect(ctx, x - 3, y - 3, w + 6, 16, 8);
      ctx.fill();
      ctx.fillStyle = '#ff6a4a';
      rrect(ctx, x, y, w * Math.max(0, boss.hp / boss.maxHp), 10, 5);
      ctx.fill();
      ctx.font = '800 13px ui-rounded, "Nunito", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(`${boss.def.name}  Lv ${boss.lv}`, vw / 2, y + 28);
    }
    let text = '';
    let size = 44;
    if (this.intro > 0) {
      text = this.intro > 0.55 ? (this.setup.boss ? 'Boss battle!' : 'Ready…') : 'Fight!';
    } else if (this.endT >= 0 && this.outcome) {
      text = this.outcome.result === 'win' ? 'Victory!' : this.outcome.result === 'lose' ? 'Oh no…' : '';
      size = 48;
    }
    if (!text) return;
    ctx.save();
    ctx.translate(vw / 2, vh * 0.38);
    const pop = 1 + Math.max(0, Math.sin(this.t * 8)) * 0.05;
    ctx.scale(pop, pop);
    ctx.font = `900 ${size}px ui-rounded, "Nunito", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#4a2a5a';
    ctx.strokeText(text, 0, 0);
    ctx.fillStyle = '#fff6d0';
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }
}

function initialState(kind: MonsterKind): EState {
  switch (kind) {
    case 'slime': case 'magma': case 'bunny': return 'idle';
    case 'shroom': return 'move';
    case 'wolf': return 'circle';
    case 'bat': return 'flutter';
    case 'golem': return 'walk';
    case 'imp': return 'float';
    case 'dragon': return 'walk';
  }
}
