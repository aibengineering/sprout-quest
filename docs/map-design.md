# Routes and timber shortcuts

This is the first route redesign, for the upcoming 0.3.7 release. Open [the interactive map comparison](map-review.html) to compare each region before and after, then switch its timber crossings on. Rebuild it with `bun scripts/map-review.ts`.

## What the review found

The routes were already hand-authored and had useful encounter grass, resource pockets and guardian gates. Their repeated shape made them feel improvised: a narrow winding road with small pockets beside it, rather than places with recognisable destinations and connections. Only Bram's old bridge changed a return journey. Higher-tier timber had no equivalent role in exploration.

Extra size helps when it makes room for a distinct destination and a route back. This pass adds three exploration loops, then places timber crossings where the player can see both banks and understand the connection they would build. Early regions retain their size. The later three grow southward, keeping existing entrances, resources and story anchors in place.

## Region layouts

| Region | Layout and purpose | Size |
| --- | --- | --- |
| Sunny Meadow | Willow Pond is the main landmark. The northern shore leads toward the eastern orchard; the southern grass still branches toward Poppy's Secret Grove. An oak crossing connects the pond's banks. | 40 × 26, unchanged |
| Whisper Woods | Keep the first climbing trail and old logging camp. The original oak bridge provides a strong return connection; a pine walk reconnects the two sides of Stillwater. | 40 × 26, unchanged |
| Echo Cavern | Add the flooded Old Quarry below the galleries. Iron workings lie to the west, the gallery return to the east, and a southern rim connects them before the boardwalk is built. Pebbler Hollow remains a separate underground instance. | 40 × 34, +31% |
| Glimmer Hollow | Mirror Gorge separates the camp-side approach from the crystal paths. Rootlight Garden is a southern destination for Glimmerwood and crystal; a Glimmerwood span provides a direct camp return. | 40 × 34, +31% |
| Ember Peak | Retain the ascent around the main lava lake and the lair ridge. Add Cinder Basin with a western Emberwood grove, eastern obsidian workings and a southern rim connecting them. Emberwood spans the main lake. | 44 × 36, +38% |

Entrance signs describe landmarks and choices. New signs identify the Quarry, Garden and Basin. Broken landing boards and stakes mark both ends of planned crossings in the world, so the build menu has a visible physical location.

## Bram's construction progression

Helping Bram return to Sowerby unlocks timber crossing plans. Ask him about **Shortcuts** from his house plans for guidance, then bring the right planks to a construction stake. Houses and workshop upgrades keep their separate progression. Crossings require the appropriate sawmill blade and the guardian that opens their region.

| Crossing | Cost | Sawmill level | Walking distance between banks, before → after |
| --- | --- | --- | --- |
| Willow Pond Crossing | 24 Oak Planks | 1 | 20 → 8 tiles |
| Bram's Bridge | 64 Oak Planks | 1 | 43 → 3 tiles |
| Stillwater Walk | 32 Pine Planks | 2 | 25 → 7 tiles |
| Old Quarry Boardwalk | 32 Pine Planks | 2 | 19 → 7 tiles |
| Mirror Gorge Span | 32 Glimmerwood Planks | 3 | 24 → 6 tiles |
| Cinder Span | 32 Emberwood Planks | 4 | 26 → 10 tiles |

These are shortest tile paths between the two banks, with actual scenery collisions and the player's feet included. Each crossing removes at least twelve tiles and half the local detour. They reward learning a route and producing its timber; they are optional, so no resource or main road depends on building one first. Guardian gates remain unavoidable even when every crossing is built.

Construction spends and saves once before boards settle into place on the map. Reloading during assembly restores the complete crossing. Reduced motion finishes it immediately. Oak, pine, Glimmerwood and Emberwood use different deck colours; board direction and outer rails follow each crossing's footprint. Existing saves retain Bram's original `bridge:woods` flag and their resource regrowth identities.

## Playtest questions and next pass

This is ready for a focused route playtest. Walk each region once before building, gather in its new pocket, build the crossing, and repeat the return journey. Check whether the landmarks are recognisable on a phone, the bank stakes are easy to find, and the timber investment feels worthwhile. Automated reachability and distance checks establish that the routes work; they cannot establish that a repeated gathering trip feels good.

Before expanding the whole world again, use that feedback to adjust encounter pacing and plank costs. Later passes can add more distinct arrival views, terrain transitions and quest destinations within these loops. New settlements should follow an actual story or travel need. Increasing the size of every map now would add walking before those destinations have a purpose.
