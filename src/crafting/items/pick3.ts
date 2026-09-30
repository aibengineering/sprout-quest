import type { CraftPresentation } from '../types';

export default {
  "id": "pick3",
  "duration": 3100,
  "layers": [
    {
      "id": "pine-haft",
      "src": "assets/crafting/pick3-pine-haft.webp"
    },
    {
      "id": "iron-head",
      "src": "assets/crafting/pick3-iron-head.webp"
    }
  ],
  "complete": "assets/crafting/pick3-complete.webp",
  "roles": {
    "pine": "Grained pine shaft and grip",
    "iron": "Forged working head and collars"
  },
  "targets": [
    {
      "material": "pine",
      "part": "pine-haft",
      "at": 220,
      "duration": 530,
      "x": 0.5,
      "y": 0.56,
      "contact": "solid",
      "sound": "creak"
    },
    {
      "material": "iron",
      "part": "iron-head",
      "at": 1120,
      "duration": 580,
      "x": 0.47,
      "y": 0.19,
      "contact": "solid",
      "sound": "craftStitch"
    }
  ],
  "phases": [
    {
      "at": 0,
      "stage": "haft",
      "text": "Pine settles into a straight, grained shaft."
    },
    {
      "at": 1010,
      "stage": "forging",
      "text": "Iron presses into a strong head and collars."
    },
    {
      "at": 2250,
      "stage": "reveal",
      "text": "A solid iron head, balanced on warm pine.",
      "sound": "craftStitch"
    }
  ],
  "sceneLabel": "Pine forms the shaft and grip with visible pale grain and a knot. Iron is forged into the working head and collars.",
  "pattern": "pine at hand, iron at work",
  "intro": "Pine Wood and Iron Ore, ready for the bench.",
  "finished": "Pine keeps the grip warm. Iron does the hard work."
} satisfies CraftPresentation;
