// The fight simulation: you, the monsters, strikes, shots and effects. Drawing lives in render.ts, each monster's
// behaviour in monsters.ts, and each weapon element's trick in elements.ts.
import { ARENA_RX, ARENA_RY, OvalArena } from '../arena';
import type { Audio, Sfx } from '../audio';
import { vibrate } from '../audio';
import { GEAR, MATS, MONSTERS, POTION_HEAL, type Fx as Element, type Gear, type MatId, type MonsterKind } from '../data';
import { Fx } from '../fx';
import type { Input } from '../input';
import { GENTLE_ATK, calcDamage, cloverPity, mergeDrops, playerStats, rollDrops, scaleMonster, type PlayerStats } from '../rules';
import type { SaveState } from '../state';
import { MOVESETS, SKILL_DATA, tierScale, type Moveset, type Strike } from '../weapons';
import { BURN_COLOR, ELEMENTS, type ElementDef, type HitWorld } from './elements';
import { MONSTER_AI, type FoeWorld } from './monsters';
import { pose } from './pose';
import {
  AIM_ASSIST, SKILL_CD, TAU, ZOOM_T, angDiff, clamp01, easeInOut, easeOut, rand,
  type BattleLog, type BattleOutcome, type BattleSetup, type Crack, type Enemy, type Flame, type Foe, type Hazard,
  type Proj, type Ring, type Spark, type Spike, type Swing, type Wave, type Zap,
} from './types';

export type { BattleOutcome, BattleSetup, Foe } from './types';

export class Battle implements FoeWorld, HitWorld {
  t = 0;
  intro = 1.2;
  /** Counts down once the fight is decided; the outcome is handed over when it runs out. */
  endT = -1;
  private done = false;
  outcome: BattleOutcome | null = null;
  readonly stats: PlayerStats;
  readonly weapon: Gear;
  readonly moves: Moveset;
  readonly tier: number;
  /** Reach and size scale for the weapon's tier. */
  readonly reach: number;
  readonly element: Element;
  private readonly el: ElementDef;
  readonly p = {
    x: 0, y: 120, vx: 0, vy: 0, kx: 0, ky: 0, r: 12,
    hp: 0, face: -Math.PI / 2, moving: false,
    atkBuffer: 0, skillCd: 1, dodgeCd: 0, dodgeT: 0, dodgeDir: 0, iframes: 0, hurtT: 0,
    potionCd: 0, regenAcc: 0,
    /** Cooldown after a full combo, and stamina pips. */
    restT: 0, ammo: 0, ammoT: 0,
    whirlT: 0, whirlTick: 0, whirlAng: 0,
    swing: null as Swing | null,
    combo: 0,
    comboT: 0,
  };
  readonly arena = new OvalArena(ARENA_RX, ARENA_RY);
  readonly fx = new Fx();

  // What's on the field. The simulation changes it; render.ts only reads it.
  enemies: Enemy[] = [];
  projs: Proj[] = [];
  hazards: Hazard[] = [];
  rings: Ring[] = [];
  waves: Wave[] = [];
  spikes: Spike[] = [];
  cracks: Crack[] = [];
  sparks: Spark[] = [];
  flames: Flame[] = [];
  zaps: Zap[] = [];
  shake = 0;
  punch = 0;

  private hitstop = 0;
  private runCd = 0;
  private xp = 0;
  private drops: Partial<Record<MatId, number>> = {};
  private defeated: string[] = [];
  private hitCounter = 1;
  /** How many times the player has landed a hit (drives the first-battle tutorial). */
  hits = 0;
  private onceKeys = new Set<number>();
  /** Running tallies for the play report. */
  readonly log: BattleLog = { time: 0, swings: 0, hits: 0, crits: 0, skills: 0, dodges: 0, potions: 0, dealt: 0, taken: 0 };

