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
      "id": "oak-beds"
    },
    {
      "id": "clover-patch"
    }
  ],
  "roles": {
    "bark": "The picket fence, the front edge and the first two beds",
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
      "part": "oak-beds",
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
      "text": "Oak Logs make a picket fence round a patch of grass."
    },
    {
      "at": 760,
      "stage": "beds",
      "text": "Two wooden beds, ready for Poppy to plant."
    },
    {
      "at": 1400,
      "stage": "luck",
      "text": "A Lucky Clover, and wildflowers come up in the grass."
    },
    {
      "at": 2360,
      "stage": "reveal",
      "text": "A garden patch with two beds, ready to plant.",
      "sound": "ding"
    }
  ],
  "sceneLabel": "Oak Logs make the picket fence, the front edge and two wooden beds. The Lucky Clover brings up clover and wildflowers in the grass.",
  "pattern": "something growing",
  "intro": "Oak and a little luck, for a first garden.",
  "finished": "A fence, two beds and a watering can."
} satisfies CraftPresentation;
