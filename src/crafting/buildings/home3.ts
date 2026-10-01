import type { CraftPresentation } from '../types';

export default {
  "id": "home3",
  "duration": 4880,
  "scene": "building",
  "model": "assets/crafting3d/home3.glb",
  "eyebrow": "SOWERBY · BUILT BY HAND",
  "layers": [
    {
      "id": "obsidian-plinth",
      "src": "assets/buildings/home3-obsidian-plinth.webp"
    },
    {
      "id": "ember-frame",
      "src": "assets/buildings/home3-ember-frame.webp"
    },
    {
      "id": "glim-walls",
      "src": "assets/buildings/home3-glim-walls.webp"
    },
    {
      "id": "glim-roof",
      "src": "assets/buildings/home3-glim-roof.webp"
    },
    {
      "id": "crystal-windows",
      "src": "assets/buildings/home3-crystal-windows.webp"
    },
    {
      "id": "flower-boxes",
      "src": "assets/buildings/home3-flower-boxes.webp"
    }
  ],
  "complete": "assets/buildings/home3-complete.webp",
  "roles": {
    "obsidian": "Glossy black plinth and front steps",
    "emberplank": "Charcoal beams glowing in the grain, and the door",
    "glimplank": "Pale glowing planking and the violet roof",
    "crystal": "Every window, the door lamps and the tower spire",
    "flower": "Window boxes and beds by the steps"
  },
  "targets": [
    {
      "material": "obsidian",
      "part": "obsidian-plinth",
      "at": 240,
      "duration": 480,
      "x": 0.51,
      "y": 0.81,
      "contact": "solid",
      "sound": "thud"
    },
    {
      "material": "emberplank",
      "part": "ember-frame",
      "at": 800,
      "duration": 480,
      "x": 0.52,
      "y": 0.55,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "glimplank",
      "part": "glim-walls",
      "at": 1360,
      "duration": 480,
      "x": 0.51,
      "y": 0.54,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "glimplank",
      "part": "glim-roof",
      "at": 1920,
      "duration": 480,
      "x": 0.51,
      "y": 0.32,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "crystal",
      "part": "crystal-windows",
      "at": 2480,
      "duration": 480,
      "x": 0.53,
      "y": 0.42,
      "contact": "energy",
      "sound": "ding"
    },
    {
      "material": "flower",
      "part": "flower-boxes",
      "at": 3040,
      "duration": 480,
      "x": 0.47,
      "y": 0.88,
      "contact": "soft",
      "sound": "craftFluff"
    }
  ],
  "phases": [
    {
      "at": 0,
      "stage": "plinth",
      "text": "Obsidian sets a glossy black plinth and steps."
    },
    {
      "at": 680,
      "stage": "frame",
      "text": "Emberwood beams rise, embers glowing in the grain."
    },
    {
      "at": 1240,
      "stage": "walls",
      "text": "Glimmerwood planking, pale and softly glowing."
    },
    {
      "at": 1800,
      "stage": "roof",
      "text": "Glimmerwood shingles cap the roof and the tower."
    },
    {
      "at": 2360,
      "stage": "windows",
      "text": "Crystal fills every window and crowns the tower."
    },
    {
      "at": 2920,
      "stage": "flowers",
      "text": "Flowers from Poppy’s Garden fill the window boxes."
    },
    {
      "at": 3880,
      "stage": "reveal",
      "text": "A manor that glows at dusk.",
      "sound": "ding"
    }
  ],
  "sceneLabel": "Obsidian forms the plinth and front steps. Emberwood Planks frame the walls and the tower and make the door. Glimmerwood Planks clad the walls and roof. Crystal fills the windows and tops the tower. Flowers fill the window boxes and the beds by the steps.",
  "pattern": "a house fit for a hero",
  "intro": "Rare materials from the far edges of the map, and flowers from home.",
  "finished": "Obsidian, Emberwood, Glimmerwood and Crystal, with flowers at the windows."
} satisfies CraftPresentation;
