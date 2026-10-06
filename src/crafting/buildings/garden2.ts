import type { CraftPresentation } from '../types';

export default {
  "id": "garden2",
  "duration": 3360,
  "scene": "building",
  "model": "assets/crafting3d/garden2.glb",
  "eyebrow": "SOWERBY · BUILT BY HAND",
  "layers": [
    {
      "id": "base"
    },
    {
      "id": "plank-plots"
    },
    {
      "id": "stone-path"
    },
    {
      "id": "shroom-basket"
    }
  ],
  "roles": {
    "plank": "Six more plots, a row and a column",
    "stone": "Gateposts and stepping stones round the paths",
    "cap": "A basket of caps for compost"
  },
  "targets": [
    {
      "material": "plank",
      "part": "plank-plots",
      "at": 240,
      "duration": 480,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "stone",
      "part": "stone-path",
      "at": 880,
      "duration": 480,
      "contact": "solid",
      "sound": "thud"
    },
    {
      "material": "cap",
      "part": "shroom-basket",
      "at": 1520,
      "duration": 480,
      "contact": "soft",
      "sound": "craftFluff"
    }
  ],
  "phases": [
    {
      "at": 0,
      "stage": "beds",
      "text": "Oak Planks edge six more plots: a new row and a new column."
    },
    {
      "at": 760,
      "stage": "path",
      "text": "Stone gateposts, and stepping stones round the paths."
    },
    {
      "at": 1400,
      "stage": "compost",
      "text": "A basket of Shroom Caps, for the compost."
    },
    {
      "at": 2360,
      "stage": "reveal",
      "text": "Twelve plots, ready for berries.",
      "sound": "ding"
    }
  ],
  "sceneLabel": "Oak Planks edge six more plots, a new row and a new column. Stone becomes gateposts and stepping stones round the paths. Shroom Caps fill a basket for the compost.",
  "pattern": "berries by summer",
  "intro": "Planks, stone and shroom compost.",
  "finished": "Twelve plots, a path and a basket."
} satisfies CraftPresentation;
