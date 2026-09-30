import type { CraftPresentation } from '../types';

export default {
  "id": "garden3",
  "duration": 2720,
  "scene": "building",
  "eyebrow": "SOWERBY · BUILT BY HAND",
  "layers": [
    {
      "id": "base",
      "src": "assets/buildings/garden3-base.webp"
    },
    {
      "id": "glim-arbour",
      "src": "assets/buildings/garden3-glim-arbour.webp"
    },
    {
      "id": "ember-blooms",
      "src": "assets/buildings/garden3-ember-blooms.webp"
    }
  ],
  "complete": "assets/buildings/garden3-complete.webp",
  "roles": {
    "glimplank": "A glowing arbour over the beds",
    "ember": "Fire-bright blooms and warm lanterns"
  },
  "targets": [
    {
      "material": "glimplank",
      "part": "glim-arbour",
      "at": 240,
      "duration": 480,
      "x": 0.5,
      "y": 0.34,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "ember",
      "part": "ember-blooms",
      "at": 880,
      "duration": 480,
      "x": 0.5,
      "y": 0.42,
      "contact": "energy",
      "sound": "ding"
    }
  ],
  "phases": [
    {
      "at": 0,
      "stage": "arbour",
      "text": "Glimmerwood rises into a softly glowing arbour."
    },
    {
      "at": 760,
      "stage": "blooms",
      "text": "Ember opens fire-bright blooms and lights lanterns."
    },
    {
      "at": 1720,
      "stage": "reveal",
      "text": "The Bloom Garden, glowing into the night.",
      "sound": "ding"
    }
  ],
  "sceneLabel": "Glimmerwood Planks make a glowing arbour over the beds. Ember opens fire-bright blooms among the plants and lights two lanterns.",
  "pattern": "blooms in the dark",
  "intro": "Glimmerwood and Ember for the garden.",
  "finished": "Blooms and lanterns under a glowing arbour."
} satisfies CraftPresentation;
