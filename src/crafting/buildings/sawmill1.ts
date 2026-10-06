import type { CraftPresentation } from '../types';

export default {
  "id": "sawmill1",
  "duration": 4000,
  "scene": "building",
  "model": "assets/crafting3d/sawmill1.glb",
  "eyebrow": "SOWERBY · BUILT BY HAND",
  "layers": [
    {
      "id": "site"
    },
    {
      "id": "stone-floor"
    },
    {
      "id": "pine-frame"
    },
    {
      "id": "pine-roof"
    },
    {
      "id": "copper-blade"
    }
  ],
  "roles": {
    "stone": "The floor and the post footings",
    "pine": "The mill house and its roof",
    "copper": "The round blade"
  },
  "targets": [
    {
      "material": "stone",
      "part": "stone-floor",
      "at": 240,
      "duration": 480,
      "contact": "solid",
      "sound": "thud"
    },
    {
      "material": "pine",
      "part": "pine-frame",
      "at": 880,
      "duration": 480,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "pine",
      "part": "pine-roof",
      "at": 1520,
      "duration": 480,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "copper",
      "part": "copper-blade",
      "at": 2160,
      "duration": 480,
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
      "text": "Pine walls go up, with a wide front door."
    },
    {
      "at": 1400,
      "stage": "roof",
      "text": "A pine roof goes on over the mill."
    },
    {
      "at": 2040,
      "stage": "blade",
      "text": "Copper is cut into a big round blade, hung over the door."
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
  "finished": "A mill house with a door to walk in, and a copper blade."
} satisfies CraftPresentation;
