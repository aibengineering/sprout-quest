// Poppy and Mr. Floppers: a little girl cornered in a secret grove off the Sunny Meadow, a walk home, a stolen toy
// bunny, and a chase down into the grove to get him back from the bunny bully. The grove stays afterwards: a quiet
// spot with good trees and rocks.
import type { ActorSpec } from '../../actors';
import { zoneById, type MonsterKind } from '../../data';
import type { WorldObj } from '../../world';
import { G, paused, persist, syncWorld } from '../context';
import { bubble, follow, lookAt, narrate, pan, say, scene, walk, wait, type Speaker } from '../scenes';
import { stopWaiting, waitAt, type Story } from '../stories';
import { GRANNY, GRANNY_ID } from './granny';

const POPPY_TALK: Speaker = { name: 'Poppy', emoji: '👧', portrait: (m) => (m === 'happy' ? 'npc_poppy' : m === 'hug' ? 'npc_poppy_hug' : `npc_poppy_${m}`) };

/**
 * The Secret Grove, in route-map tiles of the meadow (see routes.ts): its mouth opens west off the meadow's
 * south-east pocket (columns 26-28, rows 22-23), a flowery corridor runs west, dips around a clump of trees, and
 * ends in a clearing.
 */
const M = zoneById('meadow').x0;
const tile = (col: number, y: number) => ({ x: M + col, y });
/** Where Poppy cowers, with the slimes between her and the way out. */
const COWER = tile(22.5, 23.4);
/** Just outside the grove's mouth, and where Big Bun is caught with the toy. */
const MOUTH = tile(28.6, 23.2);
const DROPPED = tile(25, 23.3);
/** Granny's cottage (the blue house in Sowerby): Poppy's place by the door (Granny's is in granny.ts). */
const HOME = { x: 29.4, y: 10.4 };
const DOOR = { x: 30.5, y: 10.4 };
/** Big Bun's getaway: west down the corridor, around the clump of trees, and into the clearing. */
const GETAWAY = [tile(23.5, 23.4), tile(20.3, 23.5), tile(19.6, 24.6), tile(15.5, 24.6), tile(14.5, 23.6), tile(12.2, 23.3), tile(7, 23.3)];

const pack = (flag: string, step: number, col: number, y: number, w: number, h: number, foes: [MonsterKind, number][], extra: Partial<WorldObj> = {}): WorldObj => ({
  kind: 'foe', flag, zone: 'meadow', x: M + col, y, w, h, label: 'Fight', text: 'Monsters', foes: foes.map(([kind, lv]) => ({ kind, lv })),
  story: { id: 'poppy', step }, hidden: true, ...extra,
});

// Step numbers: 0 meet · 1 rescue · 2 escort · 3 find · 4 chase · 5 return · 6 done.
// Every group fills the grove from wall to wall, so you have to go through them, always coming from the east.
const RESCUE = pack('poppy:rescue', 1, 26.1, 22, 1.8, 2, [['slime', 4], ['slime', 4], ['slime', 3]], { facing: -1 });
const PACK1 = pack('poppy:pack1', 4, 22.1, 22, 1.8, 2, [['bunny', 4], ['bunny', 4]], { facing: 1 });
const PACK2 = pack('poppy:pack2', 4, 16, 24, 3, 1, [['slime', 5], ['bunny', 4], ['slime', 4]], { facing: 1 });
const BIGBUN = pack('poppy:bigbun', 4, 6.2, 22.3, 1.6, 1.1, [['bigbun', 4]], { boss: true, text: 'Big Bun', facing: 1 });
/** Where you walk up to a group: its east side. */
const approach = (o: WorldObj) => ({ x: o.x + o.w + 0.6, y: o.y + o.h - 0.4 });

const has = (flag: string) => G.save.flags.includes(flag);
const near = (p: { x: number; y: number }, r: number) => Math.hypot(G.over.x - p.x, G.over.y - p.y) < r;
const poppy = () => G.over.actors.get('poppy:poppy');

/** Talking to someone outside a scene: a few lines with the world waiting. */
const chat = (lines: [Speaker, string, string?][]) => paused(async () => {
  for (const [who, text, mood] of lines) await say(who, text, mood);
});

const HOME_LINES = ["Mr. Floppers says hi!", "You can chop the trees in my secret grove. Mr. Floppers says it's okay!", "Granny's baking cookies. Don't tell her I told you.", "When I grow up, I'm going to be a hero too!"];
const ROAD_LINES = ["Granny says the tall grass is where the Hopbuns nap.", "Are we nearly there yet?", "You're really brave, you know."];
let line = 0;

