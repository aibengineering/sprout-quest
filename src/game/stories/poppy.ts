// Poppy and Mr. Floppers: a little girl cornered in a secret grove off the Sunny Meadow, a walk home, a stolen toy
// bunny, and a chase down into the grove to get him back from the bunny bully. The grove stays afterwards: a quiet
// spot with good trees and rocks. Once the Garden's built, she tends it (see garden.ts): you work its field by hand.
import type { ActorSpec } from '../../actors';
import { offerVillageUpgrade } from '../housing';
import { zoneById, type MonsterKind } from '../../data';
import { FIELD_COLS, gardenOpen, gardenUpdate, isReady } from '../../garden';
import { drumsStep, poppyAway } from '../../procession';
import { plotOpen } from '../../rules';
import { POPPY_GROVE } from '../../poppyGrove';
import { FIELD, type WorldObj } from '../../world';
import { G, paused, persist, syncWorld } from '../context';
import { bubble, follow, lookAt, narrate, pan, say, scene, walk, wait, type Speaker } from '../scenes';
import { stopWaiting, syncStories, waitAt, type Story } from '../stories';
import { GRANNY, GRANNY_ID } from './granny';

export const POPPY_TALK: Speaker = { name: 'Poppy', emoji: '👧', portrait: (m) => (m === 'happy' ? 'npc_poppy' : m === 'hug' ? 'npc_poppy_hug' : `npc_poppy_${m}`) };

/**
 * One dead-end forest trail leads west from the meadow into a rich gathering glade.
 * Poppy is cornered just inside its entrance; the bunny thief later flees down this same trail.
 */
const M = zoneById('meadow').x0;
const tile = (col: number, y: number) => ({ x: M + col, y });
/** Where Poppy cowers, with the slimes between her and the way out. */
const COWER = tile(POPPY_GROVE.cower.x, POPPY_GROVE.cower.y);
/** Just outside the grove's mouth, and where Big Bun is caught with the toy. */
const MOUTH = tile(POPPY_GROVE.mouth.x, POPPY_GROVE.mouth.y);
const DROPPED = tile(25, 35.3);
/** Granny's cottage (the blue house in Sowerby): Poppy's place by the door (Granny's is in granny.ts). */
const HOME = { x: 29.4, y: 10.4 };
const DOOR = { x: 30.5, y: 10.4 };
/** Her place once she tends the Garden: on the path along the field's east side (see World.placeField). */
const V = zoneById('village').x0;
export const GARDEN_SPOT = { x: V + FIELD.x + FIELD_COLS + 0.5, y: FIELD.y + 1.9 };
export const POPPY_ID = 'poppy:poppy';
/** Big Bun's getaway: west down the corridor, around the clump of trees, and into the clearing. */
const GETAWAY = POPPY_GROVE.getaway.map(p => tile(p.x, p.y));

const pack = (flag: string, step: number, col: number, y: number, w: number, h: number, foes: [MonsterKind, number][], extra: Partial<WorldObj> = {}): WorldObj => ({
  kind: 'foe', flag, zone: 'meadow', x: M + col, y, w, h, label: 'Fight', text: 'Monsters', foes: foes.map(([kind, lv]) => ({ kind, lv })),
  story: { id: 'poppy', step }, hidden: true, ...extra,
});

// Step numbers: 0 meet · 1 rescue · 2 escort · 3 find · 4 chase · 5 return · 6 done.
// All groups block the same trail: you approach from the meadow, to their east.
const RESCUE = pack('poppy:rescue', 1, POPPY_GROVE.rescue.x, POPPY_GROVE.rescue.y, POPPY_GROVE.rescue.w, POPPY_GROVE.rescue.h,
  [['slime', 4], ['slime', 4], ['slime', 3]], { facing: -1 });
const a = POPPY_GROVE.pack1, b = POPPY_GROVE.pack2, c = POPPY_GROVE.bigbun;
const PACK1 = pack('poppy:pack1', 4, a.x, a.y, a.w, a.h, [['bunny', 4], ['bunny', 4]], { facing: 1 });
const PACK2 = pack('poppy:pack2', 4, b.x, b.y, b.w, b.h, [['slime', 5], ['bunny', 4], ['slime', 4]], { facing: 1 });
const BIGBUN = pack('poppy:bigbun', 4, c.x, c.y, c.w, c.h, [['bigbun', 4]], { boss: true, text: 'Big Bun', facing: 1 });
/** Approach from the meadow side of the trail. */
const approach = (o: WorldObj) => ({ x: o.x + o.w + 0.6, y: o === BIGBUN ? 35.5 : o.y + o.h - 0.4 });

