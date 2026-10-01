import type { CraftPresentation } from '../types';

export default {
  "id": "garden3",
  "duration": 3360,
  "scene": "building",
  "eyebrow": "SOWERBY · BUILT BY HAND",
  "layers": [
    {
      "id": "base",
      "src": "assets/buildings/garden3-base.webp"
    },
    {
      "id": "glim-beds",
      "src": "assets/buildings/garden3-glim-beds.webp"
    },
    {
      "id": "ember-lanterns",
      "src": "assets/buildings/garden3-ember-lanterns.webp"
    },
    {
      "id": "flowers",
      "src": "assets/buildings/garden3-flowers.webp"
    }
  ],
  "complete": "assets/buildings/garden3-complete.webp",
  "roles": {
    "glimplank": "The last two beds, softly glowing",
    "ember": "Lanterns on the back fence",
    "flower": "Flowers climbing the back fence"
  },
  "targets": [
    {
      "material": "glimplank",
      "part": "glim-beds",
      "at": 240,
      "duration": 480,
      "x": 0.77,
      "y": 0.57,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "ember",
      "part": "ember-lanterns",
      "at": 880,
      "duration": 480,
      "x": 0.5,
      "y": 0.22,
      "contact": "energy",
      "sound": "ding"
    },
    {
      "material": "flower",
      "part": "flowers",
      "at": 1520,
      "duration": 480,
      "x": 0.5,
      "y": 0.32,
      "contact": "soft",
      "sound": "craftFluff"
    }
  ],
  "phases": [
    {
      "at": 0,
      "stage": "beds",
      "text": "Glimmerwood makes the last two beds, softly glowing."
    },
    {
      "at": 760,
      "stage": "lanterns",
      "text": "Ember lights lanterns on the back fence."
    },
    {
      "at": 1400,
      "stage": "flowers",
      "text": "Flowers climb the fence, all along the back."
    },
    {
      "at": 2360,
      "stage": "reveal",
      "text": "The Bloom Garden, six beds in bloom.",
      "sound": "ding"
    }
  ],
  "sceneLabel": "Glimmerwood Planks make the last two beds. Ember lights two lanterns on the back fence. Flowers climb the fence all along the back.",
  "pattern": "blooms in the dark",
  "intro": "Glimmerwood, Ember and flowers for the garden.",
  "finished": "Six beds, lanterns and flowers on the fence."
} satisfies CraftPresentation;
