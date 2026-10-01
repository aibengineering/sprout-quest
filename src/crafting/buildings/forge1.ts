import type { CraftPresentation } from '../types';

export default {
  "id": "forge1",
  "duration": 4000,
  "scene": "building",
  "model": "assets/crafting3d/forge1.glb",
  "eyebrow": "SOWERBY · BUILT BY HAND",
  "layers": [
    {
      "id": "stone-walls",
      "src": "assets/buildings/forge1-stone-walls.webp"
    },
    {
      "id": "oak-roof",
      "src": "assets/buildings/forge1-oak-roof.webp"
    },
    {
      "id": "oak-door",
      "src": "assets/buildings/forge1-oak-door.webp"
    },
    {
      "id": "goo-hearth",
      "src": "assets/buildings/forge1-goo-hearth.webp"
    }
  ],
  "complete": "assets/buildings/forge1-complete.webp",
  "roles": {
    "stone": "Stone walls and chimney",
    "bark": "Oak roof, door and sign",
    "goo": "Seals the bellows and the hearth"
  },
  "targets": [
    {
      "material": "stone",
      "part": "stone-walls",
      "at": 240,
      "duration": 480,
      "x": 0.5,
      "y": 0.49,
      "contact": "solid",
      "sound": "thud"
    },
    {
      "material": "bark",
      "part": "oak-roof",
      "at": 880,
      "duration": 480,
      "x": 0.5,
      "y": 0.31,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "bark",
      "part": "oak-door",
      "at": 1520,
      "duration": 480,
      "x": 0.46,
      "y": 0.71,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "goo",
      "part": "goo-hearth",
      "at": 2160,
      "duration": 480,
      "x": 0.62,
      "y": 0.77,
      "contact": "bind",
      "sound": "craftGoo"
    }
  ],
  "phases": [
    {
      "at": 0,
      "stage": "walls",
      "text": "Stone is stacked back into walls and a chimney."
    },
    {
      "at": 760,
      "stage": "roof",
      "text": "Oak rafters and red shingles over the walls."
    },
    {
      "at": 1400,
      "stage": "door",
      "text": "An oak door, a lintel and the old hammer sign."
    },
    {
      "at": 2040,
      "stage": "hearth",
      "text": "Slime Goo seals the bellows. The hearth lights!"
    },
    {
      "at": 3000,
      "stage": "reveal",
      "text": "The Forge roars again.",
      "sound": "ding"
    }
  ],
  "sceneLabel": "Stone rebuilds the walls and chimney. Oak Logs make the roof, door and sign. Slime Goo seals the old bellows so the hearth can burn.",
  "pattern": "the old forge, mended",
  "intro": "Stone, oak and a little goo for the old forge.",
  "finished": "Stone walls, an oak roof, and a hearth that roars."
} satisfies CraftPresentation;