export const POPPY: Story = {
  id: 'poppy',
  title: "Poppy's Bunny",
  icon: '🧸',
  available: () => has('village') && G.save.lv >= 3,
  objs: [RESCUE, PACK1, PACK2, BIGBUN],
  // Running up behind the slimes takes them by surprise, with Poppy watching from the edge.
  fight: (flag) => (flag === 'poppy:rescue' ? { ambush: true, bystander: { look: 'npc/poppy', mood: '😖' } } : undefined),

  steps: [
    {
      // Coming down into the meadow's south-east pocket (and only there), you spot her in the grove's mouth.
      id: 'meet', label: 'Explore the Sunny Meadow', hidden: true,
      done: () => G.over.x > M + 28.6 && G.over.x < M + 39 && G.over.y > 20.9,
      async then() {
        syncWorld();
        G.over.actors.add({ id: 'poppy:poppy', look: { kind: 'walker', name: 'poppy' }, ...COWER, face: 0 });
        await scene(async () => {
          await pan(M + 24.8, 23, 1100);
          bubble('poppy:poppy', '😨', 99);
          await wait(900);
          await say(POPPY_TALK, 'Eek! Go away, go away! Somebody, help!', 'scared');
          await narrate("The slimes haven't noticed you. Run up behind them and take them by surprise!");
        });
      },
    },
    {
      id: 'rescue', label: 'Save the girl from the slimes',
      target: () => approach(RESCUE),
      done: () => has('poppy:rescue'),
      async then() {
        await scene(async () => {
          await pan(G.over.x - 1.5, G.over.y, 700);
          bubble('poppy:poppy', '🥹', 2.5);
          await walk('poppy:poppy', [{ x: G.over.x - 0.9, y: G.over.y + 0.1 }], 2.4);
          await say(POPPY_TALK, 'Y-you beat them all! Thank you, thank you!');
          await say(POPPY_TALK, "I'm Poppy. I found this secret grove, all full of flowers, and I was picking some for Granny, and then… the slimes came.", 'sad');
          await say(POPPY_TALK, 'Could you walk me home? Granny lives in Sowerby, in the blue house.');
          bubble('poppy:poppy', '🙂', 2);
        });
      },
    },
    {
      id: 'escort', label: 'Walk Poppy home to Sowerby',
      target: () => (has('poppy:waiting') ? approach(RESCUE) : DOOR),
      done: () => near(DOOR, 2.6) && !!poppy() && Math.hypot(poppy()!.x - G.over.x, poppy()!.y - G.over.y) < 3,
      async then() {
        G.over.actors.get('poppy:poppy')!.follow = false;
        await scene(async () => {
          await pan(DOOR.x, DOOR.y - 0.5, 600);
          await walk('poppy:poppy', [HOME], 2.8);
          lookAt('poppy:poppy', GRANNY_ID);
          bubble(GRANNY_ID, '😮', 1.2);
          await wait(700);
          bubble(GRANNY_ID, '😊', 3);
          await say(GRANNY, 'Poppy! Oh, thank goodness. Where have you been, my little poppyseed?', 'worried');
          await say(POPPY_TALK, 'Slimes chased me, Granny! But this hero saved me!');
          await say(GRANNY, "Then you have my thanks, dear. It's so good to have you both here safe.");
          await wait(400);
          lookAt('poppy:poppy');
          bubble('poppy:poppy', '❓', 1.2);
          await wait(1100);
          bubble('poppy:poppy', '😱', 99);
          await say(POPPY_TALK, 'Wait… Mr. Floppers? Where is Mr. Floppers?!', 'scared');
          await say(POPPY_TALK, 'I must have dropped him in the grove when the slimes came!', 'sad');
          await say(GRANNY, 'Her toy bunny. She never goes anywhere without him.', 'worried');
          await say(POPPY_TALK, "Please, could you find him? He's blue, with a heart patch. He'll be so scared out there.", 'sad');
        });
      },
    },
    {
      id: 'find', label: 'Find Mr. Floppers in the Secret Grove',
      target: () => MOUTH,
      // From outside, so the thief is between you and the grove.
      done: () => G.over.x > DROPPED.x + 0.8 && near(MOUTH, 3.5),
      async then() {
        // His gang is already in place along the way; Big Bun himself shows up in the clearing once he gets there.
        syncWorld();
        BIGBUN.hidden = true;
        G.over.actors.add({ id: 'poppy:thief', look: { kind: 'monster', name: 'bigbun' }, ...DROPPED, face: 0, speed: 5.5 });
        await scene(async () => {
          await pan(DROPPED.x + 0.8, DROPPED.y, 900);
          bubble('poppy:thief', '🐰', 1.3);
          await wait(1300);
          bubble('poppy:thief', '❗', 1.2);
          await wait(900);
          follow('poppy:thief');
          await walk('poppy:thief', GETAWAY, 6);
          bubble('poppy:thief', '😝', 1.5);
          await wait(1200);
        });
        G.over.actors.remove('poppy:thief');
        await paused(() => narrate('A big Hopbun grabbed Mr. Floppers and ran deep into the grove. Its friends are guarding the way!'));
      },
    },
    {
      id: 'chase', label: 'Chase down the bunny thief',
      target: () => approach(!has(PACK1.flag!) ? PACK1 : !has(PACK2.flag!) ? PACK2 : BIGBUN),
      done: () => has('poppy:bigbun'),
      async then() {
        await paused(() => G.ui.itemFound('floppers', 'Mr. Floppers', "A little blue plush bunny with a heart patch. Poppy's going to be so happy!", '🐰', 'You got back'));
      },
    },
    {
      id: 'return', label: 'Bring Mr. Floppers home to Poppy',
      target: () => HOME,
      done: () => has('poppy:returned'),
      async then() {
        await scene(async () => {
          await pan(HOME.x + 1, HOME.y - 0.4, 600);
          bubble('poppy:poppy', '🥰', 3);
          await say(POPPY_TALK, 'You found him!! Mr. Floppers, you came home!');
          const p = G.over.actors.get('poppy:poppy');
          if (p) p.look = { kind: 'idle', name: 'poppy_hug' };
          bubble('poppy:poppy', '💖', 3);
          await wait(700);
          await say(GRANNY, 'You brought my Poppy home, and her bunny too. Let me make you something for those tired feet.');
          G.save.perks.push('trailboots');
          persist();
          await G.ui.itemFound('trailboots', 'Trail Boots', 'Sturdy boots from Granny Clover. You walk 25% faster outside of fights.', '👢', 'Granny made you');
          await say(POPPY_TALK, 'Mr. Floppers says thank you!', 'hug');
          await say(GRANNY, "And you come by my kitchen whenever you're hungry, dear. A hero can't fight on an empty stomach!");
        });
      },
    },
  ],

  cast(step) {
    const cast: ActorSpec[] = [];
    const at = (mood: string, talk: () => Promise<void> | void): ActorSpec => ({ id: 'poppy:poppy', look: { kind: 'walker', name: 'poppy' }, ...HOME, face: Math.PI / 2, mood, label: 'Talk', talk });
    if (step === 1) {
      cast.push({ id: 'poppy:poppy', look: { kind: 'walker', name: 'poppy' }, ...COWER, face: 0, mood: '😨', label: 'Talk', talk: () => chat([[POPPY_TALK, 'H-help! Please! The slimes!', 'scared']]) });
    } else if (step === 2 && has('poppy:waiting')) {
      // You fainted on the way: she waited by the grove for you.
      cast.push({
        id: 'poppy:poppy', look: { kind: 'walker', name: 'poppy' }, ...approach(RESCUE), face: Math.PI / 2, mood: '😟', label: 'Talk',
        talk: async () => {
          await chat([[POPPY_TALK, "You're back! I waited right here, just like you'd want. Let's go home?"]]);
          stopWaiting('poppy:waiting');
        },
      });
    } else if (step === 2) {
      cast.push({
        id: 'poppy:poppy', look: { kind: 'walker', name: 'poppy' }, x: G.over.x - 0.8, y: G.over.y + 0.1, follow: true, label: 'Talk',
        talk: () => chat([[POPPY_TALK, ROAD_LINES[line++ % ROAD_LINES.length]]]),
      });
    } else if (step === 3 || step === 4) {
      cast.push(at('😢', () => chat([[POPPY_TALK, "Mr. Floppers… I hope he's not scared out there.", 'sad']])));
    } else if (step === 5) {
      cast.push(at('🥺', () => {
        G.save.flags.push('poppy:returned');
      }));
    } else if (step >= 6) {
      cast.push({ ...at('', () => chat([[POPPY_TALK, HOME_LINES[line++ % HOME_LINES.length], 'hug']])), look: { kind: 'idle', name: 'poppy_hug' }, mood: undefined });
    }
    return cast;
  },

  fainted() {
    if ((G.save.stories.poppy ?? 0) === 2) waitAt('poppy:poppy', 'poppy:waiting');
  },

  tick(step) {
    const p = poppy();
    if (!p) return;
    // On the walk home she keeps an eye on the grass: nervous with monsters about, happy otherwise.
    if (step === 2 && p.follow) p.mood = G.over.roamers.list.some((r) => Math.hypot(r.x - p.x, r.y - p.y) < 3.5) ? '😰' : '🙂';
    // At home with Mr. Floppers, she lights up when you come by.
    if (step >= 6 && !p.bubble && Math.hypot(p.x - G.over.x, p.y - G.over.y) < 2.5 && Math.random() < 0.004) p.bubble = { emoji: '💖', t: 0, hold: 2 };
  },
};
