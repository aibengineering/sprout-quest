import type { CraftPresentation } from '../types';

export default {
  "id": "training3",
  "duration": 3360,
  "scene": "building",
  "model": "assets/crafting3d/training3.glb",
  "eyebrow": "SOWERBY · BUILT BY HAND",
  "layers": [
    {
      "id": "base"
    },
    {
      "id": "pine-deck"
    },
    {
      "id": "iron-gong"
    },
    {
      "id": "imp-horns"
    }
  ],
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
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "iron",
      "part": "iron-gong",
      "at": 880,
      "duration": 480,
      "contact": "solid",
      "sound": "clink"
    },
    {
      "material": "horn",
      "part": "imp-horns",
      "at": 1520,
      "duration": 480,
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
