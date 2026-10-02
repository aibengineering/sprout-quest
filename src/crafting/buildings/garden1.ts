import type { CraftPresentation } from '../types';

export default {
  "id": "garden1",
  "duration": 3360,
  "scene": "building",
  "model": "assets/crafting3d/garden1.glb",
  "eyebrow": "SOWERBY · BUILT BY HAND",
  "layers": [
    {
      "id": "oak-fence"
    },
    {
      "id": "tilled-plots"
    },
    {
      "id": "clover-patch"
    }
  ],
  "roles": {
    "bark": "The picket fence round the field, and the edging of its first six plots",
    "clover": "Clover and wildflowers in the grass"
  },
  "targets": [
    {
      "material": "bark",
      "part": "oak-fence",
      "at": 240,
      "duration": 480,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "bark",
      "part": "tilled-plots",
      "at": 880,
      "duration": 480,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "clover",
      "part": "clover-patch",
      "at": 1520,
      "duration": 480,
      "contact": "energy",
      "sound": "ding"
    }
  ],
  "phases": [
    {
      "at": 0,
      "stage": "fence",
      "text": "Oak Logs make a picket fence round a field, with a gate."
    },
    {
      "at": 760,
      "stage": "beds",
      "text": "Six plots tilled in two rows, edged in oak."
    },
    {
      "at": 1400,
      "stage": "luck",
      "text": "A Lucky Clover: wildflowers where the rest of the field will go."
    },
    {
      "at": 2360,
      "stage": "reveal",
      "text": "A little field of six plots, ready to plant.",
      "sound": "ding"
    }
  ],
  "sceneLabel": "Oak Logs make the picket fence round the field and edge its first six plots. The Lucky Clover brings up clover and wildflowers where the rest of the field will go.",
  "pattern": "something growing",
  "intro": "Oak and a little luck, for a first field.",
  "finished": "A fence, six plots and a watering can."
} satisfies CraftPresentation;
