import type { CraftPresentation } from '../types';

export default {
  "id": "training2",
  "duration": 3360,
  "scene": "building",
  "model": "assets/crafting3d/training2.glb",
  "eyebrow": "SOWERBY · BUILT BY HAND",
  "layers": [
    {
      "id": "base",
      "src": "assets/buildings/training2-base.webp"
    },
    {
      "id": "fang-post",
      "src": "assets/buildings/training2-fang-post.webp"
    },
    {
      "id": "copper-rack",
      "src": "assets/buildings/training2-copper-rack.webp"
    },
    {
      "id": "royal-target",
      "src": "assets/buildings/training2-royal-target.webp"
    }
  ],
  "complete": "assets/buildings/training2-complete.webp",
  "roles": {
    "fang": "Studs on the sparring post",
    "copper": "Practice blades and their rack",
    "royaljelly": "The golden bullseye"
  },
  "targets": [
    {
      "material": "fang",
      "part": "fang-post",
      "at": 240,
      "duration": 480,
      "x": 0.26,
      "y": 0.54,
      "contact": "solid",
      "sound": "clink"
    },
    {
      "material": "copper",
      "part": "copper-rack",
      "at": 880,
      "duration": 480,
      "x": 0.18,
      "y": 0.42,
      "contact": "solid",
      "sound": "clink"
    },
    {
      "material": "royaljelly",
      "part": "royal-target",
      "at": 1520,
      "duration": 480,
      "x": 0.79,
      "y": 0.42,
      "contact": "bind",
      "sound": "craftGoo"
    }
  ],
  "phases": [
    {
      "at": 0,
      "stage": "post",
      "text": "Wolf Fangs stud a sparring post."
    },
    {
      "at": 760,
      "stage": "rack",
      "text": "Copper practice blades on a rack."
    },
    {
      "at": 1400,
      "stage": "target",
      "text": "Royal Jelly makes a golden bullseye."
    },
    {
      "at": 2360,
      "stage": "reveal",
      "text": "A real Training Yard.",
      "sound": "ding"
    }
  ],
  "sceneLabel": "Wolf Fangs stud a sparring post. Copper Ore becomes practice blades and their rack. Royal Jelly makes the golden bullseye of a target.",
  "pattern": "train every day",
  "intro": "Fangs, copper and royal jelly for the yard.",
  "finished": "A sparring post, blades and a target."
} satisfies CraftPresentation;