  constructor(
    readonly setup: BattleSetup,
    readonly save: SaveState,
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
    this.el = ELEMENTS[this.element];
    this.p.ammo = this.moves.ammo.max;
    // Regular fights swoop in and get going at once; bosses keep their dramatic "Boss battle!" beat.
    this.intro = this.dramatic ? 1.2 : ZOOM_T + 0.1;
    const n = setup.foes.length;
    setup.foes.forEach((f, i) => {
      const a = n === 1 ? -Math.PI / 2 : -Math.PI * 0.8 + (i / (n - 1)) * Math.PI * 0.6;
      const dist = MONSTERS[f.kind].boss ? 110 : 150;
      const e = this.spawn(f, Math.cos(a) * dist, Math.sin(a) * dist - 20, false);
      if (setup.ambush) e.stun = 1.5;
    });
    if (setup.ambush) this.fx.text(this.p.x, this.p.y - 46, 'Surprise attack!', '#ffe07a', 17);
  }

  /** Guardian and prologue fights open with a "Boss battle!" / "Ready… Fight!" beat instead of the swoop. */
  get dramatic() {
    return this.setup.boss || this.setup.foes.some((f) => f.gentle);
  }

  private spawn(f: Foe, x: number, y: number, minion: boolean): Enemy {
    const def = MONSTERS[f.kind];
    const s = scaleMonster(def, f.lv, f.golden);
    const e: Enemy = {
      kind: f.kind, def, lv: f.lv, golden: f.golden,
      hp: s.hp, maxHp: s.hp, atk: f.gentle ? Math.round(s.atk * GENTLE_ATK) : s.atk, dfn: s.def, xp: s.xp, spd: def.spd * (f.golden ? 1.1 : 1),
      x, y, vx: 0, vy: 0, kx: 0, ky: 0,
      r: def.r, z: 0, state: MONSTER_AI[f.kind].start, t: rand(0.3, 1.2), dir: 0, face: 1, orb: Math.atan2(y, x), sub: 0, last: null,
      windup: 0, flash: 0, stun: 0, dead: false, deathT: 0, seed: Math.random() * 10, hitId: 0,
      burn: 0, burnDmg: 0, burnTick: 0, dotColor: BURN_COLOR, slow: 0, squash: 0, tx: 0, ty: 0, flag: false, minion,
    };
    this.enemies.push(e);
    return e;
  }

  get skillFrac() { return Math.max(0, this.p.skillCd) / SKILL_CD; }
  get dodgeFrac() { return Math.max(0, this.p.dodgeCd) / 0.7; }
  /** How much of the attack cooldown is left: the rest after a combo, or waiting on the next stamina pip. */
  get attackFrac() {
    const rest = this.moves.rest ? Math.max(0, this.p.restT) / this.moves.rest : 0;
    const { regen, delay } = this.moves.ammo;
    const empty = this.p.ammo < 1 ? Math.min(1, Math.max(0, (regen - this.p.ammoT) / (regen + delay))) : 0;
    return Math.max(rest, empty);
  }
  /** Stamina pips left (shots in the clip, for ranged weapons). */
  get clip(): { n: number; max: number } { return { n: this.p.ammo, max: this.moves.ammo.max }; }
  get boss(): Enemy | undefined { return this.enemies.find((e) => e.def.boss); }

  /** 0 = normal view, 1 = swooped right in on you (the start and end of a regular fight). */
  get swoop(): number {
    if (this.dramatic) return 0;
    if (this.intro > 0) return easeInOut(clamp01(this.intro / ZOOM_T));
    if (this.endT >= 0 && this.outcome && this.outcome.result !== 'lose') return easeInOut(clamp01(1 - this.endT / ZOOM_T));
    return 0;
  }

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

  // ---------------------------------------------------------------- services for monsters and elements

  play(s: Sfx) {
    this.audio.play(s);
  }

  shakeAtLeast(n: number) {
    this.shake = Math.max(this.shake, n);
  }

  hazard(h: Omit<Hazard, 't' | 'done'>) {
    this.hazards.push({ ...h, t: 0, done: false });
  }

  ring(r: Omit<Ring, 't'>) {
    this.rings.push({ ...r, t: 0 });
  }

  once(key: number) {
    if (this.onceKeys.has(key)) return false;
    this.onceKeys.add(key);
    return true;
  }

