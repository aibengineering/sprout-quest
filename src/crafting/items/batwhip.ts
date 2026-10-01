import type { CraftPresentation } from '../types';

export default {
  id: 'batwhip', model: 'assets/crafting3d/batwhip.glb', duration: 3400,
  layers: ['wing-grip', 'wing-lash', 'core-pommel', 'fang-hooks'].map(id => ({ id })),
  roles: { wing: 'Folded grip & supple wing-strip lash', core: 'Stone-ringed pommel', fang: 'Two curved pommel hooks' },
  targets: [
    { material: 'wing', part: 'wing-grip', at: 220, duration: 460, contact: 'bind', sound: 'craftPull' },
    { material: 'wing', part: 'wing-lash', at: 800, duration: 540, contact: 'soft', sound: 'craftFluff' },
    { material: 'core', part: 'core-pommel', at: 1480, duration: 430, contact: 'energy', sound: 'tick' },
    { material: 'fang', part: 'fang-hooks', at: 2020, duration: 420, contact: 'solid', sound: 'tick' },
  ],
  phases: [
    { at: 0, stage: 'fold', text: 'Bat Wings fold into the grip and curl into a supple lash…' },
    { at: 1450, stage: 'setting', text: 'A Golem Core settles in. Sharp Fangs hook around it…' },
    { at: 2700, stage: 'reveal', text: 'A last soft coil. Ready to unfurl.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Bat Wings become the stitched grip and coiled lash. A gray-ringed Golem Core seats in the pommel, with two ivory Sharp Fang hooks. Assembly is automatic.',
  pattern: 'fold, curl, settle', intro: 'Supple wings. A little cavern light.',
  finished: 'Wing-strip coils, a Golem Core and two curved fangs.',
} satisfies CraftPresentation;
