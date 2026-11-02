// The masked fox is a Glimmer spirit, never a public Sowerby recruit or a hunt target: she is never in the village.
import { zoneAtX, zoneById } from './data';
import type { SaveState } from './state';
const H = zoneById('hollow').x0;
export const FOX_SIGHT = { x: H + 6.5, y: 8.7 };
export const FOX_TRAIL = [{ x: H + 13.5, y: 7.8 }, { x: H + 13.5, y: 5.8 }, { x: H + 20.5, y: 5.8 }];
export const FOX_DEN = { x: H + 25.2, y: 7.8 };
export const foxTrusted = (s: SaveState) => s.flags.includes('fox:trusted') || s.build.training > 0;

// The Hidden Training Clearing: in the woods just west of Sowerby, out of sight of the village, through a gap in the
// hedge at the end of the home lane. Oswin's old roped-off practice ring until Bram builds it up for the fox.
const W = zoneById('glade').x0;
/** The open ground (an ellipse, in tiles) and the trail in from the lane. */
export const HIDDEN_CLEARING = { x: W + 9.6, y: 21, rx: 4.4, ry: 2.6 };
export const HIDDEN_TRAIL = { x: W + 13, y: 22, w: 6, h: 2 };
export const TRAINING_PLOT = { x: W + 7.4, y: 19.4, w: 2.4, h: 1.9 };
/** The sign by the ring's gate: the practice menu. */
export const PRACTICE_SIGN = { x: W + 9.3, y: 21.55, w: 0.6, h: 0.4 };
/** Whether a spot is in the clearing (it's off the glade's southern woods, below the glade's own clearing). */
export const inHiddenClearing = (x: number, y: number) => zoneAtX(Math.floor(x)).id === 'glade' && y > HIDDEN_CLEARING.y - HIDDEN_CLEARING.ry - 1;
/** Where the fox waits once she trusts you, beside the ring. */
export const FOX_CLEARING = { x: W + 11.6, y: 20.9 };
/** She's at the clearing once she's given you her scarf (old saves can be trusted without it: she's still on her trail). */
export const foxAtClearing = (s: SaveState) => s.perks.includes('shadowscarf');
export function claimFoxScarf(s: SaveState): boolean {
  if (s.perks.includes('shadowscarf')) return false;
  s.perks.push('shadowscarf');
  for (const flag of ['fox:seen', 'fox:trusted', 'fox:trial']) if (!s.flags.includes(flag)) s.flags.push(flag);
  return true;
}
/** Six readable tells. A dodge changes lanes; the marked lane stays fixed until impact. No health or inventory cost. */
export class FoxTrial {
  lane = 1;
  marked = 1;
  time = 0;
  wave = 0;
  hits = 0;
  dodges = 0;
  dodgeT = 0;
  readonly tell = 1.05;
  readonly interval = 1.65;
  get done() { return this.wave >= 6; }
  get passed() { return this.done && this.hits === 0 && this.dodges >= 6; }
  get phase() { return this.time < this.tell ? 'tell' : 'fall'; }
  dodge(direction: -1 | 1) {
    if (this.done || this.dodgeT > 0) return;
    const lane = Math.max(0, Math.min(2, this.lane + direction));
    if (lane === this.lane) return;
    this.lane = lane; this.dodgeT = .22;
  }
  update(dt: number) {
    if (this.done) return;
    const before = this.time;
    this.time += Math.max(0, Math.min(dt, .1));
    this.dodgeT = Math.max(0, this.dodgeT - dt);
    if (before < this.tell && this.time >= this.tell) {
      if (this.lane === this.marked) this.hits++; else this.dodges++;
    }
    if (this.time >= this.interval) { this.time -= this.interval; this.wave++; this.marked = this.lane; }
  }
}
