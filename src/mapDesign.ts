// Wayfinding describes actual places and choices, rather than repeating a region's level recommendation.
import type { ZoneId } from './data';
export const ROUTE_GUIDES: Partial<Record<ZoneId, string>> = {
 meadow: 'East Road · At the orchard fork, the cart trail circles north; Bunny Cut takes the shorter way through the broad grass to the south. Beyond it, take the dry ridge or grassy Slime Bend around Willow Pond. Sunny Meadow opens off the southern grass.',
 woods: 'Whisper Woods · The central cut is quick but crosses Woolf grass. The longer southern logging trail stays dry. An old logging camp sits above the first fork.',
 cave: 'Echo Cavern · The lit trail forks into a short dark passage and a longer lower quarry loop. Upper galleries lead to Pebbler Hollow; an old tunnel opens off the southwest descent.',
 hollow: 'Glimmer Hollow · The northern ridge stays clear of encounter moss. The shorter southern loop crosses a little of it. Rootlight is a gathering spur, and glimmer dust leads off the upper ridge.',
 peak: 'Ember Peak · Descend to the foot of the mountain. The western switchbacks are longer and quieter; the central ascent is shorter with two small ash-grass crossings. Cinder Basin lies off the lower trail.',
};
export const LANDMARK_SIGNS = [
 {zone:'meadow' as const,x:29.2,y:20.8,text:'Willow Pond'},
 {zone:'cave' as const,x:10.2,y:29.2,text:'Old Quarry'},
 {zone:'hollow' as const,x:10.2,y:35.2,text:'Rootlight Garden · Glimmerwood, crystal and an old burrow. Return by the ridge.'},
 {zone:'peak' as const,x:28.2,y:38.2,text:'Cinder Basin · Emberwood and obsidian. The boulder at the far end hides an old route home.'},
];
