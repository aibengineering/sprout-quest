// Poppy and Mr. Floppers: a little girl in trouble in the Sunny Meadow, a walk home, a stolen toy bunny, and a chase
// through the meadow to get him back from the bunny bully.
import type { ActorSpec } from '../../actors';
import { zoneById, type MonsterKind } from '../../data';
import type { WorldObj } from '../../world';
import { G, paused, persist } from '../context';
import { startBattle } from '../fights';
import { bubble, follow, lookAt, narrate, pan, say, scene, walk, wait, type Speaker } from '../scenes';
import type { Story } from '../stories';

const POPPY_TALK: Speaker = { name: 'Poppy', emoji: '👧', portrait: (m) => (m === 'happy' ? 'npc_poppy' : m === 'hug' ? 'npc_poppy_hug' : `npc_poppy_${m}`) };
const GRANNY: Speaker = { name: 'Granny Clover', emoji: '👵', portrait: (m) => (m === 'worried' ? 'npc_granny_worried' : 'npc_granny') };

/** Where Poppy's trouble starts: the Sunny Meadow's quiet south-east corner. */
const SPOT = { x: 68.5, y: 22.3 };
/** Granny's cottage (the blue house in Sprout Village): Poppy's place by the door, and Granny's. */
const HOME = { x: 29.4, y: 10.4 };
const GRANNY_AT = { x: 31.8, y: 10.3 };
const DOOR = { x: 30.5, y: 10.4 };
/** Big Bun's getaway: up the path, west past the pond, north, and into the long grass in the meadow's north-east. */
const GETAWAY = [
  { x: 70.5, y: 21.3 }, { x: 74.5, y: 21.2 }, { x: 74.6, y: 19.5 }, { x: 74.6, y: 13.6 }, { x: 70, y: 13.3 }, { x: 68.8, y: 12 },
  { x: 61, y: 11.8 }, { x: 60.6, y: 8.5 }, { x: 60.6, y: 6 }, { x: 63, y: 4.6 }, { x: 67.5, y: 4.2 },
];

const pack = (flag: string, step: number, x: number, y: number, w: number, h: number, foes: [MonsterKind, number][], extra: Partial<WorldObj> = {}): WorldObj => ({
  kind: 'foe', flag, zone: 'meadow', x, y, w, h, label: 'Fight', text: 'Monsters', foes: foes.map(([kind, lv]) => ({ kind, lv })),
  story: { id: 'poppy', step }, hidden: true, ...extra,
});

// Step numbers: 0 meet · 1 rescue · 2 escort · 3 find · 4 chase · 5 return · 6 done.
const RESCUE = pack('poppy:rescue', 1, 70.6, 21.9, 1.4, 1, [['slime', 4], ['slime', 4], ['slime', 3]]);
const PACK1 = pack('poppy:pack1', 4, 64, 11, 1.4, 2, [['bunny', 4], ['bunny', 4]]);
const PACK2 = pack('poppy:pack2', 4, 60, 7.6, 2, 1.2, [['slime', 5], ['bunny', 4], ['slime', 4]]);
const BIGBUN = pack('poppy:bigbun', 4, 66.8, 3.6, 1.4, 1.1, [['bigbun', 4]], { boss: true, text: 'Big Bun', story: { id: 'poppy', step: 4, after: ['poppy:pack1', 'poppy:pack2'] } });

const has = (flag: string) => G.save.flags.includes(flag);
const near = (p: { x: number; y: number }, r: number) => Math.hypot(G.over.x - p.x, G.over.y - p.y) < r;
const centre = (o: WorldObj) => ({ x: o.x + o.w / 2, y: o.y + o.h + 0.6 });
const poppy = () => G.over.actors.get('poppy:poppy');

/** Talking to someone outside a scene: a few lines with the world waiting. */
const chat = (lines: [Speaker, string, string?][]) => paused(async () => {
  for (const [who, text, mood] of lines) await say(who, text, mood);
});

