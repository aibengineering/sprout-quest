import type { CraftPresentation } from '../types';

export default {
  "id": "cottage1",
  "duration": 4880,
  "scene": "building",
  "model": "assets/crafting3d/cottage1.glb",
  "eyebrow": "SOWERBY · BUILT BY BRAM",
  "layers": [
    {
      "id": "site"
    },
    {
      "id": "stone-footing"
    },
    {
      "id": "oak-frame"
    },
    {
      "id": "plank-walls"
    },
    {
      "id": "plank-roof"
    },
    {
      "id": "stone-chimney"
    },
    {
      "id": "copper-touches"
    },
    {
      "id": "flower"
    }
  ],
  "roles": {
    "stone": "The footing, the doorstep and the chimney",
    "bark": "Oak beams: the corner posts and the roof frame",
    "plank": "Plank walls, the round door, the window box and the roof boards",
    "copper": "The weathervane, the door knob and a lantern",
    "flower": "Flowers from Poppy’s garden by the doorway"
  },
  "targets": [
    {
      "material": "stone",
      "part": "stone-footing",
      "at": 240,
      "duration": 480,
      "contact": "solid",
      "sound": "thud"
    },
    {
      "material": "bark",
      "part": "oak-frame",
      "at": 800,
      "duration": 480,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "plank",
      "part": "plank-walls",
      "at": 1360,
      "duration": 480,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "plank",
      "part": "plank-roof",
      "at": 1920,
      "duration": 480,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "stone",
      "part": "stone-chimney",
      "at": 2480,
      "duration": 480,
      "contact": "solid",
      "sound": "thud"
    },
    {
      "material": "copper",
      "part": "copper-touches",
      "at": 3040,
      "duration": 480,
      "contact": "solid",
      "sound": "clink"
    },
    {
      "material": "flower",
      "part": "flower",
      "at": 2160,
      "duration": 480,
      "contact": "soft",
      "sound": "craftFluff"
    }
  ],
  "phases": [
    {
      "at": 0,
      "stage": "footing",
      "text": "Stone makes a footing by the molehill."
    },
    {
      "at": 680,
      "stage": "frame",
      "text": "Oak beams stand up as the frame."
    },
    {
      "at": 1240,
      "stage": "walls",
      "text": "Oak Planks become walls and a round green door."
    },
    {
      "at": 1800,
      "stage": "roof",
      "text": "More planks, and red shingles, close the roof."
    },
    {
      "at": 2360,
      "stage": "chimney",
      "text": "Stone again, for a little chimney."
    },
    {
      "at": 2920,
      "stage": "copper",
      "text": "Copper for a pick weathervane and a lantern."
    },
    {
      "at": 3880,
      "stage": "reveal",
      "text": "A cosy cottage for a newcomer.",
      "sound": "ding"
    }
  ],
  "sceneLabel": "Stone makes the footing, the doorstep and the chimney. Oak Logs make the beams of the frame. Oak Planks make the walls, the round green door, the window box and the roof. Copper becomes a pick-shaped weathervane, the door knob and a lantern.",
  "pattern": "a home for someone new",
  "intro": "Stone, oak beams, a stack of planks and some copper.",
  "finished": "Plank walls, a round door and a lantern lit."
} satisfies CraftPresentation;
