// Generates the oak SVGs in public/assets/resources/ (oak.svg, oak-v0..2.svg): run from that folder with `bun ../../../art/resource-oaks.ts`. 100 units = 1 Blender unit, base y=0.
const OL = '#3a2448';
type C = [number, number, number];
const circ = (c: C, a = '') => `<circle cx="${c[0]}" cy="${c[1]}" r="${c[2]}"${a}/>`;
const ell = (x: number, y: number, rx: number, ry: number, a = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"${a}/>`;
const svg = (x: number, y: number, w: number, h: number, body: string) =>
  `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}">\n${body}\n</svg>\n`;
const filters = `<filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter>
<filter id="soft2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2"/></filter>
<filter id="soft1" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1"/></filter>`;
const shadow = (rx: number) => ell(0, 0, rx, 7, ` fill="#24461f" opacity=".25" filter="url(#soft2)"`);

interface Bark { light: string; mid: string; dark: string; groove: string; cut: string; ring: string; rim: string }
const OAKB: Bark = { light: '#9f6c46', mid: '#8d5d3c', dark: '#6f472e', groove: '#5a3a25', cut: '#efcf96', ring: '#cf9f62', rim: '#b98552' };
const PINEB: Bark = { light: '#87605a', mid: '#755049', dark: '#5c3c3a', groove: '#4a2f30', cut: '#ecd29e', ring: '#c9a068', rim: '#a8805a' };

const barkGrad = (b: Bark) => `<linearGradient id="bark" x1="0" x2="1"><stop offset="0" stop-color="${b.mid}"/><stop offset=".18" stop-color="${b.light}"/><stop offset=".5" stop-color="${b.light}"/><stop offset=".6" stop-color="${b.mid}"/><stop offset=".8" stop-color="${b.mid}"/><stop offset=".9" stop-color="${b.dark}"/></linearGradient>`;

// trunk: column path + root feet; grooves; cut line C.
interface Trunk { col: string; feet: [number, number, number, number][]; grooves: string[]; w: number; C: number; cw: number }
const trunkShapes = (t: Trunk) => `<path d="${t.col}"/>` + t.feet.map((f) => ell(...f)).join('');
function trunkParts(t: Trunk, b: Bark, top: number) {
  // returns [stumpGroup, topTrunkGroup]
  const shapes = trunkShapes(t);
  const body = (clip: string) => `<g clip-path="url(#${clip}o)" fill="${OL}" stroke="${OL}" stroke-width="5" stroke-linejoin="round">${shapes}</g><g clip-path="url(#${clip})">
<g fill="url(#bark)">${shapes}</g>
<g clip-path="url(#tk)">
<g fill="${b.dark}" opacity=".55">${t.feet.map((f) => ell(f[0] + f[2] * 0.25, f[1] + f[3] * 0.35, f[2] * 0.8, f[3] * 0.6)).join('')}</g>
<g fill="${b.light}" opacity=".5">${t.feet.map((f) => ell(f[0] - f[2] * 0.3, f[1] - f[3] * 0.35, f[2] * 0.55, f[3] * 0.4)).join('')}</g>
<g stroke="${b.groove}" stroke-width="2.6" stroke-linecap="round" fill="none" opacity=".55">${t.grooves.map((d) => `<path d="${d}"/>`).join('')}</g>
<rect x="-50" y="${top}" width="100" height="30" fill="#2a1a10" opacity=".45" filter="url(#soft)"/>
</g></g>`;
  const cut = `<g id="cut" display="none">${ell(0, t.C, t.cw + 1.2, t.w * 0.27, ` fill="${b.rim}" stroke="${OL}" stroke-width="2.2"`)}${ell(-0.5, t.C - 0.6, t.cw - 0.8, t.w * 0.27 - 1.6, ` fill="${b.cut}"`)}<g fill="none" stroke="${b.ring}" stroke-width="1.4">${ell(0, t.C - 0.4, t.w * 0.62, t.w * 0.17)}${ell(0.5, t.C - 0.2, t.w * 0.3, t.w * 0.08)}</g></g>`;
  const lid = `<path d="M${-t.cw - 2.5} ${t.C}H${t.cw + 2.5}" stroke="${OL}" stroke-width="5"/>`;
  return [`<g id="stump">${body('cs')}${cut}</g>`, lid + body('ct')];
}
const trunkDefs = (t: Trunk, top: number) => `<clipPath id="tk">${trunkShapes(t)}</clipPath>
<clipPath id="cs"><rect x="-100" y="${t.C - 2}" width="200" height="40"/></clipPath>
<clipPath id="cso"><rect x="-100" y="${t.C}" width="200" height="40"/></clipPath>
<clipPath id="ct"><rect x="-100" y="${top - 20}" width="200" height="${t.C - top + 20}"/></clipPath>
<clipPath id="cto"><rect x="-100" y="${top - 20}" width="200" height="${t.C - top + 20}"/></clipPath>`;

const oakTrunk: Trunk = {
  col: 'M-17.5 -92 L-17.5 -24 C-17.5 -10 -21 -4 -29 0 L29 0 C21 -4 17.5 -10 17.5 -24 L17.5 -92 Z',
  feet: [[27, -6, 7, 3.5], [-26, -2, 9, 4.5], [25, -2, 9, 4.5]],
  grooves: ['M-10 -86 L-10 -26 Q-10 -14 -14 -6', 'M-2 -82 L-2 -6', 'M7 -86 L7 -26 Q7 -14 11 -6', 'M13 -68 L13 -22'],
  w: 19.5, C: -30, cw: 17.5,
};
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const f1 = (n: number) => Math.round(n * 10) / 10;
// scalloped blob: points on a lumpy circle joined by outward-bulging arcs of varied size
function blob([cx, cy, r]: C) {
  const n = Math.max(7, Math.round((2 * Math.PI * r) / 23));
  const a0 = rnd() * 6.28;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + ((i + (rnd() - 0.5) * 0.7) / n) * 2 * Math.PI;
    const rr = r * (0.94 + rnd() * 0.05) + Math.sin(a * 2 + seed) * r * 0.025;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n];
    const ar = Math.hypot(x1 - x0, y1 - y0) * (0.62 + rnd() * 0.3);
    d += `A${f1(ar)} ${f1(ar)} 0 0 1 ${f1(x1)} ${f1(y1)}`;
  }
  return d + 'Z';
}
const paths = (ds: string[], a = '') => ds.map((d) => `<path d="${d}"${a}/>`).join('');

