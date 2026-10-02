import type { CraftPresentation } from '../types';

export default {
  "id": "garden3",
  "duration": 3360,
  "scene": "building",
  "model": "assets/crafting3d/garden3.glb",
  "eyebrow": "SOWERBY · BUILT BY HAND",
  "layers": [
    {
      "id": "base"
    },
    {
      "id": "glim-plots"
    },
    {
      "id": "ember-lanterns"
    },
    {
      "id": "flowers"
    }
  ],
  "roles": {
    "glimplank": "Eight more plots, softly glowing",
    "ember": "Lanterns on the back fence",
    "flower": "Flowers climbing the back fence"
  },
  "targets": [
    {
      "material": "glimplank",
      "part": "glim-plots",
      "at": 240,
      "duration": 480,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "ember",
      "part": "ember-lanterns",
      "at": 880,
      "duration": 480,
      "contact": "energy",
      "sound": "ding"
    },
    {
      "material": "flower",
      "part": "flowers",
      "at": 1520,
      "duration": 480,
      "contact": "soft",
      "sound": "craftFluff"
    }
  ],
  "phases": [
    {
      "at": 0,
      "stage": "beds",
      "text": "Glimmerwood edges eight more plots, softly glowing."
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
      "text": "The Bloom Garden: a field of twenty plots.",
      "sound": "ding"
    }
  ],
  "sceneLabel": "Glimmerwood Planks edge eight more plots, filling out the field. Ember lights two lanterns on the back fence. Flowers climb the fence all along the back.",
  "pattern": "blooms in the dark",
  "intro": "Glimmerwood, Ember and flowers for the garden.",
  "finished": "Twenty plots, lanterns and flowers on the fence."
} satisfies CraftPresentation;
