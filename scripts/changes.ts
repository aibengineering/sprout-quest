// Did a change touch the game, or only documentation and CI tooling? Shared by CI (which skips the build and the
// browser test for docs-only changes) and the release check (which then needs no version bump).
//
//   bun run scripts/changes.ts <base ref>   prints what changed; in GitHub Actions also sets the `game` output
import { $ } from 'bun';
import { appendFileSync } from 'node:fs';

/** Files that don't change the game: docs (any Markdown, docs/) and CI tooling (workflows, these two scripts). */
const NOT_THE_GAME = [/\.md$/i, /^docs\//, /^\.github\//, /^scripts\/(changes|check-release)\.ts$/];

/** Files changed since `base`, or null if `base` isn't a commit we have (a new branch, say). */
export async function changedFiles(base: string): Promise<string[] | null> {
  if (!/^[\w./-]+$/.test(base) || /^0+$/.test(base)) return null;
  const known = await $`git rev-parse --verify --quiet ${base}^{commit}`.nothrow().quiet();
  if (known.exitCode !== 0) return null;
  return (await $`git diff --name-only ${base}...HEAD`.text()).split('\n').filter(Boolean);
}

/** True unless every changed file is documentation or CI tooling (when unsure, assume the game changed). */
export const touchesGame = (files: string[] | null) => !files?.length || files.some((f) => !NOT_THE_GAME.some((re) => re.test(f)));

if (import.meta.main) {
  const files = await changedFiles(process.argv[2] ?? 'origin/main');
  const game = touchesGame(files);
  console.log(game ? `Game files changed (${files?.length ?? 'unknown'} files): full checks` : `Documentation and CI only (${files!.join(', ')}): skipping the build and browser test`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `game=${game}\n`);
}
