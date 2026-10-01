import type { CraftPresentation } from '../types';

export default {
  "id": "cottage1",
  "duration": 4880,
  "scene": "building",
  "eyebrow": "SOWERBY · BUILT BY HAND",
  "layers": [
    {
      "id": "site",
      "src": "assets/buildings/cottage1-site.webp"
    },
    {
      "id": "stone-footing",
      "src": "assets/buildings/cottage1-stone-footing.webp"
    },
    {
      "id": "pine-frame",
      "src": "assets/buildings/cottage1-pine-frame.webp"
    },
    {
      "id": "plank-walls",
      "src": "assets/buildings/cottage1-plank-walls.webp"
    },
    {
      "id": "pine-roof",
      "src": "assets/buildings/cottage1-pine-roof.webp"
    },
    {
      "id": "stone-chimney",
      "src": "assets/buildings/cottage1-stone-chimney.webp"
    },
    {
      "id": "copper-touches",
      "src": "assets/buildings/cottage1-copper-touches.webp"
    }
  ],
  "complete": "assets/buildings/cottage1-complete.webp",
  "roles": {
    "stone": "The footing, the doorstep and the chimney",
    "pine": "Corner posts and the roof",
    "plank": "Plank walls, the round door and the window box",
    "copper": "The weathervane, the door knob and a lantern"
  },
  "targets": [
    {
      "material": "stone",
      "part": "stone-footing",
      "at": 240,
      "duration": 480,
      "x": 0.48,
      "y": 0.72,
      "contact": "solid",
      "sound": "thud"
    },
    {
      "material": "pine",
      "part": "pine-frame",
      "at": 800,
      "duration": 480,
      "x": 0.48,
      "y": 0.66,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "plank",
      "part": "plank-walls",
      "at": 1360,
      "duration": 480,
      "x": 0.48,
      "y": 0.56,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "pine",
      "part": "pine-roof",
      "at": 1920,
      "duration": 480,
      "x": 0.48,
      "y": 0.32,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "stone",
      "part": "stone-chimney",
      "at": 2480,
      "duration": 480,
      "x": 0.29,
      "y": 0.21,
      "contact": "solid",
      "sound": "thud"
    },
    {
      "material": "copper",
      "part": "copper-touches",
      "at": 3040,
      "duration": 480,
      "x": 0.54,
      "y": 0.47,
      "contact": "solid",
      "sound": "clink"
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
      "text": "Pine corner posts stand up."
    },
    {
      "at": 1240,
      "stage": "walls",
      "text": "An Oak Plank becomes walls and a round green door."
    },
    {
      "at": 1800,
      "stage": "roof",
      "text": "Pine rafters and red shingles close the roof."
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
  "sceneLabel": "Stone makes the footing, the doorstep and the chimney. Pine Logs make the corner posts and the roof. Oak Planks make the walls, the round green door and the window box. Copper becomes a pick-shaped weathervane, the door knob and a lantern.",
  "pattern": "a home for someone new",
  "intro": "Stone, pine, a plank and some copper.",
  "finished": "Plank walls, a round door and a lantern lit."
} satisfies CraftPresentation;
