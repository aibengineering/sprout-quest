// The story: finishing quests, introducing the next, unlock cards, Elder Bloom and the village cutscene.
import { currentQuest, advanceQuests } from '../quests';
import { logEvent } from '../stats';
import { checkUnlocks } from '../unlocks';
import { G, paused, persist, syncWorld } from './context';

/** Reveals newly earned systems with a small card (or silently when catching up an old save). */
export function unlocks(silent = false) {
  const fresh = checkUnlocks(G.save);
  if (silent) G.save.fresh = [];
  else for (const u of fresh) G.ui.unlockCard(u);
  if (fresh.length) {
    syncWorld();
    persist();
  }
}

let questBusy = false;

/** Completes finished story steps one by one with a little celebration, then introduces the next. */
export async function progressQuests(): Promise<boolean> {
  if (questBusy) return false;
  questBusy = true;
  const s = G.save;
  try {
    const done = advanceQuests(s);
    if (!done.length) {
      unlocks();
      return false;
    }
    persist();
    const prev = G.mode;
    G.mode = 'dialog';
    G.ui.closeMenu(true);
    for (const q of done) {
      logEvent(s, { kind: 'quest', id: q.id });
      if (q.quiet) continue;
      G.audio.play('victory');
      await G.ui.questComplete(q);
    }
    const next = currentQuest(s);
    if (next) {
      if (!s.tips.includes(`elder:${next.id}`)) s.tips.push(`elder:${next.id}`);
      if (next.chapter === 'Prologue') await G.ui.caption(next.text, 'narrator');
      else await G.ui.questIntro(next);
    } else {
      await G.ui.message('🌟 The End… for now!', 'Every chapter is complete. Sprout Village is safe, and you are its hero! Keep exploring, crafting and rematching bosses.');
    }
    persist();
    G.mode = prev === 'battle' || prev === 'dialog' ? 'world' : prev;
    G.input.reset();
    unlocks();
    return true;
  } finally {
    questBusy = false;
  }
}

/** Letterboxed camera tour with captions. */
async function cutscene(shots: { x: number; y: number; text: string; speaker?: 'elder' | 'narrator' }[]) {
  await paused(async () => {
    G.ui.cinema(true);
    G.input.reset();
    for (const shot of shots) {
      G.over.camTarget = { x: shot.x, y: shot.y };
      await new Promise((r) => setTimeout(r, 700));
      await G.ui.caption(shot.text, shot.speaker ?? 'elder');
    }
    G.over.camTarget = null;
    G.ui.cinema(false);
    await new Promise((r) => setTimeout(r, 400));
  });
}

/** The first time you walk into Sprout Village, Elder Bloom shows you around. */
export async function arriveAtVillage() {
  const w = G.world, s = G.save;
  const elder = w.obj('elder')!, forge = w.obj('forge')!, home = w.obj('plot', 'home')!, sign = w.objs.find((o) => o.kind === 'sign' && o.x > elder.x)!;
  await cutscene([
    { x: elder.x + 0.4, y: elder.y + 1, text: 'Oh my! A traveler, and you made it through the glade all by yourself? Welcome to Sprout Village, little sprout!' },
    { x: home.x + 3, y: home.y + 1.5, text: "It isn't much right now. A tent, a dry garden patch and a lot of empty ground…" },
    { x: forge.x + 2, y: forge.y + 2, text: 'Even our old forge has crumbled. Ever since smoke started drifting from Ember Peak, the monsters have been grumpy and nobody dares travel.' },
    { x: sign.x + 3, y: sign.y + 2, text: 'Out east, big guardians now block every road. We are cut off from the rest of the world.' },
    { x: G.over.x, y: G.over.y, text: "But I have a feeling about you. With your help, this little village could grow into something wonderful. Will you stay and help us?" },
  ]);
  s.flags.push('village');
  s.respawn = 'village';
  if (!s.visited.includes('village')) s.visited.push('village');
  persist();
  await progressQuests();
}

export async function talkToElder() {
  const s = G.save, q = currentQuest(s);
  if (q?.goal.type === 'talk') s.talked = true;
  if (q && !s.tips.includes(`elder:${q.id}`)) s.tips.push(`elder:${q.id}`);
  await paused(() => G.ui.elderSays(q ? q.text : 'The skies are clear thanks to you! Why not build up the village, or give the Emberwyrm a friendly rematch?', q?.hint));
  persist();
  void progressQuests();
}

let autoTalked = false;

/** Elder Bloom calls you over the first time you walk up to her. */
export function maybeAutoTalk() {
  const q = currentQuest(G.save);
  const elder = G.world.obj('elder');
  if (!elder || q?.goal.type !== 'talk') return;
  const d = Math.hypot(G.over.x - (elder.x + elder.w / 2), G.over.y - (elder.y + elder.h));
  if (d > 3.2) autoTalked = false;
  else if (d < 2.2 && !autoTalked) {
    autoTalked = true;
    void talkToElder();
  }
}
