// Imported only through __DEV__. No buttons, saved preferences, stat boosts, or automatic navigation/dialogue.
import { busy, G } from '../game/context';
import { chop } from '../game/gathering';
import { AutoInput, combatControls, GatherControls } from './autoInput';

interface Options { combat: boolean; gather: boolean }
const options: Options = { combat: false, gather: false };
const gathering = new GatherControls();
let input: AutoInput;
let active: 'combat' | 'gather' | null = null;

export function installPlaytest() {
  input = new AutoInput(G.input);
  const api = {
    enable(settings: Partial<Options> = { combat: true, gather: true }) {
      Object.assign(options, settings);
      input.clear();
      gathering.clear();
    },
    disable() {
      options.combat = options.gather = false;
      active = null;
      input.clear();
      gathering.clear();
    },
    get status() { return { ...options, active }; },
  };
  (window as unknown as { sproutPlaytest: typeof api }).sproutPlaytest = api;
  const auto = new URL(location.href).searchParams.get('autoplay');
  if (auto === '1') api.enable();
  else if (auto === 'combat') api.enable({ combat: true });
  else if (auto === 'gather') api.enable({ gather: true });
}

/** Called just before the normal game update, using the same clamped dt as the game. */
export function tickPlaytest(dt: number) {
  input.clear();
  active = null;
  if (busy() || G.ui.isOpen) { gathering.clear(); return; }
  if (options.combat && G.mode === 'battle' && G.battle && G.battle.intro <= 0 && G.battle.endT < 0 && !G.battle.outcome) {
    active = 'combat';
    input.set(combatControls(G.battle));
  } else if (options.gather && G.mode === 'gather' && chop) {
    active = 'gather';
    input.set(gathering.frame(chop.game, dt));
  } else gathering.clear();
}
