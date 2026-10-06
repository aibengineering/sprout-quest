import type { CraftPresentation } from '../types';

export default {
  id: 'ironplate', model: 'assets/crafting3d/ironplate.glb', duration: 3650,
  layers: ['fluff-gambeson', 'goo-seams', 'iron-shell', 'iron-helmet', 'iron-guards', 'copper-rivets'].map(id => ({ id })),
  roles: { fluff: 'Quilted gambeson, sleeves & cloth hem', goo: 'Bound hems & cuffs',
    iron: 'Forged breastplate, layered pauldrons, waist plates & open helm', copper: 'Small rivets & belt buckle' },
  targets: [
    { material: 'fluff', part: 'fluff-gambeson', at: 120, duration: 470, contact: 'soft', sound: 'craftFluff' },
    { material: 'goo', part: 'goo-seams', at: 610, duration: 440, contact: 'bind', sound: 'craftGoo' },
    { material: 'iron', part: 'iron-shell', at: 720, duration: 480, contact: 'solid', sound: 'craftStitch' },
    { material: 'iron', part: 'iron-helmet', at: 1100, duration: 480, contact: 'solid', sound: 'craftStitch' },
    { material: 'iron', part: 'iron-guards', at: 1520, duration: 480, contact: 'solid', sound: 'craftStitch' },
    { material: 'copper', part: 'copper-rivets', at: 2050, duration: 480, contact: 'solid', sound: 'craftStitch' },
  ],
  phases: [
    { at: 0, stage: 'line', text: 'Bunny Fluff, quilted into a padded gambeson…' },
    { at: 610, stage: 'binding', text: 'Slime Goo, sealing the cloth seams…' },
    { at: 720, stage: 'forge', text: 'Iron, forged into a broad breastplate and open helm…' },
    { at: 1520, stage: 'guard', text: 'Overlapping iron plates, fitted at shoulders and waist…' },
    { at: 2050, stage: 'rivet', text: 'Copper rivets and a little belt buckle, tapping into place…' },
    { at: 2850, stage: 'reveal', text: 'Honest iron. A soft lining for the road.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Fluff forms a quilted gambeson with bound goo seams. Iron forms a ridged breastplate, layered pauldrons, waist plates and an open helmet with cheek guards. Small copper rivets and a belt buckle finish the suit.',
  pattern: 'quilted, forged, riveted', intro: 'A padded coat beneath a proper suit of iron.',
  finished: 'A forged iron breastplate and helm, layered guards, quilted lining and copper rivets.',
} satisfies CraftPresentation;