const has = (flag: string) => G.save.flags.includes(flag);
const near = (p: { x: number; y: number }, r: number) => Math.hypot(G.over.x - p.x, G.over.y - p.y) < r;
const poppy = () => G.over.actors.get('poppy:poppy');

/** Talking to someone outside a scene: a few lines with the world waiting. */
const chat = (lines: [Speaker, string, string?][]) => paused(async () => {
  for (const [who, text, mood] of lines) await say(who, text, mood);
});

const HOME_LINES = ["Mr. Floppers says hi!", "You can chop the trees in my secret grove. Mr. Floppers says it's okay!", "Granny's baking cookies. Don't tell her I told you.", "When I grow up, I'm going to be a hero too!"];
/** After the night in Echo Cavern (see drums.ts). */
const CAVE_LINE = "Granny says no more caves. Ever. Mr. Floppers agrees with Granny.";
/** Once there's a plot for it: she'd love a garden. */
const WANT_GARDEN = "There's a big empty field at the end of the village, past the fountain. If you made it a garden, I'd look after it every single day!";
const ROAD_LINES = ["Granny says the tall grass is where the Hopbuns nap.", "Are we nearly there yet?", "You're really brave, you know."];
/** At the Garden, when there's nothing new to say. */
const GARDEN_LINES = [
  "Mr. Floppers is on weed patrol. He's very strict.",
  "I used to pick flowers where I wasn't supposed to. Now I grow my own!",
  'Oak trees drop Berry Seeds when they fall, and pines drop Herb Seeds. Bring me some!',
  'Thirsty plants go all droopy. A little water and they perk right up!',
  'Weeds always come back. You just keep pulling, and the good things grow.',
  'The lady on the statue looks after everything that gets planted. I help!',
  "Hold the button and walk along a row. You can do the whole row in one go!",
];
let line = 0, gardenLine = 0;

