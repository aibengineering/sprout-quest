# Authored routes and timber returns — 0.3.7

The live maps now implement the route proposal. Each exploration region has a recognisable destination, longer dry routes, shorter risky cuts, gathering spurs and permanent return connections. Sunny Meadow is a clearing off **East Road**, rather than the whole region. The interactive proposal is hosted separately on port 3002; it is a schematic, not a pixel-perfect map editor.

## Region layouts

| Region | Destinations and choices | Tiles |
| --- | --- | --- |
| Quiet Glade | Authored tutorial fights, awakening statue and optional lookout. One exit toward Sowerby. | 16 × 26 |
| Sowerby | Bram’s mill and cabin share the northwestern work yard; Forge nearby. Kitchen, Moss and garden form a cooking neighbourhood; your home and Rook face a quieter southern lane. Pip stays by the northern tunnel. The central green has no public dojo. | 31 × 26 |
| East Road | One orchard fork: dry northern cart trail or shorter southern Bunny Cut, then ridge or Slime Bend around Willow Pond. Broad, irregular grass patches and spacious gathering clearings replace narrow strips. Moss’s stop is a ridge spur; Sunny Meadow opens south, leading to Poppy’s narrow Secret Grove and a gathering pocket at its end. | 40 × 40 |
| Whisper Woods | Longer southern logging trail or short central Woolf passage. Bram’s old camp branches north; Stillwater, copper and an old burrow give gathering trips distinct destinations. | 40 × 40 |
| Echo Cavern | A separate, bounded underground map entered from the Woods gate. Upper galleries, short bat passage and longer flooded-quarry circuit. Pebbler Hollow and Pip’s ore gallery are further independent branches. | 40 × 46 |
| Glimmer Hollow | Dry northern crystal ridge or shorter southern root passage around Mirror Gorge. Rootlight gathering spur; the fox’s hidden trail, shard trial and shared den branch north. | 40 × 42 |
| Ember Peak | Western switchbacks or a shorter central ascent with brief ash-grass crossings. Cinder Basin is a resource side trip. Rook shelters under the western ledge after the Emberwyrm. | 44 × 46 |

Dry lanes reach the next gate without entering encounter terrain. Grass beside those lanes is optional. Only brief sections fill the width of the quicker passages; walls and trees make these actual decisions rather than patches one can trivially sidestep. Cave encounter terrain is shale and pale mineral chips. Monsters remain visible and can chase onto a road: “safer” means avoiding their patches, not invulnerability.

The larger layouts make space for destinations and return loops. Resources are placed explicitly in gathering stops, with a few trail-side finds; no quota-filling scan remains. Signs explain local choices and landmarks. Soft ground patches, connected path edges, floor shadows and sparse native decoration replace the strong tile checkerboard. Echo’s main galleries are brighter; Pebbler Hollow retains its darker stealth atmosphere and geometry-clipped eye beams.

Echo Cavern is hidden from outdoor cameras on both sides. Whisper Woods ends in a rocky, tree-lined cave mouth; stone and scree lead into its cliff face. Entering or leaving fades the entire screen, including the HUD, to black before switching maps. Return travel uses the eastern mouth in Glimmer Hollow. Cave monsters stay underground, and the Alpha Woolf still guards the forest entrance.

## Gathering pass — 2026-10-05

A node's terrain no longer changes its payout, skill XP, rare-find chance or regrowth. Wood and ordinary ore give
four materials, crystal and obsidian give three, and every kind regrows in 120 seconds. Flawless gathering still
adds one handful. These are playtest starting values; the reward for finding a rich place is its useful concentration
of nodes and its access, rather than a hidden grass multiplier.

- **East Road:** Poppy's grove has six oaks and four rocks. The rescue begins at its narrow trail entrance, with
  Poppy trapped between a fallen log and the slimes. The bunny thief clears that same log and flees along the trail;
  Big Bun guards the glade until defeated. Escorting Poppy no longer leaves the rich grove open.
  Completed older saves retain access, and a player saved inside the closed grove can squeeze back out.
