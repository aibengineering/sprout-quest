import type { CraftPresentation } from '../types';

export default {
  "id": "axe2",
  "duration": 3000,
  "layers": [
    {
      "id": "bark-haft",
      "src": "assets/crafting/axe2-bark-haft.webp"
    },
    {
      "id": "copper-head",
      "src": "assets/crafting/axe2-copper-head.webp"
    }
  ],
  "complete": "assets/crafting/axe2-complete.webp",
  "roles": {
    "bark": "Ridged oak-bark haft and grip",
    "copper": "Forged blade, socket and collars"
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
      "x": 0.4,
      "y": 0.22,
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
      "text": "Copper takes a curved edge and a snug socket."
    },
    {
      "at": 2180,
      "stage": "reveal",
      "text": "A warm copper blade, seated in oak bark.",
      "sound": "craftStitch"
    }
  ],
  "sceneLabel": "Oak Bark forms the ridged handle and grip. Copper is shaped into the axe blade, socket and collars.",
  "pattern": "a good edge, a steady grip",
  "intro": "Oak Bark and Copper Ore, finding their fit.",
  "finished": "Copper for the bite. Oak bark for the grip."
} satisfies CraftPresentation;
