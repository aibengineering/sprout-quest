import type { CraftPresentation } from '../types';

export default {
  "id": "pick1",
  "model": "assets/crafting3d/pick1.glb",
  "duration": 2800,
  "layers": [
    {
      "id": "existing-tool"
    },
    {
      "id": "goo-joint"
    },
    {
      "id": "fluff-wrap"
    }
  ],
  "roles": {
    "goo": "Seats the inherited stone head",
    "fluff": "Soft grip and protective head wrap"
  },
  "targets": [
    {
      "material": "goo",
      "part": "goo-joint",
      "at": 220,
      "duration": 480,
      "contact": "bind",
      "sound": "craftGoo"
    },
    {
      "material": "fluff",
      "part": "fluff-wrap",
      "at": 960,
      "duration": 530,
      "contact": "soft",
      "sound": "craftFluff"
    }
  ],
  "phases": [
    {
      "at": 0,
      "stage": "repair",
      "text": "Oswin’s old head and haft, ready to mend."
    },
    {
      "at": 850,
      "stage": "wrapping",
      "text": "Bunny Fluff winds a soft grip and securing wrap."
    },
    {
      "at": 2050,
      "stage": "reveal",
      "text": "The old pick, ready to chip again.",
      "sound": "craftStitch"
    }
  ],
  "sceneLabel": "Oswin’s existing stone pick head and wooden haft are repaired with Slime Goo at the joint and Bunny Fluff around the grip and head.",
  "pattern": "old tools, fresh care",
  "intro": "A worn pick. A little care.",
  "finished": "Goo seats the old head. Fluff cushions and secures it."
} satisfies CraftPresentation;
