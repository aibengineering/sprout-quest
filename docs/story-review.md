# Story review and resident integration

Reviewed against the [Sprout Quest Bible](../../2609_sprout_quest_story/README.md), especially [the saga](../../2609_sprout_quest_story/story/01-overview.md), [the writing guide](../../2609_sprout_quest_story/story/15-craft.md) and [the three tracks](../../2609_sprout_quest_story/story/17-three-tracks.md). The Bible remains the story source; this document records the game's implementation gap and the reasons for this dialogue pass.

## The story being built

Veyra grew the hero to fight her war. The player initially experiences a warm village under threat, helps its people and fights east. Those relationships give the hero something to value beyond Veyra's purpose for them.

The later story changes whose experience we share. The first slime asks the hero to listen; the Reckoning reveals both the monsters' tenderness and their capacity to harm. Defeat and a divided soul lead to a second journey as a slime, ending against the human champion the player used to be. Choosing understanding over finishing that opponent creates the first human–monster bond. The final act builds its play around those partnerships and the Crownless King who profits from division.

That saga spine is decided. Its execution contains open questions: the Wild's name, the nature of the Heart, the rules of monster defeat, the Act 2 vessel, the time skip and Act 3's playable character. None is settled by the new resident dialogue.

## What players have today

The game implements the Act 1 road east, village construction, Veyra's shrines and recovery, Oswin's recognition of the leaf, Poppy's bunny quest, Bram's rescue and Sawmill, Pip's arrival, Poppy's Garden and the Pebbler procession. Rook and Moss extend the optional village track with a hunt lodge and a shared recipe; Pip’s discovery opens an underground ore gallery and permanent tunnels. Timber shortcuts make Bram's contribution visible beyond Sowerby.

The planned guardian aftermath scenes, dragon flyover, Veyra's appearance after the dragon, the ember returning west, the ghost's offer, the Reckoning and later acts are not implemented. The current end is a cleared-smoke message and continued village play. Opening a road often feels like unlocking a resource tier; the dragon is absent from much of the middle game.

## Rook, Pip and Moss

Rook replaces the current Hazel resident slot. A human outsider injured by the Emberwyrm, he shelters in Glimmer Hollow until the hero returns with him. He is cordial and appreciative, but treats rare creatures as saleable stock. Buyers, markings and prices occupy him. Clover, Poppy and Pip raise small objections; he answers cheerfully and misses their significance. This brings an optional collecting game into the village and makes human exploitation visible without exposing the later story.

His lodge offers one scaled field commission at a time and a permanent bronze/silver/gold collection. Levels are fixed on acceptance, rewards claimed once, and lodge additions unlock regions and masters. Trophy displays are miniatures, with no new rule about bodies, capture or reincarnation. He is not established as the King or an agent of the order. Refusing a particular commission or changing his mind remains future work.

Pip’s story now starts in the Old Quarry tunnel in Echo Cavern. He expects a prized rock; a ten-hit mining streak opens a larger discovery: mixed ore and his old tunnel home. Sharing the find and returning to Clover unlocks the cottage. Three later resource areas have similar return tunnels. Pip’s interest in showing a stone contrasts with Rook’s offer to buy it. Older settled residents stay settled.

Moss still brings Trail Buns and finds neighbours to bake for after the roads closed his passing trade. Hazel and the fern-transplant favour are deferred. Poppy’s herbs teach Clover Meadow Tea; migrated tea progress and purchased duration remain. The Bible's **Sowerby's neighbours** page separates these implemented loops from proposed later conflicts.

## Depth to build next

These are recommendations, not implemented quests.

