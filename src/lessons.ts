// The moves the game teaches the first time you can use them (see teach() in game/fights.ts): each weapon class's
// special, and each class's ability. Their tip ids: presets and test saves start with them done, so nothing pauses a
// fight to teach.
export const LESSONS = [
  ...(['sword', 'hammer', 'whip', 'wand'] as const).map((k) => `teach:skill:${k}`),
  'teach:riposte', 'teach:stagger', 'teach:snare', 'teach:blink',
];
