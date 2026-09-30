import type { Sfx } from '../audio';
import type { MatId } from '../data';

/** Presentation only. Costs always come from Gear.recipe, never from an animation definition. */
export interface CraftLayer {
  id: string;
  src: string;
  /** Optional registered-canvas clipping, for separate contacts on one shared seam image. */
  clip?: string;
  /** Untargeted supports (bottles/cookware) show initially unless explicitly disabled. */
  initial?: boolean;
  /** Non-ingredient effects such as steam can enter at a particular timeline time. */
  showAt?: number;
  /** Fuel and temporary supports can leave when the finished piece is revealed. */
  finished?: boolean;
  /** Pilot compatibility only; new contributions should use unique layer ids. */
  binding?: number;
}

export type CraftContact = 'soft' | 'bind' | 'solid' | 'energy';
export interface CraftTarget {
  material: MatId;
  /** Matches a layer id. Multiple ingredient bundles can contribute to the same layer. */
  part: string;
  at: number;
  duration: number;
  /** Contact point normalized to the common untrimmed canvas. */
  x: number;
  y: number;
  contact: CraftContact;
  sound?: Sfx;
  binding?: number;
}

export interface CraftPresentation {
  id: string;
  duration: number;
  layers: readonly CraftLayer[];
  complete: string;
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
  /** Village buildings rise on a plot, on a wider 4:3 canvas (640×480), instead of the Forge's bench. */
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
