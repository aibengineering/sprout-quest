import type { CraftPresentation } from '../types';

export default {
  "id": "sawmill3",
  "duration": 3360,
  "scene": "building",
  "model": "assets/crafting3d/sawmill3.glb",
  "eyebrow": "SOWERBY · BUILT BY HAND",
  "layers": [
    {
      "id": "base",
      "src": "assets/buildings/sawmill3-base.webp"
    },
    {
      "id": "plank-deck",
      "src": "assets/buildings/sawmill3-plank-deck.webp"
    },
    {
      "id": "glimwood-logs",
      "src": "assets/buildings/sawmill3-glimwood-logs.webp"
    },
    {
      "id": "crystal-blade",
      "src": "assets/buildings/sawmill3-crystal-blade.webp"
    }
  ],
  "complete": "assets/buildings/sawmill3-complete.webp",
  "roles": {
    "pineplank": "A plank deck in front",
    "glimwood": "Glimmerwood waiting to be sawn",
    "crystal": "The crystal blade and a lamp"
  },
  "targets": [
    {
      "material": "pineplank",
      "part": "plank-deck",
      "at": 240,
      "duration": 480,
      "x": 0.53,
      "y": 0.84,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "glimwood",
      "part": "glimwood-logs",
      "at": 880,
      "duration": 480,
      "x": 0.86,
      "y": 0.68,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "crystal",
      "part": "crystal-blade",
      "at": 1520,
      "duration": 480,
      "x": 0.54,
      "y": 0.5,
      "contact": "energy",
      "sound": "ding"
    }
  ],
  "phases": [
    {
      "at": 0,
      "stage": "deck",
      "text": "Pine Planks lay a deck in front."
    },
    {
      "at": 760,
      "stage": "logs",
      "text": "Glimmerwood logs, glowing softly, wait their turn."
    },
    {
      "at": 1400,
      "stage": "blade",
      "text": "Crystal becomes a clear, bright blade."
    },
    {
      "at": 2360,
      "stage": "reveal",
      "text": "The Crystal Sawmill, ready for Glimmerwood.",
      "sound": "ding"
    }
  ],
  "sceneLabel": "Pine Planks lay a deck in front of the shed. Glimmerwood Logs are stacked, glowing, beside it. Crystal becomes the new blade and a lamp.",
  "pattern": "a blade of light",
  "intro": "Crystal and Glimmerwood for the mill.",
  "finished": "A crystal blade that saws Glimmerwood."
} satisfies CraftPresentation;
