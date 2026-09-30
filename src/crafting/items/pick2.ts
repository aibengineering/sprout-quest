import type { CraftPresentation } from '../types';

export default {
  "id": "pick2",
  "duration": 3000,
  "layers": [
    {
      "id": "bark-haft",
      "src": "assets/crafting/pick2-bark-haft.webp"
    },
    {
      "id": "copper-head",
      "src": "assets/crafting/pick2-copper-head.webp"
    }
  ],
  "complete": "assets/crafting/pick2-complete.webp",
  "roles": {
    "bark": "Ridged oak-bark haft and grip",
    "copper": "Curved working head and socket"
  },
  "targets": [
    {
      "material": "bark",
      "part": "bark-haft",
      "at": 220,
      "duration": 530,
      "x": 0.5,
      "y": 0.56,
      "contact": "solid",
      "sound": "creak"
    },
    {
      "material": "copper",
      "part": "copper-head",
      "at": 1080,
      "duration": 550,
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
      "text": "Oak Bark presses into a ridged, sturdy haft."
    },
    {
      "at": 990,
      "stage": "forging",
      "text": "Copper curves into a pointed head and socket."
    },
    {
      "at": 2180,
      "stage": "reveal",
      "text": "A copper point, with a grip that stays steady.",
      "sound": "craftStitch"
    }
  ],
  "sceneLabel": "Oak Bark forms the ridged handle and grip. Copper is shaped into the pick head, socket and collars.",
  "pattern": "a bright point, a steady grip",
  "intro": "Oak Bark and Copper Ore, finding their fit.",
  "finished": "Copper for the point. Oak bark for the grip."
} satisfies CraftPresentation;
