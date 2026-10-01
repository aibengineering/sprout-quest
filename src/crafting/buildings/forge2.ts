import type { CraftPresentation } from '../types';

export default {
  "id": "forge2",
  "duration": 3360,
  "scene": "building",
  "model": "assets/crafting3d/forge2.glb",
  "eyebrow": "SOWERBY · BUILT BY HAND",
  "layers": [
    {
      "id": "base"
    },
    {
      "id": "oak-porch"
    },
    {
      "id": "copper-trim"
    },
    {
      "id": "royal-bellows"
    }
  ],
  "roles": {
    "bark": "An oak porch over the door",
    "copper": "Copper ridge, chimney caps and weathervane",
    "royaljelly": "Seals the great bellows, and crowns the sign"
  },
  "targets": [
    {
      "material": "bark",
      "part": "oak-porch",
      "at": 240,
      "duration": 480,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "copper",
      "part": "copper-trim",
      "at": 880,
      "duration": 480,
      "contact": "solid",
      "sound": "clink"
    },
    {
      "material": "royaljelly",
      "part": "royal-bellows",
      "at": 1520,
      "duration": 480,
      "contact": "bind",
      "sound": "craftGoo"
    }
  ],
  "phases": [
    {
      "at": 0,
      "stage": "porch",
      "text": "Oak posts and a porch roof over the door."
    },
    {
      "at": 760,
      "stage": "copper",
      "text": "Copper caps the ridge, a new chimney and a vane."
    },
    {
      "at": 1400,
      "stage": "bellows",
      "text": "Royal Jelly seals the great bellows in gold."
    },
    {
      "at": 2360,
      "stage": "reveal",
      "text": "A proper Smithy, for copper work.",
      "sound": "ding"
    }
  ],
  "sceneLabel": "Oak Logs make a porch over the Forge door. Copper Ore becomes the roof ridge, a second chimney, the chimney caps and a weathervane. Royal Jelly seals great golden bellows and crowns the sign.",
  "pattern": "a smithy for copper",
  "intro": "Oak, copper and the Slime King’s jelly.",
  "finished": "A copper-trimmed Smithy with royal bellows."
} satisfies CraftPresentation;
