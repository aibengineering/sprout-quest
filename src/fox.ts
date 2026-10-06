// The masked fox is a Glimmer spirit, never a public Sowerby recruit or a hunt target.
import { zoneById } from './data';
import type { SaveState } from './state';
const H = zoneById('hollow').x0;
export const FOX_SIGHT = { x: H + 6.5, y: 8.7 };
export const FOX_TRAIL = [{ x: H + 13.5, y: 7.8 }, { x: H + 13.5, y: 5.8 }, { x: H + 20.5, y: 5.8 }];
export const FOX_DEN = { x: H + 25.2, y: 7.8 };
export const FOX_TRAINING = { x: H + 26, y: 6, w: 3, h: 1.5 };
export const foxTrusted = (s: SaveState) => s.flags.includes('fox:trusted') || s.build.training > 0;
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
