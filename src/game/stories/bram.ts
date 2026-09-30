// Bram, the lumberjack: a grump at an abandoned logging camp in Whisper Woods who stopped chopping when the Woolves moved
// in (every swing brings the pack). Granny sends you with a pie; you fell his winter wood quietly, fight off the raid
// that comes anyway, and after he's hurt charging in to help, you walk him home. He stays, builds the Sawmill, and
// teaches Granny his stew. See the story bible (Side quests).
import type { ActorSpec } from '../../actors';
import { BRAM_CABIN_PLANKS, MATS, ZONES, zoneById, type MatId, type MonsterKind } from '../../data';
import { SAW_LOGS, sawCollect, sawOrder, type SawLog } from '../../sawmill';
import type { WorldObj } from '../../world';
import { G, paused, persist, syncWorld } from '../context';
import { challengeFoe, startBattle } from '../fights';
import { bubble, narrate, pan, say, scene, walk, wait, type Speaker } from '../scenes';
import { stopWaiting, waitAt, type Story } from '../stories';
import { GRANNY, GRANNY_AT, GRANNY_ID } from './granny';

export const BRAM: Speaker = { name: 'Bram', emoji: '🧔', portrait: (m) => (m === 'happy' ? 'npc_bram_happy' : m === 'hurt' ? 'npc_bram_hurt' : 'npc_bram') };
const ID = 'bram:bram';

const W = ZONES.find((z) => z.id === 'woods')!.x0;
const V = ZONES.find((z) => z.id === 'village')!.x0;
/** Where he sits at his camp, by the stump with his axe in it, and his place in Sowerby once he's moved in. */
const CAMP = { x: W + 8.1, y: 6.3 };
const MILL = { x: V + 4.2, y: 8.6 };
/** Where the pack comes in: the clearing's east mouth. */
const MOUTH = { x: W + 13.5, y: 5.6 };

const has = (flag: string) => G.save.flags.includes(flag);
const near = (p: { x: number; y: number }, r: number) => Math.hypot(G.over.x - p.x, G.over.y - p.y) < r;
const bram = () => G.over.actors.get(ID);

/** The camp's pines: the ones in the clearing, west of the path. */
const campPine = (o: WorldObj) => o.kind === 'node' && o.node === 'pine' && o.x > W + 1 && o.x < W + 13 && o.y > 2.5 && o.y < 8;
const felledCount = () => G.save.flags.filter((f) => f.startsWith('bram:pine:')).length;
const PINES_NEEDED = 3;

const pack = (flag: string, step: number, x: number, y: number, w: number, h: number, foes: [MonsterKind, number][], extra: Partial<WorldObj> = {}): WorldObj => ({
  kind: 'foe', flag, zone: 'woods', x, y, w, h, label: 'Fight', text: 'Woolves', foes: foes.map(([kind, lv]) => ({ kind, lv })),
  story: { id: 'bram', step }, hidden: true, facing: -1, ...extra,
});

// Step numbers: 0 ask · 1 deliver · 2 contest · 3 wave1 · 4 wave2 · 5 scar · 6 escort · 7 mill · 8 hut · 9 done.
// The raid's groups wait in the clearing if you lose to them, so you can walk back in and try again.
const WAVE1 = pack('bram:wave1', 3, W + 10.5, 4.6, 1.6, 1.4, [['wolf', 5], ['wolf', 5]]);
const WAVE2 = pack('bram:wave2', 4, W + 10.5, 4.6, 1.6, 1.4, [['wolf', 6], ['wolf', 5], ['shroom', 5]]);
const SCAR = pack('bram:scar', 5, W + 10.3, 4.5, 1.8, 1.4, [['scarwolf', 6]], { boss: true, text: 'Scarred Woolf' });
// On the way home: the corridor down from the camp, and the Woods' west gate. Each fills its way from side to side.
const AMBUSH1 = pack('bram:ambush1', 6, W + 15, 9.4, 4.4, 1, [['wolf', 5], ['shroom', 5]], { facing: 1 });
const AMBUSH2 = pack('bram:ambush2', 6, W + 3.5, 12, 1, 4, [['wolf', 6], ['wolf', 5]], { facing: 1 });
/** If you faint on the way home, Bram waits at the last checkpoint: his camp, past the first ambush, or past the second. */
const checkpoint = () => (has(AMBUSH2.flag!) ? { x: W + 2.2, y: 13.6 } : has(AMBUSH1.flag!) ? { x: W + 16.5, y: 11.6 } : CAMP);

