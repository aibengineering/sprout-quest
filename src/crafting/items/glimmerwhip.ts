import type { CraftPresentation } from '../types';
const src = (part: string) => `assets/crafting/glimmerwhip-${part}.webp`;
export default {
  id: 'glimmerwhip', duration: 3500,
  layers: ['core-anchor', 'glass-grip', 'jelly-lash', 'shard-tip'].map(id => ({ id, src: src(id) })),
  complete: src('complete'),
  roles: { core: 'Golem Core grip anchor', glimmer: 'Hardened glass grip, glowing coiled lash & icy shard tip' },
  targets: [
    { material: 'core', part: 'core-anchor', at: 180, duration: 430, x: .15, y: .643, contact: 'solid', sound: 'craftStitch' },
    { material: 'glimmer', part: 'glass-grip', at: 720, duration: 470, x: .315, y: .479, contact: 'solid', sound: 'tick' },
    { material: 'glimmer', part: 'jelly-lash', at: 1250, duration: 500, x: .584, y: .416, contact: 'bind', sound: 'craftGoo' },
    { material: 'glimmer', part: 'shard-tip', at: 1850, duration: 450, x: .822, y: .491, contact: 'solid', sound: 'tick' },
  ],
  phases: [
    { at: 0, stage: 'anchor', text: 'A Golem Core, nestled at the grip…' },
    { at: 680, stage: 'harden', text: 'Glimmer Jelly, hardening into a clear glass grip…' },
    { at: 1220, stage: 'coil', text: 'Soft Glimmer Jelly, curling into glowing coils…' },
    { at: 2700, stage: 'reveal', text: 'A glowing lash with a glassy sting.', sound: 'craftStitch' },
  ],
  sceneLabel: 'A Golem Core anchors the grip. Glimmer Jelly hardens into a faceted glass grip, curls softly into glowing coils, and sets into an icy shard at the tip.',
  pattern: 'soft glow, a glassy sting', intro: 'A core, jelly glass, and a glowing coil.',
  finished: 'Glimmer glass and glowing coils, anchored by a Golem Core.',
} satisfies CraftPresentation;
