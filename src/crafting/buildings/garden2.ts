import type { CraftPresentation } from '../types';

export default {
  "id": "garden2",
  "duration": 3360,
  "scene": "building",
  "model": "assets/crafting3d/garden2.glb",
  "eyebrow": "SOWERBY · BUILT BY HAND",
  "layers": [
    {
      "id": "base",
      "src": "assets/buildings/garden2-base.webp"
    },
    {
      "id": "plank-beds",
      "src": "assets/buildings/garden2-plank-beds.webp"
    },
    {
      "id": "stone-path",
      "src": "assets/buildings/garden2-stone-path.webp"
    },
    {
      "id": "shroom-basket",
      "src": "assets/buildings/garden2-shroom-basket.webp"
    }
  ],
  "complete": "assets/buildings/garden2-complete.webp",
  "roles": {
    "plank": "Two more beds",
    "stone": "Gateposts and stepping stones between the beds",
    "cap": "A basket of caps for compost"
  },
  "targets": [
    {
      "material": "plank",
      "part": "plank-beds",
      "at": 240,
      "duration": 480,
      "x": 0.23,
      "y": 0.54,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "stone",
      "part": "stone-path",
      "at": 880,
      "duration": 480,
      "x": 0.5,
      "y": 0.59,
      "contact": "solid",
      "sound": "thud"
    },
    {
      "material": "cap",
      "part": "shroom-basket",
      "at": 1520,
      "duration": 480,
      "x": 0.87,
      "y": 0.74,
      "contact": "soft",
      "sound": "craftFluff"
    }
  ],
  "phases": [
    {
      "at": 0,
      "stage": "beds",
      "text": "Oak Planks make two more beds."
    },
    {
      "at": 760,
      "stage": "path",
      "text": "Stone gateposts, and stepping stones between the beds."
    },
    {
      "at": 1400,
      "stage": "compost",
      "text": "A basket of Shroom Caps, for the compost."
    },
    {
      "at": 2360,
      "stage": "reveal",
      "text": "Four beds, ready for berries.",
      "sound": "ding"
    }
  ],
  "sceneLabel": "Oak Planks make two more beds. Stone becomes gateposts and stepping stones between the beds. Shroom Caps fill a basket for the compost.",
  "pattern": "berries by summer",
  "intro": "Planks, stone and shroom compost.",
  "finished": "Four beds, a path and a basket."
} satisfies CraftPresentation;