  /** Bosses call in helpers — they pop in with a puff. */
  summon(kind: MonsterKind, lv: number, near: Enemy, count: number) {
    const alive = this.enemies.filter((e) => e.minion && !e.dead).length;
    for (let i = 0; i < Math.min(count, 4 - alive); i++) {
      const a = Math.random() * TAU;
      const { x, y } = this.arena.nearestFree(near.x + Math.cos(a) * 70, near.y + Math.sin(a) * 50, 20);
      const m = this.spawn({ kind, lv, golden: false }, x, y, true);
      m.t = 0.8;
      this.fx.burst(x, y - 10, '#ffffff', 14, 120, { size: 5 });
      this.fx.burst(x, y - 10, '#fff6a0', 6, 90, { star: true, size: 4 });
    }
  }

  enemyShoot(e: Enemy, ang: number, speed: number, r: number, color: string, mult = 1) {
    this.projs.push({
      x: e.x + Math.cos(ang) * e.r, y: e.y - e.r * 0.8 - e.z + Math.sin(ang) * e.r,
      vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, r, atk: e.atk, mult, owner: 'e', life: 3, color,
    });
  }

  // ---------------------------------------------------------------- player

  private updatePlayer(dt: number) {
    const p = this.p, st = this.stats, inp = this.input;
    p.skillCd -= dt; p.dodgeCd -= dt; p.iframes -= dt; p.hurtT -= dt;
    p.potionCd -= dt; p.atkBuffer -= dt; p.comboT -= dt; this.runCd -= dt; p.restT -= dt;
    const clip = this.moves.ammo;
    if (p.ammo < clip.max) {
      p.ammoT += dt;
      if (p.ammoT >= clip.regen) {
        p.ammoT -= clip.regen;
        p.ammo++;
      }
    }
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
    } else {
      p.vx = a.x * speed;
      p.vy = a.y * speed;
    }
    const decay = Math.exp(-10 * dt);
    const mv = this.arena.move(p.x, p.y, (p.vx + p.kx) * dt, (p.vy + p.ky) * dt, p.r);
    p.x = mv.x;
    p.y = mv.y;
    p.kx *= decay;
    p.ky *= decay;

    if (p.swing) this.updateSwing(dt);
    if (p.whirlT > 0) this.updateWhirl(dt);

