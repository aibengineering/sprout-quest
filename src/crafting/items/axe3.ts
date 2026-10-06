import type { CraftPresentation } from '../types';

export default {
  "id": "axe3",
  "model": "assets/crafting3d/axe3.glb",
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
    "pine": "Grained pine haft and grip",
    "iron": "Forged broad blade, socket and collars"
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
      "at": 1100,
      "duration": 580,
      "contact": "solid",
      "sound": "craftStitch"
    }
  ],
  "phases": [
    {
      "at": 0,
      "stage": "haft",
      "text": "Pine settles into a straight, grained haft."
    },
    {
      "at": 1000,
      "stage": "forging",
      "text": "Iron is beaten into a broad, bright edge."
    },
    {
      "at": 2250,
      "stage": "reveal",
      "text": "An iron bite, balanced on warm pine.",
      "sound": "craftStitch"
    }
  ],
  "sceneLabel": "Pine forms the haft and grip with pale grain and a knot. Iron is forged into the broad axe blade, socket and collars.",
  "pattern": "pine at hand, iron at the edge",
  "intro": "Iron Ore and a Pine Log, ready for the bench.",
  "finished": "Iron for the bite. Pine for the grip."
} satisfies CraftPresentation;