1. **Make the road east change home.** Prioritise the short guardian aftermath scenes already proposed in the Bible. Smoke, a sound from the mountain and a changed conversation give progress weight. A dragon flyover needs its own presentation and recovery design; it should not unexpectedly erase purchased homes.
2. **Give Oswin affection as well as certainty.** Knowing the hero's purpose need not make his kindness false. Let him notice an injury or save a seat before sending the hero east. His later revelation becomes a conflict between care and duty, rather than a kindly elder turning into a stock deceiver.
3. **Let Poppy discover.** Her bravery is attention to things adults dismiss. “Are they… sad?” follows what she sees. In the current cave scene, “This is a goodbye” comes before that question, making her certain too early. Keep her occasional intuition, but let the procession and her pauses carry the meaning. Her later role as a bridge between peoples grows from those choices.
4. **Let Clover's practicality carry the feeling.** Food, mended boots and an extra chair are her language. She can remain scared for Poppy while accepting something Poppy learned. Avoid repeating rescue warnings forever or making every conversation cooking instructions.
5. **Keep Bram's pride physical.** His arc goes from an axe abandoned in a stump to roofs over other people. A chair, repaired doorstep or bridge he checks is stronger than a speech about community. His grumbling concerns work, never newcomers. Keep the deliberately dropped Old Kings secret out of his camp.
6. **Use Pip as an observer.** A fern fossil, warm stone or old tunnel gives him something to show. One find at a time; he should not explain every mystery.
7. **Give Rook and Moss a specific relationship scene.** A particular hunt could trouble Poppy; Moss and Clover could bake a welcome supper. A visible planting or shared table pays off their dialogue. These remain proposals, with no new reward or task chain promised.

## Continuity decisions worth making first

- **What a defeated monster loses.** Reforming is still open; the current cave scene carries a fading core and raises a memorial. If ordinary defeat always reverses without loss, that scene and the Reckoning lose weight. Define what returns, what is lost, and why this farewell matters. Delayed return or rare irreversible loss are options, not canon. Reincarnation should not cancel every consequence.
- **What happens to the Emberwyrm.** The game says “Calm the Emberwyrm,” permits friendly rematches and has no final death scene. The saga depends on the loss of the Wild's great heart. Decide the event before writing its defeat, and distinguish a future rematch from that original event. Keep the stolen Heart and the dragon's role as a living heart clear to the writer, even when characters speak poetically.
- **How much the King explains.** His theft can explain the original wound and his influence can keep it open. It should not excuse every choice afterward. Both gods still use the hero; understanding remains a choice with consequences.
- **What material recipes imply.** Fluff, goo, cores and scales acquire meaning once monsters become people. Set rules for shed, gathered and defeated-monster materials before writing Act 2 accusations. Avoid accidental body horror or condemning mandatory tutorial actions retroactively.
- **What names imply.** Moss fits the proposed plant-name tradition; Rook’s name does not establish a priesthood or faction. Names can suggest their culture without making them priests, secret gods or authorities on the Wild.

The strongest tone is a plain sentence beside a meaningful action. Sowerby can stay funny and comfortable as its people become more specific. Reserve explanations of gods and war for moments when the player has seen enough to need them.


## Clover's extension and Alder (0.3.7)

Clover already lives in Sowerby. Poppy's rescue earns her gratitude and starts the pie favour for Bram; it no longer magically opens a fully equipped kitchen on new saves. Once Bram is home, he fences Poppy's garden, then extends Clover's house with timber, oven stone, copper and flowers grown with Poppy. The original house stays. Clover invites the hero to cook with her in the new room. She remains outdoors for ordinary conversation and quests, and joins the player inside. Existing open kitchens remain open on older saves.

Alder is a former escort from the east road. Hearing about the Woolves gives him a reason to ask for a dojo. Bram builds it, Alder teaches: one place and one activity belongs to one character. His first lessons reward attention to attack tells; later additions let him teach rushes, specials and crowds. Practice should make returning to the road less frightening. He knows roadcraft, not the gods' secrets. A later beat where he learns to pause rather than assume every creature is an attacker remains a proposal, not implemented lore.

Construction requests now connect trades: Poppy's flowers brighten Clover's kitchen and later doorsteps; Pip’s discovery brings him home; Rook’s lodge puts a market beside the village’s ordinary care; Clover's new oven lets Moss bake without another production system. Bram's pride appears as useful work, and village growth stays separate from workshop capability.


## Arriving before a roof

Pip is now met underground in Echo Cavern; Alder beside the Woods road; Rook in Glimmer Hollow; Moss beside the Meadow road. Each introduces their practical need and walks back with the hero. A saved return unlocks Bram's first building offer. They wait with Clover until it is built, so the friendship precedes the purchase. Existing residents remain settled. These are short arrival journeys, not the proposed fern or supper favours.

Owners can request the next addition without delaying another person's arrival. Clover has pine and glimmer kitchen additions; Pip a study and archive; Rook a Trophy Hall and Grand Lodge; Moss a larder and baking annex. Garden and dojo retain their three tiers. The larger payoffs stay specific to that person's activity and are intended for playtest tuning.
