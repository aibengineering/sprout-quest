import type { CraftPresentation } from '../types';

export default {
  "id": "forge4",
  "duration": 3360,
  "scene": "building",
  "model": "assets/crafting3d/forge4.glb",
  "eyebrow": "SOWERBY · BUILT BY HAND",
  "layers": [
    {
      "id": "base",
      "src": "assets/buildings/forge4-base.webp"
    },
    {
      "id": "crystal-kiln",
      "src": "assets/buildings/forge4-crystal-kiln.webp"
    },
    {
      "id": "glimmer-glaze",
      "src": "assets/buildings/forge4-glimmer-glaze.webp"
    },
    {
      "id": "echo-vane",
      "src": "assets/buildings/forge4-echo-vane.webp"
    }
  ],
  "complete": "assets/buildings/forge4-complete.webp",
  "roles": {
    "crystal": "The crystal-brick kiln and the crystals growing on it",
    "glimmer": "Glowing glaze and the kiln’s mouth",
    "echowing": "A bat-wing weathervane on the kiln"
  },
  "targets": [
    {
      "material": "crystal",
      "part": "crystal-kiln",
      "at": 240,
      "duration": 480,
      "x": 0.88,
      "y": 0.59,
      "contact": "energy",
      "sound": "ding"
    },
    {
      "material": "glimmer",
      "part": "glimmer-glaze",
      "at": 880,
      "duration": 480,
      "x": 0.89,
      "y": 0.64,
      "contact": "bind",
      "sound": "craftGoo"
    },
    {
      "material": "echowing",
      "part": "echo-vane",
      "at": 1520,
      "duration": 480,
      "x": 0.87,
      "y": 0.41,
      "contact": "soft",
      "sound": "craftFluff"
    }
  ],
  "phases": [
    {
      "at": 0,
      "stage": "kiln",
      "text": "Crystal bricks round up into a kiln."
    },
    {
      "at": 760,
      "stage": "glaze",
      "text": "Glimmer Jelly glazes it, and the mouth glows."
    },
    {
      "at": 1400,
      "stage": "vane",
      "text": "The Echo Wing spreads over the kiln as a vane."
    },
    {
      "at": 2360,
      "stage": "reveal",
      "text": "The Crystal Kiln, for crystal gear.",
      "sound": "ding"
    }
  ],
  "sceneLabel": "Crystal becomes the domed kiln beside the Forge, with crystals growing from it. Glimmer Jelly glazes it in glowing bands and lights its mouth. The Echo Wing becomes a weathervane on top.",
  "pattern": "a kiln for crystal",
  "intro": "Crystal, Glimmer Jelly and the Echo Queen’s wing.",
  "finished": "A glowing kiln beside the old Forge."
} satisfies CraftPresentation;
