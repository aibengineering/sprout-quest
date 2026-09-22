// Real-time arena battles. Units are "arena pixels"; the arena is a circle of radius ARENA_R centered at (0, 0).
import type { Audio } from './audio';
import { vibrate } from './audio';
import { GEAR, MATS, MONSTERS, POTION_HEAL, type MatId, type MonsterDef, type MonsterKind, type Style, type Zone } from './data';
import { Fx } from './fx';
import type { Input } from './input';
import { calcDamage, mergeDrops, playerStats, rollDrops, scaleMonster, type PlayerStats } from './rules';
import { drawMonster, drawPlayer, drawWeapon, rrect } from './sprites';
import type { SaveState } from './state';
import { hash2 } from './world';

const TAU = Math.PI * 2;
export const ARENA_R = 210;

const WEAPONS: Record<Style, { range: number; arc: number; cd: number; mult: number; kb: number }> = {
  sword: { range: 58, arc: 2.0, cd: 0.34, mult: 1, kb: 170 },
  spear: { range: 88, arc: 0.75, cd: 0.42, mult: 1.1, kb: 130 },
  wand: { range: 0, arc: 0, cd: 0.36, mult: 0.85, kb: 70 },
  hammer: { range: 70, arc: TAU, cd: 0.75, mult: 1.5, kb: 280 },
};
const SKILL_CD = 4.5;

export const SKILL_NAMES: Record<Style, string> = { sword: 'Spin', spear: 'Lunge', wand: 'Nova', hammer: 'Quake' };

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
}

interface Proj {
  x: number; y: number; vx: number; vy: number; r: number;
  atk: number; mult: number; owner: 'p' | 'e'; life: number; color: string;
}

interface Hazard { x: number; y: number; r: number; t: number; delay: number; atk: number; mult: number; done: boolean }
interface Ring { x: number; y: number; r0: number; r1: number; t: number; dur: number; color: string }
interface Swing { t: number; dur: number; angle: number; arc: number; range: number; spin: boolean }

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

