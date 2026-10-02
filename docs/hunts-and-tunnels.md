# Rook’s hunts and Pip’s discoveries — 0.3.7

Rook replaces the current Hazel resident slot, keeping its aligned village lot. He is found sheltering in Glimmer Hollow after the Echo Queen, injured while pursuing the Emberwyrm. Walk him to Clover before Bram offers the lodge. He is a courteous human outsider with buyers back home, overly interested in the value of unusual monsters. Clover, Poppy and Pip express different objections. Future confrontation or refusal quests remain proposals in the sibling Bible.

## Hunt loop

Enter the lodge, talk to Rook, take one commission from its board, find the marked regional variant and return to Rook. A quest marker and named world encounter identify the sighting. The target’s level is the greater of the player’s level and its base level, frozen on acceptance; masters add two. Fleeing or losing leaves the target available at that level. Withdrawing removes it until accepted again.

| Lodge | Commissions |
| --- | --- |
| Hunting Lodge | Slime, Hopbun, Sporecap, Woolf |
| Trophy Hall | Adds Flapper, Pebblor and Glimmer Slime |
| Grand Lodge | Adds Impy, Magma Slime and master versions of all nine |

Guardian gates remain required. Masters also require the first commission of that species. Swift variants move faster; armoured variants are slower and tougher; fierce variants hit harder. No additional monster behaviour or cash economy is implied.

Five field victories of one species earn bronze and 80 XP. A first commission earns silver and `acceptedLevel × 24` XP; a master earns gold and `acceptedLevel × 40`. Rook claims rewards atomically before presenting them. Trophy shelves show the highest owned rank for each species; inspection lists all earned ranks. Ordinary wins build records but cannot complete a marked commission. Dojo and Tower encounters are excluded.

The pure state and definitions live in `src/hunts.ts`; battle integration in `src/game/fights.ts`; board and claims in `src/game/hunting.ts`; lodge presentation in `src/game/hunterRoom.ts`. Costs and tier gates are tuning values in `src/housing.ts` and `src/villageJobs.ts`. Moss now depends on Pip and Clover’s kitchen, so this later arrival does not gate his earlier recipe.

## Pip and the boulders

After Clover’s kitchen is built, Bram points to tapping beneath the Old Quarry in Echo Cavern. Its visible tunnel mouth enters a separate underground map. Pip expects a prized rock beyond a large boulder and asks for ten clean mining hits in a row. A miss resets progress; pick power cannot skip the streak. Cancelling leaves it intact. Breaking it reveals six regrowing nodes of stone, copper and iron, and an old tunnel home. Show Pip the opening, take the tunnel and walk to Clover to unlock his cottage.

| Discovery | Region | Required clean streak |
| --- | --- | --- |
| Pip’s Promising Tunnel | Echo Cavern, Old Quarry | 10 |
| Stillwater Burrow | Whisper Woods, eastern lake resources | 10 |
| Rootlight Burrow | Glimmer Hollow, southern crystal beds | 11 |
| Cinder Burrow | Ember Peak, eastern basin resources | 11 |

Later discoveries hide their tunnel beneath the boulder. Cleared boulders never regrow; gallery ore uses normal gathering timers. All return to the mouth beside Pip’s cottage in Sowerby. That mouth offers outward travel only to passages already discovered. Region guardians gate clearing, so these routes shorten return trips without bypassing progression. A normal eligible pick is still needed for the boulder’s rock type.

Definitions and flags live in `src/seams.ts`, the instance in `src/resourceCave.ts`, streak rules in `src/gather.ts`, payout in `src/game/gathering.ts`, travel in `src/game/underground.ts` and Pip’s saved escort in `src/game/stories/neighbours.ts`. His ordinary cottage, Rock Candy and home upgrades remain.

## Save compatibility

`homes.hazel` migrates to `homes.rook` at the same tier, including a queued Hazel addition and unfinished escort. No materials are charged. Old Meadow Tea remains learned, with its purchased duration bonus retained as `legacyHerbLevel`; new herb harvesting teaches it through Clover, and new lodge upgrades affect commissions only. Existing settled Pips stay settled and can discover the ore gallery without replaying their arrival. Gallery position, opened passages, active contracts, claims and trophies survive reloads.

Playtest the ten/eleven-hit difficulty on touch, how quickly bronze trophies accumulate, the variant multipliers and one-time XP. The current trophy display and wording deliberately leave the Bible’s monster-loss and reincarnation rules open.
