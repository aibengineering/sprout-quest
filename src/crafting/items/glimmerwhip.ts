import type { CraftPresentation } from '../types';
export default {
  id: 'glimmerwhip', model: 'assets/crafting3d/glimmerwhip.glb', duration: 3500,
  layers: ['core-anchor', 'glass-grip', 'jelly-lash', 'shard-tip'].map(id => ({ id })),
  roles: { core: 'Golem Core grip anchor', glimmer: 'Hardened glass grip, glowing coiled lash & icy shard tip' },
  targets: [
    { material: 'core', part: 'core-anchor', at: 180, duration: 430, contact: 'solid', sound: 'craftStitch' },
    { material: 'glimmer', part: 'glass-grip', at: 720, duration: 470, contact: 'solid', sound: 'tick' },
    { material: 'glimmer', part: 'jelly-lash', at: 1250, duration: 500, contact: 'bind', sound: 'craftGoo' },
    { material: 'glimmer', part: 'shard-tip', at: 1850, duration: 450, contact: 'solid', sound: 'tick' },
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
