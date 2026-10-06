# Playthrough simulator

A scripted player that plays Sprout Quest from a fresh world to the Emberwyrm with one weapon class, and a comparison
that lines its playthroughs up against a real play report. It answers one question after a playtest: **when the game
felt off, is the model wrong, or are the targets wrong?**

- If the real report lands **outside** the simulation's typical range, the model is off: the balance model's
  assumptions, or how the simulated player behaves (`CAL` in `player.ts`). Fix the model or calibrate it.
- If it lands **inside** the range but still felt wrong, agreement alone does not validate the model: omitted
  mechanics can still matter. Inspect the integrated combat report before changing the targets.

`bun run balance` is the combat comparison entry point: `sim/out/balance/index.html` measures the actual battle
engine for every weapon and stage and contains these progression/economy estimates alongside it. This simulator
still uses the simplified `killModel` and is useful for story pacing; it does not validate specials, enemy AI,
hitboxes or weapon effects. Do not treat a successful simulated playthrough as a balanced-combat result.

## It's test tooling, not the game

- It lives here, outside `src/` and `tests/`. It isn't typechecked with the game, has no unit tests, isn't run in CI,
  and changes here need no release (`scripts/changes.ts` treats `sim/` as not the game).
- It reuses the game's own rules (XP, drops, crafting, handling, and `killModel` from the balance model), so game
  changes flow in by themselves. It's also expected to **break** when the game changes shape. That's fine: fix it when
  you next need it. Nothing depends on it.
- Keep it simple and quick to change. The one check is `bun run sim:smoke`, run by hand: every class plays through to
  the Emberwyrm without getting stuck.

## Running it

```sh
bun run sim -- --class whip --runs 30        # the typical playthrough: per quest fights, minutes, levels (median and range)
bun run sim:compare -- ~/me/downloads/sprout-quest-report-….json   # a real report against the simulation
bun run sim:smoke                            # every class reaches the Emberwyrm
```

`simulate` also writes its first run's full report, in the play report's own format, to `sim/out/`.

`compare` picks the class you played most, re-summarizes your report's raw events with today's code (so older reports
get the newer fields), and marks each number ✓ (inside the simulated 10th–90th percentile), ▲ above or ▼ below:

- **Story, quest by quest**: fights, minutes and level at the end of each quest, and when you reached each guardian.
- **Fights by weapon**: strikes and seconds per kill, HP lost.
- **Guardians**: fight length, HP lost, potions.
- **Time**: total over the same stretch of story, and the share spent fighting, walking, gathering and in menus.

Reports from an older version are flagged: balance changes since then show up as differences too.

## How the simulated player plays

For each quest it works out what it needs, then gets it the fastest way it knows:

- **Gathering**: at the rates the balance model uses, working its tools up as it goes.
- **Fights**: rolled from each area's real spawn odds and levels, played out with `killModel`, with the monsters
  hitting back while they stand.
- **Crafting**: the best weapon of its class it can, and armor from its track.
- **Guardians**: it grinds until it's at most `readyMargin` levels under, then fights (and grinds more after a loss).
- **Side stories**: Poppy's and Bram's fights happen on the way.

Everything about *how a player behaves* is in `CAL`: time per fight's walk-in, how often the grass ambushes you, trips,
menus, how often monsters land hits, when you rest, when you take on a guardian. Tune these against real reports.

## What it doesn't know yet

- Guardians' behaviour: minions, movement, and time spent dodging instead of hitting. It has real guardian fights at
  about a third of their real length.
- How much a real player gathers or farms ahead of need, and wanders. It only gets what the next step needs.
- Specials and class abilities (the kill model leaves them out), dodging skill, and golden monsters.
- Calibration so far is first guesses. The first 0.3.3 playthrough report is the one to calibrate `CAL` against.
