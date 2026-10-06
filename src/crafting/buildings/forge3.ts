import type { CraftPresentation } from '../types';

export default {
  "id": "forge3",
  "duration": 3360,
  "scene": "building",
  "model": "assets/crafting3d/forge3.glb",
  "eyebrow": "SOWERBY · BUILT BY HAND",
  "layers": [
    {
      "id": "base"
    },
    {
      "id": "pine-fuel"
    },
    {
      "id": "iron-bands"
    },
    {
      "id": "golem-core"
    }
  ],
  "roles": {
    "pine": "A stack of pine fuel and a quench barrel",
    "iron": "Iron bands, corner straps and barrel hoops",
    "core": "Golem Cores glowing either side of the hearth"
  },
  "targets": [
    {
      "material": "pine",
      "part": "pine-fuel",
      "at": 240,
      "duration": 480,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "iron",
      "part": "iron-bands",
      "at": 880,
      "duration": 480,
      "contact": "solid",
      "sound": "clink"
    },
    {
      "material": "core",
      "part": "golem-core",
      "at": 1520,
      "duration": 480,
      "contact": "energy",
      "sound": "ding"
    }
  ],
  "phases": [
    {
      "at": 0,
      "stage": "fuel",
      "text": "Pine is stacked for a hotter fire, and a barrel."
    },
    {
      "at": 760,
      "stage": "iron",
      "text": "Iron bands wrap the walls, the door and the barrel."
    },
    {
      "at": 1400,
      "stage": "cores",
      "text": "Golem Cores hum by the hearth, heat for iron."
    },
    {
      "at": 2360,
      "stage": "reveal",
      "text": "The Iron Smithy, hot enough for iron.",
      "sound": "ding"
    }
  ],
  "sceneLabel": "Pine Logs are stacked as fuel and made into a quench barrel. Iron Ore bands the walls, door and barrel. Golem Cores glow either side of the hearth.",
  "pattern": "a smithy for iron",
  "intro": "Iron, pine and two humming Golem Cores.",
  "finished": "Iron-banded walls and a hearth that hums."
} satisfies CraftPresentation;
