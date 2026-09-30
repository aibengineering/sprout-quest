import type { CraftPresentation } from '../types';

export default {
  "id": "garden2",
  "duration": 3360,
  "scene": "building",
  "eyebrow": "SOWERBY · BUILT BY HAND",
  "layers": [
    {
      "id": "base",
      "src": "assets/buildings/garden2-base.webp"
    },
    {
      "id": "stone-path",
      "src": "assets/buildings/garden2-stone-path.webp"
    },
    {
      "id": "plank-trellis",
      "src": "assets/buildings/garden2-plank-trellis.webp"
    },
    {
      "id": "shroom-berries",
      "src": "assets/buildings/garden2-shroom-berries.webp"
    }
  ],
  "complete": "assets/buildings/garden2-complete.webp",
  "roles": {
    "stone": "A stepping-stone path and corner stones",
    "plank": "The trellis at the back",
    "cap": "Compost for the beds, and ripe berries"
  },
  "targets": [
    {
      "material": "stone",
      "part": "stone-path",
      "at": 240,
      "duration": 480,
      "x": 0.5,
      "y": 0.76,
      "contact": "solid",
      "sound": "thud"
    },
    {
      "material": "plank",
      "part": "plank-trellis",
      "at": 880,
      "duration": 480,
      "x": 0.5,
      "y": 0.28,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "cap",
      "part": "shroom-berries",
      "at": 1520,
      "duration": 480,
      "x": 0.5,
      "y": 0.43,
      "contact": "soft",
      "sound": "craftFluff"
    }
  ],
  "phases": [
    {
      "at": 0,
      "stage": "path",
      "text": "Stone for a path and the bed corners."
    },
    {
      "at": 760,
      "stage": "trellis",
      "text": "Oak Planks go up as a trellis."
    },
    {
      "at": 1400,
      "stage": "berries",
      "text": "Shroom Caps feed the beds. Berries ripen!"
    },
    {
      "at": 2360,
      "stage": "reveal",
      "text": "A berry garden, ready to pick.",
      "sound": "ding"
    }
  ],
  "sceneLabel": "Stone lays a stepping-stone path and the bed corners. Oak Planks make a trellis. Shroom Caps compost the beds, and berries ripen on the trellis and the plants.",
  "pattern": "berries by summer",
  "intro": "Stone, planks and shroom compost.",
  "finished": "A path, a trellis and berries everywhere."
} satisfies CraftPresentation;