export class Battle {
  t = 0;
  intro = 1.2;
  private endT = -1;
  private done = false;
  private outcome: BattleOutcome | null = null;
  readonly stats: PlayerStats;
  readonly p = {
    x: 0, y: 120, vx: 0, vy: 0, kx: 0, ky: 0, r: 12,
    hp: 0, face: -Math.PI / 2, moving: false,
    atkCd: 0, atkBuffer: 0, skillCd: 1, dodgeCd: 0, dodgeT: 0, dodgeDir: 0, iframes: 0, hurtT: 0,
    lungeT: 0, lungeDir: 0, lungeId: 0, potionCd: 0, regenAcc: 0,
    swing: null as Swing | null,
  };
  enemies: Enemy[] = [];
  private projs: Proj[] = [];
  private hazards: Hazard[] = [];
  private rings: Ring[] = [];
  private fx = new Fx();
  private shake = 0;
  private hitstop = 0;
  private runCd = 0;
  private xp = 0;
  private drops: Partial<Record<MatId, number>> = {};
  private defeated: string[] = [];
  private hitCounter = 1;
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
    this.weaponColor = GEAR[save.equip.weapon]?.color ?? '#ccc';
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
    for (const r of this.rings) r.t += dt;
    this.rings = this.rings.filter((r) => r.t < r.dur);
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
    this.updateHazards(dt);
    this.checkEnd();
  }

  // ---------------------------------------------------------------- player

  private updatePlayer(dt: number) {
    const p = this.p, st = this.stats, inp = this.input;
    p.atkCd -= dt; p.skillCd -= dt; p.dodgeCd -= dt; p.iframes -= dt; p.hurtT -= dt;
    p.potionCd -= dt; p.atkBuffer -= dt; this.runCd -= dt;
    if (p.swing) {
      p.swing.t += dt;
      if (p.swing.t >= p.swing.dur) p.swing = null;
    }
    if (st.regen && p.hp < st.maxHp) {
      p.regenAcc += st.regen * dt;
      if (p.regenAcc >= 1) {
        p.hp = Math.min(st.maxHp, p.hp + Math.floor(p.regenAcc));
        p.regenAcc %= 1;
      }
    }
    const a = inp.axis();
    p.moving = Math.hypot(a.x, a.y) > 0.1;
    if (p.moving && !p.swing) p.face = Math.atan2(a.y, a.x);
    const speed = 150 * (1 + st.spd / 100);
    if (p.dodgeT > 0) {
      p.dodgeT -= dt;
      p.vx = Math.cos(p.dodgeDir) * speed * 3;
      p.vy = Math.sin(p.dodgeDir) * speed * 3;
      if (Math.random() < 0.6) this.fx.burst(p.x, p.y - 4, 'rgba(255,255,255,0.8)', 1, 30, { size: 4, grav: 0, life: 0.3 });
    } else if (p.lungeT > 0) {
      p.lungeT -= dt;
      p.vx = Math.cos(p.lungeDir) * speed * 4.5;
      p.vy = Math.sin(p.lungeDir) * speed * 4.5;
      for (const e of this.enemies) {
        if (e.dead || e.hitId === p.lungeId) continue;
        if (Math.hypot(e.x - p.x, e.y - e.r * 0.6 - (p.y - 10)) < e.r + 26) {
          e.hitId = p.lungeId;
          this.hitEnemy(e, 2.0, p.lungeDir, 200);
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
    const d = Math.hypot(p.x, p.y);
    const maxD = ARENA_R - p.r;
    if (d > maxD) {
      p.x *= maxD / d;
      p.y *= maxD / d;
    }

    if (inp.consume('dodge') && p.dodgeCd <= 0 && p.lungeT <= 0) {
      p.dodgeDir = p.moving ? Math.atan2(a.y, a.x) : p.face + Math.PI;
      p.dodgeT = 0.2;
      p.iframes = Math.max(p.iframes, 0.32);
      p.dodgeCd = 0.7;
      this.audio.play('dodge');
    }
    if (inp.consume('attack')) p.atkBuffer = 0.18;
    if ((p.atkBuffer > 0 || inp.isHeld('attack')) && p.atkCd <= 0 && p.dodgeT <= 0) {
      p.atkBuffer = 0;
      this.attack();
    }
    if (inp.consume('skill') && p.skillCd <= 0 && p.dodgeT <= 0) this.skill();
    if (inp.consume('potion')) this.drinkPotion();
    if (inp.consume('run')) this.tryRun();
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

  private attack() {
    const p = this.p, st = this.stats, W = WEAPONS[st.style];
    const ang = this.aim();
    p.face = ang;
    p.atkCd = W.cd;
    p.swing = { t: 0, dur: Math.min(0.28, W.cd * 0.8), angle: ang, arc: W.arc, range: W.range, spin: false };
    if (st.style === 'wand') {
      this.shoot(ang, W.mult);
      this.audio.play('shoot');
      return;
    }
    this.audio.play('swing');
    this.arcHit(ang, W.arc, W.range, W.mult, W.kb, 0);
    if (st.style === 'hammer') {
      this.rings.push({ x: p.x, y: p.y, r0: 10, r1: W.range + 10, t: 0, dur: 0.3, color: '255,255,255' });
      this.shake = Math.max(this.shake, 4);
    }
  }

  private shoot(ang: number, mult: number) {
    const p = this.p;
    this.projs.push({
      x: p.x + Math.cos(ang) * 14, y: p.y - 12 + Math.sin(ang) * 14,
      vx: Math.cos(ang) * 380, vy: Math.sin(ang) * 380, r: 7,
      atk: 0, mult, owner: 'p', life: 1.2, color: this.weaponColor,
    });
  }

  private arcHit(ang: number, arc: number, range: number, mult: number, kb: number, stun: number) {
    const p = this.p;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const ex = e.x - p.x, ey = e.y - e.r * 0.6 - (p.y - 10);
      const d = Math.hypot(ex, ey) - e.r;
      if (d > range) continue;
      if (arc < TAU) {
        let diff = Math.atan2(ey, ex) - ang;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        // Enemies hugging the player always count, even if slightly outside the arc.
        if (Math.abs(diff) > arc / 2 && d > 6) continue;
      }
      this.hitEnemy(e, mult, Math.atan2(ey, ex), kb, stun);
    }
  }

  private skill() {
    const p = this.p, st = this.stats;
    p.skillCd = SKILL_CD;
    this.audio.play('skill');
    const ang = this.aim();
    switch (st.style) {
      case 'sword':
        p.swing = { t: 0, dur: 0.35, angle: ang, arc: TAU, range: 95, spin: true };
        this.arcHit(ang, TAU, 95, 1.6, 240, 0.3);
        this.rings.push({ x: p.x, y: p.y - 10, r0: 20, r1: 100, t: 0, dur: 0.3, color: '255,255,200' });
        break;
      case 'spear':
        p.lungeT = 0.22;
        p.lungeDir = ang;
        p.lungeId = ++this.hitCounter;
        p.iframes = Math.max(p.iframes, 0.35);
        p.face = ang;
        p.swing = { t: 0, dur: 0.25, angle: ang, arc: 0.3, range: 90, spin: false };
        break;
      case 'wand':
        for (let i = 0; i < 12; i++) this.shoot(ang + (i / 12) * TAU, 1.1);
        this.rings.push({ x: p.x, y: p.y - 10, r0: 10, r1: 60, t: 0, dur: 0.3, color: '160,230,255' });
        break;
      case 'hammer':
        p.swing = { t: 0, dur: 0.3, angle: ang, arc: TAU, range: 150, spin: false };
        this.arcHit(ang, TAU, 150, 2.2, 320, 1.3);
        this.rings.push({ x: p.x, y: p.y, r0: 20, r1: 160, t: 0, dur: 0.45, color: '255,200,120' });
        this.fx.burst(p.x, p.y, '#b8a080', 24, 220, { size: 5 });
        this.shake = 12;
        this.audio.play('boom');
        break;
    }
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

  private hitEnemy(e: Enemy, mult: number, ang: number, kb: number, stun = 0) {
    if (e.dead) return;
    const st = this.stats;
    const { dmg, crit } = calcDamage(st.atk, e.dfn, mult, 0.08 + st.luck * 0.2);
    e.hp -= dmg;
    e.flash = 0.12;
    const kbk = e.def.boss ? 0.12 : 1;
    e.kx += Math.cos(ang) * kb * kbk;
    e.ky += Math.sin(ang) * kb * kbk;
    if (stun) e.stun = Math.max(e.stun, e.def.boss ? stun * 0.3 : stun);
    this.fx.text(e.x, e.y - e.r * 2 - e.z, crit ? `${dmg}!` : `${dmg}`, crit ? '#ffd84a' : '#ffffff', crit ? 22 : 17);
    this.fx.burst(e.x, e.y - e.r * 0.8 - e.z, '#ffffff', crit ? 9 : 5, 140, { size: 3 });
    this.audio.play(crit ? 'crit' : 'hit');
    this.hitstop = Math.max(this.hitstop, crit ? 0.07 : 0.035);
    this.shake = Math.max(this.shake, crit ? 6 : 3);
    if (e.hp <= 0) this.kill(e);
  }

  private kill(e: Enemy) {
    e.dead = true;
    e.hp = 0;
    e.deathT = 0.45;
    e.windup = 0;
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
            this.hitEnemy(e, pr.mult, Math.atan2(pr.vy, pr.vx), WEAPONS.wand.kb);
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
    const { k, cx, cy } = this.layout(vw, vh);
    ctx.fillStyle = th.outside;
    ctx.fillRect(0, 0, vw, vh);
    const sx = (Math.random() - 0.5) * this.shake, sy = (Math.random() - 0.5) * this.shake;
    ctx.save();
    ctx.translate(cx + sx, cy + sy);
    ctx.scale(k, k);
    this.drawArena(ctx, vw / k, vh / k);

    // Telegraphed danger zones
    for (const h of this.hazards) {
      const prog = Math.min(1, h.t / h.delay);
      ctx.fillStyle = `rgba(255,70,60,${0.12 + prog * 0.12})`;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = `rgba(255,70,60,${0.25})`;
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
      ctx.strokeStyle = `rgba(${r.color},${1 - q})`;
      ctx.lineWidth = 6 * (1 - q) + 1;
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, r.r0 + (r.r1 - r.r0) * q, (r.r0 + (r.r1 - r.r0) * q) * 0.6, 0, 0, TAU);
      ctx.stroke();
    }
    this.fx.draw(ctx);
    ctx.restore();

    this.drawOverlay(ctx, vw, vh);
  }

  private drawArena(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const th = this.setup.zone.theme;
    const R = ARENA_R;
    // Scenery tufts outside the ring.
    ctx.fillStyle = th.grass;
    for (let i = 0; i < 90; i++) {
      const x = (hash2(i, 1, 3) - 0.5) * w * 1.1, y = (hash2(i, 2, 3) - 0.5) * h * 1.1;
      if (Math.hypot(x, y) < R + 30) continue;
      const sway = Math.sin(this.t * 2 + i) * 2;
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
    if (e.golden && !e.dead && Math.random() < 0.15) this.fx.burst(e.x + rand(-e.r, e.r), e.y - rand(0, e.r * 2), '#fff6a0', 1, 20, { star: true, size: 3, grav: -20 });
    if (e.stun > 0 && !e.dead) {
      for (let i = 0; i < 3; i++) {
        const a = this.t * 5 + (i / 3) * TAU;
        ctx.fillStyle = '#ffe04a';
        ctx.beginPath();
        ctx.arc(e.x + Math.cos(a) * e.r * 0.8, e.y - e.r * 2.2 + Math.sin(a) * 4, 3, 0, TAU);
        ctx.fill();
      }
    }
    if (!e.dead && !e.def.boss && e.hp < e.maxHp) {
      const w = Math.max(26, e.r * 2), y = e.y - e.r * 2.4 - e.z - 6;
      ctx.fillStyle = 'rgba(40,20,50,0.7)';
      rrect(ctx, e.x - w / 2 - 1.5, y - 1.5, w + 3, 7, 3.5);
      ctx.fill();
      ctx.fillStyle = e.hp / e.maxHp > 0.3 ? '#7aee8a' : '#ff6a6a';
      rrect(ctx, e.x - w / 2, y, w * (e.hp / e.maxHp), 4, 2);
      ctx.fill();
    }
  }

  private drawHero(ctx: CanvasRenderingContext2D) {
    const p = this.p, st = this.stats;
    const blink = p.iframes > 0 && p.dodgeT <= 0 && p.lungeT <= 0 && Math.floor(this.t * 20) % 2 === 0;
    const cosF = Math.cos(p.face);
    const handX = p.x + (cosF >= 0 ? 9 : -9), handY = p.y - 11;
    let wAng = cosF >= 0 ? -1.0 : Math.PI + 1.0;
    let wx = handX, wy = handY;
    const sw = p.swing;
    if (sw) {
      const q = Math.min(1, sw.t / sw.dur);
      const ease = 1 - (1 - q) * (1 - q);
      if (st.style === 'spear' || st.style === 'wand') {
        wAng = sw.angle;
        const push = Math.sin(q * Math.PI) * (st.style === 'spear' ? 16 : 6);
        wx += Math.cos(sw.angle) * push;
        wy += Math.sin(sw.angle) * push;
      } else if (sw.spin || sw.arc >= TAU) {
        wAng = sw.angle + ease * TAU;
      } else {
        wAng = sw.angle - sw.arc / 2 + ease * sw.arc;
      }
      // Slash trail
      if (st.style !== 'wand' && st.style !== 'spear') {
        ctx.fillStyle = `rgba(255,255,255,${0.4 * (1 - q)})`;
        ctx.beginPath();
        const arc = sw.arc >= TAU ? TAU : sw.arc;
        const a0 = sw.arc >= TAU ? 0 : sw.angle - arc / 2;
        ctx.moveTo(p.x, p.y - 10);
        ctx.arc(p.x, p.y - 10, sw.range + 6, a0, a0 + arc * ease);
        ctx.closePath();
        ctx.fill();
      } else if (st.style === 'spear') {
        ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - q)})`;
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 10);
        ctx.lineTo(p.x + Math.cos(sw.angle) * (sw.range + 4), p.y - 10 + Math.sin(sw.angle) * (sw.range + 4));
        ctx.stroke();
      }
    }
    const behind = Math.sin(wAng) < -0.2;
    const alpha = blink ? 0.35 : 1;
    ctx.globalAlpha = alpha;
    if (behind) drawWeapon(ctx, st.style, wx, wy, wAng, 12, this.weaponColor);
    drawPlayer(ctx, p.x, p.y, 12, {
      t: this.t, moving: p.moving, face: p.face, armor: this.armorColor, hurt: p.hurtT > 0,
      squash: p.dodgeT > 0 ? 1.25 : 1, alpha,
    });
    ctx.globalAlpha = alpha;
    if (!behind) drawWeapon(ctx, st.style, wx, wy, wAng, 12, this.weaponColor);
    ctx.globalAlpha = 1;
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
