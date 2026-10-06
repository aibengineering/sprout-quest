import type { CraftPresentation } from '../types';

export default {
  "id": "training1",
  "duration": 2720,
  "scene": "building",
  "model": "assets/crafting3d/training1.glb",
  "eyebrow": "GLIMMER HOLLOW · BUILT BY BRAM",
  "layers": [
    {
      "id": "oak-post"
    },
    {
      "id": "fluff-stuffing"
    }
  ],
  "roles": {
    "fluff": "Stuffing for the body and head",
    "plank": "The post, the arms and the ground",
    "stone": "A firm footing beneath the timber"
  },
  "targets": [
    {
      "material": "plank",
      "part": "oak-post",
      "at": 240,
      "duration": 480,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "fluff",
      "part": "fluff-stuffing",
      "at": 880,
      "duration": 480,
      "contact": "soft",
      "sound": "craftFluff"
    },
    {
      "material": "stone",
      "part": "oak-post",
      "at": 160,
      "duration": 480,
      "contact": "solid",
      "sound": "clink"
    }
  ],
  "phases": [
    {
      "at": 0,
      "stage": "post",
      "text": "Oak makes a sturdy post with two arms."
    },
    {
      "at": 760,
      "stage": "stuffing",
      "text": "Bunny Fluff stuffs a body and a head."
    },
    {
      "at": 1720,
      "stage": "reveal",
      "text": "A dummy that can take a hit.",
      "sound": "ding"
    }
  ],
  "sceneLabel": "Oak Planks make the dummy’s post, arms and base. Bunny Fluff is stuffed into its body and head.",
  "pattern": "something to swing at",
  "intro": "Bram builds the hidden clearing. The masked fox prepares the next lessons.",
  "finished": "The masked fox’s hidden clearing is ready for practice."
} satisfies CraftPresentation;
