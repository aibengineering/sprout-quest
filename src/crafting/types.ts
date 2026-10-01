import type { Sfx } from '../audio';
import type { MatId } from '../data';

/** Presentation only. Costs always come from Gear.recipe, never from an animation definition. */
export interface CraftLayer {
  /** The name of the layer's top-level node in the scene's model. */
  id: string;
  /** Untargeted supports (bottles/cookware) show initially unless explicitly disabled. */
  initial?: boolean;
  /** Non-ingredient effects such as steam can enter at a particular timeline time. */
  showAt?: number;
  /** Fuel and temporary supports can leave when the finished piece is revealed. */
  finished?: boolean;
}

export type CraftContact = 'soft' | 'bind' | 'solid' | 'energy';
export interface CraftTarget {
  material: MatId;
  /** Matches a layer id; the ingredients fly to the middle of that layer. Several bundles can land on one layer. */
  part: string;
  at: number;
  duration: number;
  contact: CraftContact;
  sound?: Sfx;
}

export interface CraftPresentation {
  id: string;
  /**
   * The scene's 3D model (assets/crafting3d/<id>.glb), from the same Blender builders as the worn or held item: each
   * top-level node is a layer, named after its id, and everything visible in the finished piece is some layer.
   * Z-up in Blender with the front facing -Y, origin on the ground under the middle (exported Y-up).
   */
  model: string;
  duration: number;
  layers: readonly CraftLayer[];
  /** Ingredient roles must cover the recipe's materials; names come from MATS. */
  roles: Partial<Record<MatId, string>>;
  targets: readonly CraftTarget[];
  phases: readonly { at: number; stage: string; text: string; sound?: Sfx }[];
  sceneLabel: string;
  pattern: string;
  intro: string;
  finished: string;
  /** Defaults to the Forge heading; meals may name Granny's kitchen instead. */
  eyebrow?: string;
  /** Village buildings rise on a plot, framed wider (4:3), instead of on the Forge's bench. */
  scene?: 'building';
}

export interface CraftItem {
  id: string;
  name: string;
  recipe: import('../data').Recipe;
  /** Meals retain their existing meal_<id> inventory icon identity. */
  iconId?: string;
}

export interface CraftFlight extends CraftTarget { count: number }
