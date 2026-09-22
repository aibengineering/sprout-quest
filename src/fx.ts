// Particles and floating text, shared by the overworld and battles. Units are whatever space the caller draws in.

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; max: number; size: number; color: string; grav: number;
  star: boolean;
}

interface FloatText {
  x: number; y: number; text: string; color: string; t: number; size: number;
}

export class Fx {
  parts: Particle[] = [];
  texts: FloatText[] = [];

  burst(x: number, y: number, color: string, n: number, speed: number, opts: { size?: number; grav?: number; star?: boolean; life?: number } = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.6);
      const life = (opts.life ?? 0.6) * (0.6 + Math.random() * 0.6);
      this.parts.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.3,
        life, max: life, size: (opts.size ?? 3) * (0.6 + Math.random() * 0.7),
        color, grav: opts.grav ?? speed * 1.5, star: !!opts.star,
      });
    }
  }

  text(x: number, y: number, text: string, color: string, size = 16) {
    this.texts.push({ x: x + (Math.random() - 0.5) * 8, y, text, color, t: 0, size });
  }

  update(dt: number) {
    for (const p of this.parts) {
      p.life -= dt;
      p.vy += p.grav * dt;
      p.vx *= 1 - 2 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const t of this.texts) t.t += dt;
    this.texts = this.texts.filter((t) => t.t < 0.9);
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const p of this.parts) {
      const k = p.life / p.max;
      ctx.globalAlpha = Math.min(1, k * 1.5);
      ctx.fillStyle = p.color;
      const s = p.size * (0.5 + k * 0.5);
      if (p.star) {
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const r = i % 2 ? s * 0.4 : s;
          const a = (i / 8) * Math.PI * 2 + p.life * 4;
          ctx.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
        }
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      const pop = t.t < 0.12 ? 0.6 + (t.t / 0.12) * 0.6 : 1.2 - Math.min(0.2, (t.t - 0.12) * 0.5);
      ctx.globalAlpha = t.t > 0.6 ? 1 - (t.t - 0.6) / 0.3 : 1;
      ctx.font = `900 ${t.size * pop}px ui-rounded, "Nunito", system-ui, sans-serif`;
      const y = t.y - t.t * 40;
      ctx.lineWidth = t.size * 0.25;
      ctx.strokeStyle = 'rgba(40,20,50,0.85)';
      ctx.strokeText(t.text, t.x, y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, y);
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    this.parts = [];
    this.texts = [];
  }
}
