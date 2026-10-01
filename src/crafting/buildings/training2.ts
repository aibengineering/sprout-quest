import type { CraftPresentation } from '../types';

export default {
  "id": "training2",
  "duration": 3360,
  "scene": "building",
  "model": "assets/crafting3d/training2.glb",
  "eyebrow": "SOWERBY · BUILT BY HAND",
  "layers": [
    {
      "id": "base"
    },
    {
      "id": "fang-post"
    },
    {
      "id": "copper-rack"
    },
    {
      "id": "royal-target"
    }
  ],
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
      "contact": "solid",
      "sound": "clink"
    },
    {
      "material": "copper",
      "part": "copper-rack",
      "at": 880,
      "duration": 480,
      "contact": "solid",
      "sound": "clink"
    },
    {
      "material": "royaljelly",
      "part": "royal-target",
      "at": 1520,
      "duration": 480,
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
