// What happens when you press the action button next to something on the map: one handler per kind of object.
import { MONSTERS, ZONES, zoneById } from '../data';
import { playerStats, potionRefill } from '../rules';
import { has } from '../unlocks';
import type { ObjKind, WorldObj } from '../world';
import { G, menuCtx, paused, persist, syncWorld } from './context';
import { challengeFoe, startBattle } from './fights';
import { travelTo } from './menu';
import { tryGather } from './gathering';
import { progressQuests, talkToElder } from './story';
import { sawmillBuilt } from './stories/bram';
import { visitPip } from './stories/pip';
import { gardenOpen } from '../garden';
import { poppyAway } from '../procession';
import { kitchenOpen } from '../kitchen';
import { enterRoom, roomAct } from './rooms';
import { enterEchoCave, leaveEchoCave } from './underground';
import { gardenAct, gardenStation, POPPY_AWAY } from './gardenWork';
import { askBramForHome } from './housing';
import { visitResident } from './stories/residents';
import { constructShortcut } from './shortcuts';

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

/** Sowerby's Waystone: pick a campfire you've lit, and you're there. */
async function waystone() {
  const s = G.save, lit = ZONES.filter((z) => s.camps.includes(z.id));
  const list = lit.length
    ? lit.map((z) => `<button class="go wide" data-dialog="${z.id}">🔥 ${z.name} <small>· Lv ${z.lv[0]}–${z.lv[1]}</small></button>`).join('')
    : '<p>No campfires lit yet. Beat a guardian to light the one past its gate.</p>';
  const r = await paused(() => G.ui.dialog(
    `<div class="big" style="font-size:22px">🔮 Veyra's Waystone</div><p>Where to?</p><div class="waystone">${list}</div>`,
    [['close', 'Stay']],
  ));
  const z = lit.find((z) => z.id === r);
  if (z) travelTo(z.id);
}

const HANDLERS: Partial<Record<ObjKind, (o: WorldObj) => void | Promise<void>>> = {
  forge() {
    const s = G.save;
    if (s.build.forge === 0) {
      if (!has(s, 'village')) return G.ui.toast('🏚 The old forge has fallen to pieces. Maybe someone in the village knows how to fix it…');
      return openMenu(menuCtx(), 'village', 'forge');
    }
    if (!has(s, 'forge')) return G.ui.toast('🔒 The forge is cold. Elder Oswin will light it when you are ready.');
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
    // Veyra's Waystone, once it's rebuilt: out to any campfire you've lit.
    if (o.project === 'warp' && G.save.build.warp > 0) return waystone();
    // Bram's Sawmill, once it's built: his bench, logs in and planks out.
    if (o.project === 'sawmill' && sawmillBuilt()) return enterRoom('sawmill');
    // The Guest Cottage, once Pip's moved in: a knock on his door.
    if (o.project === 'cottage') return (G.save.stories.pip ?? 0) >= 1 ? visitPip() : askBramForHome();
    // Poppy's Garden, once she tends it: her plots (not while she's off after the drums in Echo Cavern).
    if (o.project === 'garden' && gardenOpen(G.save) && poppyAway(G.save)) return G.ui.toast(POPPY_AWAY);
    // Worked by hand: the plot you're on (Poppy offers advice when you talk to her).
    if (o.project === 'garden' && gardenOpen(G.save)) return gardenAct();
    openMenu(menuCtx(), 'village', o.project);
  },

  elder: () => talkToElder(),
  residence: (o) => visitResident(o.home!),

  /** Granny's blue house: her Kitchen, once she cooks. */
  house() {
    if (kitchenOpen(G.save) && !poppyAway(G.save)) enterRoom('kitchen');
  },

  /** Something to work at by hand in a room, or the way back out. */
  // The Garden's sign by the field's gate: its next level, in the village plans.
  station: (o) => (o.id === 'garden:sign' ? openMenu(menuCtx(), 'village', 'garden') : o.id?.startsWith('garden:') ? gardenStation(o) : roomAct(o)),
  door: (o) => o.id === 'echo:exit' ? leaveEchoCave() : roomAct(o),
  prop: (o) => { if (o.id === 'prop_cavemouth') enterEchoCave(); },

  async pickup() {
    await paused(() => G.ui.itemFound('twig', 'Twig Sword', "It's just a stick… but it feels right in your hand.", '🗡️', 'You found', true));
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

  // A campfire: rest (your checkpoint), and the way home to Sowerby in a flash. The first time, you light it.
  async camp(o) {
    const s = G.save;
    if (!s.camps.includes(o.zone!)) {
      s.camps.push(o.zone!);
      rest(o.zone!);
      G.over.kindle(o);
      G.audio.play('kindle');
      G.ui.banner('🔥 Campfire lit', `${zoneById(o.zone!).name}: your checkpoint, and a way home`);
      syncWorld();
      persist();
      return;
    }
    rest(o.zone!);
    persist();
    const r = await paused(() => G.ui.dialog(
      `<div class="big" style="font-size:22px">🔥 Campfire</div><p>Rested by the fire. Your checkpoint is saved here.</p>`,
      [['stay', 'Stay'], ['home', '🏠 Travel to Sowerby']],
    ));
    if (r === 'home') travelTo('village');
  },

  fountain() {
    const s = G.save, potBefore = s.potions;
    rest('village');
    // A free potion top-up keeps things gentle; the Garden raises how many you get.
    s.potions = Math.max(s.potions, potionRefill(s));
    G.ui.toast(`💧 Fully healed!${s.potions > potBefore ? ` Potions refilled to ${s.potions}.` : ''}`);
    persist();
  },

  async statue(o) {
    await paused(() => G.ui.message(o.id === 'king' ? '👑 An old statue' : '🌾 Veyra, the Sower', o.text ?? ''));
  },

  async sign(o) {
    await paused(() => G.ui.message('📜 Sign', o.text ?? ''));
  },

  node: (o) => tryGather(o),

  bridge: (o) => constructShortcut(o.id!),

  /** A story character: whatever they have to say. */
  async npc(o) {
    await G.over.cast.get(o.id!)?.talk?.();
  },

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
