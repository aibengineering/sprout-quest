# Balance and pacing

What the game's numbers are aiming for, what they assume about how people play, and how to re-tune them when that
changes. The numbers themselves live in code, so this page explains the targets rather than repeating every figure:

- `src/balance.ts` holds the balance model: checkpoints, the expected playthrough, weapon and material measures.
- `bun run balance` prints all of it. Treat that output as the current snapshot.
- `tests/balance.test.ts` enforces the targets. If a change breaks one, the test name says which intent it broke.
- The in-game play report (More → Play report) is the real-play check on the model. When they disagree, the report
  wins, and the model's assumptions get fixed, not just its numbers.
- The playthrough simulator ([sim/](../sim/README.md)) plays the story with the model and lines its runs up against a
  real report (`bun run sim:compare -- <report.json>`). That tells a wrong model apart from wrong targets.

## The intent

These were decided with the game's designer while tuning 0.3.x. Keep them, or change them on purpose.

**A fair fight is a real exchange, with every class.**
- A regular monster at your level takes 4–8 swings with Blades, 2–4 slams or cracks with a Hammer or Whip, or 3–6
  bolts with Magic, and it's over within about 5 seconds (`CLASS_STRIKES` in `src/balance.ts`). Nothing at your level
  falls to one blow.
- It's measured by `killModel`, which plays out each strike with the class's real rhythm, strike multipliers, crits,
  the level gap and Sunder. The old measure counted swings at 1× damage, which hid one-shot whip cracks and hammer
  slams. Test: *a fair fight is a real exchange with every class*, at every checkpoint.
- Monsters you've outgrown still fall fast. That's the reward for levelling, and XP falls off to match.

**Gear is an investment.** Armor costs about twice a weapon of its tier, built from the materials with the most room
in the farming budget. Weapons stay cheaper, so switching class stays easy.

**Fights are fair, and XP rewards fair fights.**
- A monster at your level gives full XP. One above you gives up to 25% more. One level below gives 72%, and anything
  you've outgrown further gives a base 55% (`xpEdge` in `src/rules.ts`).
- XP never drops below that base. You can always farm your way over-levelled if you want an unfair fight; it just
  takes longer.

**A natural playthrough meets each guardian a little under its level.**
- If you skip the grass and the side stories, you arrive under-levelled.
- If you farm, you arrive over-levelled, but slowly.
- Test: *a natural playthrough meets each guardian about at its level*, allowing at most 1 over and 2 under.

**Two progression tracks, with different jobs.**
- Your **character level** is the frequent, small one. It rises about every 8–11 fights and gives stats. Test:
  *kills per level* at each checkpoint.
- **Weapon handling** is the rarer, bigger one. Each of its 10 levels gives something you can feel:
  - Lv 2: the class's special.
  - Lv 3: the class's own ability (Riposte, Sunder, Snare or Blink).
  - Lv 4, 6, 7 and 9: faster attacks.
  - Lv 5, 8 and 10: special ranks II, III and Mastery.
- Handling is paced to the whole story (`HANDLING_XP` in `src/rules.ts`). With one weapon:
  - Lv 2 on your first meadow fight.
  - Lv 3 around the Slime King.
  - Each weapon tier's handling (4, 6, 8) comes about as you reach that tier's area.
  - Mastery around the Emberwyrm.
  - Test: *one weapon through the story*.
- **A second class** trains twice as fast while it's below your best one (`CATCH_UP`), so mastering one weapon makes
  the next quicker to learn. Starting a fresh class late is still a real commitment: at most 20 minutes of fighting
  (`MAX_HANDLING_MINUTES`).
- **Grinding every class early is allowed but inefficient.** Later monsters give far more XP, so training a class
  later costs much less.

**Weapon classes play differently.**
- Blades are the only combo class. Hammer, Whip and Magic strike once and rest, and weave in their special.
- Handling speeds every class up about 2× from Lv 1 to Mastery (`pace` in `src/weapons.ts`).
- Specials start small (Rank I ≈ 1.2× one hit) and end huge (Mastery ≈ 3.1×). At each rank every class hits one
  target about the same, and no close-range special pulls ahead in a crowd.
- Each class's damage stays within its band against its tier's gatherer weapons.

## What it assumes about how people play

**How many fights each area has** (`EXPECTED_FIGHTS` in `src/balance.ts`): about **40 regular fights** in each area,
counting its quests and story fights, grass ambushes and roamers met walking back and forth, and some farming for gear.
- This is an estimate from the map's size, the 6% ambush chance per grass tile walked, and each area's errands. It
  hasn't been measured yet.
- A **light** run is 0.6× that (skipping grass and side stories). A **heavy** run is 1.5× (farming).
- A fight has one to three of the area's monsters, spread across its level range.
- Fighting time uses `SECONDS_PER_KILL` (14 s).

