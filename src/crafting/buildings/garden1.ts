import type { CraftPresentation } from '../types';

export default {
  "id": "garden1",
  "duration": 2720,
  "scene": "building",
  "eyebrow": "SOWERBY · BUILT BY HAND",
  "layers": [
    {
      "id": "oak-beds",
      "src": "assets/buildings/garden1-oak-beds.webp"
    },
    {
      "id": "clover-sprouts",
      "src": "assets/buildings/garden1-clover-sprouts.webp"
    }
  ],
  "complete": "assets/buildings/garden1-complete.webp",
  "roles": {
    "bark": "Log-edged beds and a little fence",
    "clover": "The first sprouts, clover-green"
  },
  "targets": [
    {
      "material": "bark",
      "part": "oak-beds",
      "at": 240,
      "duration": 480,
      "x": 0.5,
      "y": 0.59,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "clover",
      "part": "clover-sprouts",
      "at": 880,
      "duration": 480,
      "x": 0.5,
      "y": 0.52,
      "contact": "energy",
      "sound": "ding"
    }
  ],
  "phases": [
    {
      "at": 0,
      "stage": "beds",
      "text": "Oak Logs edge the beds and make a fence."
    },
    {
      "at": 760,
      "stage": "sprouts",
      "text": "A Lucky Clover, and the first sprouts come up."
    },
    {
      "at": 1720,
      "stage": "reveal",
      "text": "A patch of sprouts by the fountain.",
      "sound": "ding"
    }
  ],
  "sceneLabel": "Oak Logs edge the soil beds and make a little fence. The Lucky Clover brings up the first sprouts.",
  "pattern": "something growing",
  "intro": "Oak and a little luck, for a first garden.",
  "finished": "Neat beds and bright green sprouts."
} satisfies CraftPresentation;
