import type { CraftPresentation } from '../types';

export default {
  "id": "sawmill1",
  "duration": 4000,
  "scene": "building",
  "eyebrow": "SOWERBY · BUILT BY HAND",
  "layers": [
    {
      "id": "site",
      "src": "assets/buildings/sawmill1-site.webp"
    },
    {
      "id": "stone-floor",
      "src": "assets/buildings/sawmill1-stone-floor.webp"
    },
    {
      "id": "pine-frame",
      "src": "assets/buildings/sawmill1-pine-frame.webp"
    },
    {
      "id": "pine-roof",
      "src": "assets/buildings/sawmill1-pine-roof.webp"
    },
    {
      "id": "copper-blade",
      "src": "assets/buildings/sawmill1-copper-blade.webp"
    }
  ],
  "complete": "assets/buildings/sawmill1-complete.webp",
  "roles": {
    "stone": "The floor and the post footings",
    "pine": "The shed, its bench and its roof",
    "copper": "The round blade"
  },
  "targets": [
    {
      "material": "stone",
      "part": "stone-floor",
      "at": 240,
      "duration": 480,
      "x": 0.5,
      "y": 0.68,
      "contact": "solid",
      "sound": "thud"
    },
    {
      "material": "pine",
      "part": "pine-frame",
      "at": 880,
      "duration": 480,
      "x": 0.5,
      "y": 0.42,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "pine",
      "part": "pine-roof",
      "at": 1520,
      "duration": 480,
      "x": 0.5,
      "y": 0.2,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "copper",
      "part": "copper-blade",
      "at": 2160,
      "duration": 480,
      "x": 0.63,
      "y": 0.54,
      "contact": "solid",
      "sound": "clink"
    }
  ],
  "phases": [
    {
      "at": 0,
      "stage": "floor",
      "text": "Stone lays a floor and footings."
    },
    {
      "at": 760,
      "stage": "shed",
      "text": "Pine posts, a back wall and a sawing bench."
    },
    {
      "at": 1400,
      "stage": "roof",
      "text": "A pine roof leans over the bench."
    },
    {
      "at": 2040,
      "stage": "blade",
      "text": "Copper is cut into a big round blade."
    },
    {
      "at": 3000,
      "stage": "reveal",
      "text": "Bram’s Sawmill, ready for oak.",
      "sound": "ding"
    }
  ],
  "sceneLabel": "Stone makes the floor and post footings. Pine Logs make the shed, its bench and its roof. Copper Ore becomes the round saw blade.",
  "pattern": "logs in, planks out",
  "intro": "Stone, pine and copper for Bram.",
  "finished": "A shed, a bench and a copper blade."
} satisfies CraftPresentation;
