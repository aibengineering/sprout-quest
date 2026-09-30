import type { CraftPresentation } from '../types';

export default {
  "id": "training1",
  "duration": 2720,
  "scene": "building",
  "eyebrow": "SOWERBY · BUILT BY HAND",
  "layers": [
    {
      "id": "oak-post",
      "src": "assets/buildings/training1-oak-post.webp"
    },
    {
      "id": "fluff-stuffing",
      "src": "assets/buildings/training1-fluff-stuffing.webp"
    }
  ],
  "complete": "assets/buildings/training1-complete.webp",
  "roles": {
    "bark": "The post, the arms and the ground",
    "fluff": "Stuffing for the body and head"
  },
  "targets": [
    {
      "material": "bark",
      "part": "oak-post",
      "at": 240,
      "duration": 480,
      "x": 0.5,
      "y": 0.56,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "fluff",
      "part": "fluff-stuffing",
      "at": 880,
      "duration": 480,
      "x": 0.5,
      "y": 0.35,
      "contact": "soft",
      "sound": "craftFluff"
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
  "sceneLabel": "Oak Logs make the dummy’s post, arms and base. Bunny Fluff is stuffed into its body and head.",
  "pattern": "something to swing at",
  "intro": "Oak and fluff for a practice partner.",
  "finished": "Soft enough to hit, tough enough to stay up."
} satisfies CraftPresentation;
