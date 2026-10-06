// Wayfinding describes actual places and choices, rather than repeating a region's level recommendation.
import type { ZoneId } from './data';
export const ROUTE_GUIDES: Partial<Record<ZoneId, string>> = {
 meadow: 'East Road · At the orchard fork, the cart trail circles north; Bunny Cut takes the shorter way through the broad grass to the south. Beyond it, take the dry ridge or grassy Slime Bend around Willow Pond. The stakes on its opposite banks mark a future oak crossing. Sunny Meadow opens off the southern grass; explore its clearing to reach Poppy’s Secret Grove.',
 woods: 'Whisper Woods · The central cut is quick but crosses Woolf grass. The longer southern logging trail stays dry. Bram’s old camp is above the first fork; oak restores its creek crossing. Pine opens the Stillwater return.',
 cave: 'Echo Cavern · The lit trail forks into a short dark passage and a longer lower quarry loop. Upper galleries lead to Pebbler Hollow; Pip’s tunnel opens off the southwest descent. Pine spans the flooded quarry.',
 hollow: 'Glimmer Hollow · The northern ridge stays clear of encounter moss. The shorter southern loop crosses a little of it. Rootlight is a gathering spur, and glimmer dust leads off the upper ridge. Glimmerwood spans Mirror Gorge.',
 peak: 'Ember Peak · Descend to the foot of the mountain. The western switchbacks are longer and quieter; the central ascent is shorter with two small ash-grass crossings. Cinder Basin lies off the lower trail. Emberwood spans the lava.',
};
export const LANDMARK_SIGNS = [
 {zone:'meadow' as const,x:29.2,y:20.8,text:'Willow Pond · The two banks mark an unfinished crossing. Help Bram, then bring 24 oak planks to the western stakes. Until then, follow the northern ridge or the southern grass around the pond.'},
 {zone:'cave' as const,x:10.2,y:29.2,text:'Old Quarry · Pip’s tunnel to the west. Pine boardwalk to the east. The lower loop stays clear of the dark upper passage.'},
 {zone:'hollow' as const,x:10.2,y:35.2,text:'Rootlight Garden · Glimmerwood, crystal and an old burrow. Return by the ridge, or restore Mirror Gorge’s span.'},
 {zone:'peak' as const,x:28.2,y:38.2,text:'Cinder Basin · Emberwood and obsidian. The boulder at the far end hides an old route home.'},
];
