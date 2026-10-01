// Browser-side half of tests/e2e/hero-armors.ts: draws the hero in every armour with the game's own loader and renderer.
import { GEAR } from '../../src/data';
import { drawModel, loadModel } from '../../src/models';

(window as any).heroArmorSheet = async () => {
  const armors = Object.values(GEAR).filter((g) => g.slot === 'armor').map((g) => g.id);
  const poses = [
    { anim: 'idle', phase: 0, yaw: 0.45 },
    { anim: 'walk', phase: 0.25, yaw: 0.45 },
    { anim: 'walk', phase: 0.6, yaw: -1.2 },
    { anim: 'idle', phase: 0.5, yaw: Math.PI - 0.4 },
    { anim: 'idle', phase: 0, yaw: 0.8, held: { id: 'wpn_ironsword', at: 'hand' as const, ang: 0.3, lift: 0.2, scale: 0.75 } },
  ];
  await loadModel('wpn_ironsword');
  const cw = 150, ch = 190;
  const canvas = document.createElement('canvas');
  canvas.width = cw * poses.length;
  canvas.height = ch * armors.length;
  canvas.id = 'hero-armor-sheet';
  canvas.style.cssText = `position:fixed;left:0;top:0;z-index:9999;width:${canvas.width}px;height:${canvas.height}px`;
  document.body.append(canvas);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#e8f0d8';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const missing: string[] = [];
  for (const [row, armor] of armors.entries()) {
    if (!(await loadModel(`hero_${armor}`))) { missing.push(armor); continue; }
    for (const [col, pose] of poses.entries()) {
      const x = col * cw + cw / 2, y = row * ch + ch - 22, unit = 110;
      const ok = drawModel(ctx, `sheet-${armor}-${col}`, `hero_${armor}`, { ...pose, bold: true }, x, y, unit, {}, (f) => ctx.drawImage(f.img, f.x, f.y, f.w, f.h, x - f.ax * unit / f.ppu, y - f.ay * unit / f.ppu, f.w * unit / f.ppu, f.h * unit / f.ppu));
      if (!ok) missing.push(`${armor}:${col}`);
    }
    ctx.fillStyle = '#49384d';
    ctx.font = '14px sans-serif';
    ctx.fillText(armor, 6, row * ch + 16);
  }
  return { armors: armors.length, missing };
};
