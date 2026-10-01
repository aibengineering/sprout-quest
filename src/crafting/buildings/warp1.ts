import type { CraftPresentation } from '../types';

export default {
  "id": "warp1",
  "duration": 3360,
  "scene": "building",
  "model": "assets/crafting3d/warp1.glb",
  "eyebrow": "SOWERBY · BUILT BY HAND",
  "layers": [
    {
      "id": "base",
      "src": "assets/buildings/warp1-base.webp"
    },
    {
      "id": "pine-posts",
      "src": "assets/buildings/warp1-pine-posts.webp"
    },
    {
      "id": "iron-cradle",
      "src": "assets/buildings/warp1-iron-cradle.webp"
    },
    {
      "id": "alpha-pelt",
      "src": "assets/buildings/warp1-alpha-pelt.webp"
    }
  ],
  "complete": "assets/buildings/warp1-complete.webp",
  "roles": {
    "pine": "A ring of posts and a lantern",
    "iron": "Bands binding the old crystal back together",
    "alphapelt": "Draped at the stone’s foot"
  },
  "targets": [
    {
      "material": "pine",
      "part": "pine-posts",
      "at": 240,
      "duration": 480,
      "x": 0.5,
      "y": 0.7,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "iron",
      "part": "iron-cradle",
      "at": 880,
      "duration": 480,
      "x": 0.5,
      "y": 0.48,
      "contact": "solid",
      "sound": "clink"
    },
    {
      "material": "alphapelt",
      "part": "alpha-pelt",
      "at": 1520,
      "duration": 480,
      "x": 0.5,
      "y": 0.87,
      "contact": "soft",
      "sound": "craftFluff"
    }
  ],
  "phases": [
    {
      "at": 0,
      "stage": "posts",
      "text": "Pine posts ring the old plinth."
    },
    {
      "at": 760,
      "stage": "bands",
      "text": "Iron bands bind the crystal back together."
    },
    {
      "at": 1400,
      "stage": "pelt",
      "text": "The Alpha Pelt, laid at its foot."
    },
    {
      "at": 2360,
      "stage": "reveal",
      "text": "The Waystone hums. Every campfire is a step away.",
      "sound": "ding"
    }
  ],
  "sceneLabel": "Pine Logs make a ring of posts and a lantern round the old plinth. Iron Ore bands the Waystone’s crystal back together. The Alpha Pelt is draped at its foot.",
  "pattern": "a road through the stone",
  "intro": "Pine, iron and the Alpha Woolf’s pelt.",
  "finished": "Whole again, and humming."
} satisfies CraftPresentation;
