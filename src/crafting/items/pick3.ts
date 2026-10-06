import type { CraftPresentation } from '../types';

export default {
  "id": "pick3",
  "model": "assets/crafting3d/pick3.glb",
  "duration": 3100,
  "layers": [
    {
      "id": "pine-haft"
    },
    {
      "id": "iron-head"
    }
  ],
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
      "contact": "solid",
      "sound": "creak"
    },
    {
      "material": "iron",
      "part": "iron-head",
      "at": 1120,
      "duration": 580,
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
