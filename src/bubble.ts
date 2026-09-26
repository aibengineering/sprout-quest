// An emoji in a speech bubble over someone's head: how they feel, readable at a glance from across the screen.

const easeBack = (q: number) => 1 + 2.7 * (q - 1) ** 3 + 1.7 * (q - 1) ** 2;

/**
 * Draws a bubble whose tail points down at (x, y). `size` is its height in pixels; `age` and `hold` (seconds) drive
 * the pop in and the fade out (a hold of Infinity stays up).
 */
export function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, emoji: string, size: number, age = 1, hold = Infinity) {
  const pop = age < 0.18 ? Math.max(0.01, easeBack(age / 0.18)) : 1;
  const fade = hold === Infinity ? 1 : Math.max(0, Math.min(1, (hold - age) / 0.25));
  if (fade <= 0) return;
  const bob = Math.sin(age * 5) * size * 0.04;
  ctx.save();
  ctx.globalAlpha *= fade;
  ctx.translate(x, y + bob);
  ctx.scale(pop, pop);
  const w = size * 1.15, h = size, r = size * 0.42;
  const top = -h - size * 0.22;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#4a2a5a';
  ctx.lineWidth = Math.max(2, size * 0.07);
  ctx.beginPath();
  ctx.roundRect(-w / 2, top, w, h, r);
  ctx.moveTo(-size * 0.12, top + h - 1);
  ctx.lineTo(0, 0);
  ctx.lineTo(size * 0.12, top + h - 1);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(-w / 2, top, w, h, r);
  ctx.stroke();
  // The tail's outline, drawn over so it joins the bubble cleanly.
  ctx.beginPath();
  ctx.moveTo(-size * 0.12, top + h);
  ctx.lineTo(0, 0);
  ctx.lineTo(size * 0.12, top + h);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-size * 0.1, top + h - ctx.lineWidth * 1.2, size * 0.2, ctx.lineWidth * 1.4);
  ctx.font = `${Math.round(size * 0.62)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 0, top + h / 2 + size * 0.03);
  ctx.restore();
}
