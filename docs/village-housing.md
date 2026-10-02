# Sowerby’s neighbours

The housing loop is **meet someone on the road → return to Sowerby together → bring Bram materials → build their place → use it → ask its owner about an addition**. The physical work gives the planks a purpose, and each doorstep gives the village another person to visit.

## Implemented for 0.3.7

Bram's outdoor conversation offers **one next building job**, after his cabin quest. The generic Village menu keeps workshops and the player's original home. Resident homes, Poppy's garden, Alder's dojo and Clover's kitchen are handed in to Bram in conversation, with actual materials and a cancellable single-job card. The tracker points back to him. Material payment and completion are saved before the assembly animation.

First places follow **Poppy's patch → Clover's kitchen → Pip's cottage**, then Alder's dojo, Hazel's home and Moss's home as those people return. Pip and Alder are met by the Woods road, Hazel and Moss by the Meadow road. Their quests ask you to walk back with them; they stay with Clover while waiting for construction. Talking or having materials alone cannot unlock a home. Existing buildings count as settled, so older saves do not repeat arrivals.

Upgrades are independent of that arrival order. Each owner can request their next addition in conversation, which makes it Bram's current job without spending anything. If a newcomer is still away, Bram can offer an available improvement. The tracker and Journal follow the chosen request; completion is derived from saved building levels, so a changed job order does not skip construction. Mill tiers continue to gate the timber. Workshops and the player's original home retain their existing upgrades.

| Place / owner | First construction | Additions / contribution |
| --- | --- | --- |
| Poppy's garden | 32 oak planks, 12 stone, 1 clover | Six, twelve, then twenty beds; food and flowers for later jobs |
| Clover's kitchen extension | 64 oak planks, 24 stone, 9 copper, 6 flowers | Three tiers: kitchen extension, Pine Pantry, Glimmer Kitchen; her own meals gain 30/60 seconds |
| Pip's cottage | 48 oak planks, 12 bark, 18 stone, 9 copper, 4 flowers | Study: 48 pine planks, 9 iron, 6 flowers; then a Glimmer Archive; Rock Candy gains one/two minutes |
| Alder's dojo | 40 oak planks, 18 stone, 18 fluff | Pine and glimmer additions open six combat lessons; first-clear XP from 180 to 1,000 |
| Hazel's cottage | 64 oak planks, 24 stone, 8 herbs, 6 flowers | Glasshouse: 56 pine planks, 8 crystal, 8 flowers; then a Glimmer Conservatory; Meadow Tea gains one/two minutes |
| Moss's cottage | 64 pine planks, 24 stone, 12 berries, 8 flowers | Larder: 48 glimmer planks, 8 crystal, 10 flowers; then an Ember Bakehouse; Trail Buns gain one/two minutes |

Each activity has its own character. Bram constructs; Poppy gardens; Clover cooks; Alder teaches combat. Alder is a former road escort who wants people to return safely, rather than another foreman. His dojo uses canvas targets with real enemy tells, a separate practice health pool and once-only combat/handling XP. It does not drop materials or advance monster-kill quests. A home addition improves future meals, without permanent combat stats or workshop levels.

The player, Hazel and Moss face one shared lane south of the main road, with short paths from their aligned doorsteps. A single branch connects that lane and Veyra’s Spring to the main road, leaving an open green instead of four parallel roads through the plots. Bram’s cabin sits beside the Sawmill in the northwestern work yard; its approach joins the mill’s without blocking either door. Pip stays northeast near his tunnel and Granny, and the dojo sits east of the Waystone. The Garden keeps its own gate and approach. Lots leave room for the largest upgraded roofs as well as the collision boxes. New home additions retain their original footprint and visibly extend the original house.

## Story integration

The sibling [Sprout Quest Bible](../../2609_sprout_quest_story/story/18-sowerby-neighbours.md) records Hazel and Moss's character direction. Hazel carried cuttings through the closed road and finds a place for them beside Poppy. Moss's passing trade vanished when the road closed; he borrows Clover's oven and finds neighbours to bake for. Their welcome dialogue, ordinary chats and reactions after the cave reunion and dragon defeat connect them to the existing cast. Granny, Pip and Bram acknowledge them too. See [the story review](story-review.md) for the implementation gap and continuity questions.

## Next story pass

These are proposed beats, not active quests or promised unlocks:

1. Deepen the requests Bram already gives with a short resident visit or letter; keep village arrival optional beside the main story.
2. Give each resident one favour using their trade: Pip brings Hazel a fern fossil, Hazel helps Poppy identify a new herb, Moss bakes for Bram’s first village supper. Tie house additions to these character moments as well as the timber cost.
3. Add a shared supper or small village event after the favours. Let conversations change after the event, without creating another daily chore or mandatory production minigame.
4. Explore neighbouring settlements after Sowerby has people worth leaving and returning to. Use introductions, trade requests and shared recipes before expanding housing to an entirely new map.

Workshop progression continues to determine tools, materials and construction capability. Housing progression determines residents, relationships and their recipe contributions. The player’s existing tent/cottage/manor stays on its current main-quest path for compatibility; a later design pass can revisit it independently. The new final tiers improve the resident’s own recipe and retain the previous building as their assembly base. Costs, bonuses and tier gates are tuning values in `src/housing.ts`, `src/kitchenUpgrades.ts` and `src/villageJobs.ts`.

## Playtest questions

- Does talking to Bram make the reason to cut planks clear?
- Do the new homes leave enough space to walk and see the Spring and Garden?
- Is the duration bonus worth an optional house addition without becoming mandatory?
- Do Hazel and Moss feel like neighbours rather than recipe dispensers?

Validate old saves, reloading an escort, returning before construction, cancelling a request, skipping or reloading during assembly, both newcomers’ recipes, and the job card and lessons at phone and desktop sizes.
