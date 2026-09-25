// Release check for pull requests into main: the version in package.json must go up, and the newest patch notes must
// describe it. Pull requests that only touch documentation or CI tooling are exempt: they don't change the game.
// Run from CI as `bun run scripts/check-release.ts <base ref>` (e.g. origin/main).
import { $ } from 'bun';
import pkg from '../package.json';
import { newerThan } from '../src/semver';
import { PATCH_NOTES } from '../src/version';

const base = process.argv[2] ?? 'origin/main';
const problems: string[] = [];

/** Files that don't change the game: docs (any Markdown, docs/) and CI tooling (workflows, this check). */
const NOT_THE_GAME = [/\.md$/i, /^docs\//, /^\.github\//, /^scripts\/check-release\.ts$/];
const changed = (await $`git diff --name-only ${base}...HEAD`.text()).split('\n').filter(Boolean);
if (changed.length && changed.every((f) => NOT_THE_GAME.some((re) => re.test(f)))) {
  console.log(`✓ Documentation and CI only (${changed.join(', ')}): no release needed`);
  process.exit(0);
}

const baseVersion: string = await $`git show ${base}:package.json`.json().then((p: { version?: string }) => p.version ?? '0.0.0');
const version = pkg.version;
const newest = PATCH_NOTES[0];

if (!newerThan(version, baseVersion)) {
  problems.push(`package.json is at ${version}, which isn't newer than ${base} (${baseVersion}). Bump the version for this release.`);
}
if (newest?.version !== version) {
  problems.push(`The newest patch notes in src/version.ts are for ${newest?.version ?? 'nothing'}, not ${version}. Add an entry describing this release at the top of PATCH_NOTES.`);
} else {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(newest.date)) problems.push(`The ${version} patch notes need a date as YYYY-MM-DD (got "${newest.date}").`);
  if (!newest.title.trim()) problems.push(`The ${version} patch notes need a title.`);
  if (!newest.notes.length || newest.notes.some((n) => !n.trim())) problems.push(`The ${version} patch notes need at least one note, and no empty ones.`);
}

if (problems.length) {
  console.error(`✗ Release check failed:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exit(1);
}
console.log(`✓ Release ${version} (was ${baseVersion}): "${newest.title}", ${newest.notes.length} notes`);
