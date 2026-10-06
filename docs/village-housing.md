# Sowerby’s neighbours

The housing loop is **meet someone in the world → return to Sowerby together → bring Bram materials → build their place → use it → ask its owner about an addition**. The physical work gives the planks a purpose, and each doorstep gives the village another person to visit.

## Implemented for 0.3.7

Bram's outdoor conversation offers **one next building job**, after his cabin quest. The generic Village menu keeps workshops and the player's original home. Resident homes, Poppy's garden, the fox’s hidden training clearing and Clover's kitchen are handed in to Bram in conversation, with actual materials and a cancellable single-job card. The tracker points back to him. Material payment and completion are saved before the assembly animation.

First places follow **Poppy's patch → Clover's kitchen → Pip's cottage**, then the fox’s hidden training clearing, Rook's lodge and Moss's home as those people return. Pip is met in an underground Old Quarry tunnel in Echo Cavern, the masked fox at her hidden Glimmer den, Rook sheltering on Ember Peak and Moss by the Meadow road. Pip’s ten-hit boulder opens an ore gallery and tunnel home before his return. Rook appears after the Emberwyrm, independently of Moss. Pip, Rook and Moss ask you to walk back with them; the fox stays at her den. Human guests stay with Clover while waiting for construction. Talking or having materials alone cannot unlock a home. The fox’s field trial earns trust and Shadow Scarf without a building; Bram later brings practice equipment to her den. Existing buildings count as settled, so older saves do not repeat arrivals.

Upgrades are independent of that arrival order. Each owner can request their next addition in conversation, which makes it Bram's current job without spending anything. If a newcomer is still away, Bram can offer an available improvement. The tracker and Journal follow the chosen request; completion is derived from saved building levels, so a changed job order does not skip construction. Mill tiers continue to gate the timber. Workshops and the player's original home retain their existing upgrades.

| Place / owner | First construction | Additions / contribution |
| --- | --- | --- |
| Poppy's garden | 32 oak planks, 12 stone, 1 clover | Six, twelve, then twenty beds; food and flowers for later jobs |
| Clover's kitchen extension | 64 oak planks, 24 stone, 9 copper, 6 flowers | Three tiers: kitchen extension, Pine Pantry, Glimmer Kitchen; her own meals gain 30/60 seconds |
| Pip's cottage | 48 oak planks, 12 bark, 18 stone, 9 copper, 4 flowers | Study: 48 pine planks, 9 iron, 6 flowers; then a Glimmer Archive; Rock Candy gains one/two minutes |
| Fox’s hidden clearing | 40 oak planks, 18 stone, 18 fluff | Pine and glimmer additions open six combat lessons; first-clear XP from 180 to 1,000 |
| Rook's Hunting Lodge | 64 oak planks, 24 stone, 8 fangs, 6 flowers | Trophy Hall: 56 pine planks, 8 crystal, 8 flowers; Grand Lodge: 64 glimmer planks, 12 crystal, 12 fangs, 12 flowers; adds regional and master hunts |
| Moss's cottage | 64 pine planks, 24 stone, 12 berries, 8 flowers | Larder: 48 glimmer planks, 8 crystal, 10 flowers; then an Ember Bakehouse; Trail Buns gain one/two minutes |

Each activity has its own character. Bram constructs; Poppy gardens; Clover cooks; the masked fox teaches combat privately in Glimmer Hollow. Her hidden clearing uses canvas targets with real enemy tells, a separate practice health pool and once-only combat/handling XP. It does not drop materials or advance monster-kill quests. A home addition improves future meals, without permanent combat stats or workshop levels.

The player and Rook face one shared lane south of the main road, with short paths from their aligned doorsteps. A single branch connects that lane and Veyra’s Spring to the main road, leaving an open green instead of four parallel roads through the plots. Bram’s cabin sits beside the Sawmill in the northwestern work yard; its approach joins the mill’s without blocking either door. Pip stays northeast near his tunnel and Granny, while Moss lives beside the kitchen and Garden. The Garden keeps its own gate and approach. Lots leave room for the largest upgraded roofs as well as the collision boxes. New home additions retain their original footprint and visibly extend the original house.

## Story integration

The sibling [Sprout Quest Bible](../../2609_sprout_quest_story/story/18-sowerby-neighbours.md) records Rook, Pip and Moss. Rook is an injured visiting human hunter: warm manners, excessive excitement at valuable specimens, and buyers waiting back home. Clover, Poppy and Pip question his prices in ordinary conversations. His optional lodge commissions are useful before their implications become uncomfortable. He has no confirmed connection to the Crownless King or Act 2's order.

Pip expects one prized rock but discovers a whole mixed-ore gallery and a way home. The contrast matters: he wants to share his finds; Rook wants to buy them. Pip’s ten-hit challenge and three later ten/eleven-hit boulders open permanent return tunnels, with outward travel only to discovered passages. Normal ore regrowth remains. See [hunts and tunnels](hunts-and-tunnels.md) for state, gates and tuning.

Hazel is deferred. Poppy’s first herb harvest teaches Clover Meadow Tea. Migrated Hazel homes retain their purchased level as Rook’s lodge, and old tea progress retains its duration bonus. New lodge upgrades affect hunts, not tea.

## Next story pass

These are proposed beats, not active quests or promised unlocks:

1. Deepen the requests Bram already gives with a short resident visit or letter; keep village arrival optional beside the main story.
2. Give each resident one favour using their trade: Pip shares a particular find, Rook is challenged over a particular commission, Moss bakes for Bram’s first village supper. Tie house additions to these character moments as well as the timber cost.
3. Add a shared supper or small village event after the favours. Let conversations change after the event, without creating another daily chore or mandatory production minigame.
4. Explore neighbouring settlements after Sowerby has people worth leaving and returning to. Use introductions, trade requests and shared recipes before expanding housing to an entirely new map.

Workshop progression continues to determine tools, materials and construction capability. Housing progression determines residents, relationships and their recipe contributions. The player’s existing tent/cottage/manor stays on its current main-quest path for compatibility; a later design pass can revisit it independently. The new final tiers improve the resident’s own activity or recipe and retain the previous building as their assembly base. Costs, bonuses and tier gates are tuning values in `src/housing.ts`, `src/kitchenUpgrades.ts` and `src/villageJobs.ts`.

## Playtest questions

- Does talking to Bram make the reason to cut planks clear?
- Do the new homes leave enough space to walk and see the Spring and Garden?
- Is the duration bonus worth an optional house addition without becoming mandatory?
- Does Rook remain likeable while his commercial enthusiasm feels uncomfortable?

Validate old saves, reloading an escort, returning before construction, cancelling a request, skipping or reloading during assembly, Rook’s commission rewards and Moss’s recipe, and the job card and lessons at phone and desktop sizes.