- **Woods:** four pines at Bram's camp, four in the southern pine grove, and three copper veins at the Stillwater
  workings. A few small trail stops connect these destinations. The southern circuit has a useful gathering purpose.
- **Cavern:** three iron veins in the upper working, separate eastern and western ledges, and three deposits on the
  lower quarry loop. Pip's quest still opens his six-node mixed-ore gallery and its tunnel home.
- **Hollow:** four Glimmerwood trees in Rootlight, a five-node northern crystal chamber, and smaller gorge-side stops.
- **Peak:** four Emberwood trees and three obsidian seams in Cinder Basin; distinct mineral shelves along the ascent.

Four ordinary timber harvests give 16 logs, or 32 planks: a southern-pine, Rootlight or Cinder trip can supply the
wood for its region's 32-plank crossing before flawless bonuses. The three-node upper iron working gives 12 iron.
This ties a destination to a useful project without making roadside trees artificially worse.

Iteration checks included full-map captures, moving wall-adjacent nodes inward, keeping water and chasms intact
when widening clearings, restoring the Peak's route choice after a clearing joined its entrance, and checking real
player clearance around every authored resource. Remaining tuning should focus on actual trip time and whether
the two-minute regrowth encourages leaving to do something else between harvests.

## Timber crossings

Helping Bram unlocks crossing plans. Bring planks to the visible construction stakes. Crossings require the appropriate blade and regional guardian; housing and workshop upgrades keep their independent progression.

| Crossing | Cost | Mill | Walking distance before → after |
| --- | --- | --- | --- |
| Willow Pond Crossing | 24 oak planks | 1 | 20 → 6 |
| Bram’s Bridge | 64 oak planks | 1 | 27 → 5 |
| Stillwater Walk | 32 pine planks | 2 | 29 → 9 |
| Old Quarry Boardwalk | 32 pine planks | 2 | 38 → 16 |
| Mirror Gorge Span | 32 Glimmerwood planks | 3 | 24 → 6 |
| Cinder Span | 32 Emberwood planks | 4 | 38 → 8 |

Distances use shortest tile paths with scenery collisions and player clearance. Every crossing removes at least twelve tiles and half the local detour. Both banks are accessible before construction; the main route never requires payment. Building every bridge still cannot bypass a closed guardian boundary. Payment and completion persist before animation, including Bram’s original `bridge:woods` flag.

Pip’s ten-hit discovery and later ten/eleven-hit boulders open additional tunnels from resource areas to Sowerby. Only discovered passages can be revisited from his village mouth.

## Characters and save compatibility

Poppy’s rescue and the bunny chase share one enclosed, winding forest trail off Sunny Meadow. The slimes block its only exit, with Poppy just behind them; the chase then takes you deeper down that same trail into a glade containing six harvestable oaks and four rocks. The expanded meadow cannot spill across the trail’s tree walls. Bram retains his camp rescue and village construction role. Pip stays in the quarry branch. The masked fox remains a private friendship in Glimmer Hollow, including after Rook settles; Bram builds equipment at her den, and she teaches all six existing combat lessons. Rook’s new introduction requires the dragon, while existing Rook residents and hunts remain valid.

Logical zone coordinates, resource identities, purchased bridges, lesson clears and building levels are retained. Saves standing in newly solid terrain move to nearby walkable ground in the same region. Main-cavern positions and both branch instances survive reloads. The cavern has its own terrain bounds and camera; shared object identities keep resource regrowth and quest visibility consistent with the save.

## Playtest focus

Walk each fork before building, gather in its side pocket, construct the return crossing and repeat the journey. Check whether the longer safe routes justify their extra walking, grass cuts are readable on a phone, landmarks orient you, and the plank investment is worthwhile. Reachability and browser checks establish functioning routes; pacing, costs and atmosphere still need player feedback.
