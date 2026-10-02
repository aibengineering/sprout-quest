// Wayfinding describes actual places and choices, rather than repeating a region's level recommendation.
import type { ZoneId } from './data';
export const ROUTE_GUIDES: Partial<Record<ZoneId, string>> = {
  meadow: 'Willow Pond: follow the north shore to the eastern orchard. The southern grass leads to Poppy’s Secret Grove. A broken crossing by the west bank needs Bram’s oak planks.',
  woods: 'Whisper Woods: south to the climbing trail; north to Bram’s old logging camp. Stillwater divides the western climb from the eastern trail. Oak repairs the camp bridge; pine spans the lake.',
  cave: 'Echo Cavern: upper galleries to Pebbler Hollow and the eastern road. The flooded Old Quarry lies below, with iron workings around its southern rim. A pine boardwalk reconnects its banks.',
  hollow: 'Glimmer Hollow: follow the northern moss beds toward the crystal paths. South lies Rootlight Garden. Mirror Gorge separates those paths from this campfire; Glimmerwood makes a direct return.',
  peak: 'Ember Peak: climb north round the lava lake to the lair ridge, or explore the southern Cinder Basin for Emberwood and obsidian. Only heat-hardened Emberwood can bridge the lake.',
};
export const LANDMARK_SIGNS = [
  { zone: 'cave' as const, x: 15.2, y: 24.2, text: 'Old Quarry · West bank: iron workings. East bank: return to the galleries. Follow the southern rim, or build the pine boardwalk across the flooded cut.' },
  { zone: 'hollow' as const, x: 14.2, y: 29.2, text: 'Rootlight Garden · Glimmerwood grows beside the crystal beds. Back north to the main trail; the Mirror Gorge span leads straight to the campfire.' },
  { zone: 'peak' as const, x: 10.2, y: 24.2, text: 'Cinder Basin · Emberwood grove to the west, obsidian workings on the east bank. The southern rim joins both banks and returns to the lair-side trail.' },
];
