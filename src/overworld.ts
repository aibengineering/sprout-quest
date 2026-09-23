// Overworld: walking around, tall-grass encounters and drawing the tile map.
import { GEAR, MONSTERS, ZONES, zoneAtX, type Theme, type Zone } from './data';
import { currentQuest } from './quests';
import { drawFrame, drawHero, frame } from './assets';
import { Fx } from './fx';
import type { Input } from './input';
import { drawPlayer, rrect, shadow } from './sprites';
import type { SaveState } from './state';
import { hash2, T, type World, type WorldObj } from './world';

const TAU = Math.PI * 2;
const ENCOUNTER_CHANCE = 0.11;
/** Map tiles are 1.6 Blender units wide. */
const TILE_BU = 1.6;

export type WorldEvent = { type: 'encounter' } | { type: 'zone'; zone: Zone } | null;

export class Overworld {
  x: number;
  y: number;
  face = Math.PI / 2;
  moving = false;
  t = 0;
  alert = 0;
  private stepAcc = 0;
  private grace = 3;
  private zone: Zone;
  private fx = new Fx();
  ts = 40;
  /** Current goal's location in tiles; drawn as a bouncing waypoint arrow. */
  objective: { x: number; y: number } | null = null;

  constructor(private world: World, private save: SaveState) {
    this.x = save.pos.x;
    this.y = save.pos.y;
    // Recover from a stale save position that's now inside a wall.
    if (world.blocked(this.x, this.y, 0.28)) {
      const p = world.entryPoint('village');
      this.x = p.x;
      this.y = p.y;
    }
    this.zone = world.zoneAt(this.x);
  }

  get currentZone(): Zone {
    return this.zone;
  }

  teleport(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.grace = 3;
    this.zone = this.world.zoneAt(x);
  }

  /** Steps of safety after battles so you aren't immediately re-ambushed. */
  resetGrace(steps = 3) {
    this.grace = steps;
    this.stepAcc = 0;
  }

  nearbyObject(): WorldObj | null {
    return this.world.nearestObj(this.x, this.y - 0.2, 1.4);
  }

  update(dt: number, input: Input, frozen: boolean): WorldEvent {
    this.t += dt;
    this.fx.update(dt);
    if (this.alert > 0) {
      this.alert -= dt;
      this.moving = false;
      return null;
    }
    if (frozen) {
      this.moving = false;
      return null;
    }
    const a = input.axis();
    const mag = Math.hypot(a.x, a.y);
    this.moving = mag > 0.1;
    if (!this.moving) return null;
    this.face = Math.atan2(a.y, a.x);
    const spdBonus = (GEAR[this.save.equip.armor]?.spd ?? 0) + (this.save.equip.charm ? GEAR[this.save.equip.charm]?.spd ?? 0 : 0);
    const speed = 5 * (1 + spdBonus / 100);
    const dx = a.x * speed * dt, dy = a.y * speed * dt;
    const r = 0.28;
    const ox = this.x, oy = this.y;
    if (!this.world.blocked(this.x + dx, this.y, r)) this.x += dx;
    if (!this.world.blocked(this.x, this.y + dy, r)) this.y += dy;
    const moved = Math.hypot(this.x - ox, this.y - oy);

    let ev: WorldEvent = null;
    const z = this.world.zoneAt(this.x);
    if (z !== this.zone) {
      this.zone = z;
      ev = { type: 'zone', zone: z };
    }

    const onGrass = this.world.tile(Math.floor(this.x), Math.floor(this.y - 0.1)) === T.GRASS;
    if (onGrass && moved > 0) {
      if (Math.random() < 0.25) {
        this.fx.burst(this.x * this.ts, (this.y - 0.1) * this.ts, this.zone.theme.grassTip, 2, this.ts * 1.5, { size: this.ts * 0.06, life: 0.4 });
      }
      this.stepAcc += moved;
      while (this.stepAcc >= 1) {
        this.stepAcc -= 1;
        if (this.grace > 0) this.grace--;
        else if (this.zone.monsters.length && Math.random() < ENCOUNTER_CHANCE) {
          this.alert = 0.55;
          this.moving = false;
          this.stepAcc = 0;
          return { type: 'encounter' };
        }
      }
    }
    return ev;
  }