**The timeline this gives** (the 0.3.1 snapshot; `bun run balance` prints the current one). Each cell is your level /
handling at the end of that area:

| Run | Meadow | Woods | Cavern | Hollow | Peak | At the Emberwyrm |
|---|---|---|---|---|---|---|
| light ×0.6 | 3 / 2 | 7 / 3 | 11 / 5 | 13 / 6 | 17 / 8 | 17 / 9 |
| **natural** | **4 / 3** | **8 / 4** | **12 / 6** | **15 / 7** | **18 / 9** | **19 / 10** |
| heavy ×1.5 | 4 / 3 | 9 / 4 | 13 / 6 | 16 / 8 | 20 / 10 | 20 / 10 |

The guardians met on leaving each area: Slime King Lv 5, Alpha Woolf Lv 9, Echo Queen Lv 12, Crystal King Lv 14,
Emberwyrm Lv 20. Weapon tiers need handling ★★ 2, ★★★ 4, ★★★★ 6, ★★★★★ 8.

## When something changes

**New quests or story in an area** (more walking back and forth, more fights):
1. Estimate or measure the area's new fight count. The play report's per-area summary gives real numbers.
2. Update `EXPECTED_FIGHTS` for that area.
3. Run `bun test` and `bun run balance`. The progression tests fail if you'd now meet a guardian more than a level
   over, or if handling would miss its milestones.
4. Re-tune with the knobs below. Usually monster XP or the handling costs move, not the targets.

**A new area or guardian:** add it to `EXPECTED_FIGHTS` and give it a checkpoint in `CHECKPOINTS`. The progression
tests pick it up automatically from the zone list.

**The knobs, and what each one moves:**

| Knob | Where | Moves |
|---|---|---|
| `MONSTER_HP` | rules.ts | How many blows a regular monster takes (fight substance) |
| `CLASS_STRIKES` | balance.ts | The target blows per class for a fair fight |
| `MONSTER_XP` | rules.ts | All combat and handling XP (the overall leveling speed) |
| `xpEdge` | rules.ts | How much fair fights pay versus outgrown ones (how far farming gets you) |
| `xpToNext` | rules.ts | The character level curve |
| `HANDLING_XP` | rules.ts | When each handling level lands in the story |
| `CATCH_UP` | rules.ts | How quickly a second class catches up |
| `pace`, `SPEED_LEVELS` | weapons.ts | How much faster handling makes attacks |
| `SKILL_RANKS` | weapons.ts | Special strength per rank |
| `MOVESETS` | weapons.ts | Each class's rhythm and per-hit damage |
| Monster `xp`, `hp`, `atk` | data.ts | One monster's reward and toughness |

## Poppy's Garden

Crops (Berries, Herbs, Flowers) aren't farmed: they grow in real time in Poppy's plots (`src/garden.ts`), like Bram's
planks, so they come along while you're out doing other things. Only Flowers are in the building budget (4 for the
Bloom Garden, 4 for the Manor); Berries (Berry Tart) and Herbs (Herb Tonic) are for meals and potions.

- The farm table gives crops a **garden** row: the real minutes to grow the demand on the plots you'd have when you
  first need it (the Berry Garden's 4 for Flowers, since the Bloom Garden costs them), each seed going into the first
  free plot once you have it (Poppy's handful of Flower Seeds, or a tree seed every so often while chopping).
- Each planting counts its tended time (`tendedSeconds` in `src/balance.ts`): weeds modelled as left in from halfway,
  and a thirsty plot waiting a minute (`THIRSTY_WAIT`) to be watered.
- It's held to the same ≤14 minute budget as farming, though it's waiting rather than playing.

The knobs are `CROPS` (grow time, yield), `PLOTS_BY_LEVEL`, `FLOWER_GIFT` / `GIFT_SECONDS` and the thirst and weed
chances in `src/garden.ts`, and each tree's `seed` chance in `NODES`.

## Known gaps

- The fight counts are estimates. Replace them with play-report numbers when there are some. The report's
  `storyline` gives fights and levels per quest, and when you first reached each guardian.
- `SECONDS_PER_KILL` (14 s, used for farming times) predates fights getting longer in 0.3.3. Check it against the
  report's `secondsPerKill`.
- Leaving Glimmer Hollow, a natural run is one level over the Crystal King (15 against 14). That's within the test's
  tolerance, but the Hollow is the most generous area.
- Story fights (Poppy's and Bram's) aren't modelled separately. They're folded into each area's 40.
- Monsters' tricks aren't in the kill model: Woolf howls, Sporecap poison, Flapper screeches, Pebblor stone skin
  (half damage while it walks, 1.6× while it's open after a slam, about 12% slower on average if you hit whenever you
  can) and Impy dodging your attacks. They're meant to reward learning each monster, so real fights with a monster you
  haven't figured out yet will run longer than the model says.