    if (inp.consume('dodge') && p.dodgeCd <= 0) {
      // Dodging cancels a swing's recovery — but not a committed windup.
      if (!p.swing || p.swing.t > p.swing.s.windup) {
        p.swing = null;
        p.dodgeDir = p.moving ? Math.atan2(a.y, a.x) : p.face + Math.PI;
        p.dodgeT = 0.2;
        p.iframes = Math.max(p.iframes, 0.32);
        p.dodgeCd = 0.7;
        this.log.dodges++;
        this.audio.play('dodge');
      }
    }
    if (inp.consume('attack')) p.atkBuffer = 0.25;
    const wantAttack = p.atkBuffer > 0 || inp.isHeld('attack');
    const loaded = p.ammo >= 1;
    if (wantAttack && this.canStrike() && p.restT <= 0 && loaded && p.dodgeT <= 0 && p.whirlT <= 0) {
      p.atkBuffer = 0;
      const combo = this.moves.combo;
      const idx = p.combo % combo.length;
      p.combo = idx + 1;
      this.startSwing(combo[idx], false, idx === combo.length - 1);
    }
    // Skills cancel whatever swing is in progress, so they always come out when pressed.
    if (inp.consume('skill') && p.skillCd <= 0 && p.dodgeT <= 0 && p.whirlT <= 0) this.skill();
    if (inp.consume('potion')) this.drinkPotion();
    if (inp.consume('run')) this.tryRun();
  }

  /** You can chain into the next strike once the current one is into its recovery. */
  private canStrike() {
    const sw = this.p.swing;
    if (!sw) return true;
    return sw.t >= sw.s.windup + sw.s.active + sw.s.recover * 0.35;
  }

  /** The enemy almost straight ahead of you (within AIM_ASSIST), if any. */
  aimTarget(): Enemy | null {
    const p = this.p;
    let best: Enemy | null = null, bd = AIM_ASSIST;
    for (const e of this.enemies) {
      if (e.dead || Math.hypot(e.x - p.x, e.y - p.y) - e.r > 220) continue;
      const d = Math.abs(angDiff(Math.atan2(e.y - e.r * 0.6 - (p.y - 10), e.x - p.x), p.face));
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  /** Where the next attack goes: the way you're facing, nudged onto an enemy that's nearly dead ahead. */
  private aim(): number {
    const e = this.aimTarget();
    return e ? Math.atan2(e.y - e.r * 0.6 - (this.p.y - 10), e.x - this.p.x) : this.p.face;
  }

  private startSwing(s: Strike, skill: boolean, finisher: boolean) {
    const p = this.p;
    const aim = this.aim();
    p.face = aim;
    p.swing = { s, t: 0, aim, id: ++this.hitCounter, prevAng: null, impacted: false, skill, trail: [], finisher: finisher && !skill };
    if (!skill) this.log.swings++;
    if (finisher && !skill) this.punch = Math.max(this.punch, 0.02);
  }

  private updateSwing(dt: number) {
    const p = this.p, sw = p.swing!, s = sw.s;
    const wasWindup = sw.t < s.windup;
    sw.t += dt;
    const total = s.windup + s.active + s.recover;
    const activeEnd = s.windup + s.active;
    if (wasWindup && sw.t >= s.windup) this.onActiveStart(sw);
    if (sw.t >= s.windup && sw.t - dt < activeEnd) {
      const ps = pose(sw, this.reach);
      if (s.lunge) {
        const step = (s.lunge / s.active) * dt;
        const mv = this.arena.move(p.x, p.y, Math.cos(sw.aim) * step, Math.sin(sw.aim) * step, p.r);
        p.x = mv.x;
        p.y = mv.y;
      }
      if (s.shape === 'arc') {
        sw.trail.push({ ang: ps.ang, t: this.t });
        if (sw.prevAng !== null) this.sweepHit(sw, sw.prevAng, ps.ang);
        sw.prevAng = ps.ang;
      } else if (s.shape === 'line') {
        const q = clamp01((sw.t - s.windup) / s.active);
        this.lineHit(sw, s.range * this.reach * easeOut(q), s.size * this.reach);
      }
    }
    if (s.shape === 'circle' && !sw.impacted && sw.t >= activeEnd) this.impact(sw);
    // Fire weapons leave a longer blazing trail.
    sw.trail = sw.trail.filter((k) => this.t - k.t < (this.el.hot ? 0.26 : 0.14));
    if (sw.t >= total) {
      p.swing = null;
      p.comboT = this.moves.window;
      // A full combo earns a short breather before the next one.
      if (sw.finisher) {
        p.restT = this.moves.rest;
        p.combo = 0;
      }
    }
  }

  private onActiveStart(sw: Swing) {
    const s = sw.s, p = this.p;
    const heavy = s.mult >= 1.5 || this.moves.combo[0].windup > 0.12;
    this.audio.play(s.shape === 'shot' ? 'shoot' : heavy ? 'heavy' : 'swing');
    if (s.shape === 'shot') {
      for (const off of s.shots ?? [0]) this.shoot(sw.aim + off, s.mult, s.size * (1 + this.tier * 0.06));
    }
    if (!sw.skill) {
      p.ammo = Math.max(0, p.ammo - 1);
      p.ammoT = -this.moves.ammo.delay;
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
    this.rings.push({ x: ix, y: iy, r0: 8, r1: radius * 1.2, t: 0, dur: 0.35, color: '255,245,220', width: 8 });
    this.fx.burst(ix, iy, '#c8b8a0', 14 + this.tier * 3, 200, { size: 5, life: 0.5 });
    this.fx.burst(ix, iy, this.el.colors[0], 6 + this.tier * 2, 160, { size: 4, star: true, life: 0.5 });
    this.addCrack(ix, iy, sw.aim, radius * 1.4);
    this.shakeAtLeast(s.shake * (1 + this.tier * 0.1));
    this.audio.play('boom');
    vibrate(30);
    if (s.wave) {
      const w = s.wave;
      const width = w.width * this.reach * (this.el.waveWidth ?? 1);
      this.waves.push({ x: ix, y: iy, dir: sw.aim, dist: 0, range: w.range * this.reach, width, speed: w.speed, mult: w.mult, id: ++this.hitCounter, spikeAt: 0 });
    }
    if (this.weapon.breath && !sw.skill) {
      // Dragon breath: a fan of fire rolls out from the slam, leaving the ground burning behind it.
      for (const off of [-0.5, -0.25, 0, 0.25, 0.5]) {
        this.waves.push({ x: ix, y: iy, dir: sw.aim + off, dist: 0, range: 150 * this.reach, width: 30, speed: 430, mult: 0.3, id: ++this.hitCounter, spikeAt: 0, fire: true });
      }
    }
    if (sw.skill) {
      // Quake: shockwaves burst out in every direction.
      const q = SKILL_DATA.quake.waves;
      for (let i = 0; i < q.count; i++) {
        const dir = sw.aim + (i / q.count) * TAU;
        this.waves.push({ x: ix, y: iy, dir, dist: 0, range: q.range * this.reach, width: q.width, speed: q.speed, mult: q.mult, id: ++this.hitCounter, spikeAt: 0 });
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
        if (w.fire) {
          // Dragonfire leaves burning ground rather than rock spikes.
          if (w.spikeAt % 30 < 15) this.flames.push({ x: sx + rand(-4, 4), y: sy + rand(-3, 3), r: 16 + rand(0, 6), t: 0, life: 1.6, tick: 0 });
          if (Math.random() < 0.6) this.fx.burst(sx, sy - 6, Math.random() < 0.5 ? '#ffb03a' : '#ff5a2a', 2, 70, { size: 4, grav: -120, life: 0.5 });
        } else {
          this.spikes.push({ x: sx + rand(-4, 4), y: sy + rand(-3, 3), t: 0, life: 0.5, size: w.width * rand(0.32, 0.45), tilt: rand(-0.3, 0.3) });
          if (Math.random() < 0.5) this.fx.burst(sx, sy, '#c8b8a0', 2, 90, { size: 3, life: 0.4 });
        }
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
    // Burning ground scorches whatever stands in it.
    for (const f of this.flames) {
      f.t += dt;
      f.tick -= dt;
      if (f.tick > 0) continue;
      f.tick = 0.4;
      for (const e of this.enemies) {
        if (e.dead || Math.hypot(e.x - f.x, (e.y - f.y) * 1.4) > f.r + e.r * 0.7) continue;
        const { dmg } = calcDamage(this.stats.atk, e.dfn, 0.15, 0);
        e.hp -= dmg;
        this.log.dealt += dmg;
        e.flash = 0.05;
        e.burn = Math.max(e.burn, 1);
        e.burnDmg = Math.max(e.burnDmg, 1);
        e.dotColor = BURN_COLOR;
        if (e.hp <= 0) this.kill(e);
      }
    }
    this.flames = this.flames.filter((f) => f.t < f.life);
    for (const z of this.zaps) z.t += dt;
    this.zaps = this.zaps.filter((z) => z.t < 0.18);
  }

  private skill() {
    const p = this.p;
    p.skillCd = SKILL_CD;
    this.log.skills++;
    p.swing = null;
    this.audio.play('skill');
    const ang = this.aim();
    const col = this.el.colors;
    switch (this.moves.skill) {
      case 'spin':
        this.startSwing(SKILL_DATA.spin, true, true);
        this.rings.push({ x: p.x, y: p.y - 10, r0: 20, r1: SKILL_DATA.spin.range * this.reach, t: 0, dur: 0.35, color: '255,255,200' });
        if (this.el.hot) {
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * TAU;
            this.fx.burst(p.x + Math.cos(a) * 80, p.y + Math.sin(a) * 60, col[i % 2], 2, 80, { size: 5, grav: -80, life: 0.6 });
          }
        }
        break;
      case 'whirl':
        p.whirlT = SKILL_DATA.whirl.dur;
        p.whirlTick = 0;
        p.whirlAng = ang;
        break;
      case 'quake':
        this.startSwing(SKILL_DATA.quake.strike, true, true);
        break;
      case 'nova':
        for (let i = 0; i < SKILL_DATA.nova.shots; i++) this.shoot(ang + (i / SKILL_DATA.nova.shots) * TAU, SKILL_DATA.nova.mult, SKILL_DATA.nova.size);
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
      p.whirlTick = SKILL_DATA.whirl.tick;
      const id = ++this.hitCounter;
      const range = SKILL_DATA.whirl.radius * this.reach;
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.x - p.x, e.y - e.r * 0.6 - (p.y - 10)) - e.r > range) continue;
        this.hitEnemy(e, SKILL_DATA.whirl.mult, Math.atan2(e.y - p.y, e.x - p.x), 160, 0.1, id, 0.02);
      }
      this.audio.play('swing');
    }
  }

  private shoot(ang: number, mult: number, r: number) {
    const p = this.p;
    this.projs.push({
      x: p.x + Math.cos(ang) * 16, y: p.y - 12 + Math.sin(ang) * 16,
      vx: Math.cos(ang) * 400, vy: Math.sin(ang) * 400, r,
      atk: 0, mult, owner: 'p', life: 1.2, color: this.weapon.trail ?? this.weapon.color ?? '#ccc', homing: this.el.homing,
    });
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
    this.log.potions++;
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
      this.finish({ result: 'run', hp: p.hp, xp: 0, drops: {}, defeated: [], log: this.log }, 0.5);
    } else {
      this.fx.text(p.x, p.y - 40, 'Blocked!', '#ffd0d0', 16);
      this.runCd = 1.5;
    }
  }

  private hitEnemy(e: Enemy, mult: number, ang: number, kb: number, stun = 0, strikeId = 0, hitstop = 0.035) {
    if (e.dead) return;
    this.hits++;
    const st = this.stats;
    const critChance = 0.08 + st.luck * 0.2 + (this.el.crit ?? 0);
    const { dmg, crit } = calcDamage(st.atk, e.dfn, mult, critChance);
    e.hp -= dmg;
    this.log.hits++;
    this.log.dealt += dmg;
    if (crit) this.log.crits++;
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
    const col = this.el.colors;
    this.sparks.push({ x: hx, y: hy, t: 0, size: (14 + this.tier * 3) * (heavy ? 1.35 : 1) * (crit ? 1.3 : 1), color: col[0], rot: Math.random() * TAU });
    this.fx.burst(hx, hy, '#ffffff', crit ? 9 : 5, 140, { size: 3 });
    if (this.tier >= 1) this.fx.burst(hx, hy, col[1], 2 + this.tier, 120, { size: 3, star: this.tier >= 3 });
    this.el.onHit?.(this, e, { dmg, crit, x: hx, y: hy, strikeId });
    this.audio.play(crit ? 'crit' : 'hit');
    this.hitstop = Math.max(this.hitstop, hitstop * (crit ? 1.4 : 1));
    this.shakeAtLeast((crit ? 5 : 3) * (heavy ? 1.6 : 1) * (1 + this.tier * 0.08));
    if (e.hp <= 0) this.kill(e);
  }

  /** Glimmer weapons: a spark leaps from the foe you hit to the nearest other one. */
  chain(from: Enemy) {
    let best: Enemy | null = null, bd = 130;
    for (const o of this.enemies) {
      if (o === from || o.dead) continue;
      const d = Math.hypot(o.x - from.x, o.y - from.y);
      if (d < bd) { bd = d; best = o; }
    }
    if (!best) return;
    const { dmg } = calcDamage(this.stats.atk, best.dfn, 0.5, 0);
    best.hp -= dmg;
    best.flash = 0.1;
    this.log.dealt += dmg;
    this.zaps.push({ x1: from.x, y1: from.y - from.r, x2: best.x, y2: best.y - best.r, t: 0 });
    this.fx.text(best.x, best.y - best.r * 2, `${dmg}`, '#e8d8ff', 15);
    this.fx.burst(best.x, best.y - best.r, '#f0e0ff', 8, 120, { star: true, size: 3 });
    if (best.hp <= 0) this.kill(best);
  }

  dragonBurst(x: number, y: number, skip: Enemy) {
    this.rings.push({ x, y, r0: 10, r1: 55, t: 0, dur: 0.3, color: '255,140,60', width: 7 });
    this.fx.burst(x, y - 10, '#ff7a3a', 16, 180, { size: 6, grav: -120, life: 0.6 });
    this.fx.burst(x, y - 10, '#ffd35a', 8, 120, { size: 5, star: true });
    for (const o of this.enemies) {
      if (o === skip || o.dead) continue;
      if (Math.hypot(o.x - x, o.y - y) > 55 + o.r) continue;
      const { dmg } = calcDamage(this.stats.atk, o.dfn, 0.5, 0);
      o.hp -= dmg;
      this.log.dealt += dmg;
      o.flash = 0.1;
      o.burn = 1.6;
      o.dotColor = BURN_COLOR;
      o.burnDmg = Math.max(1, Math.round(dmg * 0.12));
      this.fx.text(o.x, o.y - o.r * 2, `${dmg}`, '#ffb03a', 15);
      if (o.hp <= 0) this.kill(o);
    }
  }

  /** Defeats a foe: its burst, XP and drops (a guardian's helpers scatter with it). The e2e test calls it too. */
  kill(e: Enemy) {
    e.dead = true;
    e.hp = 0;
    e.deathT = 0.45;
    e.windup = 0;
    e.burn = 0;
    this.fx.burst(e.x, e.y - e.r * 0.7, e.golden ? '#ffd84a' : MONSTER_AI[e.kind].color, 18, 180, { size: 5 });
    this.fx.burst(e.x, e.y - e.r * 0.7, '#fff6a0', 8, 120, { star: true, size: 5, grav: -30 });
    this.audio.play('kill');
    this.xp += e.xp;
    this.defeated.push(e.def.name);
    const d = rollDrops(e.def, this.stats.luck, e.golden);
    cloverPity(this.save, e.def, d);
    mergeDrops(this.drops, d);
    let i = 0;
    for (const m in d) this.fx.text(e.x + (i++ - 0.5) * 18, e.y - e.r * 2.6, MATS[m as MatId].icon, '#fff', 18);
    if (e.def.boss) {
      for (const m of this.enemies) if (m.minion && !m.dead) this.kill(m);
      this.shake = 20;
      this.audio.play('boom');
      for (let k = 0; k < 4; k++) this.fx.burst(e.x + rand(-40, 40), e.y - rand(20, 90), '#ffb03a', 20, 220, { size: 6 });
    }
  }

  private hurtPlayer(atk: number, mult: number, fx: number, fy: number) {
    const p = this.p;
    if (p.iframes > 0 || p.dodgeT > 0 || this.endT >= 0) return;
    const { dmg } = calcDamage(atk, this.stats.def, mult, 0.04);
    p.hp -= dmg;
    this.log.taken += dmg;
    p.iframes = 0.8;
    p.hurtT = 0.25;
    const ang = Math.atan2(p.y - fy, p.x - fx);
    p.kx = Math.cos(ang) * 240;
    p.ky = Math.sin(ang) * 240;
    this.fx.text(p.x, p.y - 42, `-${dmg}`, '#ff6a7a', 18);
    this.fx.burst(p.x, p.y - 14, '#ff8a9a', 8, 140, { size: 3 });
    this.audio.play('hurt');
    vibrate(40);
    this.shakeAtLeast(7);
    this.hitstop = 0.05;
    if (p.hp <= 0) p.hp = 0;
  }

  private finish(o: BattleOutcome, delay: number) {
    if (this.endT >= 0) return;
    this.log.time = Math.max(0, this.t);
    o.log = this.log;
    this.outcome = o;
    this.endT = delay;
  }

  private checkEnd() {
    if (this.endT >= 0) return;
    if (this.p.hp <= 0) {
      this.audio.play('lose');
      this.finish({ result: 'lose', hp: 0, xp: 0, drops: {}, defeated: this.defeated, log: this.log }, 1.4);
    } else if (this.enemies.every((e) => e.dead)) {
      this.audio.play('victory');
      this.finish({ result: 'win', hp: this.p.hp, xp: this.xp, drops: this.drops, defeated: this.defeated, log: this.log }, 1.1);
    }
  }

  // ---------------------------------------------------------------- enemies

  private updateEnemy(e: Enemy, dt: number) {
    if (e.dead) return;
    const p = this.p, ai = MONSTER_AI[e.kind];
    e.flash -= dt;
    e.squash = Math.max(0, e.squash - dt);
    if (e.burn > 0) {
      e.burn -= dt;
      e.burnTick -= dt;
      if (e.burnTick <= 0) {
        e.burnTick = 0.4;
        e.hp -= e.burnDmg;
        this.log.dealt += e.burnDmg;
        e.flash = 0.05;
        this.fx.text(e.x + rand(-8, 8), e.y - e.r * 2 - e.z, `${e.burnDmg}`, e.dotColor === BURN_COLOR ? '#ffb03a' : '#b8f08a', 13);
        if (e.hp <= 0) {
          this.kill(e);
          return;
        }
      }
    }
    const decay = Math.exp(-8 * dt);
    const kb = this.arena.move(e.x, e.y, e.kx * dt, e.ky * dt, e.r);
    e.x = kb.x;
    e.y = kb.y;
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
      const rage = e.def.boss && e.hp < e.maxHp * 0.5 ? 0.72 : 1;
      ai.think(e, this, dt, dist, toP, rage);
    }
    // Stay in the arena; charging enemies bounce off walls (and trees).
    // Jelly slows movement (not the AI's plans, so hops still land where they meant to, just later).
    e.slow = Math.max(0, e.slow - dt);
    const sl = e.slow > 0 ? 0.55 : 1;
    const mv = this.arena.move(e.x, e.y, e.vx * dt * sl, e.vy * dt * sl, e.r);
    const bounced = mv.hitX || mv.hitY;
    e.x = mv.x;
    e.y = mv.y;
    if (Math.abs(e.vx) > 5) e.face = Math.sign(e.vx);
    else if (Math.abs(dx) > 4) e.face = Math.sign(dx);
    const fast = e.state === 'charge' || e.state === 'dash' || e.state === 'swoop';
    if (bounced && fast) {
      const n = this.arena.normal(e.x, e.y);
      const dot = e.vx * n.x + e.vy * n.y;
      e.vx -= 2 * dot * n.x;
      e.vy -= 2 * dot * n.y;
      this.shakeAtLeast(e.def.boss ? 8 : 2);
    }
    // Contact damage (slimes mid-hop sail over you).
    const airborne = ai.hops && e.z > 10;
    if (!airborne && Math.hypot(p.x - e.x, p.y - e.y) < p.r + e.r * 0.85) {
      this.hurtPlayer(e.atk, (e.def.boss ? 0.8 : 1) * (fast ? 1.2 : 1), e.x, e.y);
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
      if (pr.homing) {
        // Swerve toward the nearest foe ahead (up to ~3 radians a second).
        let best: Enemy | null = null, bd = 260;
        for (const e of this.enemies) {
          if (e.dead) continue;
          const d = Math.hypot(e.x - pr.x, e.y - pr.y);
          if (d < bd) { bd = d; best = e; }
        }
        if (best) {
          const want = Math.atan2(best.y - best.r * 0.7 - pr.y, best.x - pr.x), cur = Math.atan2(pr.vy, pr.vx);
          const turn = Math.max(-3 * dt, Math.min(3 * dt, angDiff(want, cur)));
          const sp = Math.hypot(pr.vx, pr.vy);
          pr.vx = Math.cos(cur + turn) * sp;
          pr.vy = Math.sin(cur + turn) * sp;
        }
      }
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.life -= dt;
      if (!this.arena.inside(pr.x, pr.y, 40)) pr.life = 0;
      if (pr.life <= 0) continue;
      if (Math.random() < 0.4) this.fx.burst(pr.x, pr.y, pr.color, 1, 20, { size: pr.r * 0.4, grav: 0, life: 0.3 });
      if (pr.owner === 'e') {
        if (Math.hypot(pr.x - p.x, pr.y - (p.y - 10)) < pr.r + p.r) {
          if (p.iframes <= 0 && p.dodgeT <= 0) {
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
        this.shakeAtLeast(8);
        this.audio.play('boom');
      }
    }
    this.hazards = this.hazards.filter((h) => h.t < h.delay + 0.1);
  }
}