/** What the Garden needs, over Poppy's head: water, weeding or picking. */
function gardenMood(): string | undefined {
  const plots = gardenUpdate(G.save).plots;
  if (plots.some((p) => p?.thirsty)) return '💧';
  if (plots.some((p) => p?.weeds)) return '🌿';
  if (plots.some((p) => p && isReady(p))) return '🧺';
  return undefined;
}

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
      done: () => near(MOUTH, 5),
      async then() {
        syncWorld();
        G.over.actors.add({ id: 'poppy:poppy', look: { kind: 'walker', name: 'poppy' }, ...COWER, face: 0 });
        await scene(async () => {
          await pan(M + POPPY_GROVE.camera.x, POPPY_GROVE.camera.y, 1100);
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
          await say(POPPY_TALK, "I'm Poppy. I found this little trail into a secret grove! I was picking flowers by the log for Granny, and then… the slimes came.", 'sad');
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
          await say(POPPY_TALK, 'I must have dropped him by that fallen log when the slimes came!', 'sad');
          await say(GRANNY, 'Her toy bunny. She never goes anywhere without him.', 'worried');
          await say(POPPY_TALK, "Please, could you find him? He's blue, with a heart patch. He'll be so scared out there.", 'sad');
        });
      },
    },
    {
      id: 'find', label: 'Find Mr. Floppers by the grove entrance',
      target: () => MOUTH,
      // From outside, so the thief is between you and the grove.
      done: () => G.over.x > DROPPED.x + 0.8 && near(MOUTH, 3.5),
      async then() {
        // His gang is already in place along the way; Big Bun himself shows up in the clearing once he gets there.
        syncWorld();
        BIGBUN.hidden = true;
        const log = G.world.objs.find(o => o.id === 'poppy:thicket')!;
        // The saved step already permits entry; keep the log here until the thief reaches it.
        log.hidden = false;
        G.over.actors.add({ id: 'poppy:thief', look: { kind: 'monster', name: 'bigbun' }, ...DROPPED, face: 0, speed: 5.5 });
        await scene(async () => {
          await pan(DROPPED.x + 0.8, DROPPED.y, 900);
          bubble('poppy:thief', '🐰', 1.3);
          await wait(1300);
          bubble('poppy:thief', '❗', 1.2);
          await wait(900);
          follow('poppy:thief');
          await walk('poppy:thief', GETAWAY.slice(0, 1), 6);
          bubble('poppy:thief', '💢', .8);
          await wait(500);
          const restingY = log.y;
          try {
            for (let i = 1; i <= 16; i++) {
              log.y = restingY - log.h * i / 16;
              await wait(25);
            }
          } finally {
            log.y = restingY;
            log.hidden = true;
          }
          await walk('poppy:thief', GETAWAY.slice(1), 6);
          bubble('poppy:thief', '😝', 1.5);
          await wait(1200);
        });
        G.over.actors.remove('poppy:thief');
        await paused(() => narrate('A big Hopbun grabbed Mr. Floppers and shoved the fallen log aside! It fled down the grove trail. Its friends are guarding the way!'));
      },
    },
    {
      id: 'chase', label: 'Chase down the bunny thief',
      target: () => approach(!has(PACK1.flag!) ? PACK1 : !has(PACK2.flag!) ? PACK2 : BIGBUN),
      done: () => has('poppy:bigbun'),
      async then() {
        await paused(() => G.ui.itemFound('floppers', 'Mr. Floppers', "A little blue plush bunny with a heart patch. Poppy's going to be so happy!", '🐰', 'You got back', true));
        G.ui.toast('🌳 The Secret Grove is open. Its trees and rocks are yours to gather.',4200);
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
          await G.ui.itemFound('trailboots', 'Trail Boots', 'Sturdy boots from Granny Clover. You walk 25% faster outside of fights.', '👢', 'Granny made you', true);
          await say(POPPY_TALK, 'Mr. Floppers says thank you!', 'hug');
          await say(GRANNY, "And you come by my kitchen whenever you're hungry, dear. A hero can't fight on an empty stomach!");
        });
      },
    },
  ],

  cast(step) {
    const cast: ActorSpec[] = [];
    // Off after the drums in Echo Cavern, until she runs home (drums.ts has her there).
    if (step >= 6 && poppyAway(G.save)) return cast;
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
    } else if (step >= 6 && gardenOpen(G.save)) {
      // She tends the Garden now, and shows what it needs over her head.
      cast.push({ id: 'poppy:poppy', look: { kind: 'walker', name: 'poppy' }, ...GARDEN_SPOT, face: Math.PI / 2, mood: gardenMood(), label: 'Talk', talk: () => paused(async()=>{const n=gardenLine++;await say(POPPY_TALK,G.save.flags.includes('rook:lodge') && n % 4===0 ? 'Rook asked how much Mr. Floppers was worth. He’s not for sale.' : GARDEN_LINES[n % GARDEN_LINES.length]);await offerVillageUpgrade('Poppy');}) });
    } else if (step >= 6) {
      // Every other chat, once there's a plot for it, she asks for a garden.
      const home = () => {
        const lines = drumsStep(G.save) >= 4 ? [...HOME_LINES, CAVE_LINE] : HOME_LINES;
        const text = plotOpen(G.save, 'garden') && line % 2 === 0 ? WANT_GARDEN : lines[line % lines.length];
        line++;
        return chat([[POPPY_TALK, text, 'hug']]);
      };
      cast.push({ ...at('', home), look: { kind: 'idle', name: 'poppy_hug' }, mood: undefined });
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
    // Scenes can borrow Poppy from the Garden. Don't reset her position or mood
    // while a scripted walk or conversation controls her, including after she arrives.
    if (step < 6 || G.mode !== 'world' || G.over.quiet || p.path.length) return;
    // She moves to the Garden once there is one for her to tend (and it says what it needs over her head).
    // (She wanders over to help when you work the field: anywhere in it counts.)
    const atGarden = Math.hypot(p.x - GARDEN_SPOT.x, p.y - GARDEN_SPOT.y) < 8;
    if (atGarden !== gardenOpen(G.save)) return syncStories();
    if (atGarden) p.mood = gardenMood();
    // At home with Mr. Floppers, she lights up when you come by.
    if (!p.bubble && Math.hypot(p.x - G.over.x, p.y - G.over.y) < 2.5 && Math.random() < 0.004) p.bubble = { emoji: '💖', t: 0, hold: 2 };
  },
};
