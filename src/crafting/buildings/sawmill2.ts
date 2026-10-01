import type { CraftPresentation } from '../types';

export default {
  "id": "sawmill2",
  "duration": 3360,
  "scene": "building",
  "model": "assets/crafting3d/sawmill2.glb",
  "eyebrow": "SOWERBY · BUILT BY HAND",
  "layers": [
    {
      "id": "base"
    },
    {
      "id": "stone-ramp"
    },
    {
      "id": "pine-store"
    },
    {
      "id": "iron-blade"
    }
  ],
  "roles": {
    "stone": "A stepped log ramp",
    "pine": "A log store under its own roof",
    "iron": "A new blade and bands on the posts"
  },
  "targets": [
    {
      "material": "stone",
      "part": "stone-ramp",
      "at": 240,
      "duration": 480,
      "contact": "solid",
      "sound": "thud"
    },
    {
      "material": "pine",
      "part": "pine-store",
      "at": 880,
      "duration": 480,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "iron",
      "part": "iron-blade",
      "at": 1520,
      "duration": 480,
      "contact": "solid",
      "sound": "clink"
    }
  ],
  "phases": [
    {
      "at": 0,
      "stage": "ramp",
      "text": "Stone steps up into a log ramp."
    },
    {
      "at": 760,
      "stage": "store",
      "text": "Pine logs, stored under their own roof."
    },
    {
      "at": 1400,
      "stage": "blade",
      "text": "An iron blade, and iron bands on the posts."
    },
    {
      "at": 2360,
      "stage": "reveal",
      "text": "The Iron Sawmill, ready for pine.",
      "sound": "ding"
    }
  ],
  "sceneLabel": "Stone makes a stepped log ramp. Pine Logs make a store under its own roof. Iron Ore becomes the new blade and bands on the posts.",
  "pattern": "a sharper blade",
  "intro": "Stone, pine and iron for a bigger mill.",
  "finished": "An iron blade that bites through pine."
} satisfies CraftPresentation;
