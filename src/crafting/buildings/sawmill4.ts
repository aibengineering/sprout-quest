import type { CraftPresentation } from '../types';

export default {
  "id": "sawmill4",
  "duration": 3360,
  "scene": "building",
  "model": "assets/crafting3d/sawmill4.glb",
  "eyebrow": "SOWERBY · BUILT BY HAND",
  "layers": [
    {
      "id": "base",
      "src": "assets/buildings/sawmill4-base.webp"
    },
    {
      "id": "glimplank-trim",
      "src": "assets/buildings/sawmill4-glimplank-trim.webp"
    },
    {
      "id": "emberwood-logs",
      "src": "assets/buildings/sawmill4-emberwood-logs.webp"
    },
    {
      "id": "obsidian-blade",
      "src": "assets/buildings/sawmill4-obsidian-blade.webp"
    }
  ],
  "complete": "assets/buildings/sawmill4-complete.webp",
  "roles": {
    "glimplank": "Glowing roof trim and a sign",
    "emberwood": "Emberwood waiting to be sawn",
    "obsidian": "The black blade and its feet"
  },
  "targets": [
    {
      "material": "glimplank",
      "part": "glimplank-trim",
      "at": 240,
      "duration": 480,
      "x": 0.46,
      "y": 0.42,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "emberwood",
      "part": "emberwood-logs",
      "at": 880,
      "duration": 480,
      "x": 0.11,
      "y": 0.74,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "obsidian",
      "part": "obsidian-blade",
      "at": 1520,
      "duration": 480,
      "x": 0.58,
      "y": 0.54,
      "contact": "solid",
      "sound": "thud"
    }
  ],
  "phases": [
    {
      "at": 0,
      "stage": "trim",
      "text": "Glimmerwood trims the roof and makes a sign."
    },
    {
      "at": 760,
      "stage": "logs",
      "text": "Emberwood logs, embers in the grain."
    },
    {
      "at": 1400,
      "stage": "blade",
      "text": "Obsidian is chipped into a black blade."
    },
    {
      "at": 2360,
      "stage": "reveal",
      "text": "The Obsidian Sawmill, ready for Emberwood.",
      "sound": "ding"
    }
  ],
  "sceneLabel": "Glimmerwood Planks make glowing roof trim and a sign. Emberwood Logs are stacked beside the shed. Obsidian becomes the new black blade and the bench’s feet.",
  "pattern": "the sharpest blade",
  "intro": "Obsidian, Emberwood and Glimmerwood planks.",
  "finished": "An obsidian blade that saws Emberwood."
} satisfies CraftPresentation;
