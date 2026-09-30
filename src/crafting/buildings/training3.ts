import type { CraftPresentation } from '../types';

export default {
  "id": "training3",
  "duration": 3360,
  "scene": "building",
  "eyebrow": "SOWERBY · BUILT BY HAND",
  "layers": [
    {
      "id": "base",
      "src": "assets/buildings/training3-base.webp"
    },
    {
      "id": "pine-deck",
      "src": "assets/buildings/training3-pine-deck.webp"
    },
    {
      "id": "iron-gong",
      "src": "assets/buildings/training3-iron-gong.webp"
    },
    {
      "id": "imp-horns",
      "src": "assets/buildings/training3-imp-horns.webp"
    }
  ],
  "complete": "assets/buildings/training3-complete.webp",
  "roles": {
    "pineplank": "The deck and the Dojo gate",
    "iron": "A gong and iron post caps",
    "horn": "Horns crowning the gate"
  },
  "targets": [
    {
      "material": "pineplank",
      "part": "pine-deck",
      "at": 240,
      "duration": 480,
      "x": 0.5,
      "y": 0.49,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "iron",
      "part": "iron-gong",
      "at": 880,
      "duration": 480,
      "x": 0.5,
      "y": 0.29,
      "contact": "solid",
      "sound": "clink"
    },
    {
      "material": "horn",
      "part": "imp-horns",
      "at": 1520,
      "duration": 480,
      "x": 0.5,
      "y": 0.13,
      "contact": "solid",
      "sound": "clink"
    }
  ],
  "phases": [
    {
      "at": 0,
      "stage": "deck",
      "text": "Pine Planks lay a deck and raise a gate."
    },
    {
      "at": 760,
      "stage": "gong",
      "text": "Iron hangs a gong and caps the posts."
    },
    {
      "at": 1400,
      "stage": "horns",
      "text": "Imp Horns crown the gate."
    },
    {
      "at": 2360,
      "stage": "reveal",
      "text": "The Dojo. Bow as you enter.",
      "sound": "ding"
    }
  ],
  "sceneLabel": "Pine Planks make the deck and the Dojo gate. Iron Ore becomes a gong and caps on the posts. Imp Horns crown the gate.",
  "pattern": "the way of the blade",
  "intro": "Pine planks, iron and Imp Horns.",
  "finished": "A deck, a gong and a horned gate."
} satisfies CraftPresentation;
