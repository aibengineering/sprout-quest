# Sowerby’s neighbours

The housing loop is **cut logs in the Sawmill → carry the planks outside → ask Bram to build → meet the resident → try their recipe in Granny’s Kitchen**. The physical work gives the planks a purpose, and each doorstep gives the village another person to visit.

## Implemented for 0.3.7

Bram’s outdoor conversation opens his House Plans once his own cabin quest is finished. The generic Village menu remains for workshops and the player’s original home. Resident homes use a separate saved `homes` record. Existing Guest Cottages migrate to Pip’s first home without replaying his welcome or spending again.

| Resident | First home | Addition | Contribution |
| --- | --- | --- | --- |
| Pip, miner | Guest Cottage: 32 oak planks, 12 bark, 12 stone, 6 copper | Stone Study: 32 pine planks, 6 iron | Teaches Rock Candy; the study increases its duration from four to five minutes |
| Hazel, herbalist | Herb Cottage: 48 oak planks, 18 stone, 6 herbs | Glasshouse: 40 pine planks, 6 crystal | Teaches Meadow Tea, a wider mining sweet spot; the glasshouse increases its duration from four to five minutes |
| Moss, baker | Pine Cottage: 40 pine planks, 18 stone, 8 berries | Glimmer Larder: 32 glimmer planks, 6 crystal | Teaches Trail Buns, +20% woodcutting/mining XP; the larder increases their duration from four to five minutes |

Pip’s home opens Hazel’s plan; Hazel’s opens Moss’s. Plans require the mill that cuts their timber (oak level 1, pine level 2, glimmer level 3). Meeting Hazel or Moss unlocks their recipe once. Their dialogue acknowledges neighbours and their own addition. A home addition improves future meals, and meals still replace one another rather than stacking. It gives no permanent combat stats, gear recipes or workshop levels.

The residential lane sits south of the main road: player home, Bram’s cabin, Hazel and Moss, with footpaths between them. Veyra’s Spring remains a plaza between the homes. Pip stays northeast near his tunnel and Granny; the Waystone and Training Yard move onto clear northern approaches. Workshop doorways stay open. New home additions retain their original footprint and visibly extend the original house.

## Next story pass

These are proposed beats, not active quests or promised unlocks:

1. Before a newcomer arrives, let Bram share a short letter explaining who needs a place. Keep arrival optional beside the main story.
2. Give each resident one favour using their trade: Pip brings Hazel a fern fossil, Hazel helps Poppy identify a new herb, Moss bakes for Bram’s first village supper. Tie house additions to these character moments as well as the timber cost.
3. Add a shared supper or small village event after the favours. Let conversations change after the event, without creating another daily chore or mandatory production minigame.
4. Explore neighbouring settlements after Sowerby has people worth leaving and returning to. Use introductions, trade requests and shared recipes before expanding housing to an entirely new map.

Workshop progression continues to determine tools, materials and construction capability. Housing progression determines residents, relationships and their recipe contributions. The player’s existing tent/cottage/manor stays on its current main-quest path for compatibility; a later design pass can revisit it independently. Further housing tiers need a distinct character or recipe payoff before more expensive planks are added.

## Playtest questions

- Does talking to Bram make the reason to cut planks clear?
- Do the new homes leave enough space to walk and see the Spring and Garden?
- Is the duration bonus worth an optional house addition without becoming mandatory?
- Do Hazel and Moss feel like neighbours rather than recipe dispensers?

Validate old saves, cancelling a plan, skipping or reloading during assembly, both newcomers’ recipes, and the menu at phone and desktop sizes.
