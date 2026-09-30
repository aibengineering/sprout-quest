# Stage 1 of the game's music samples: downloads the chosen instruments from VSCO 2 Community Edition (CC0,
# github.com/sgossner/VSCO-2-CE), finds each recording's real pitch, trims and normalises it, and writes mono WAVs plus
# a catalog to art/music/cache/. Run through `bun run music` (art/music/pack.ts), which then ships only what the
# scores play.
import json, os, re, urllib.parse, urllib.request
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
import numpy as np, soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, 'cache')
OUT = os.path.join(CACHE, 'wav')
RAW = 'https://raw.githubusercontent.com/sgossner/VSCO-2-CE/master/'

# name: (folder, file filter, max seconds, pitched)
PICK = {
  'violins':        ('Strings/Violin Section/susVib', r'', 3.0, True),
  'violins_spic':   ('Strings/Violin Section/Spic', r'rr1', 1.0, True),
  'violins_pizz':   ('Strings/Violin Section/Pizz', r'rr1', 1.5, True),
  'violins_trem':   ('Strings/Violin Section/Trem', r'', 3.0, True),
  'violas':         ('Strings/Viola Section/susvib', r'', 3.0, True),
  'violas_spic':    ('Strings/Viola Section/spic', r'rr1', 1.0, True),
  'celli':          ('Strings/Cello Section/susvib', r'', 3.0, True),
  'celli_spic':     ('Strings/Cello Section/spic', r'RR1', 1.0, True),
  'celli_pizz':     ('Strings/Cello Section/pizzT', r'', 1.8, True),
  'basses':         ('Strings/Solo Contrabass/SusVib', r'', 3.0, True),
  'basses_spic':    ('Strings/Solo Contrabass/Spic', r'rr1', 1.0, True),
  'basses_pizz':    ('Strings/Solo Contrabass/Pizz', r'rr1', 2.0, True),
  'harp':           ('Strings/Harp', r'', 3.5, True),
  'horn':           ('Brass/F Horn/sus', r'', 3.0, True),
  'horn_stac':      ('Brass/F Horn/stac', r'rr1', 1.0, True),
  'trumpet':        ('Brass/Trumpet/sus', r'', 3.0, True),
  'trumpet_stac':   ('Brass/Trumpet/stac', r'rr1', 1.0, True),
  'trombone':       ('Brass/Tenor Trombone/sus', r'', 3.0, True),
  'trombone_stac':  ('Brass/Tenor Trombone/stac', r'rr1', 1.0, True),
  'tuba':           ('Brass/Tuba/sus', r'', 3.0, True),
  'flute':          ('Woodwinds/Flute/susvib', r'_1\.wav$', 3.0, True),
  'flute_stac':     ('Woodwinds/Flute/stac', r'rr1', 0.8, True),
  'oboe':           ('Woodwinds/Oboe/Vib', r'', 3.0, True),
  'clarinet':       ('Woodwinds/Clarinet/susLong', r'', 3.0, True),
  'clarinet_stac':  ('Woodwinds/Clarinet/stac', r'rr1', 0.8, True),
  'bassoon_stac':   ('Woodwinds/Bassoon/stac', r'rr1', 0.8, True),
  'glock':          ('Percussion/Glock', r'', 2.5, True),
  'timpani':        ('Percussion/Timpani', r'Hit_v(3|4)_rr1', 3.0, True),
  # Unpitched: the key is the file's role.
  'bassdrum':       ('Percussion', r'BDrumNewhit_v(3|7)_rr1', 2.5, False),
  'snare':          ('Percussion', r'Snare2-HitSN_v(5|9)_rr1', 0.8, False),
  'snare_roll':     ('Percussion', r'Snare2-rollSN_v5_rr1', 3.0, False),
  'crash':          ('Percussion', r'cymbal-crash1_(mf|ff)_rr1', 4.0, False),
  'swell':          ('Percussion', r'susCymb1-cresc-Median_v1', 6.0, False),
  'gong':           ('Percussion', r'gongHit_f\.wav', 6.0, False),
  'triangle':       ('Percussion', r'Triangle3-Hit_v2_rr1', 2.0, False),
  'claves':         ('Percussion', r'Claves1_Hit_v2_rr1', 0.5, False),
  'tambourine':     ('Percussion', r'Tamb1-Hit_v2_rr1', 1.0, False),
}

# The timpani files aren't named by note, and their pitch (inharmonic drums) fools detection by an octave.
TIMPANI = {'Timpani1': 42, 'Timpani2': 47, 'Timpani3': 49, 'Timpani4': 52, 'Timpani5': 54}

NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
def named_midi(fn):
  m = re.search(r'(?:^|_)([A-G])(#|b)?(-?\d)(?=_|\.wav)', fn)
  if not m: return None
  return 12 * (int(m.group(3)) + 1) + NOTE[m.group(1)] + (1 if m.group(2) == '#' else -1 if m.group(2) == 'b' else 0)

