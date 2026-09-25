// Getting text out of the game: the system share sheet (phones), a download, or the clipboard.

/** Can this browser hand a file to the share sheet (so it can go straight to another app)? */
export function canShareFiles() {
  try {
    return !!navigator.canShare?.({ files: [new File(['{}'], 'test.json', { type: 'application/json' })] });
  } catch {
    return false;
  }
}

/** Shares `text` as a file where the share sheet takes files (phones); downloads it otherwise. */
export async function shareOrDownload(text: string, name: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([text], name, { type: 'application/json' });
  if (canShareFiles()) {
    try {
      await navigator.share({ files: [file], title: name });
      return 'shared';
    } catch (e) {
      // Closing the share sheet isn't an error; anything else falls back to a download.
      if ((e as Error).name === 'AbortError') return 'cancelled';
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  return 'downloaded';
}

/**
 * Copies text to the clipboard. The clipboard API only exists on https (or localhost), so on the dev server's LAN
 * address this falls back to selecting a hidden text box and copying that.
 */
export async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Blocked: try the fallback.
    }
  }
  const box = document.createElement('textarea');
  box.value = text;
  box.setAttribute('readonly', '');
  box.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
  document.body.appendChild(box);
  box.select();
  box.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  box.remove();
  return ok;
}
