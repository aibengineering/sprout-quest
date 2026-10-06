import type { CraftPresentation } from '../types';

export default {
  "id": "training3",
  "duration": 3360,
  "scene": "building",
  "model": "assets/crafting3d/training3.glb",
  "eyebrow": "GLIMMER HOLLOW · BUILT BY BRAM",
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
    },
    {
      "id": "flower"
    }
  ],
  "roles": {
    "iron": "A gong and iron post caps",
    "horn": "Horns crowning the gate",
    "glimplank": "The deck and the practice gate",
    "flower": "Flowers from Poppy’s garden by the doorway"
  },
  "targets": [
    {
      "material": "glimplank",
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
    },
    {
      "material": "flower",
      "part": "flower",
      "at": 1800,
      "duration": 480,
      "contact": "soft",
      "sound": "craftFluff"
    }
  ],
  "phases": [
    {
      "at": 0,
      "stage": "deck",
      "text": "Glimmerwood Planks lay a deck and raise a gate."
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
      "text": "A quiet clearing for the harder lessons.",
      "sound": "ding"
    }
  ],
  "sceneLabel": "Glimmerwood Planks make the deck and the practice gate. Iron Ore becomes a gong and caps on the posts. Imp Horns crown the gate.",
  "pattern": "the way of the blade",
  "intro": "Bram builds the hidden clearing. The masked fox prepares the next lessons.",
  "finished": "The masked fox’s hidden clearing is ready for practice."
} satisfies CraftPresentation;
