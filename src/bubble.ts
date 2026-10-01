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

/**
 * A short line of speech over someone's head (wrapped to `maxW` pixels), its tail pointing down at (x, y), kept
 * between `left` and `right` sideways. It pops in and fades out like the emoji bubbles and never stops the game: it's
 * for chatter while you get on with things.
 */
export function drawSpeech(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, size: number, age: number, hold: number, left: number, right: number) {
  const pop = age < 0.18 ? Math.max(0.01, easeBack(age / 0.18)) : 1;
  const fade = Math.max(0, Math.min(1, (hold - age) / 0.3));
  if (fade <= 0) return;
  ctx.save();
  ctx.font = `800 ${Math.round(size * 0.5)}px ui-rounded, "Nunito", system-ui, sans-serif`;
  const maxW = Math.min(size * 8, right - left - size);
  const lines: string[] = [];
  for (const word of text.split(' ')) {
    const last = lines[lines.length - 1];
    if (last !== undefined && ctx.measureText(`${last} ${word}`).width <= maxW) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  const lh = size * 0.62, pad = size * 0.32;
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + pad * 2, h = lines.length * lh + pad * 1.3;
  // The box slides to stay on screen; the tail stays over the speaker.
  const bx = Math.max(left, Math.min(right - w, x - w / 2));
  const top = y - h - size * 0.35;
  ctx.globalAlpha *= fade;
  ctx.translate(x, y);
  ctx.scale(pop, pop);
  ctx.translate(-x, -y);
  ctx.fillStyle = '#fffdf6';
  ctx.strokeStyle = '#4a2a5a';
  ctx.lineWidth = Math.max(2, size * 0.07);
  ctx.beginPath();
  ctx.roundRect(bx, top, w, h, size * 0.3);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - size * 0.16, top + h - 1);
  ctx.lineTo(x, y);
  ctx.lineTo(x + size * 0.16, top + h - 1);
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(x - size * 0.13, top + h - ctx.lineWidth * 1.5, size * 0.26, ctx.lineWidth * 1.6);
  ctx.fillStyle = '#4a2a5a';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, bx + pad, top + pad * 0.65 + lh * (i + 0.5)));
  ctx.restore();
}