/** Talking to someone outside a scene: a few lines with the world waiting. */
const chat = (lines: [Speaker, string, string?][]) => paused(async () => {
  for (const [who, text, mood] of lines) await say(who, text, mood);
});

const ROAD = ["Easy. Easy on the leg.", "Clover's going to fuss. She always fussed.", "You're stronger than you look, kid.", "Mind the grass. Fangs in the grass."];
const MILL_LINES = ["Two logs, one plank. I'll saw while you're out.", 'Good wood in the meadow. Oak, straight grain.', "Clover's stew's coming along. Don't tell her I said so."];
let line = 0;

/** Bram's Sawmill: hand him logs, take your planks. */
export function openSawmill(greeting = MILL_LINES[line++ % MILL_LINES.length]) {
  return paused(async () => {
    for (;;) {
      const r = await G.ui.sawmill(G.save, greeting);
      if (r.startsWith('saw:')) {
        const [, count, log] = r.split(':');
        const n = SAW_LOGS.includes(log as SawLog) ? sawOrder(G.save, Number(count), log as SawLog) : 0;
        if (n) G.audio.play('chop');
        greeting = n ? `Right. ${n} plank${n > 1 ? 's' : ''} coming up.` : "You'll need more logs than that.";
      } else if (r === 'collect') {
        const got = Object.entries(sawCollect(G.save)) as [MatId, number][];
        if (got.length) {
          G.audio.play('pickup');
          G.ui.toast(got.map(([p, n]) => `${MATS[p].icon} +${n} ${MATS[p].name}${n > 1 ? 's' : ''}`).join(' · '));
        }
        greeting = 'There you go. Straight and true.';
      } else break;
      persist();
    }
    persist();
  });
}

/** The pack comes early: a couple of Woolves, with Bram watching from his stump. */
function tooLoud() {
  G.ui.toast('🐺 Too loud! The Woolves heard that…', 2600);
  startBattle(zoneById('woods'), [{ kind: 'wolf', lv: 5, golden: false }, { kind: 'wolf', lv: 4, golden: false }], false, undefined, { bystander: { look: 'npc/bram', mood: '😬' } });
}

