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

/**
 * What someone in a room is saying, in one place at the top of the screen (under the HUD, where the hint usually is)
 * instead of over the room, so it never covers what you're working at: their feeling, their name and the line,
 * wrapped to fit. Fades in and out like a speech bubble. Returns the box drawn (screen pixels), or null once faded.
 */
export function drawCaption(ctx: CanvasRenderingContext2D, vw: number, y: number, name: string, text: string, emoji: string | undefined, age: number, hold: number) {
  const fade = Math.max(0, Math.min(1, age / 0.15, (hold - age) / 0.3));
  if (fade <= 0) return null;
  ctx.save();
  const w = Math.min(vw - 24, 440), pad = 10, face = emoji ? 30 : 0;
  // Two lines at most: a long line drops the type a size rather than reaching down into the room.
  let size = 15, lines: string[] = [];
  for (; size >= 12; size--) {
    ctx.font = `800 ${size}px ui-rounded, "Nunito", system-ui, sans-serif`;
    lines = [];
    for (const word of `${name}: ${text}`.split(' ')) {
      const last = lines[lines.length - 1];
      if (last !== undefined && ctx.measureText(`${last} ${word}`).width <= w - pad * 2 - face) lines[lines.length - 1] = `${last} ${word}`;
      else lines.push(word);
    }
    if (lines.length <= 2) break;
  }
  const lh = size + 4, h = Math.max(30, lines.length * lh + 10), x = (vw - w) / 2;
  ctx.globalAlpha *= fade;
  ctx.fillStyle = '#fffdf6';
  ctx.strokeStyle = '#4a2a5a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
  ctx.stroke();
  if (emoji) {
    ctx.font = `20px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, x + pad + 12, y + h / 2 + 1);
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  lines.forEach((l, i) => {
    const ly = y + 5 + lh * (i + 0.5) + 1;
    let lx = x + pad + face;
    // The speaker's name, in their own colour.
    if (i === 0) {
      ctx.font = `900 ${size}px ui-rounded, "Nunito", system-ui, sans-serif`;
      ctx.fillStyle = '#c0567a';
      const head = `${name}:`;
      ctx.fillText(head, lx, ly);
      lx += ctx.measureText(`${head} `).width;
      l = l.slice(head.length + 1);
    }
    ctx.font = `800 ${size}px ui-rounded, "Nunito", system-ui, sans-serif`;
    ctx.fillStyle = '#4a2a5a';
    ctx.fillText(l, lx, ly);
  });
  ctx.restore();
  return { x, y, w, h };
}
