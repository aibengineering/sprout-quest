import type { CraftPresentation } from '../types';

export default {
  "id": "forge5",
  "duration": 3360,
  "scene": "building",
  "model": "assets/crafting3d/forge5.glb",
  "eyebrow": "SOWERBY · BUILT BY HAND",
  "layers": [
    {
      "id": "base"
    },
    {
      "id": "obsidian"
    },
    {
      "id": "glim-gable"
    },
    {
      "id": "king-crystal"
    }
  ],
  "roles": {
    "obsidian": "Front steps, a crucible and the anvil’s face",
    "glimplank": "Glowing gable boards, sign and banner pole",
    "kingcrystal": "Set on the ridge, over everything"
  },
  "targets": [
    {
      "material": "obsidian",
      "part": "obsidian",
      "at": 240,
      "duration": 480,
      "contact": "solid",
      "sound": "thud"
    },
    {
      "material": "glimplank",
      "part": "glim-gable",
      "at": 880,
      "duration": 480,
      "contact": "solid",
      "sound": "chop"
    },
    {
      "material": "kingcrystal",
      "part": "king-crystal",
      "at": 1520,
      "duration": 480,
      "contact": "energy",
      "sound": "ding"
    }
  ],
  "phases": [
    {
      "at": 0,
      "stage": "obsidian",
      "text": "Obsidian makes the steps, a crucible and an anvil face."
    },
    {
      "at": 760,
      "stage": "gable",
      "text": "Glimmerwood boards trim the gable, sign and banner."
    },
    {
      "at": 1400,
      "stage": "crown",
      "text": "The King Crystal takes its place on the ridge."
    },
    {
      "at": 2360,
      "stage": "reveal",
      "text": "The Master Forge. Legends start here.",
      "sound": "ding"
    }
  ],
  "sceneLabel": "Obsidian makes glossy black steps, a crucible and the anvil’s face. Glimmerwood Planks trim the gable and make the sign and banner pole. The King Crystal is set on the roof ridge.",
  "pattern": "a forge for legends",
  "intro": "The King Crystal, Glimmerwood and Obsidian.",
  "finished": "Crowned with the King Crystal. Ready for legends."
} satisfies CraftPresentation;