// ---------- OAKS ----------
// One canopy, no clump shapes inside it: the scalloped silhouette is filled once, lit from the top left, and its cel
// bands follow the silhouette (a darker rim low and to the right, a sunlit patch high and to the left), with a few
// little leaf marks. The map's scenery oaks are variants: other shapes, greens and apples, so a wood isn't stamped.
interface Oak { clumps: C[]; seed: number; greens: string[]; dark: string; light: string; apples: [number, number][]; leaves: [number, number, number, boolean][]; trunkTop: number }
const BASE = ['#78d36c', '#6cc963', '#5dbb58', '#52af50', '#45a049', '#3a9043', '#31803c'];
function oakSvg(o: Oak, file: string, chop: boolean) {
  seed = o.seed;
  const P = o.clumps.map(blob);
  const ys = o.clumps.map(([, y, r]) => y - r), top = Math.min(...ys), xs = o.clumps.flatMap(([x, , r]) => [x - r, x + r]);
  const [l, r] = [Math.min(...xs), Math.max(...xs)], cx = (l + r) / 2, w = r - l;
  const stops = [0, 0.3, 0.4, 0.58, 0.68, 0.85, 1].map((t, i) => `<stop offset="${t}" stop-color="${o.greens[i]}"/>`).join('');
  const [stump, topTrunk] = trunkParts(oakTrunk, OAKB, o.trunkTop);
  const body = `<defs>
<radialGradient id="lit" gradientUnits="userSpaceOnUse" cx="${f1(l + w * 0.3)}" cy="${f1(top + 14)}" r="${f1(w * 0.85)}">${stops}</radialGradient>
<linearGradient id="under" gradientUnits="userSpaceOnUse" x1="0" y1="${o.trunkTop - 26}" x2="0" y2="${o.trunkTop + 24}"><stop offset="0" stop-color="#1c5a2e" stop-opacity="0"/><stop offset="1" stop-color="#1c5a2e" stop-opacity=".35"/></linearGradient>
${barkGrad(OAKB)}
${filters}
<filter id="cel" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation=".8"/></filter>
<clipPath id="cc">${paths(P)}</clipPath>
${trunkDefs(oakTrunk, o.trunkTop)}
</defs>
<g id="top">
${topTrunk}
<g fill="${OL}" stroke="${OL}" stroke-width="5" stroke-linejoin="round">${paths(P)}</g>
<g clip-path="url(#cc)">
<rect x="-120" y="-260" width="240" height="260" fill="${o.dark}"/>
<g filter="url(#cel)" fill="url(#lit)" transform="translate(-6 -9)">${paths(P)}</g>
<g filter="url(#soft)" fill="${o.light}" opacity=".45" transform="translate(${f1(l + w * 0.32)} ${f1(top + 16)}) scale(.45) translate(${f1(-cx)} ${f1(-top - 40)})">${paths(P)}</g>
<rect x="-120" y="${o.trunkTop - 26}" width="240" height="60" fill="url(#under)"/>
<g fill="none" stroke-linecap="round" stroke-width="2.1">
${o.leaves.map(([x, y, s, lit]) => `<path d="M${x} ${y}q${f1(3 * s)} ${f1(3.4 * s)} ${f1(6 * s)} 0q${f1(3 * s)} ${f1(3.4 * s)} ${f1(6 * s)} 0" stroke="${lit ? o.light : o.dark}" opacity="${lit ? 0.6 : 0.55}"/>`).join('')}
</g>
</g>
<g stroke="${OL}" stroke-width="1.4" fill="#e8474a">${o.apples.map(([x, y]) => circ([x, y, 6])).join('')}</g>
<g fill="#c22f3d">${o.apples.map(([x, y]) => `<path d="M${x - 5.4} ${y + 1.5}a6 6 0 0 0 10.8 0a6 4 0 0 1-10.8 0Z"/>`).join('')}</g>
<g fill="#ffd0c8">${o.apples.map(([x, y]) => circ([x - 2, y - 2.2, 1.5])).join('')}</g>
</g>
${chop ? stump : stump.replace('<g id="stump">', '<g>')}`;
  return Bun.write(file, svg(-96, -222, 192, 232, body));
}
const LEAVES: [number, number, number, boolean][] = [[-44, -150, 1, true], [-22, -182, 1, true], [-6, -160, 0.9, true], [-58, -122, 0.8, true], [26, -160, 0.9, false], [46, -128, 1, false], [8, -114, 0.9, false], [-30, -110, 0.9, false], [54, -102, 0.8, false]];
// The gatherable oak (also the chop close-up), with its apples.
await oakSvg({ seed: 7, trunkTop: -98, greens: BASE, dark: '#2f7d3a', light: '#8fe07e', leaves: LEAVES,
  clumps: [[0, -164, 44], [-50, -124, 37], [50, -124, 37], [-32, -139, 31], [37, -142, 28], [2, -146, 23], [-25, -99, 27], [28, -106, 25], [2, -100, 24]],
  apples: [[12, -147], [-11, -129], [38, -117], [-12, -107], [15, -100], [-36, -88]] }, 'oak.svg', true);
