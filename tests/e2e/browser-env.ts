// Linux CLI installations may have no emoji font: screenshots then show empty boxes in the HUD, menus and canvas.
// SPROUT_EMOJI_FONT supplies a local font for the browser without installing it globally or shipping it in the game.
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const xml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);
let configured: Record<string, string> | undefined;

export function browserEnv(requireEmoji = false): Record<string, string> {
  if (!configured) {
    configured = Object.fromEntries(Object.entries(process.env).filter((e): e is [string, string] => e[1] !== undefined));
    if (process.platform === 'linux' && process.env.SPROUT_EMOJI_FONT) {
      const font = realpathSync(process.env.SPROUT_EMOJI_FONT);
      const root = mkdtempSync(join(tmpdir(), 'sprout-browser-fonts-'));
      const config = join(root, 'fonts.conf');
      writeFileSync(config, `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">
<fontconfig>
  <include ignore_missing="yes">${xml(process.env.FONTCONFIG_FILE || '/etc/fonts/fonts.conf')}</include>
  <dir>${xml(dirname(font))}</dir>
  <cachedir>${xml(join(root, 'cache'))}</cachedir>
</fontconfig>`);
      configured.FONTCONFIG_FILE = config;
      process.once('exit', () => rmSync(root, { recursive: true, force: true }));
    }
  }
  if (requireEmoji && process.platform === 'linux') {
    const match = spawnSync('fc-match', ['-f', '%{family}', 'emoji'], { env: configured, encoding: 'utf8' });
    if (match.status !== 0 || !/emoji/i.test(match.stdout)) {
      throw new Error('Screenshots need an emoji font. Install fonts-noto-color-emoji or set SPROUT_EMOJI_FONT to a local NotoColorEmoji.ttf file.');
    }
  }
  return configured;
}
