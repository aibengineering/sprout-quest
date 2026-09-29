import { describe, expect, test } from 'bun:test';
import { towerLink, towerSaveFromLink } from '../src/dev/towerLink';

const from = (q: string) => towerSaveFromLink(new URLSearchParams(q));

describe('Battle Tower links (dev builds)', () => {
  test('a floor alone gears you up the way the balance model expects there, keeping the class you ask for', () => {
    const s = from('tower&floor=9&style=hammer');
    expect(s.tower?.floor).toBe(9);
    expect(s.lv).toBe(8);
    expect(s.equip.weapon).toBe('copperhammer');
    expect(s.mastery.hammer.lv).toBeGreaterThanOrEqual(3);
  });

  test('anything else in the link overrides it: level, gear, handling, materials', () => {
    const s = from('tower&floor=4&lv=3&weapon=twig&armor=tunic&h=whip:4,wand:2&mats=goo:20,all:0');
    expect([s.lv, s.equip.weapon, s.equip.armor, s.mastery.whip.lv, s.mastery.wand.lv]).toEqual([3, 'twig', 'tunic', 4, 2]);
    const m = from('tower&mats=all:7,goo:20').mats;
    expect([m.goo, m.fluff, m.iron]).toEqual([20, 7, 7]);
  });

  test('a run copied as a link comes back the same', () => {
    const s = from('tower&floor=12&style=whip&h=sword:3&mats=wing:5');
    const back = from(new URL(towerLink(s, 25, 'http://x/')).search.slice(1));
    for (const k of ['lv', 'tower', 'equip', 'mastery', 'mats'] as const) expect(back[k]).toEqual(s[k]);
    expect(towerLink(s, 25, 'http://x/')).toContain('xp=25');
  });
});
