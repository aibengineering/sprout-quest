// What happens when you press the action button next to something on the map: one handler per kind of object.
import { MONSTERS, ZONES, zoneById } from '../data';
import { playerStats, potionRefill } from '../rules';
import { has } from '../unlocks';
import type { ObjKind, WorldObj } from '../world';
import { G, menuCtx, paused, persist, syncWorld } from './context';
import { challengeFoe, startBattle } from './fights';
import { tryGather } from './gathering';
import { progressQuests, talkToElder } from './story';

/** Opens the menu with the world waiting behind it. */
function openMenu(...args: Parameters<typeof G.ui.openMenu>) {
  G.mode = 'dialog';
  G.ui.openMenu(...args);
}

/** Full HP, and this is where you'll wake up if you fall. */
function rest(respawn: typeof G.save.respawn) {
  G.save.hp = playerStats(G.save).maxHp;
  G.save.respawn = respawn;
  G.audio.play('heal');
}

const HANDLERS: Partial<Record<ObjKind, (o: WorldObj) => void | Promise<void>>> = {
  forge() {
    const s = G.save;
    if (s.build.forge === 0) {
      if (!has(s, 'village')) return G.ui.toast('🏚 The old forge has fallen to pieces. Maybe someone in the village knows how to fix it…');
      return openMenu(menuCtx(), 'village', 'forge');
    }
    if (!has(s, 'forge')) return G.ui.toast('🔒 The forge is cold. Elder Bloom will light it when you are ready.');
    openMenu(menuCtx(true), 'forge');
  },

  plot(o) {
    // Before the village takes you in, the home plot is just your tent.
    if (!has(G.save, 'village')) {
      G.save.hp = playerStats(G.save).maxHp;
      G.audio.play('heal');
      G.ui.toast('🏕 Your cozy tent. You feel rested!');
      return persist();
    }
    openMenu(menuCtx(), 'village', o.project);
  },

  elder: () => talkToElder(),

  async pickup() {
    G.audio.play('levelup');
    await paused(() => G.ui.itemFound('twig', 'Twig Sword', "It's just a stick… but it feels right in your hand."));
    G.save.flags.push('sword');
    syncWorld();
    persist();
    void progressQuests();
  },

  foe: (o) => challengeFoe(o),

  async gate(o) {
    const z = zoneById(o.zone!), g = z.guardian!, m = MONSTERS[g.kind];
    G.mode = 'dialog';
    const r = await G.ui.challenge(g.kind, m.name, m.title ?? '', g.lv, G.save.lv, z.name);
    G.input.reset();
    // You fight the guardian in the area you're coming from.
    if (r === 'yes') startBattle(ZONES[ZONES.indexOf(z) - 1], [{ kind: g.kind, lv: g.lv, golden: false }], true);
    else G.mode = 'world';
  },

  camp(o) {
    rest(o.zone!);
    persist();
    if (G.save.build.warp) {
      G.ui.toast('🔥 Rested. Checkpoint saved!');
      openMenu(menuCtx(), 'journey');
    } else G.ui.toast('🔥 Rested by the fire. Checkpoint saved!');
  },

  fountain() {
    const s = G.save, potBefore = s.potions;
    rest('village');
    // A free potion top-up keeps things gentle; the Garden raises how many you get.
    s.potions = Math.max(s.potions, potionRefill(s));
    G.ui.toast(`💧 Fully healed!${s.potions > potBefore ? ` Potions refilled to ${s.potions}.` : ''}`);
    persist();
  },

  async sign(o) {
    await paused(() => G.ui.message('📜 Sign', o.text ?? ''));
  },

  node: (o) => tryGather(o),

  async lair() {
    const s = G.save;
    G.mode = 'dialog';
    const r = await G.ui.dialog(
      `<div class="big" style="font-size:26px">🐉 Emberwyrm's Lair</div><p>A huge dragon snores inside. It's Lv 20 and very, very grumpy.${
        s.lv < 16 ? '<br><b>You might want to get stronger first!</b>' : ''
      }</p>`,
      [['no', 'Not yet'], ['yes', 'Fight!', 'alt']],
    );
    G.input.reset();
    // Each rematch, it comes back a little stronger.
    if (r === 'yes') startBattle(zoneById('peak'), [{ kind: 'dragon', lv: 20 + Math.max(0, s.bossWins) * 2, golden: false }], true);
    else G.mode = 'world';
  },
};

export async function interact() {
  const o = G.over.nearbyObject();
  if (!o) return;
  G.audio.play('ui');
  await HANDLERS[o.kind]?.(o);
}
