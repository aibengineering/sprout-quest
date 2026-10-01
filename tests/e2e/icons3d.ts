// Icons rendered from the items' 3D models (scripts/icons3d.ts) are deterministic: the same model gives the same bytes
// on every render, in a fresh page, so a re-run only changes the icons whose models changed. Also reports any shipped
// icon that's out of date with its model (a warning: another machine's software renderer may round differently).
//   bun run tests/e2e/icons3d.ts
import { readFileSync } from 'node:fs';
import { iconPage } from '../../scripts/icons3d';
import { MODEL_ICONS } from '../../src/itemview';

// A weapon tilted from its hand-held model, a crafting scene's weapon, armour, a charm, a tool, a potion and a meal
// with a layer left out.
const SAMPLE = ['twig', 'emberblade', 'crystalmail', 'impring', 'pick2', 'herbtonic', 'meal_stew'];
const failures: string[] = [];
for (const id of SAMPLE) if (!MODEL_ICONS.includes(id)) failures.push(`${id} is no longer a model icon`);

const renders: Record<string, string | null>[] = [];
for (let run = 0; run < 2; run++) {
  const { render, close } = await iconPage();
  const out: Record<string, string | null> = {};
  // The second run goes in the other order, so nothing left over from the previous icon can leak into the next.
  for (const id of run ? [...SAMPLE].reverse() : SAMPLE) out[id] = await render(id);
  renders.push(out);
  await close();
}
for (const id of SAMPLE) {
  const [a, b] = renders.map((r) => r[id]);
  if (!a) failures.push(`${id}: didn't render`);
  else if (a !== b) failures.push(`${id}: two renders differ`);
  else if (!Buffer.from(a.split(',')[1], 'base64').equals(readFileSync(`public/assets/icons/${id}.webp`))) {
    console.warn(`warning: ${id}.webp differs from its model here (re-run \`bun run art icons3d ${id}\` if its model changed)`);
  }
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`icons3d: ${SAMPLE.length} icons render identically twice`);
