import type { CraftPresentation } from '../types';

export default {
  "id": "axe1",
  "duration": 2800,
  "layers": [
    {
      "id": "existing-tool",
      "src": "assets/crafting/axe1-existing-tool.webp"
    },
    {
      "id": "goo-joint",
      "src": "assets/crafting/axe1-goo-joint.webp"
    },
    {
      "id": "fluff-wrap",
      "src": "assets/crafting/axe1-fluff-wrap.webp"
    }
  ],
  "complete": "assets/crafting/axe1-complete.webp",
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
      "x": 0.52,
      "y": 0.25,
      "contact": "bind",
      "sound": "craftGoo"
    },
    {
      "material": "fluff",
      "part": "fluff-wrap",
      "at": 960,
      "duration": 530,
      "x": 0.5,
      "y": 0.81,
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
      "text": "The old axe, ready for another season.",
      "sound": "craftStitch"
    }
  ],
  "sceneLabel": "Oswin’s existing stone head and wooden haft are repaired with Slime Goo at the joint and Bunny Fluff around the grip and head.",
  "pattern": "old tools, fresh care",
  "intro": "A worn axe. A little care.",
  "finished": "Goo seats the old head. Fluff cushions and secures it."
} satisfies CraftPresentation;