function grannyLines(step: number): [Speaker, string, string?][] {
  if (step <= 1) return [[GRANNY, "My granddaughter Poppy went to pick flowers in the Sunny Meadow this morning. She should have been home by now…", 'worried']];
  if (step <= 4) return [[GRANNY, "Poor Poppy. That bunny is her best friend in the whole world.", 'worried']];
  if (step === 5) return [[GRANNY, "You found him? Oh, go on, give him to her, dear!"]];
  return [[GRANNY, "Those boots holding up? Poppy hasn't stopped talking about you."]];
}

const HOME_LINES = ["Mr. Floppers says hi!", "Granny's baking cookies. Don't tell her I told you.", "When I grow up, I'm going to be a hero too!"];
const ROAD_LINES = ["Granny says the tall grass is where the Hopbuns nap.", "Are we nearly there yet?", "You're really brave, you know."];
let line = 0;

export const POPPY: Story = {
  id: 'poppy',
  title: "Poppy's Bunny",
  icon: '🧸',
  available: () => has('village') && G.save.lv >= 3,
  objs: [RESCUE, PACK1, PACK2, BIGBUN],
  fight: (flag) => (flag === 'poppy:rescue' ? { bystander: { look: 'npc/poppy', mood: '😖' } } : undefined),

  steps: [
    {
      id: 'meet', label: 'Explore the Sunny Meadow', hidden: true,
      done: () => near(SPOT, 4.2),
      async then() {
        const slimes = [{ x: 71.8, y: 23.4 }, { x: 72.8, y: 22.4 }, { x: 73.4, y: 23.6 }];
        G.over.actors.add({ id: 'poppy:poppy', look: { kind: 'walker', name: 'poppy' }, ...SPOT, face: Math.PI / 2 });
        slimes.forEach((p, i) => G.over.actors.add({ id: `poppy:s${i}`, look: { kind: 'monster', name: 'slime' }, ...p, face: Math.PI }));
        await scene(async () => {
          await pan(SPOT.x + 1.5, SPOT.y, 1000);
          slimes.forEach((_, i) => bubble(`poppy:s${i}`, '❗', 1.4));
          await wait(500);
          slimes.forEach((p, i) => void walk(`poppy:s${i}`, [{ x: p.x - 1.1, y: p.y - 0.3 }], 1.3));
          bubble('poppy:poppy', '😨', 99);
          await wait(700);
          await say(POPPY_TALK, 'Eek! Go away, go away! Somebody, help!', 'scared');
        });
        slimes.forEach((_, i) => G.over.actors.remove(`poppy:s${i}`));
        startBattle(zoneById('meadow'), RESCUE.foes!.map((f) => ({ ...f, golden: false })), false, RESCUE.flag, POPPY.fight!(RESCUE.flag!));
      },
    },
    {
      id: 'rescue', label: 'Save the girl from the slimes',
      target: () => centre(RESCUE),
      done: () => has('poppy:rescue'),
      async then() {
        await scene(async () => {
          await pan(SPOT.x, SPOT.y, 700);
          bubble('poppy:poppy', '🥹', 2.5);
          await walk('poppy:poppy', [{ x: G.over.x - 0.9, y: G.over.y + 0.1 }], 2.4);
          await say(POPPY_TALK, 'Y-you beat them all! Thank you, thank you!');
          await say(POPPY_TALK, "I'm Poppy. I was picking flowers for Granny, and… everything out here is so big.", 'sad');
          await say(POPPY_TALK, 'Could you walk me home? Granny lives in Sprout Village, in the blue house.');
          bubble('poppy:poppy', '🙂', 2);
        });
      },
    },
    {
      id: 'escort', label: 'Walk Poppy home to Sprout Village',
      target: () => DOOR,
      done: () => near(DOOR, 2.6) && !!poppy() && Math.hypot(poppy()!.x - G.over.x, poppy()!.y - G.over.y) < 3,
      async then() {
        G.over.actors.get('poppy:poppy')!.follow = false;
        await scene(async () => {
          await pan(DOOR.x, DOOR.y - 0.5, 600);
          await walk('poppy:poppy', [HOME], 2.8);
          lookAt('poppy:poppy', 'poppy:granny');
          bubble('poppy:granny', '😮', 1.2);
          await wait(700);
          bubble('poppy:granny', '😊', 3);
          await say(GRANNY, 'Poppy! Oh, thank goodness. Where have you been, little sprout?', 'worried');
          await say(POPPY_TALK, 'Slimes chased me, Granny! But this hero saved me!');
          await say(GRANNY, "Then you have my thanks, dear. It's so good to have you both here safe.");
          await wait(400);
          lookAt('poppy:poppy');
          bubble('poppy:poppy', '❓', 1.2);
          await wait(1100);
          bubble('poppy:poppy', '😱', 99);
          await say(POPPY_TALK, 'Wait… Mr. Floppers? Where is Mr. Floppers?!', 'scared');
          await say(POPPY_TALK, 'I must have dropped him when the slimes came!', 'sad');
          await say(GRANNY, 'Her toy bunny. She never goes anywhere without him.', 'worried');
          await say(POPPY_TALK, "Please, could you find him? He's blue, with a heart patch. He'll be so scared out there.", 'sad');
        });
      },
    },
    {
      id: 'find', label: 'Find Mr. Floppers where you met Poppy',
      target: () => SPOT,
      done: () => near(SPOT, 3),
      async then() {
        G.over.actors.add({ id: 'poppy:thief', look: { kind: 'monster', name: 'bigbun' }, x: SPOT.x + 1.2, y: SPOT.y + 0.4, face: Math.PI, speed: 5.5, hop: true });
        await scene(async () => {
          await pan(SPOT.x + 1.2, SPOT.y, 900);
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
        await paused(() => narrate('A big Hopbun ran off with Mr. Floppers! Chase it north through the meadow. Its friends are guarding the way.'));
      },
    },
    {
      id: 'chase', label: 'Chase down the bunny thief',
      target: () => centre(!has(PACK1.flag!) ? PACK1 : !has(PACK2.flag!) ? PACK2 : BIGBUN),
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
        });
      },
    },
  ],

  cast(step) {
    const cast: ActorSpec[] = [];
    if (has('village')) {
      cast.push({
        id: 'poppy:granny', look: { kind: 'idle', name: 'granny' }, ...GRANNY_AT, label: 'Talk',
        mood: step <= 4 ? '😟' : undefined,
        talk: () => chat(grannyLines(step)),
      });
    }
    const at = (mood: string, talk: () => Promise<void> | void): ActorSpec => ({ id: 'poppy:poppy', look: { kind: 'walker', name: 'poppy' }, ...HOME, face: Math.PI / 2, mood, label: 'Talk', talk });
    if (step === 1) {
      cast.push({ id: 'poppy:poppy', look: { kind: 'walker', name: 'poppy' }, ...SPOT, face: Math.PI / 2, mood: '😨', label: 'Talk', talk: () => chat([[POPPY_TALK, 'H-help! Please! The slimes!', 'scared']]) });
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

  tick(step) {
    const p = poppy();
    if (!p) return;
    // On the walk home she keeps an eye on the grass: nervous with monsters about, happy otherwise.
    if (step === 2) p.mood = G.over.roamers.list.some((r) => Math.hypot(r.x - p.x, r.y - p.y) < 3.5) ? '😰' : '🙂';
    // At home with Mr. Floppers, she lights up when you come by.
    if (step >= 6 && !p.bubble && Math.hypot(p.x - G.over.x, p.y - G.over.y) < 2.5 && Math.random() < 0.004) p.bubble = { emoji: '💖', t: 0, hold: 2 };
  },
};