export const BRAM_STORY: Story = {
  id: 'bram',
  title: "Bram's Sawmill",
  icon: '🪓',
  available: () => G.save.bosses.includes('kingslime') && (G.save.stories.poppy ?? 0) >= 6,
  // He's at his camp from the start, grumbling; he only warms up once Granny sends you with a pie.
  castEarly: true,
  objs: [WAVE1, WAVE2, SCAR, AMBUSH1, AMBUSH2],
  fight: (flag) => {
    if (flag === 'bram:scar') return { bystander: { look: 'npc/bram_hurt', mood: '😖' } };
    if (flag === 'bram:wave1' || flag === 'bram:wave2') return { bystander: { look: 'npc/bram', mood: '😠' } };
    return { bystander: { look: 'npc/bram_hurt', mood: '😣' } };
  },

  steps: [
    {
      // Granny asks the favour when you next talk to her (see granny.ts).
      id: 'ask', label: 'Granny Clover has a favour to ask',
      target: () => ({ x: GRANNY_AT.x, y: GRANNY_AT.y + 1 }),
      done: () => has('bram:pie'),
    },
    {
      id: 'deliver', label: "Take Granny's pie to Bram in Whisper Woods",
      target: () => ({ x: CAMP.x + 0.8, y: CAMP.y + 0.3 }),
      done: () => has('bram:met'),
      async then() {
        await scene(async () => {
          await pan(CAMP.x + 0.5, CAMP.y - 0.4, 700);
          bubble(ID, '😤', 1.5);
          await say(BRAM, "Didn't ask for company.");
          await narrate("You hold out Granny Clover's pie.");
          bubble(ID, '😮', 1.2);
          await wait(900);
          await say(BRAM, '…Cherry. Clover always did know.', 'happy');
          bubble(ID, '🥧', 2);
          await say(BRAM, 'Woods have gone quiet. You know why? Swing an axe out here and the whole pack comes running.');
          await say(BRAM, "Haven't chopped in years. Winter's coming, and there's no wood by my fire.");
          await say(BRAM, 'You look tough enough. Fell three of those pines for me. Quietly, mind: clean cuts don\'t carry. Sloppy ones will bring every Woolf in the Woods.');
        });
      },
    },
    {
      id: 'contest', label: "Fell three pines at Bram's camp, quietly",
      target: () => {
        const tree = G.world.objs.find((o) => campPine(o) && !has(`bram:pine:${o.id}`) && (G.save.nodes[o.id!] ?? 0) <= Date.now());
        return tree ? { x: tree.x + tree.w / 2, y: tree.y + tree.h + 0.5 } : CAMP;
      },
      done: () => felledCount() >= PINES_NEEDED,
      async then() {
        // The last one comes down with a crash, and the pack comes anyway.
        syncWorld();
        await scene(async () => {
          await pan(MOUTH.x - 1.5, MOUTH.y - 0.6, 800);
          await narrate('CRAAACK! The last pine crashes down, loud enough to shake the needles off the branches.');
          bubble(ID, '😨', 1.5);
          await wait(800);
          await say(BRAM, "That's done it. Here they come!", 'hurt');
          await narrate('Howls, from every side. The Woolves pour into the clearing!');
        });
        challengeFoe(WAVE1);
      },
    },
    {
      id: 'wave1', label: "Defend Bram's camp!",
      target: () => ({ x: WAVE1.x - 0.6, y: WAVE1.y + 1 }),
      done: () => has('bram:wave1'),
      async then() {
        await scene(async () => {
          await pan(CAMP.x + 1, CAMP.y - 0.6, 500);
          bubble(ID, '😠', 1.5);
          await say(BRAM, 'More of them. Behind you, kid!');
        });
        challengeFoe(WAVE2);
      },
    },
    {
      id: 'wave2', label: "Defend Bram's camp!",
      target: () => ({ x: WAVE2.x - 0.6, y: WAVE2.y + 1 }),
      done: () => has('bram:wave2'),
      async then() {
        // Their leader: it goes for you, and Bram goes for it.
        G.over.actors.add({ id: 'bram:scar', look: { kind: 'monster', name: 'scarwolf' }, x: MOUTH.x + 1.5, y: MOUTH.y, face: Math.PI, speed: 4, scale: 1.4 });
        await scene(async () => {
          await pan(CAMP.x + 2.5, CAMP.y - 0.6, 700);
          await walk('bram:scar', [{ x: CAMP.x + 3.2, y: CAMP.y - 0.3 }], 4);
          bubble('bram:scar', '💢', 1.5);
          await narrate('A huge Woolf with a scar across its eye stalks in. The pack leader.');
          bubble(ID, '😡', 1.4);
          await say(BRAM, 'Not in my camp, you mangy brute!');
          await narrate('Bram tears his axe out of the old stump, for the first time in years, and charges.');
          await walk(ID, [{ x: CAMP.x + 2.4, y: CAMP.y - 0.2 }], 5);
          bubble('bram:scar', '💥', 0.8);
          await wait(500);
          await walk(ID, [{ x: CAMP.x + 0.6, y: CAMP.y + 0.2 }], 7);
          bubble(ID, '😖', 99);
          await say(BRAM, 'Agh! My leg…', 'hurt');
          await say(BRAM, "Don't mind me. Get that brute!", 'hurt');
        });
        G.over.actors.remove('bram:scar');
        challengeFoe(SCAR);
      },
    },
    {
      id: 'scar', label: 'Drive off the scarred Woolf',
      target: () => ({ x: SCAR.x - 0.6, y: SCAR.y + 1 }),
      done: () => has('bram:scar'),
      async then() {
        await scene(async () => {
          await pan(CAMP.x + 0.5, CAMP.y - 0.4, 600);
          await narrate('The scarred Woolf limps off into the trees, and what is left of its pack slinks after it.');
          bubble(ID, '😣', 2);
          await say(BRAM, "Can't put weight on it. Not on my own.", 'hurt');
          await say(BRAM, '…Would you help me back to Sowerby? It isn\'t far.', 'hurt');
        });
      },
    },
    {
      id: 'escort', label: 'Help Bram home to Sowerby',
      target: () => {
        if (has('bram:waiting')) return checkpoint();
        if (!has(AMBUSH1.flag!)) return { x: AMBUSH1.x + AMBUSH1.w / 2, y: AMBUSH1.y - 0.6 };
        if (!has(AMBUSH2.flag!)) return { x: AMBUSH2.x + AMBUSH2.w + 0.6, y: AMBUSH2.y + 2 };
        return { x: GRANNY_AT.x, y: GRANNY_AT.y + 1 };
      },
      // Home together, and through both ambushes (no skipping them by fainting on the way).
      done: () => has(AMBUSH1.flag!) && has(AMBUSH2.flag!) && !has('bram:waiting') && near(GRANNY_AT, 2.8) && !!bram() && Math.hypot(bram()!.x - G.over.x, bram()!.y - G.over.y) < 3,
      async then() {
        const b = bram();
        if (b) b.follow = false;
        await scene(async () => {
          await pan(GRANNY_AT.x - 1, GRANNY_AT.y + 0.4, 700);
          bubble(GRANNY_ID, '😮', 1.5);
          await say(GRANNY, 'Bram? Bram Oakes, is that you? Look at your leg, you old fool!', 'worried');
          await say(BRAM, '…Hello, Clover.', 'hurt');
          await say(GRANNY, "Sit. Sit! I'll put the kettle on, and you're not going anywhere until that leg's mended.", 'worried');
          bubble(ID, '🥲', 2.5);
          await wait(700);
          await say(BRAM, "Never had anyone come back for me, kid. Not once.", 'happy');
          await say(BRAM, "The camp's no place to be alone. And this village needs timber. I'll build a sawmill here, right beside your forge.", 'happy');
          await say(BRAM, "You bring the makings: Pine for the frame, Stone for the base, and Copper for a saw blade.");
        });
        G.save.flags.push('bram:home');
        syncWorld();
        persist();
      },
    },
    {
      id: 'mill', label: "Build Bram's Sawmill in Sowerby",
      target: () => {
        const o = G.world.obj('plot', 'sawmill');
        return o ? { x: o.x + o.w / 2, y: o.y + o.h + 0.6 } : MILL;
      },
      done: () => G.save.build.sawmill >= 1,
      async then() {
        await scene(async () => {
          await pan(MILL.x - 1.5, MILL.y - 1.2, 700);
          bubble(ID, '😊', 2.5);
          await say(BRAM, "Now that's a mill.", 'happy');
          await say(BRAM, "Bring me Oak Logs. Two logs make a plank, and I'll saw while you're out adventuring.");
          await say(BRAM, 'First job, though: a roof over my head. Six planks will do it.');
        });
      },
    },
    {
      id: 'hut', label: "Saw six planks for Bram's cabin",
      target: () => ({ x: MILL.x + 0.2, y: MILL.y + 0.8 }),
      done: () => has('bram:hut'),
      async then() {
        syncWorld();
        await scene(async () => {
          await pan(MILL.x - 1.4, MILL.y, 700);
          await narrate('Hammering, sawing, and a good deal of grumbling later, Bram has a cabin.');
          bubble(ID, '😊', 3);
          await say(BRAM, 'Home.', 'happy');
          await say(BRAM, "Thanks, partner. I mean it.", 'happy');
          await say(BRAM, "Tell Clover I'll teach her my Woodcutter's Stew. Thirty years she's been feeding me; about time I returned the favour.", 'happy');
        });
        G.save.flags.push('bram:stew');
        persist();
        await paused(() => G.ui.itemFound('meal_stew', "Woodcutter's Stew", "Granny can cook it now: a wider sweet spot when chopping, for 4 minutes. Pine Logs and Shroom Caps.", '🍲', 'New recipe'));
      },
    },
  ],

  cast(step) {
    const at = (p: { x: number; y: number }, mood: string | undefined, talk: () => Promise<void> | void, hurt = false): ActorSpec => ({
      id: ID, look: { kind: 'walker', name: hurt ? 'bram_hurt' : 'bram' }, ...p, face: Math.PI / 2, mood, label: 'Talk', talk,
    });
    if (step === 0) return [at(CAMP, '😤', () => chat([[BRAM, 'Go away. Trees are fine where they are.']]))];
    if (step === 1) return [at(CAMP, '😤', () => { G.save.flags.push('bram:met'); })];
    if (step === 2) {
      return [at(CAMP, '😐', () => chat([[BRAM, felledCount() ? `${felledCount()} down. Quiet, now. Clean cuts.` : "Well? Pines don't fell themselves. Clean cuts, mind."]]))];
    }
    if (step === 3 || step === 4) return [at(CAMP, '😠', () => chat([[BRAM, 'Keep them off the camp!']]))];
    if (step === 5) return [at({ x: CAMP.x + 0.6, y: CAMP.y + 0.2 }, '😖', () => chat([[BRAM, 'Get that brute!', 'hurt']]), true)];
    if (step === 6 && has('bram:waiting')) {
      return [at(checkpoint(), '😣', async () => {
        await chat([[BRAM, "There you are. Thought I'd have to crawl home. Come on, then.", 'hurt']]);
        stopWaiting('bram:waiting');
      }, true)];
    }
    if (step === 6) {
      return [{
        id: ID, look: { kind: 'walker', name: 'bram_hurt' }, x: G.over.x - 0.8, y: G.over.y + 0.1, follow: true, label: 'Talk', mood: '😣',
        talk: () => chat([[BRAM, ROAD[line++ % ROAD.length], 'hurt']]),
      }];
    }
    if (step === 7) return [at(MILL, '🙂', () => chat([[BRAM, 'Pine, stone and copper. You\'ll find the plans for the mill with the others: the village board.']]), true)];
    if (step === 8) {
      return [at(MILL, '🙂', () => {
        if (G.save.mats.plank >= BRAM_CABIN_PLANKS) {
          G.save.mats.plank -= BRAM_CABIN_PLANKS;
          G.save.flags.push('bram:hut');
          persist();
          return;
        }
        return openSawmill(`Six planks for the cabin, when you have them. You've got ${G.save.mats.plank}.`);
      })];
    }
    return [at(MILL, '😊', () => openSawmill())];
  },

  fainted() {
    if ((G.save.stories.bram ?? 0) === 6) waitAt(ID, 'bram:waiting');
  },

  noisy: (o) => (G.save.stories.bram ?? 0) === 2 && campPine(o),
  tooLoud,
  felled(o) {
    if ((G.save.stories.bram ?? 0) !== 2 || !campPine(o) || has(`bram:pine:${o.id}`)) return;
    G.save.flags.push(`bram:pine:${o.id}`);
    const n = felledCount();
    if (n < PINES_NEEDED) G.ui.toast(`🌲 ${n}/${PINES_NEEDED} pines felled. Bram nods.`);
    persist();
  },

  tick(step) {
    const b = bram();
    if (!b) return;
    // On the walk home he eyes the grass warily.
    if (step === 6 && b.follow) b.mood = G.over.roamers.list.some((r) => Math.hypot(r.x - b.x, r.y - b.y) < 3.5) ? '😰' : '😣';
  },
};

/** Bram's Sawmill once it's built: the plot opens his bench (see interact.ts). */
export const sawmillBuilt = () => G.save.build.sawmill >= 1 && (G.save.stories.bram ?? 0) >= 8;