def layer(fn):
  m = re.search(r'_v(\d+)', fn)
  return int(m.group(1)) if m else 1

def detect(x, sr):
  """Fundamental by harmonic product spectrum over the steady part of the note."""
  seg = x[int(0.15 * sr): int(0.15 * sr) + 16384]
  if len(seg) < 4096: seg = x[:16384]
  seg = seg * np.hanning(len(seg))
  n = 1 << 17
  spec = np.abs(np.fft.rfft(seg, n))
  hps = spec.copy()
  for h in (2, 3, 4):
    d = spec[::h]
    hps[:len(d)] *= d
  lo, hi = int(25 * n / sr), int(2500 * n / sr)
  k = lo + int(np.argmax(hps[lo:hi]))
  return 69 + 12 * np.log2(k * sr / n / 440)

def tree():
  path = os.path.join(CACHE, 'tree.json')
  if not os.path.exists(path):
    with urllib.request.urlopen('https://api.github.com/repos/sgossner/VSCO-2-CE/git/trees/master?recursive=1') as r: open(path, 'wb').write(r.read())
  return [t['path'] for t in json.load(open(path))['tree'] if t['type'] == 'blob' and t['path'].endswith('.wav')]

def fetch(p):
  dst = os.path.join(CACHE, p)
  if not os.path.exists(dst):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    urllib.request.urlretrieve(RAW + urllib.parse.quote(p), dst)
  return dst

def main():
  os.makedirs(CACHE, exist_ok=True)
  files = tree()
  jobs = {}
  for name, (folder, filt, secs, pitched) in PICK.items():
    chosen = [p for p in files if os.path.dirname(p).startswith(folder) and (pitched or os.path.dirname(p) == folder) and re.search(filt, os.path.basename(p)) and '/temp/' not in p and 'Rolls' not in p]
    if pitched:
      # Keep the softest and the loudest layer of each note.
      by = defaultdict(list)
      for p in chosen: by[named_midi(os.path.basename(p)) or os.path.basename(p)].append(p)
      chosen = []
      for ps in by.values():
        ps.sort(key=lambda p: layer(os.path.basename(p)))
        chosen += [ps[0]] + ([ps[-1]] if len(ps) > 1 else [])
    jobs[name] = chosen
  allp = sorted({p for ps in jobs.values() for p in ps})
  print(f'{len(allp)} files')
  with ThreadPoolExecutor(16) as ex: list(ex.map(fetch, allp))

  index = {}
  for name, ps in jobs.items():
    folder, filt, secs, pitched = PICK[name]
    loaded = []
    for p in ps:
      x, sr = sf.read(os.path.join(CACHE, p), always_2d=True)
      x = x.mean(axis=1)
      loaded.append((p, x, sr))
    offset = 0
    if pitched:
      diffs = Counter()
      for p, x, sr in loaded:
        nm = named_midi(os.path.basename(p))
        if nm is None: continue
        diffs[int(round((detect(x, sr) - nm) / 12)) * 12] += 1
      offset = diffs.most_common(1)[0][0] if diffs else 0
    os.makedirs(os.path.join(OUT, name), exist_ok=True)
    loudest = {}
    for p, x, sr in loaded:
      loudest[p] = float(np.max(np.abs(x)))
    top = max(loudest.values())
    entries = []
    layers = sorted({layer(os.path.basename(p)) for p, _, _ in loaded})
    for i, (p, x, sr) in enumerate(loaded):
      fn = os.path.basename(p)
      # Trim the silence before the note, keep `secs`, fade the end.
      thr = 0.02 * np.max(np.abs(x))
      start = max(0, int(np.argmax(np.abs(x) > thr)) - int(0.004 * sr))
      x = x[start: start + int(secs * sr)]
      fade = min(len(x), int(0.25 * sr))
      x[-fade:] *= np.linspace(1, 0, fade)
      nm = named_midi(fn)
      if name == 'timpani': nm, offset = TIMPANI[fn.split('_')[0]], 0
      midi = (nm + offset if nm is not None else int(round(detect(x, sr)))) if pitched else None
      vel = 'soft' if pitched and layer(fn) == layers[0] and len(layers) > 1 else 'loud'
      out = f'{name}/{i:02d}'
      sf.write(os.path.join(OUT, out + '.wav'), (x / top * 0.95).astype(np.float32), sr, subtype='PCM_16')
      entries.append({'file': out, 'midi': midi, 'vel': vel, 'gain': round(loudest[p] / top, 3), 'src': fn})
    index[name] = entries
    ms = sorted(e['midi'] for e in entries if e['midi'] is not None)
    print(f'{name:14} {len(entries):3} samples  offset {offset:+d}  range {ms[0] if ms else "-"}–{ms[-1] if ms else "-"}')
  json.dump(index, open(os.path.join(CACHE, 'catalog.json'), 'w'), indent=1)

main()
