import type { CraftPresentation } from '../types';

export default {
  "id": "home2",
  "duration": 4880,
  "scene": "building",
  "eyebrow": "SOWERBY · BUILT BY HAND",
  "layers": [
    {
      "id": "stone-footing",
      "src": "assets/buildings/home2-stone-footing.webp"
    },
    {
      "id": "oak-frame",
      "src": "assets/buildings/home2-oak-frame.webp"
    },
    {
      "id": "oak-walls",
      "src": "assets/buildings/home2-oak-walls.webp"
    },
    {
      "id": "roof",
      "src": "assets/buildings/home2-roof.webp"
    },
    {
      "id": "chimney",
      "src": "assets/buildings/home2-chimney.webp"
    },
    {
      "id": "clover",
      "src": "assets/buildings/home2-clover.webp"
    }
  ],
  "complete": "assets/buildings/home2-complete.webp",
  "roles": {
    "stone": "Footing, doorstep and chimney",
    "bark": "Oak frame, wattle walls and shingle roof",
    "clover": "Luck over the door and in the window boxes"
  },
  "targets": [
    {
      "material": "stone",
      "part": "stone-footing",
      "at": 240,
      "duration": 480,
      "x": 0.5,
      "y": 0.74,
      "contact": "solid",
      "sound": "thud"
    },
    {
      "material": "bark",
      "part": "oak-frame",
      "at": 800,
      "duration": 480,
      "x": 0.5,
      "y": 0.68,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "bark",
      "part": "oak-walls",
      "at": 1360,
      "duration": 480,
      "x": 0.5,
      "y": 0.56,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "bark",
      "part": "roof",
      "at": 1920,
      "duration": 480,
      "x": 0.5,
      "y": 0.32,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "stone",
      "part": "chimney",
      "at": 2480,
      "duration": 480,
      "x": 0.64,
      "y": 0.19,
      "contact": "solid",
      "sound": "thud"
    },
    {
      "material": "clover",
      "part": "clover",
      "at": 3040,
      "duration": 480,
      "x": 0.5,
      "y": 0.68,
      "contact": "energy",
      "sound": "ding"
    }
  ],
  "phases": [
    {
      "at": 0,
      "stage": "footing",
      "text": "Stone is laid for a footing and a doorstep."
    },
    {
      "at": 680,
      "stage": "frame",
      "text": "Oak Logs stand up into a timber frame."
    },
    {
      "at": 1240,
      "stage": "walls",
      "text": "Wattle walls fill the frame; a door, two windows."
    },
    {
      "at": 1800,
      "stage": "roof",
      "text": "Oak shingles close the roof over your head."
    },
    {
      "at": 2360,
      "stage": "chimney",
      "text": "Stone again, stacked into a chimney."
    },
    {
      "at": 2920,
      "stage": "luck",
      "text": "A Lucky Clover over the door, for luck."
    },
    {
      "at": 3880,
      "stage": "reveal",
      "text": "A little cottage, all your own.",
      "sound": "ding"
    }
  ],
  "sceneLabel": "Stone makes the footing and chimney. Oak Logs make the frame, the wattle walls and the shingle roof. A Lucky Clover goes over the door and in the window boxes.",
  "pattern": "a roof and a door",
  "intro": "Oak, stone and a little luck, finding their places.",
  "finished": "Stone underfoot, oak all round, luck over the door."
} satisfies CraftPresentation;