  render(ctx: CanvasRenderingContext2D, vw: number, vh: number) {
    const ts = (this.ts = Math.round(Math.max(32, Math.min(60, Math.min(vw, vh) / 9.5))));
    const W = this.world;
    const mapW = W.w * ts, mapH = W.h * ts;
    let camX = this.x * ts - vw / 2;
    let camY = (this.y - 0.5) * ts - vh / 2;
    camX = mapW <= vw ? (mapW - vw) / 2 : Math.max(0, Math.min(mapW - vw, camX));
    camY = mapH <= vh ? (mapH - vh) / 2 : Math.max(0, Math.min(mapH - vh, camY));
    camX = Math.round(camX);
    camY = Math.round(camY);

    ctx.fillStyle = this.zone.theme.outside;
    ctx.fillRect(0, 0, vw, vh);
    ctx.save();
    ctx.translate(-camX, -camY);

    const x0 = Math.max(0, Math.floor(camX / ts) - 1), x1 = Math.min(W.w - 1, Math.ceil((camX + vw) / ts) + 1);
    const y0 = Math.max(0, Math.floor(camY / ts) - 1), y1 = Math.min(W.h - 1, Math.ceil((camY + vh) / ts) + 2);

    // Ground layer
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const th = zoneAtX(x).theme;
        const t = W.tile(x, y);
        const px = x * ts, py = y * ts;
        ctx.fillStyle = hash2(x, y, 1) < 0.5 ? th.ground : th.ground2;
        ctx.fillRect(px, py, ts + 1, ts + 1);
        if (t === T.PATH) this.drawPath(ctx, x, y, px, py, ts, th);
        else if (t === T.POOL) this.drawPool(ctx, x, y, px, py, ts, th);
        else if (t === T.GRASS) this.drawGrass(ctx, x, y, px, py, ts, th);
        else if (t === T.DECOR) this.drawDecor(ctx, x, y, px, py, ts, th);
      }
    }

    // Y-sorted: obstacles, buildings and the hero
    const items: { y: number; draw: () => void }[] = [];
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++)
        if (W.tile(x, y) === T.OBST) {
          const th = zoneAtX(x).theme;
          items.push({ y: y + 0.9, draw: () => this.drawObstacle(ctx, x, y, ts, th) });
        }
    for (const o of W.objs) {
      if (o.x + o.w < x0 - 2 || o.x > x1 + 2) continue;
      items.push({ y: o.y + o.h, draw: () => this.drawObj(ctx, o, ts) });
    }
    items.push({ y: this.y, draw: () => this.drawHero(ctx, ts) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();

    this.fx.draw(ctx);
    if (this.objective) this.drawObjective(ctx, camX, camY, vw, vh, ts);

    // Interaction hint bubble
    const near = this.nearbyObject();
    if (near && this.alert <= 0) {
      const bx = (near.x + near.w / 2) * ts, by = near.y * ts - ts * 0.3 + Math.sin(this.t * 4) * 3;
      ctx.font = `900 ${Math.round(ts * 0.4)}px ui-rounded, "Nunito", system-ui, sans-serif`;
      const label = near.label;
      const tw = ctx.measureText(label).width + ts * 0.4;
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      rrect(ctx, bx - tw / 2, by - ts * 0.5, tw, ts * 0.55, ts * 0.2);
      ctx.fill();
      ctx.fillStyle = '#5a3a6a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, bx, by - ts * 0.22);
    }
    ctx.restore();
  }

  /** A golden arrow over the goal, or pinned to the screen edge pointing toward it when it's off-screen. */
  private drawObjective(ctx: CanvasRenderingContext2D, camX: number, camY: number, vw: number, vh: number, ts: number) {
    const o = this.objective!;
    const wx = o.x * ts, wy = o.y * ts;
    const sx = wx - camX, sy = wy - camY;
    const top = 130, bottom = vh - 150, left = 30, right = vw - 30;
    const bounce = Math.abs(Math.sin(this.t * 4)) * ts * 0.18;
    const arrow = (x: number, y: number, ang: number, size: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(size * 0.6, 0);
      ctx.lineTo(-size * 0.4, -size * 0.5);
      ctx.lineTo(-size * 0.2, 0);
      ctx.lineTo(-size * 0.4, size * 0.5);
      ctx.closePath();
      ctx.fillStyle = '#ffd35a';
      ctx.strokeStyle = '#6a3a5a';
      ctx.lineWidth = size * 0.1;
      ctx.lineJoin = 'round';
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };
    if (sx > left && sx < right && sy > top - ts && sy < bottom) {
      // On screen: bob above the target.
      const ay = wy - ts * 1.9 - bounce;
      ctx.fillStyle = 'rgba(255,211,90,0.25)';
      ctx.beginPath();
      ctx.ellipse(wx, wy, ts * (0.5 + 0.1 * Math.sin(this.t * 4)), ts * 0.22, 0, 0, TAU);
      ctx.fill();
      arrow(wx, ay, Math.PI / 2, ts * 0.7);
      return;
    }
    // Off screen: pin to the edge, pointing the way.
    const cx = vw / 2, cy = (top + bottom) / 2;
    const dx = sx - cx, dy = sy - cy;
    const k = Math.min((dx > 0 ? right - cx : left - cx) / (dx || 1e-6), (dy > 0 ? bottom - cy : top - cy) / (dy || 1e-6));
    const ex = cx + dx * Math.abs(k), ey = cy + dy * Math.abs(k);
    const ang = Math.atan2(dy, dx);
    const pulse = 1 + Math.sin(this.t * 5) * 0.08;
    ctx.fillStyle = 'rgba(74,42,90,0.55)';
    ctx.beginPath();
    ctx.arc(camX + ex, camY + ey, ts * 0.55 * pulse, 0, TAU);
    ctx.fill();
    arrow(camX + ex, camY + ey, ang, ts * 0.75 * pulse);
  }

  private drawHero(ctx: CanvasRenderingContext2D, ts: number) {
    const px = this.x * ts, py = this.y * ts;
    shadow(ctx, px, py, ts * 0.27);
    if (!drawHero(ctx, this.save.equip.armor, px, py, ts / 1.35, this.face, this.moving, this.t)) {
      drawPlayer(ctx, px, py, ts * 0.3, {
        t: this.t, moving: this.moving, face: this.face,
        armor: GEAR[this.save.equip.armor]?.color ?? '#6fa8ff',
      });
    }
    // Tall grass hides your feet — cute and tells you you're in encounter territory.
    if (this.world.tile(Math.floor(this.x), Math.floor(this.y - 0.1)) === T.GRASS) {
      const th = this.zone.theme;
      ctx.fillStyle = th.grass;
      for (let i = -2; i <= 2; i++) {
        const bx = px + i * ts * 0.12, sway = Math.sin(this.t * 6 + i) * ts * 0.03;
        ctx.beginPath();
        ctx.moveTo(bx - ts * 0.07, py + 1);
        ctx.lineTo(bx + sway, py - ts * (0.22 + (i & 1) * 0.06));
        ctx.lineTo(bx + ts * 0.07, py + 1);
        ctx.fill();
      }
    }
    if (this.alert > 0) {
      const s = 1 + Math.max(0, 0.55 - this.alert) * 0.6;
      ctx.save();
      ctx.translate(px, py - ts * 1.3);
      ctx.scale(s, s);
      ctx.fillStyle = '#fff';
      rrect(ctx, -ts * 0.2, -ts * 0.55, ts * 0.4, ts * 0.55, ts * 0.15);
      ctx.fill();
      ctx.fillStyle = '#ff4a5a';
      ctx.font = `900 ${Math.round(ts * 0.45)}px ui-rounded, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', 0, -ts * 0.27);
      ctx.restore();
    }
  }

  /** A guardian's roadblock: a barrier on each blocked tile and the boss standing watch in front of it. */
  private drawGate(ctx: CanvasRenderingContext2D, o: WorldObj, ts: number): boolean {
    const zone = ZONES.find((z) => z.id === o.zone);
    const g = zone?.guardian;
    const barrier = g && frame(`env/gate_${g.gate}`);
    if (!g || !barrier) return false;
    const unit = ts / TILE_BU;
    for (let i = 0; i < o.h; i++) {
      const bx = (o.x + 0.5) * ts, by = (o.y + i + 0.92) * ts;
      shadow(ctx, bx, by, ts * 0.45, 0.2);
      drawFrame(ctx, barrier, bx, by, unit, { flip: i % 2 === 1 });
    }
    const mf = frame(`mon/${g.kind}/${Math.floor(this.t * 5) % 6}`);
    const gx = (o.x - 0.8) * ts, gy = (o.y + 2.6) * ts;
    if (mf) {
      shadow(ctx, gx, gy, ts * 0.6, 0.25);
      drawFrame(ctx, mf, gx, gy, unit * 0.8, { flip: true });
    }
    const m = MONSTERS[g.kind];
    const text = `👑 ${m.name} · Lv ${g.lv}`;
    ctx.font = `900 ${Math.round(ts * 0.3)}px ui-rounded, "Nunito", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(text).width + ts * 0.4;
    const ty = gy - ts * 2.1 + Math.sin(this.t * 2) * 3;
    ctx.fillStyle = this.save.lv >= g.lv ? 'rgba(90,60,110,0.9)' : 'rgba(200,60,70,0.92)';
    rrect(ctx, gx - tw / 2, ty - ts * 0.24, tw, ts * 0.48, ts * 0.2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(text, gx, ty);
    return true;
  }

  private drawPath(ctx: CanvasRenderingContext2D, x: number, y: number, px: number, py: number, ts: number, th: Theme) {
    ctx.fillStyle = th.path;
    const up = this.world.tile(x, y - 1) === T.PATH, down = this.world.tile(x, y + 1) === T.PATH;
    const inset = ts * 0.12;
    ctx.fillRect(px, py + (up ? 0 : inset), ts + 1, ts - (up ? 0 : inset) - (down ? 0 : inset) + 1);
    if (hash2(x, y, 4) < 0.4) {
      ctx.fillStyle = 'rgba(120,90,60,0.18)';
      ctx.beginPath();
      ctx.ellipse(px + hash2(x, y, 5) * ts, py + ts * 0.5, ts * 0.08, ts * 0.05, 0, 0, TAU);
      ctx.fill();
    }
  }

  private drawPool(ctx: CanvasRenderingContext2D, x: number, y: number, px: number, py: number, ts: number, th: Theme) {
    const lava = th.pool === 'lava';
    const W = this.world;
    const inset = ts * 0.14;
    const pool = (dx: number, dy: number) => W.tile(x + dx, y + dy) === T.POOL;
    const l = pool(-1, 0) ? 0 : inset, r = pool(1, 0) ? 0 : inset;
    const u = pool(0, -1) ? 0 : inset, d = pool(0, 1) ? 0 : inset;
    // Only round the corners that sit on the pool's outer edge so neighbouring tiles merge seamlessly.
    const rad = ts * 0.3;
    const x0 = px + l, y0 = py + u, x1 = px + ts - r + 0.5, y1 = py + ts - d + 0.5;
    const tl = !pool(-1, 0) && !pool(0, -1) ? rad : 0, tr = !pool(1, 0) && !pool(0, -1) ? rad : 0;
    const br = !pool(1, 0) && !pool(0, 1) ? rad : 0, bl = !pool(-1, 0) && !pool(0, 1) ? rad : 0;
    ctx.fillStyle = lava ? '#ff7a2a' : '#6ac8f0';
    ctx.beginPath();
    ctx.moveTo(x0 + tl, y0);
    ctx.arcTo(x1, y0, x1, y1, tr);
    ctx.arcTo(x1, y1, x0, y1, br);
    ctx.arcTo(x0, y1, x0, y0, bl);
    ctx.arcTo(x0, y0, x1, y0, tl);
    ctx.fill();
    const k = Math.sin(this.t * 2 + x * 1.3 + y * 0.7);
    ctx.fillStyle = lava ? `rgba(255,220,90,${0.5 + k * 0.3})` : `rgba(255,255,255,${0.35 + k * 0.2})`;
    if (lava) {
      ctx.beginPath();
      ctx.arc(px + ts * (0.3 + hash2(x, y, 6) * 0.4), py + ts * 0.5, ts * (0.06 + 0.04 * k), 0, TAU);
      ctx.fill();
    } else {
      ctx.fillRect(px + ts * 0.25 + k * ts * 0.05, py + ts * 0.4, ts * 0.3, ts * 0.05);
    }
  }

  private drawGrass(ctx: CanvasRenderingContext2D, x: number, y: number, px: number, py: number, ts: number, th: Theme) {
    ctx.fillStyle = th.grass;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(px, py, ts + 1, ts + 1);
    ctx.globalAlpha = 1;
    const tuft = frame(`env/grass_${zoneAtX(x).id}`);
    if (tuft) {
      for (let i = 0; i < 2; i++) {
        const sway = Math.sin(this.t * 2.2 + x * 0.8 + y * 0.5 + i) * 0.08;
        drawFrame(ctx, tuft, px + ts * (0.28 + i * 0.44), py + ts * (0.55 + i * 0.4), ts / TILE_BU, { rot: sway, flip: ((x + y + i) & 1) === 1 });
      }
      return;
    }
    for (let i = 0; i < 2; i++) {
      const cx = px + ts * (0.28 + i * 0.44), by = py + ts * (0.55 + i * 0.4);
      const sway = Math.sin(this.t * 2.2 + x * 0.8 + y * 0.5 + i) * ts * 0.06;
      ctx.fillStyle = th.grass;
      ctx.beginPath();
      ctx.moveTo(cx - ts * 0.24, by);
      ctx.lineTo(cx - ts * 0.14 + sway, by - ts * 0.42);
      ctx.lineTo(cx - ts * 0.04, by - ts * 0.08);
      ctx.lineTo(cx + sway, by - ts * 0.55);
      ctx.lineTo(cx + ts * 0.06, by - ts * 0.08);
      ctx.lineTo(cx + ts * 0.16 + sway, by - ts * 0.4);
      ctx.lineTo(cx + ts * 0.24, by);
      ctx.fill();
      ctx.fillStyle = th.grassTip;
      ctx.beginPath();
      ctx.moveTo(cx - ts * 0.03, by - ts * 0.1);
      ctx.lineTo(cx + sway, by - ts * 0.55);
      ctx.lineTo(cx + ts * 0.04, by - ts * 0.1);
      ctx.fill();
    }
  }

  private drawDecor(ctx: CanvasRenderingContext2D, x: number, y: number, px: number, py: number, ts: number, th: Theme) {
    const cx = px + ts * (0.25 + hash2(x, y, 7) * 0.5), cy = py + ts * (0.3 + hash2(x, y, 8) * 0.5);
    const h = hash2(x, y, 9);
    const names = { flower: ['flower0', 'flower1', 'flower2', 'flower3'], mush: ['mush0', 'mush1'], gem: ['gem0', 'gem1'], pebble: ['pebble0', 'pebble1'] }[th.decor];
    const deco = frame(`env/${names[Math.floor(h * names.length)]}`);
    if (deco) {
      drawFrame(ctx, deco, cx, cy + ts * 0.1, ts / TILE_BU);
      return;
    }
    switch (th.decor) {
      case 'flower': {
        const cols = ['#ff8ab0', '#ffd35a', '#ffffff', '#b08aff'];
        ctx.fillStyle = cols[Math.floor(h * cols.length)];
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * TAU;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(a) * ts * 0.07, cy + Math.sin(a) * ts * 0.07, ts * 0.06, 0, TAU);
          ctx.fill();
        }
        ctx.fillStyle = '#ffb03a';
        ctx.beginPath();
        ctx.arc(cx, cy, ts * 0.04, 0, TAU);
        ctx.fill();
        break;
      }
      case 'mush': {
        ctx.fillStyle = '#fff0d8';
        ctx.fillRect(cx - ts * 0.04, cy - ts * 0.08, ts * 0.08, ts * 0.12);
        ctx.fillStyle = h < 0.5 ? '#e8505a' : '#d8a060';
        ctx.beginPath();
        ctx.ellipse(cx, cy - ts * 0.08, ts * 0.12, ts * 0.09, 0, Math.PI, TAU);
        ctx.fill();
        break;
      }
      case 'gem': {
        ctx.fillStyle = h < 0.5 ? '#a8f0ff' : '#e0b0ff';
        ctx.globalAlpha = 0.6 + Math.sin(this.t * 3 + x) * 0.3;
        ctx.beginPath();
        ctx.moveTo(cx, cy - ts * 0.16);
        ctx.lineTo(cx + ts * 0.08, cy);
        ctx.lineTo(cx, cy + ts * 0.06);
        ctx.lineTo(cx - ts * 0.08, cy);
        ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }
      case 'pebble': {
        ctx.fillStyle = h < 0.3 ? '#ff9a4a' : '#8a6a5a';
        ctx.beginPath();
        ctx.ellipse(cx, cy, ts * 0.09, ts * 0.06, 0, 0, TAU);
        ctx.fill();
        break;
      }
    }
  }

  private drawObstacle(ctx: CanvasRenderingContext2D, x: number, y: number, ts: number, th: Theme) {
    const cx = (x + 0.5) * ts + (hash2(x, y, 12) - 0.5) * ts * 0.15;
    const by = (y + 0.92) * ts;
    const v = hash2(x, y, 13);
    const sprite = frame(`env/${th.obstacle}${Math.floor(v * 3)}`);
    if (sprite) {
      shadow(ctx, cx, by - ts * 0.05, ts * 0.42);
      drawFrame(ctx, sprite, cx, by - ts * 0.05, ts / TILE_BU, { flip: v > 0.5, rot: th.obstacle === 'tree' || th.obstacle === 'pine' ? Math.sin(this.t * 1.2 + x) * 0.012 : 0 });
      return;
    }
    switch (th.obstacle) {
      case 'tree': {
        shadow(ctx, cx, by, ts * 0.42);
        ctx.fillStyle = '#8a5a3a';
        rrect(ctx, cx - ts * 0.09, by - ts * 0.45, ts * 0.18, ts * 0.45, ts * 0.05);
        ctx.fill();
        const cy = by - ts * 0.8;
        const sway = Math.sin(this.t * 1.5 + x) * ts * 0.015;
        ctx.fillStyle = v < 0.5 ? '#3f9a45' : '#48a84a';
        ctx.beginPath();
        ctx.arc(cx - ts * 0.22 + sway, cy + ts * 0.08, ts * 0.32, 0, TAU);
        ctx.arc(cx + ts * 0.22 + sway, cy + ts * 0.08, ts * 0.32, 0, TAU);
        ctx.fill();
        ctx.fillStyle = v < 0.5 ? '#5ab85a' : '#62c060';
        ctx.beginPath();
        ctx.arc(cx + sway, cy - ts * 0.12, ts * 0.38, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.beginPath();
        ctx.arc(cx - ts * 0.12 + sway, cy - ts * 0.24, ts * 0.13, 0, TAU);
        ctx.fill();
        if (v > 0.85) {
          ctx.fillStyle = '#ff6a6a';
          for (const [ox, oy] of [[-0.2, 0], [0.15, -0.15], [0.2, 0.12]]) {
            ctx.beginPath();
            ctx.arc(cx + ox * ts, cy + oy * ts, ts * 0.05, 0, TAU);
            ctx.fill();
          }
        }
        break;
      }
      case 'pine': {
        shadow(ctx, cx, by, ts * 0.38);
        ctx.fillStyle = '#6a4a30';
        ctx.fillRect(cx - ts * 0.07, by - ts * 0.3, ts * 0.14, ts * 0.3);
        const layers = 3;
        for (let i = 0; i < layers; i++) {
          const w = ts * (0.5 - i * 0.1), top = by - ts * (0.55 + i * 0.32);
          ctx.fillStyle = i % 2 ? '#2f7a45' : '#27693c';
          ctx.beginPath();
          ctx.moveTo(cx - w, top + ts * 0.35);
          ctx.lineTo(cx, top - ts * 0.2);
          ctx.lineTo(cx + w, top + ts * 0.35);
          ctx.closePath();
          ctx.fill();
        }
        break;
      }
      case 'crystal': {
        shadow(ctx, cx, by, ts * 0.38);
        const cols = v < 0.5 ? ['#b8a0ff', '#8a70e0'] : ['#8ae8ff', '#50b8e0'];
        const shards = [[-0.18, 0.55, -0.25], [0.15, 0.7, 0.2], [0, 0.95, 0]];
        for (const [ox, h, tilt] of shards) {
          ctx.save();
          ctx.translate(cx + ox * ts, by - ts * 0.05);
          ctx.rotate(tilt);
          ctx.fillStyle = cols[1];
          ctx.beginPath();
          ctx.moveTo(-ts * 0.12, 0);
          ctx.lineTo(-ts * 0.12, -h * ts * 0.7);
          ctx.lineTo(0, -h * ts);
          ctx.lineTo(ts * 0.12, -h * ts * 0.7);
          ctx.lineTo(ts * 0.12, 0);
          ctx.fill();
          ctx.fillStyle = cols[0];
          ctx.beginPath();
          ctx.moveTo(-ts * 0.12, 0);
          ctx.lineTo(-ts * 0.12, -h * ts * 0.7);
          ctx.lineTo(0, -h * ts);
          ctx.lineTo(0, 0);
          ctx.fill();
          ctx.restore();
        }
        break;
      }
      case 'rock': {
        shadow(ctx, cx, by, ts * 0.45);
        ctx.fillStyle = v < 0.5 ? '#7a5a50' : '#6a4a44';
        ctx.beginPath();
        ctx.ellipse(cx, by - ts * 0.3, ts * 0.46, ts * 0.38, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.ellipse(cx - ts * 0.12, by - ts * 0.45, ts * 0.18, ts * 0.1, -0.3, 0, TAU);
        ctx.fill();
        if (v > 0.7) {
          ctx.strokeStyle = '#ff8a3a';
          ctx.lineWidth = ts * 0.04;
          ctx.beginPath();
          ctx.moveTo(cx + ts * 0.1, by - ts * 0.55);
          ctx.lineTo(cx, by - ts * 0.35);
          ctx.lineTo(cx + ts * 0.12, by - ts * 0.15);
          ctx.stroke();
        }
        break;
      }
    }
  }

  private drawObj(ctx: CanvasRenderingContext2D, o: WorldObj, ts: number) {
    const x = o.x * ts, y = o.y * ts, w = o.w * ts, h = o.h * ts;
    const labelAt = (text: string, top: number) => {
      ctx.font = `900 ${Math.round(ts * 0.34)}px ui-rounded, "Nunito", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = ts * 0.1;
      ctx.strokeStyle = 'rgba(60,30,60,0.8)';
      ctx.strokeText(text, x + w / 2, top - ts * 0.25);
      ctx.fillStyle = '#fff';
      ctx.fillText(text, x + w / 2, top - ts * 0.25);
    };
    const label = (text: string) => {
      ctx.font = `900 ${Math.round(ts * 0.34)}px ui-rounded, "Nunito", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = ts * 0.1;
      ctx.strokeStyle = 'rgba(60,30,60,0.8)';
      ctx.strokeText(text, x + w / 2, y - ts * 0.9);
      ctx.fillStyle = '#fff';
      ctx.fillText(text, x + w / 2, y - ts * 0.9);
    };
    if (o.hidden) return;
    const unit = ts / TILE_BU;
    if (o.kind === 'gate' && this.drawGate(ctx, o, ts)) return;
    if (o.kind === 'elder') {
      const f = frame(`npc/elder/${Math.floor(this.t * 3) % 4}`);
      if (f) {
        const ax = x + w / 2, ay = y + h;
        shadow(ctx, ax, ay, ts * 0.27);
        drawFrame(ctx, f, ax, ay, ts / 1.35);
        const q = currentQuest(this.save);
        const top = ay - f.ay * (ts / 1.35 / f.ppu);
        // A bouncing "!" when Elder Bloom has something new to say.
        if (q?.goal.type === 'talk' || (q && !this.save.tips.includes(`elder:${q.id}`))) {
          const by = top - ts * 0.35 + Math.abs(Math.sin(this.t * 4)) * -ts * 0.12;
          ctx.fillStyle = '#ffd35a';
          rrect(ctx, ax - ts * 0.17, by - ts * 0.46, ts * 0.34, ts * 0.46, ts * 0.12);
          ctx.fill();
          ctx.fillStyle = '#5a3a6a';
          ctx.font = `900 ${Math.round(ts * 0.36)}px ui-rounded, system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('!', ax, by - ts * 0.22);
        }
        return;
      }
    }
    const lv = (id: keyof SaveState['build']) => this.save.build[id];
    let spriteName: string;
    let back = 0.42;
    switch (o.kind) {
      case 'forge': spriteName = ['forge', 'forge2', 'forge3'][lv('forge') - 1] ?? 'forge'; break;
      case 'house': spriteName = 'house_blue'; break;
      case 'fountain': spriteName = 'fountain'; back = 0.45; break;
      case 'sign': spriteName = 'sign'; back = 0.05; break;
      case 'lair': spriteName = 'lair'; back = 0.4; break;
      case 'camp': spriteName = 'campfire'; back = 0.05; break;
      case 'plot': {
        const p = o.project!, l = lv(p);
        if (p === 'home') spriteName = `home${l}`;
        else if (p === 'warp') { spriteName = `warp${l}`; back = 0.1; }
        else { spriteName = l ? `${p}${l}` : 'plot'; back = 0.28; }
        break;
      }
      default: spriteName = '';
    }
    const sprite = frame(`env/${spriteName}`);
    if (sprite) {
      // Model origins sit in the middle of their footprint; push them back so their fronts line up with the collision box.
      const ax = x + w / 2, ay = y + h - back * ts;
      if (o.kind !== 'sign' && o.kind !== 'camp') shadow(ctx, ax, ay, w * 0.52, 0.2);
      if (o.kind === 'camp') {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(255,150,60,${0.16 + Math.sin(this.t * 9) * 0.04})`;
        ctx.beginPath();
        ctx.ellipse(ax, ay - ts * 0.1, ts * 1.1, ts * 0.7, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      drawFrame(ctx, sprite, ax, ay, unit);
      const top = ay - sprite.ay * (unit / sprite.ppu);
      if (o.kind === 'forge') {
        if (Math.random() < 0.08) this.fx.burst(ax + w * 0.3, top + ts * 0.3, 'rgba(220,220,230,0.8)', 1, ts * 0.6, { size: ts * 0.12, grav: -ts * 0.8, life: 1.2 });
        labelAt('⚒ Forge', top);
      } else if (o.kind === 'fountain') {
        for (let i = 0; i < 3; i++) {
          const q = (this.t * 1.5 + i / 3) % 1;
          ctx.fillStyle = `rgba(190,240,255,${1 - q})`;
          ctx.beginPath();
          ctx.arc(ax + (i - 1) * q * ts * 0.5, top + ts * 0.15 - Math.sin(q * Math.PI) * ts * 0.4 + q * ts * 0.5, ts * 0.07, 0, TAU);
          ctx.fill();
        }
        labelAt('💧 Fountain', top);
      } else if (o.kind === 'camp') {
        if (Math.random() < 0.3) this.fx.burst(ax + (Math.random() - 0.5) * ts * 0.3, ay - ts * 0.35, Math.random() < 0.5 ? '#ffb03a' : '#ff7a2a', 1, ts * 0.4, { size: ts * 0.06, grav: -ts * 1.5, life: 0.7 });
      } else if (o.kind === 'plot') {
        const p = o.project!;
        const name = ({ home: '🏠 Home', garden: '🌱 Garden', training: '🎯 Training', warp: '🔮 Warp Stone' } as Record<string, string>)[p] ?? '';
        if (!lv(p) || p === 'home') labelAt(name, top);
      } else if (o.kind === 'lair') labelAt(this.save.bosses.includes('dragon') ? '🐉 Lair (rematch)' : '🐉 Dragon Lair', top);
      return;
    }
    switch (o.kind) {
      case 'forge':
      case 'house': {
        const forge = o.kind === 'forge';
        shadow(ctx, x + w / 2, y + h, w * 0.55, 0.25);
        ctx.fillStyle = forge ? '#b8a8a0' : '#fff0dc';
        rrect(ctx, x + ts * 0.1, y + h * 0.3, w - ts * 0.2, h * 0.7, ts * 0.12);
        ctx.fill();
        // Roof
        ctx.fillStyle = forge ? '#c8503a' : o.x < 10 ? '#6a9ae0' : '#e88ab0';
        ctx.beginPath();
        ctx.moveTo(x - ts * 0.15, y + h * 0.4);
        ctx.lineTo(x + w / 2, y - h * 0.25);
        ctx.lineTo(x + w + ts * 0.15, y + h * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        ctx.moveTo(x - ts * 0.15, y + h * 0.4);
        ctx.lineTo(x + w / 2, y - h * 0.25);
        ctx.lineTo(x + w / 2, y - h * 0.1);
        ctx.lineTo(x + ts * 0.3, y + h * 0.4);
        ctx.fill();
        // Door
        ctx.fillStyle = '#8a5a3a';
        rrect(ctx, x + w / 2 - ts * 0.3, y + h - ts * 0.9, ts * 0.6, ts * 0.9, ts * 0.25);
        ctx.fill();
        // Window
        ctx.fillStyle = forge ? '#ffb03a' : '#bfe8ff';
        rrect(ctx, x + ts * 0.4, y + h * 0.5, ts * 0.5, ts * 0.45, ts * 0.08);
        ctx.fill();
        if (forge) {
          ctx.fillStyle = '#8a8090';
          ctx.fillRect(x + w - ts * 0.9, y - h * 0.15, ts * 0.4, ts * 0.8);
          if (Math.random() < 0.08) this.fx.burst(x + w - ts * 0.7, y - h * 0.2, 'rgba(220,220,230,0.8)', 1, ts * 0.6, { size: ts * 0.12, grav: -ts * 0.8, life: 1.2 });
          // Anvil
          ctx.fillStyle = '#5a5a6a';
          rrect(ctx, x + w - ts * 0.95, y + h - ts * 0.45, ts * 0.6, ts * 0.22, ts * 0.06);
          ctx.fill();
          ctx.fillRect(x + w - ts * 0.75, y + h - ts * 0.25, ts * 0.2, ts * 0.25);
          label('⚒ Forge');
        }
        break;
      }
      case 'fountain': {
        shadow(ctx, x + w / 2, y + h, w * 0.6, 0.25);
        ctx.fillStyle = '#b8b0c8';
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h * 0.6, w * 0.55, h * 0.4, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#6ac8f0';
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h * 0.55, w * 0.44, h * 0.3, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#d0c8e0';
        ctx.fillRect(x + w / 2 - ts * 0.1, y + h * 0.1, ts * 0.2, h * 0.45);
        for (let i = 0; i < 3; i++) {
          const q = (this.t * 1.5 + i / 3) % 1;
          ctx.fillStyle = `rgba(170,230,255,${1 - q})`;
          ctx.beginPath();
          ctx.arc(x + w / 2 + (i - 1) * q * ts * 0.5, y + h * 0.1 - Math.sin(q * Math.PI) * ts * 0.4 + q * ts * 0.3, ts * 0.07, 0, TAU);
          ctx.fill();
        }
        label('💧 Fountain');
        break;
      }
      case 'sign': {
        const cx = x + w / 2;
        shadow(ctx, cx, y + h, ts * 0.3);
        ctx.fillStyle = '#8a5a3a';
        ctx.fillRect(cx - ts * 0.05, y - ts * 0.1, ts * 0.1, h + ts * 0.1);
        ctx.fillStyle = '#c89a6a';
        rrect(ctx, cx - ts * 0.4, y - ts * 0.55, ts * 0.8, ts * 0.5, ts * 0.08);
        ctx.fill();
        ctx.fillStyle = '#8a5a3a';
        ctx.fillRect(cx - ts * 0.25, y - ts * 0.42, ts * 0.5, ts * 0.05);
        ctx.fillRect(cx - ts * 0.25, y - ts * 0.3, ts * 0.35, ts * 0.05);
        break;
      }
      case 'lair': {
        shadow(ctx, x + w / 2, y + h, w * 0.6, 0.3);
        ctx.fillStyle = '#6a3a30';
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h, w * 0.6, h * 1.1, 0, Math.PI, TAU);
        ctx.fill();
        ctx.fillStyle = '#1a0a14';
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h, w * 0.28, h * 0.6, 0, Math.PI, TAU);
        ctx.fill();
        if ((this.t % 4) > 0.15) {
          ctx.fillStyle = '#ffb03a';
          for (const s of [-1, 1]) {
            ctx.beginPath();
            ctx.ellipse(x + w / 2 + s * ts * 0.18, y + h - ts * 0.55, ts * 0.08, ts * 0.05, 0, 0, TAU);
            ctx.fill();
          }
        }
        label(this.save.bossWins ? '🐉 Lair (rematch)' : '🐉 Dragon Lair');
        break;
      }
    }
  }
}

