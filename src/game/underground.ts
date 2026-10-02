// Enter an independent underground map through its visible mouth, and return to the same doorstep.
import { ECHO_OUTSIDE } from '../echoCave';
import { MOUTH } from '../procession';
import { G, busy, persist, transition } from './context';

export function enterEchoCave() {
  if (busy() || G.over.room || G.over.underground || G.mode !== 'world') return;
  G.audio.play('step');
  G.input.reset();
  transition(() => { G.over.enterCave(); persist(); });
}

export function leaveEchoCave() {
  if (busy() || !G.over.underground) return;
  G.audio.play('step');
  G.input.reset();
  transition(() => { G.over.teleport(ECHO_OUTSIDE.x, ECHO_OUTSIDE.y); G.over.face = Math.PI / 2; persist(); });
}

export function undergroundTick() {
  if (busy() || G.mode !== 'world' || G.over.room) return;
  if (G.over.underground) {
    if (G.over.underground.outAt(G.over.x, G.over.y)) leaveEchoCave();
  } else if (G.over.currentZone.id === 'cave' && G.input.axis().y < -.5
    && Math.abs(G.over.x - MOUTH.x) < .5 && G.over.y > MOUTH.y - .2 && G.over.y < MOUTH.y + .6) enterEchoCave();
}

export function restoreUnderground() {
  const saved = G.save.underground;
  if (saved?.id !== 'echo' || G.over.room) return;
  const valid = Number.isFinite(saved.x) && Number.isFinite(saved.y) && !G.over.echo.blocked(saved.x, saved.y, .28);
  G.over.enterCave(valid ? saved : undefined);
}
