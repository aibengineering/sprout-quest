import type { CraftPresentation } from '../types';

export default {
  "id": "axe4",
  "duration": 3300,
  "layers": [
    {
      "id": "glimwood-haft",
      "src": "assets/crafting/axe4-glimwood-haft.webp"
    },
    {
      "id": "crystal-head",
      "src": "assets/crafting/axe4-crystal-head.webp"
    }
  ],
  "complete": "assets/crafting/axe4-complete.webp",
  "roles": {
    "glimwood": "Pale, softly glowing haft and turned grip",
    "crystal": "Faceted blade and socket, cut from one crystal"
  },
  "targets": [
    {
      "material": "glimwood",
      "part": "glimwood-haft",
      "at": 220,
      "duration": 540,
      "x": 0.5,
      "y": 0.56,
      "contact": "solid",
      "sound": "creak"
    },
    {
      "material": "crystal",
      "part": "crystal-head",
      "at": 1120,
      "duration": 620,
      "x": 0.4,
      "y": 0.22,
      "contact": "energy",
      "sound": "craftStitch"
    }
  ],
  "phases": [
    {
      "at": 0,
      "stage": "haft",
      "text": "Glimmerwood straightens into a pale, glowing haft."
    },
    {
      "at": 1020,
      "stage": "forging",
      "text": "Crystal splits clean into a faceted edge."
    },
    {
      "at": 2380,
      "stage": "reveal",
      "text": "A crystal edge on a Glimmerwood haft.",
      "sound": "craftStitch"
    }
  ],
  "sceneLabel": "Glimmerwood forms the pale haft with its lilac and cyan grain and a turned grip. Crystal is cut into the faceted axe blade and its socket.",
  "pattern": "glimmer in the grain, crystal at the edge",
  "intro": "Crystal and Glimmerwood, humming on the bench.",
  "finished": "Crystal cuts. Glimmerwood holds steady."
} satisfies CraftPresentation;
