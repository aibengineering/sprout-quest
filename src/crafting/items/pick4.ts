import type { CraftPresentation } from '../types';

export default {
  "id": "pick4",
  "model": "assets/crafting3d/pick4.glb",
  "duration": 3300,
  "layers": [
    {
      "id": "iron-haft"
    },
    {
      "id": "crystal-head"
    },
    {
      "id": "iron-socket"
    }
  ],
  "roles": {
    "iron": "Metal shaft, grip and securing collar",
    "crystal": "Broad faceted working head"
  },
  "targets": [
    {
      "material": "iron",
      "part": "iron-haft",
      "at": 200,
      "duration": 500,
      "contact": "solid",
      "sound": "craftStitch"
    },
    {
      "material": "crystal",
      "part": "crystal-head",
      "at": 870,
      "duration": 600,
      "contact": "energy",
      "sound": "craftStitch"
    },
    {
      "material": "iron",
      "part": "iron-socket",
      "at": 1660,
      "duration": 440,
      "contact": "solid",
      "sound": "craftStitch"
    }
  ],
  "phases": [
    {
      "at": 0,
      "stage": "haft",
      "text": "Iron draws into a sturdy shaft and ridged grip."
    },
    {
      "at": 790,
      "stage": "crystal",
      "text": "Crystal facets join into a broad working head."
    },
    {
      "at": 1580,
      "stage": "seating",
      "text": "The iron collar seats around the crystal head."
    },
    {
      "at": 2490,
      "stage": "reveal",
      "text": "Clear crystal, held firmly by iron.",
      "sound": "craftStitch"
    }
  ],
  "sceneLabel": "Iron forms the metal shaft, grip and securing collar. Crystal forms the entire broad faceted pick head.",
  "pattern": "clear facets, firm footing",
  "intro": "Iron Ore and Crystal Shards, ready to fit together.",
  "finished": "A crystal head. An iron grip and collar. Ready for the hollow."
} satisfies CraftPresentation;