// Scenery oaks: rounder and darker, taller and sunnier, lopsided and cooler.
await oakSvg({ seed: 101, trunkTop: -92, greens: ['#6ccb68', '#60c05e', '#52b154', '#47a54c', '#3b9545', '#31853e', '#287437'], dark: '#276f34', light: '#82d878', leaves: LEAVES,
  clumps: [[0, -156, 46], [-54, -118, 36], [54, -118, 36], [-30, -132, 32], [32, -134, 32], [-22, -96, 28], [24, -98, 28], [0, -104, 30]],
  apples: [] }, 'oak-v0.svg', false);
await oakSvg({ seed: 202, trunkTop: -104, greens: ['#8fd66a', '#82cc5f', '#72bf55', '#66b34e', '#58a347', '#4b9240', '#3f8139'], dark: '#3d7d33', light: '#a8e680', leaves: LEAVES.map(([x, y, s, lit]) => [x * 0.85, y - 8, s, lit] as [number, number, number, boolean]),
  clumps: [[0, -180, 36], [-36, -146, 32], [38, -148, 30], [-6, -150, 28], [-40, -112, 26], [40, -114, 26], [0, -108, 30], [-14, -126, 22]],
  apples: [[16, -160], [-20, -136], [24, -118]] }, 'oak-v1.svg', false);
await oakSvg({ seed: 303, trunkTop: -96, greens: ['#6ccf78', '#5fc46e', '#51b464', '#46a85b', '#3a9852', '#30874a', '#287642'], dark: '#256e3c', light: '#88dd8e', leaves: LEAVES.map(([x, y, s, lit]) => [x - 6, y, s, lit] as [number, number, number, boolean]),
  clumps: [[-14, -166, 42], [-58, -128, 34], [40, -126, 32], [-36, -146, 30], [20, -150, 26], [-32, -102, 28], [22, -104, 26], [-4, -104, 26]],
  apples: [[-30, -150], [8, -118]] }, 'oak-v2.svg', false);
