// Hand-drawn SVG art in the game's toon style: purple-ink outlines and a soft cel shade from the top left.
// Every drawing is a string of SVG with its origin at the feet (or centre), and named parts (data-p) to animate.

export const INK = '#3a2448';
export const SKIN = '#ffe2c8';
const HAIR = '#8a5a3a';

// Shared gradients, collected while drawing and written once into the page's <defs>.
const defs = new Map();
export const defsMarkup = () => [...defs.values()].join('');

function mix(a, b, k) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, '0')).join('');
}

/** A cel-shaded fill: lit top-left, a crisp darker crescent at the bottom right. */
export function toon(hex) {
  const id = 'tn' + hex.slice(1);
  if (!defs.has(id)) {
    defs.set(id, `<radialGradient id="${id}" cx=".36" cy=".3" r=".85" fx=".3" fy=".22">` +
      `<stop offset="0" stop-color="${mix(hex, '#ffffff', 0.22)}"/><stop offset=".45" stop-color="${hex}"/>` +
      `<stop offset=".7" stop-color="${hex}"/><stop offset=".72" stop-color="${mix(hex, INK, 0.2)}"/>` +
      `<stop offset="1" stop-color="${mix(hex, INK, 0.3)}"/></radialGradient>`);
  }
  return `url(#${id})`;
}

/** A soft glow fill for fire, lava and light. */
export function glow(id, stops) {
  if (!defs.has(id)) defs.set(id, `<radialGradient id="${id}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</radialGradient>`);
  return `url(#${id})`;
}

const O = (w = 5) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const shadow = (rx, ry = rx * 0.2) => `<ellipse cx="0" cy="0" rx="${rx}" ry="${ry}" fill="#1c3a18" opacity=".22"/>`;

// --- Tools, drawn from the grip along +x ------------------------------------------------------------------
export const TOOLS = {
  axe: `<rect x="-14" y="-6" width="126" height="12" rx="6" fill="${toon('#a8744a')}" ${O(4)}/>
    <path d="M86 -10 C88 -34 112 -44 128 -40 C122 -22 124 4 132 20 C114 24 92 14 88 -2 Z" fill="${toon('#c9d3e0')}" ${O(4)}/>
    <path d="M124 -36 C119 -20 120 4 128 16" stroke="#ffffff" stroke-width="4" fill="none" opacity=".8"/>`,
  pick: `<rect x="-14" y="-6" width="124" height="12" rx="6" fill="${toon('#a8744a')}" ${O(4)}/>
    <path d="M100 -6 C82 -44 54 -58 30 -62 C58 -44 72 -26 84 0 L100 10 C116 -16 132 -36 160 -46 C136 -48 112 -34 100 -6Z" fill="${toon('#aab4c8')}" ${O(4)}/>`,
  sword: `<rect x="-16" y="-7" width="34" height="14" rx="6" fill="${toon('#7a4a2e')}" ${O(4)}/>
    <rect x="16" y="-22" width="12" height="44" rx="5" fill="${toon('#ffd35a')}" ${O(4)}/>
    <path d="M28 -11 L150 -11 L176 0 L150 11 L28 11 Z" fill="${toon('#f2a35e')}" ${O(4)}/>
    <path d="M34 -3 L150 -3" stroke="#fff3d8" stroke-width="4" opacity=".85"/>`,
  hammer: `<rect x="-14" y="-6" width="110" height="12" rx="6" fill="${toon('#a8744a')}" ${O(4)}/>
    <rect x="80" y="-34" width="44" height="68" rx="8" fill="${toon('#7d8496')}" ${O(4)}/>
    <rect x="86" y="-28" width="10" height="56" rx="4" fill="#ffffff" opacity=".35"/>`,
  can: `<path d="M-20 -30 L40 -30 L44 30 L-24 30 Z" fill="${toon('#5fb3e8')}" ${O(4)}/>
    <path d="M40 -10 L96 -44 L102 -36 L44 6 Z" fill="${toon('#5fb3e8')}" ${O(4)}/>
    <ellipse cx="100" cy="-41" rx="9" ry="12" transform="rotate(-30 100 -41)" fill="#cfe9fb" ${O(4)}/>
    <path d="M-16 -30 C-14 -58 30 -58 34 -30" fill="none" ${O(8)}/><path d="M-16 -30 C-14 -58 30 -58 34 -30" fill="none" stroke="#5fb3e8" stroke-width="3"/>`,
};

// --- The hero --------------------------------------------------------------------------------------------
/** The chibi hero with a leaf sprout. Parts: body, head, armL, armR (holds `tool`), face. */
export function hero({ armor = 'tunic', tool = null, face = 'happy', toolOnLeft = false } = {}) {
  const body = armor === 'copper' ? '#ec9550' : '#6fa8ff';
  const trim = armor === 'copper' ? '#8a5a3a' : '#b98a5a';
  const sleeve = armor === 'copper' ? '#d47a3a' : '#5d95ec';
  const arm = (side, withTool) => `
    <g transform="translate(${44 * side} -86)"><g data-p="arm${side < 0 ? 'L' : 'R'}">
      ${withTool ? `<g transform="translate(${2 * side} 40)"><g data-p="tool">${TOOLS[withTool]}</g></g>` : ''}
      <path d="M${-9 * side} -4 C${-16 * side} 12 ${-14 * side} 28 ${-8 * side} 38 L${10 * side} 36 C${12 * side} 24 ${11 * side} 10 ${8 * side} -4 Z" fill="${toon(sleeve)}" ${O(5)}/>
      <circle cx="${1 * side}" cy="41" r="12" fill="${toon(SKIN)}" ${O(4.5)}/>
    </g></g>`;
  const armorBits = armor === 'copper' ? `
      <path d="M-44 -66 Q0 -54 44 -66" fill="none" stroke="#b5642c" stroke-width="4"/>
      <circle cx="-30" cy="-58" r="3.5" fill="#ffd35a" ${O(2)}/><circle cx="30" cy="-58" r="3.5" fill="#ffd35a" ${O(2)}/>
      <ellipse cx="-50" cy="-90" rx="24" ry="16" fill="${toon('#f2a35e')}" ${O(4.5)}/>
      <ellipse cx="50" cy="-90" rx="24" ry="16" fill="${toon('#f2a35e')}" ${O(4.5)}/>` : '';
  return `<g data-p="hero">${shadow(58)}
  <g data-p="body">
    <ellipse cx="-21" cy="-10" rx="20" ry="13" fill="${toon('#6b4838')}" ${O(5)}/>
    <ellipse cx="21" cy="-10" rx="20" ry="13" fill="${toon('#6b4838')}" ${O(5)}/>
    ${arm(-1, toolOnLeft ? tool : null)}
    <path d="M-40 -98 C-52 -72 -58 -42 -54 -24 Q-52 -14 -38 -14 L38 -14 Q52 -14 54 -24 C58 -42 52 -72 40 -98 Z" fill="${toon(body)}" ${O(5)}/>
    <path d="M-55 -42 Q0 -32 55 -42 L54 -30 Q0 -20 -54 -30 Z" fill="${trim}" ${O(3.5)}/>
    <rect x="-9" y="-41" width="18" height="15" rx="3" fill="#ffd35a" ${O(3)}/>
    ${armorBits}
    <path d="M-42 -102 Q0 -84 42 -102 Q47 -92 40 -86 Q0 -72 -40 -86 Q-47 -92 -42 -102Z" fill="${toon('#e8474a')}" ${O(4.5)}/>
    <path d="M18 -86 Q30 -70 22 -52 L8 -56 Q14 -70 6 -82Z" fill="${toon('#e8474a')}" ${O(4)}/>
    ${arm(1, toolOnLeft ? null : tool)}
    <g transform="translate(0 -100)"><g data-p="head">
      <g transform="translate(0 -112)"><g data-p="sprout">
        <path d="M0 6 C1 -6 -1 -14 1 -24" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>
        <path d="M0 6 C1 -6 -1 -14 1 -24" fill="none" stroke="#4a9a3a" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M0 -22 C-6 -42 -32 -46 -42 -34 C-32 -20 -12 -16 0 -22Z" fill="${toon('#7ad85a')}" ${O(4.5)}/>
        <path d="M2 -22 C8 -42 34 -46 44 -34 C34 -20 14 -16 2 -22Z" fill="${toon('#7ad85a')}" ${O(4.5)}/>
      </g></g>
      <circle cx="0" cy="-56" r="66" fill="${toon(HAIR)}" ${O(5.5)}/>
      <ellipse cx="0" cy="-42" rx="56" ry="50" fill="${toon(SKIN)}"/>
      <path d="M-62 -48 C-66 -100 -32 -120 0 -120 C32 -120 66 -100 62 -48 C56 -62 46 -72 34 -74 C28 -62 14 -60 4 -68 C-6 -58 -20 -60 -28 -70 C-38 -66 -52 -60 -62 -48Z" fill="${toon(HAIR)}"/>
      <path d="M-62 -48 C-56 -60 -38 -66 -28 -70 C-20 -60 -6 -58 4 -68 C14 -60 28 -62 34 -74 C46 -72 56 -62 62 -48" fill="none" ${O(4)}/>
      <g data-p="face">${heroFace(face)}</g>
    </g></g>
  </g></g>`;
}

/** Faces share eyes at (+/-19, -36) on the hero's head. */
export function heroFace(face) {
  const blush = `<ellipse cx="-36" cy="-18" rx="10" ry="5.5" fill="#ff8fa0" opacity=".65"/><ellipse cx="36" cy="-18" rx="10" ry="5.5" fill="#ff8fa0" opacity=".65"/>`;
  const eyes = `<ellipse cx="-19" cy="-36" rx="7.5" ry="10" fill="#302536"/><ellipse cx="19" cy="-36" rx="7.5" ry="10" fill="#302536"/>
    <circle cx="-21.5" cy="-40" r="3.2" fill="#fff"/><circle cx="16.5" cy="-40" r="3.2" fill="#fff"/>
    <circle cx="-16" cy="-32" r="1.6" fill="#fff"/><circle cx="22" cy="-32" r="1.6" fill="#fff"/>`;
  switch (face) {
    case 'determined': return `${eyes}<path d="M-32 -54 L-9 -48 M32 -54 L9 -48" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
      <path d="M-8 -16 Q0 -20 8 -16" fill="none" ${O(4)}/>${blush}`;
    case 'shout': return `${eyes}<path d="M-32 -54 L-9 -48 M32 -54 L9 -48" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
      <path d="M-12 -20 Q0 -24 12 -20 Q10 -2 0 -2 Q-10 -2 -12 -20Z" fill="#8a2a3a" ${O(3.5)}/>${blush}`;
    case 'shock': return `<circle cx="-19" cy="-36" r="9" fill="#fff" ${O(3.5)}/><circle cx="19" cy="-36" r="9" fill="#fff" ${O(3.5)}/>
      <circle cx="-19" cy="-36" r="3.5" fill="#302536"/><circle cx="19" cy="-36" r="3.5" fill="#302536"/>
      <ellipse cx="0" cy="-12" rx="7" ry="9" fill="#8a2a3a" ${O(3.5)}/>${blush}`;
    case 'smug': return `<path d="M-28 -36 Q-19 -30 -10 -36" fill="none" ${O(5)}/><path d="M10 -36 Q19 -30 28 -36" fill="none" ${O(5)}/>
      <path d="M-10 -18 Q2 -10 12 -20" fill="none" ${O(4)}/>${blush}`;
    case 'cool': return `<path d="M-46 -46 L46 -46 L42 -34 Q34 -20 18 -24 Q8 -26 4 -38 L-4 -38 Q-8 -26 -18 -24 Q-34 -20 -42 -34 Z" fill="#241a2c" ${O(3)}/>
      <path d="M-36 -42 L-26 -42 M10 -42 L20 -42" stroke="#9fd4ff" stroke-width="4" stroke-linecap="round"/>
      <path d="M-8 -14 Q2 -8 12 -16" fill="none" ${O(4)}/>${blush}`;
    case 'joy': return `<path d="M-28 -34 Q-19 -46 -10 -34" fill="none" ${O(5)}/><path d="M10 -34 Q19 -46 28 -34" fill="none" ${O(5)}/>
      <path d="M-12 -20 Q0 -22 12 -20 Q10 -4 0 -4 Q-10 -4 -12 -20Z" fill="#8a2a3a" ${O(3.5)}/>${blush}`;
    default: return `${eyes}<path d="M-7 -18 Q0 -11 7 -18" fill="none" ${O(4)}/>${blush}`;
  }
}

// --- Monsters --------------------------------------------------------------------------------------------
export function slime({ angry = false, color = '#55c46c' } = {}) {
  return `<g data-p="slime">${shadow(70, 12)}<g data-p="blob">
    <path d="M-74 -4 C-82 -52 -46 -106 0 -106 C46 -106 82 -52 74 -4 C42 6 -42 6 -74 -4Z" fill="${toon(color)}" ${O(5.5)}/>
    <ellipse cx="-34" cy="-74" rx="15" ry="8" transform="rotate(-32 -34 -74)" fill="#fff" opacity=".8"/>
    <circle cx="-14" cy="-88" r="4" fill="#fff" opacity=".7"/>
    <ellipse cx="-22" cy="-42" rx="6.5" ry="8.5" fill="#302536"/><ellipse cx="22" cy="-42" rx="6.5" ry="8.5" fill="#302536"/>
    <circle cx="-24" cy="-45" r="2.6" fill="#fff"/><circle cx="20" cy="-45" r="2.6" fill="#fff"/>
    ${angry ? `<path d="M-36 -62 L-12 -54 M36 -62 L12 -54" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
      <path d="M-9 -22 Q0 -30 9 -22" fill="none" ${O(4)}/>` : `<path d="M-6 -26 Q0 -20 6 -26" fill="none" ${O(3.5)}/>`}
    <ellipse cx="-40" cy="-28" rx="9" ry="5" fill="#ff8fa0" opacity=".6"/><ellipse cx="40" cy="-28" rx="9" ry="5" fill="#ff8fa0" opacity=".6"/>
  </g></g>`;
}

/** The Emberwyrm: a chubby red dragon. `roar` opens the mouth; `eyes` can glow. */
export function dragon({ roar = false } = {}) {
  const wing = (s) => `<path d="M${40 * s} -250 C${120 * s} -330 ${210 * s} -380 ${300 * s} -400 L${290 * s} -330 L${330 * s} -300 L${280 * s} -250 L${310 * s} -200 L${240 * s} -190 L${250 * s} -140 L${170 * s} -160 C${120 * s} -170 ${70 * s} -190 ${40 * s} -210 Z" fill="${toon('#8f2f4c')}" ${O(6)}/>
    <path d="M${60 * s} -236 L${290 * s} -380 M${70 * s} -220 L${300 * s} -300 M${70 * s} -205 L${280 * s} -205" stroke="#6a1f38" stroke-width="5" stroke-linecap="round"/>`;
  return `<g data-p="dragon">${shadow(170, 26)}
    <g data-p="wingL">${wing(-1)}</g><g data-p="wingR">${wing(1)}</g>
    <path d="M110 -40 C200 -30 250 -80 240 -150 C270 -120 280 -40 210 -10 C180 0 140 -4 110 -14Z" fill="${toon('#d24a42')}" ${O(6)}/>
    <path d="M232 -146 L262 -176 L256 -128Z" fill="${toon('#f2d6a8')}" ${O(5)}/>
    <ellipse cx="0" cy="-130" rx="140" ry="135" fill="${toon('#d24a42')}" ${O(6)}/>
    <ellipse cx="6" cy="-104" rx="86" ry="96" fill="${toon('#f3cd8c')}" ${O(5)}/>
    <path d="M-70 -150 Q6 -136 80 -150 M-80 -116 Q6 -100 90 -116 M-80 -80 Q6 -64 88 -80 M-66 -46 Q6 -32 74 -46" fill="none" stroke="#d99a55" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="-80" cy="-12" rx="46" ry="26" fill="${toon('#c23f3a')}" ${O(5.5)}/><ellipse cx="80" cy="-12" rx="46" ry="26" fill="${toon('#c23f3a')}" ${O(5.5)}/>
    <path d="M-110 -4 l6 -14 l6 14 M-94 -2 l6 -14 l6 14 M74 -2 l6 -14 l6 14 M90 -4 l6 -14 l6 14" fill="#fff" ${O(3)}/>
    <ellipse cx="-120" cy="-150" rx="30" ry="40" transform="rotate(30 -120 -150)" fill="${toon('#c23f3a')}" ${O(5)}/>
    <ellipse cx="120" cy="-150" rx="30" ry="40" transform="rotate(-30 120 -150)" fill="${toon('#c23f3a')}" ${O(5)}/>
    <g transform="translate(0 -300)"><g data-p="head">
      <path d="M-70 -70 C-80 -110 -92 -140 -76 -160 C-60 -130 -44 -104 -36 -84Z" fill="${toon('#f2d6a8')}" ${O(5)}/>
      <path d="M70 -70 C80 -110 92 -140 76 -160 C60 -130 44 -104 36 -84Z" fill="${toon('#f2d6a8')}" ${O(5)}/>
      <ellipse cx="0" cy="0" rx="112" ry="98" fill="${toon('#d24a42')}" ${O(6)}/>
      <path d="M-30 -92 L-18 -116 L-6 -94 M6 -94 L18 -118 L30 -92" fill="${toon('#f2d6a8')}" ${O(4)}/>
      <ellipse cx="0" cy="40" rx="74" ry="46" fill="${toon('#e05a4e')}" ${O(5)}/>
      <ellipse cx="-22" cy="26" rx="7" ry="9" fill="#5a1a22"/><ellipse cx="22" cy="26" rx="7" ry="9" fill="#5a1a22"/>
      <g data-p="eyes">
        <ellipse cx="-52" cy="-20" rx="19" ry="23" fill="#fff4c8" ${O(4.5)}/><ellipse cx="52" cy="-20" rx="19" ry="23" fill="#fff4c8" ${O(4.5)}/>
        <ellipse cx="-50" cy="-18" rx="7" ry="16" fill="#2a1420"/><ellipse cx="50" cy="-18" rx="7" ry="16" fill="#2a1420"/>
        <circle cx="-55" cy="-28" r="4" fill="#fff"/><circle cx="45" cy="-28" r="4" fill="#fff"/>
        <path d="M-82 -52 L-30 -36 M82 -52 L30 -36" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>
      </g>
      ${roar ? `<path d="M-58 56 Q0 40 58 56 Q52 128 0 132 Q-52 128 -58 56Z" fill="#5a1222" ${O(5)}/>
        <path d="M-34 108 Q0 92 34 108 Q24 126 0 128 Q-24 126 -34 108Z" fill="#e8607a"/>
        <path d="M-48 56 l10 22 l10 -20 M28 54 l10 22 l10 -22" fill="#fff" ${O(3)}/>` :
        `<path d="M-30 64 Q0 80 30 64" fill="none" ${O(5)}/>`}
      <ellipse cx="-82" cy="34" rx="14" ry="8" fill="#ff8fa0" opacity=".6"/><ellipse cx="82" cy="34" rx="14" ry="8" fill="#ff8fa0" opacity=".6"/>
    </g></g>
  </g>`;
}

// --- Villagers -------------------------------------------------------------------------------------------
function smallHead({ hair, extra = '', back = '', face = 'happy' }) {
  const eyes = face === 'joy'
    ? `<path d="M-26 -30 Q-18 -40 -10 -30" fill="none" ${O(4.5)}/><path d="M10 -30 Q18 -40 26 -30" fill="none" ${O(4.5)}/>`
    : `<ellipse cx="-17" cy="-32" rx="6.5" ry="8.5" fill="#302536"/><ellipse cx="17" cy="-32" rx="6.5" ry="8.5" fill="#302536"/>
       <circle cx="-19" cy="-35" r="2.6" fill="#fff"/><circle cx="15" cy="-35" r="2.6" fill="#fff"/>`;
  return `${back}<circle cx="0" cy="-50" r="58" fill="${toon(hair)}" ${O(5)}/>
    <ellipse cx="0" cy="-36" rx="50" ry="44" fill="${toon(SKIN)}"/>
    ${extra}${eyes}
    <path d="M-7 -14 Q0 -7 7 -14" fill="none" ${O(3.5)}/>
    <ellipse cx="-32" cy="-16" rx="9" ry="5" fill="#ff8fa0" opacity=".65"/><ellipse cx="32" cy="-16" rx="9" ry="5" fill="#ff8fa0" opacity=".65"/>`;
}

/** Mr. Floppers, Poppy's blue plush bunny (origin at his feet, ~110 tall). */
export function floppers() {
  return `<g data-p="floppers">
    <ellipse cx="-14" cy="-118" rx="10" ry="30" transform="rotate(-14 -14 -118)" fill="${toon('#7aa6ec')}" ${O(4)}/>
    <ellipse cx="-14" cy="-116" rx="4.5" ry="20" transform="rotate(-14 -14 -116)" fill="#ffc0d0"/>
    <ellipse cx="30" cy="-96" rx="10" ry="30" transform="rotate(62 30 -96)" fill="${toon('#7aa6ec')}" ${O(4)}/>
    <ellipse cx="-22" cy="-8" rx="14" ry="9" fill="${toon('#6a94da')}" ${O(4)}/><ellipse cx="22" cy="-8" rx="14" ry="9" fill="${toon('#6a94da')}" ${O(4)}/>
    <ellipse cx="0" cy="-34" rx="30" ry="28" fill="${toon('#7aa6ec')}" ${O(4.5)}/>
    <ellipse cx="0" cy="-30" rx="15" ry="14" fill="#cfe0ff"/>
    <ellipse cx="-30" cy="-40" rx="10" ry="8" fill="${toon('#7aa6ec')}" ${O(4)}/><ellipse cx="30" cy="-40" rx="10" ry="8" fill="${toon('#7aa6ec')}" ${O(4)}/>
    <circle cx="0" cy="-76" r="30" fill="${toon('#7aa6ec')}" ${O(4.5)}/>
    <circle cx="-11" cy="-80" r="4.5" fill="#241a2c"/><circle cx="11" cy="-80" r="4.5" fill="#241a2c"/>
    <circle cx="-12.5" cy="-81.5" r="1.4" fill="#fff"/><circle cx="9.5" cy="-81.5" r="1.4" fill="#fff"/>
    <path d="M-4 -70 L4 -70 L0 -65Z" fill="#ff8fb0"/>
    <path d="M-6 -61 Q0 -57 6 -61" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M18 -58 l4 4 M22 -58 l-4 4" stroke="#4a5f9a" stroke-width="2"/>
  </g>`;
}

/** Poppy, in her yellow dress; optionally hugging Mr. Floppers. */
export function poppy({ hug = true, face = 'happy' } = {}) {
  const flower = `<g transform="translate(-34 -96)">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-9" rx="7" ry="9" transform="rotate(${a})" fill="#fff" ${O(2.5)}/>`).join('')}<circle r="6" fill="#ffd23f" ${O(2.5)}/></g>`;
  return `<g data-p="poppy">${shadow(48)}<g data-p="body">
    <ellipse cx="-16" cy="-8" rx="15" ry="10" fill="${toon('#c0503a')}" ${O(4.5)}/><ellipse cx="16" cy="-8" rx="15" ry="10" fill="${toon('#c0503a')}" ${O(4.5)}/>
    <path d="M-30 -84 C-42 -60 -54 -32 -52 -18 Q-50 -10 -36 -10 L36 -10 Q50 -10 52 -18 C54 -32 42 -60 30 -84 Z" fill="${toon('#ffd23f')}" ${O(5)}/>
    <path d="M-24 -84 Q0 -70 24 -84 L18 -74 Q0 -66 -18 -74Z" fill="#fff" ${O(3)}/>
    ${hug ? `<g transform="translate(0 -14) scale(.62)">${floppers()}</g>
      <circle cx="-30" cy="-50" r="10" fill="${toon(SKIN)}" ${O(4)}/><circle cx="30" cy="-50" r="10" fill="${toon(SKIN)}" ${O(4)}/>` :
      `<g transform="translate(-36 -76)"><g data-p="armL"><path d="M-6 -2 C-12 10 -12 22 -8 30 L6 30 C8 20 8 8 6 -2Z" fill="${toon('#ffd23f')}" ${O(4)}/><circle cx="-1" cy="33" r="10" fill="${toon(SKIN)}" ${O(4)}/></g></g>
       <g transform="translate(36 -76)"><g data-p="armR"><path d="M6 -2 C12 10 12 22 8 30 L-6 30 C-8 20 -8 8 -6 -2Z" fill="${toon('#ffd23f')}" ${O(4)}/><circle cx="1" cy="33" r="10" fill="${toon(SKIN)}" ${O(4)}/></g></g>`}
    <g transform="translate(0 -88)"><g data-p="head">
      ${smallHead({ hair: '#c8642e', face, back: `<circle cx="-56" cy="-46" r="22" fill="${toon('#c8642e')}" ${O(4.5)}/><circle cx="56" cy="-46" r="22" fill="${toon('#c8642e')}" ${O(4.5)}/>`,
        extra: `<path d="M-54 -42 C-58 -90 -30 -106 0 -106 C30 -106 58 -90 54 -42 C46 -58 34 -62 22 -64 C14 -54 0 -54 -8 -62 C-18 -54 -32 -56 -38 -64 C-46 -60 -50 -52 -54 -42Z" fill="${toon('#c8642e')}" ${O(3.5)}/>${flower}` })}
    </g></g>
  </g></g>`;
}

/** Bram the bearded lumberjack, in his green beanie and red plaid. */
export function bram({ thumbs = false } = {}) {
  return `<g data-p="bram">${shadow(70)}<g data-p="body">
    <ellipse cx="-26" cy="-10" rx="24" ry="14" fill="${toon('#4a3326')}" ${O(5)}/><ellipse cx="26" cy="-10" rx="24" ry="14" fill="${toon('#4a3326')}" ${O(5)}/>
    <path d="M-40 -60 L-40 -16 L40 -16 L40 -60Z" fill="${toon('#4b5a78')}" ${O(5)}/>
    <path d="M-58 -128 C-70 -96 -70 -70 -62 -54 Q-58 -46 -44 -46 L44 -46 Q58 -46 62 -54 C70 -70 70 -96 58 -128 Z" fill="url(#plaid)" ${O(5.5)}/>
    <path d="M-30 -126 L-26 -48 M30 -126 L26 -48" stroke="#6b4030" stroke-width="9"/>
    <circle cx="-26" cy="-58" r="4" fill="#ffd35a" ${O(2)}/><circle cx="26" cy="-58" r="4" fill="#ffd35a" ${O(2)}/>
    <g transform="translate(-60 -118)"><path d="M-2 -4 C-20 14 -22 40 -16 58 L4 56 C8 40 10 18 12 -2Z" fill="url(#plaid)" ${O(5)}/><circle cx="-6" cy="62" r="14" fill="${toon(SKIN)}" ${O(4.5)}/></g>
    <g transform="translate(60 -118)"><g data-p="armR">${thumbs
      ? `<path d="M2 -4 C24 -16 40 -34 42 -52 L24 -60 C20 -42 10 -26 -10 -14Z" fill="url(#plaid)" ${O(5)}/>
         <rect x="26" y="-100" width="15" height="30" rx="7.5" transform="rotate(-12 33 -85)" fill="${toon(SKIN)}" ${O(4.5)}/>
         <rect x="16" y="-82" width="38" height="32" rx="13" fill="${toon(SKIN)}" ${O(4.5)}/>
         <path d="M22 -70 L46 -70 M22 -61 L46 -61" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" opacity=".6"/>`
      : `<path d="M2 -4 C20 14 22 40 16 58 L-4 56 C-8 40 -10 18 -12 -2Z" fill="url(#plaid)" ${O(5)}/><circle cx="6" cy="62" r="14" fill="${toon(SKIN)}" ${O(4.5)}/>`}</g></g>
    <g transform="translate(0 -124)"><g data-p="head">
      <ellipse cx="0" cy="-48" rx="56" ry="52" fill="${toon(SKIN)}" ${O(5)}/>
      <path d="M-56 -50 C-62 6 -30 46 0 50 C30 46 62 6 56 -50 C46 -26 28 -24 0 -16 C-28 -24 -46 -26 -56 -50Z" fill="${toon('#b85a2a')}" ${O(5)}/>
      <path d="M-30 -24 C-20 -34 -6 -30 0 -24 C6 -30 20 -34 30 -24 C20 -14 6 -18 0 -22 C-6 -18 -20 -14 -30 -24Z" fill="${toon('#a44c22')}" ${O(3.5)}/>
      <ellipse cx="0" cy="-36" rx="11" ry="9" fill="${toon('#ffbfa0')}" ${O(3.5)}/>
      <ellipse cx="-20" cy="-54" rx="6" ry="7.5" fill="#302536"/><ellipse cx="20" cy="-54" rx="6" ry="7.5" fill="#302536"/>
      <circle cx="-22" cy="-57" r="2.2" fill="#fff"/><circle cx="18" cy="-57" r="2.2" fill="#fff"/>
      <path d="M-34 -70 L-10 -64 M34 -70 L10 -64" stroke="#7a3a1a" stroke-width="8" stroke-linecap="round"/>
      <path d="M-58 -64 C-62 -118 -30 -128 0 -128 C30 -128 62 -118 58 -64 Z" fill="${toon('#3f8f45')}" ${O(5)}/>
      <path d="M-60 -70 Q0 -82 60 -70 L58 -56 Q0 -68 -58 -56Z" fill="${toon('#2f7438')}" ${O(4)}/>
      <circle cx="0" cy="-132" r="15" fill="${toon('#f4ecd8')}" ${O(4.5)}/>
    </g></g>
  </g></g>`;
}

/** Granny, with her silver bun, round glasses and a tray of cookies. */
export function granny() {
  const cookie = (x, y) => `<g transform="translate(${x} ${y})"><circle r="15" fill="${toon('#d9a05a')}" ${O(3.5)}/><circle cx="-5" cy="-4" r="2.6" fill="#5a3020"/><circle cx="5" cy="2" r="2.6" fill="#5a3020"/><circle cx="-2" cy="7" r="2.2" fill="#5a3020"/></g>`;
  return `<g data-p="granny">${shadow(56)}<g data-p="body">
    <path d="M-38 -96 C-56 -70 -64 -34 -60 -16 Q-58 -6 -42 -6 L42 -6 Q58 -6 60 -16 C64 -34 56 -70 38 -96 Z" fill="${toon('#8a63c2')}" ${O(5)}/>
    <path d="M-44 -100 Q0 -76 44 -100 Q50 -86 40 -78 Q0 -60 -40 -78 Q-50 -86 -44 -100Z" fill="${toon('#f4a6c6')}" ${O(4.5)}/>
    <g transform="translate(0 -52)">
      <ellipse cx="0" cy="0" rx="62" ry="14" fill="${toon('#c9a77a')}" ${O(4.5)}/>
      ${cookie(-30, -10)}${cookie(0, -14)}${cookie(30, -10)}${cookie(-14, -24)}${cookie(16, -26)}
      <circle cx="-62" cy="4" r="11" fill="${toon(SKIN)}" ${O(4)}/><circle cx="62" cy="4" r="11" fill="${toon(SKIN)}" ${O(4)}/>
    </g>
    <g transform="translate(0 -100)"><g data-p="head">
      <circle cx="0" cy="-118" r="26" fill="${toon('#e6e1ee')}" ${O(4.5)}/>
      <path d="M14 -132 L40 -146" stroke="#c8962e" stroke-width="5" stroke-linecap="round"/>
      ${smallHead({ hair: '#e6e1ee', face: 'joy', extra: `<path d="M-52 -40 C-56 -88 -28 -102 0 -102 C28 -102 56 -88 52 -40 C40 -60 24 -66 0 -66 C-24 -66 -40 -60 -52 -40Z" fill="${toon('#e6e1ee')}" ${O(3.5)}/>` })}
      <circle cx="-18" cy="-32" r="13" fill="#fff" fill-opacity=".25" stroke="#c8962e" stroke-width="4"/><circle cx="18" cy="-32" r="13" fill="#fff" fill-opacity=".25" stroke="#c8962e" stroke-width="4"/>
      <path d="M-5 -32 L5 -32" stroke="#c8962e" stroke-width="4"/>
    </g></g>
  </g></g>`;
}

// --- Places and props ------------------------------------------------------------------------------------
export function house({ roof = '#e88aae', wall = '#fff1d6' } = {}) {
  const shade = mix(roof, INK, 0.18);
  return `<g>${shadow(210, 22)}
    <rect x="-170" y="-200" width="340" height="200" rx="8" fill="${toon(wall)}" ${O(5)}/>
    <path d="M-200 -190 L0 -340 L200 -190 Z" fill="${roof}" ${O(5.5)}/>
    <path d="M0 -340 L200 -190 L60 -190 Z" fill="${shade}" opacity=".7"/>
    <path d="M-200 -190 L0 -340 L200 -190 Z" fill="none" ${O(5.5)}/>
    <rect x="-34" y="-110" width="68" height="110" rx="6" fill="${toon('#8a5a3a')}" ${O(4.5)}/><circle cx="20" cy="-54" r="5" fill="#ffd35a"/>
    ${[-110, 110].map((x) => `<rect x="${x - 30}" y="-150" width="60" height="52" rx="6" fill="${toon('#bfe6ff')}" ${O(4.5)}/>
      <path d="M${x} -150 L${x} -98" stroke="${INK}" stroke-width="3"/>
      <rect x="${x - 36}" y="-98" width="72" height="16" rx="4" fill="${toon('#8a5a3a')}" ${O(3.5)}/>
      <circle cx="${x - 20}" cy="-102" r="7" fill="#ff8fb8" ${O(2.5)}/><circle cx="${x}" cy="-104" r="7" fill="#ffd23f" ${O(2.5)}/><circle cx="${x + 20}" cy="-102" r="7" fill="#fff" ${O(2.5)}/>`).join('')}
    <rect x="96" y="-330" width="40" height="80" rx="6" fill="${toon('#c9b8a6')}" ${O(4.5)}/>
  </g>`;
}

export function forge() {
  const bricks = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) {
    const x = -168 + c * 58 + (r % 2) * 29, y = -228 + r * 44;
    if (x > -100 && x < 60 && y > -190 && y < -40) continue;
    if (x < -175 || x > 140) continue;
    bricks.push(`<rect x="${x}" y="${y}" width="44" height="26" rx="5" fill="#a39690" opacity=".8"/>`);
  }
  return `<g>${shadow(220, 24)}
    <rect x="70" y="-420" width="62" height="170" rx="8" fill="${toon('#8a8494')}" ${O(5)}/>
    <rect x="-190" y="-250" width="380" height="250" rx="16" fill="${toon('#c2b6ae')}" ${O(5.5)}/>
    ${bricks.join('')}
    <path d="M-210 -240 L-170 -300 L170 -300 L210 -240 Z" fill="${toon('#d0583a')}" ${O(5.5)}/>
    <path d="M-96 -20 L-96 -120 C-96 -176 96 -176 96 -120 L96 -20 Z" fill="#3a1a1a" ${O(5)}/>
    <path d="M-86 -20 L-86 -116 C-86 -164 86 -164 86 -116 L86 -20 Z" fill="${glow('forgeglow', [[0, '#fff3a0'], [0.35, '#ffb43a'], [0.75, '#ff6a2a'], [1, '#b8301a']])}"/>
    <g data-p="flames">
      <path d="M-60 -24 C-70 -60 -40 -70 -40 -100 C-20 -80 -10 -60 -14 -24Z" fill="#ffe46a" opacity=".9"/>
      <path d="M-10 -24 C-20 -70 10 -80 10 -120 C34 -96 44 -70 30 -24Z" fill="#fff6c0" opacity=".9"/>
      <path d="M30 -24 C30 -50 50 -60 54 -84 C70 -60 70 -40 62 -24Z" fill="#ffe46a" opacity=".9"/>
    </g>
    <rect x="-110" y="-26" width="220" height="26" rx="8" fill="${toon('#6e6676')}" ${O(4.5)}/>
  </g>`;
}

export function anvil() {
  return `<g>${shadow(110, 18)}
    <path d="M-50 0 L-40 -56 L40 -56 L50 0 Z" fill="${toon('#8a5a3a')}" ${O(5)}/>
    <path d="M-104 -112 L96 -112 Q112 -112 106 -96 L64 -84 L46 -56 L-46 -56 L-62 -84 L-130 -92 Q-150 -104 -104 -112Z" fill="${toon('#5e6272')}" ${O(5.5)}/>
    <path d="M-96 -106 L92 -106" stroke="#9aa2b8" stroke-width="5" stroke-linecap="round"/>
  </g>`;
}

/** The copper chestplate the forge makes: the piece that flies onto the hero. */
export function chestplate({ hot = false } = {}) {
  const c = hot ? '#ffb05a' : '#ec9550';
  return `<g>
    <path d="M-60 -50 Q-30 -66 0 -56 Q30 -66 60 -50 L66 -10 Q60 40 0 58 Q-60 40 -66 -10 Z" fill="${toon(c)}" ${O(5.5)}/>
    <path d="M0 -54 L0 52" stroke="#b5642c" stroke-width="5"/>
    <path d="M-50 -2 Q0 14 50 -2" fill="none" stroke="#b5642c" stroke-width="5"/>
    ${[[-36, -34], [36, -34], [-30, 24], [30, 24]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#ffd35a" ${O(2.5)}/>`).join('')}
    <ellipse cx="-30" cy="-30" rx="14" ry="7" transform="rotate(-20 -30 -30)" fill="#fff" opacity=".5"/>
    ${hot ? `<path d="M-60 -50 Q-30 -66 0 -56 Q30 -66 60 -50 L66 -10 Q60 40 0 58 Q-60 40 -66 -10 Z" fill="#ffdc7a" opacity=".35"/>` : ''}
  </g>`;
}

/** A saw blade with 20 teeth, centred. */
export function blade(r = 110) {
  const pts = [];
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2, b = a + (Math.PI * 2) / 20 * 0.55;
    pts.push(`${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`, `${(Math.cos(b) * (r + 20)).toFixed(1)} ${(Math.sin(b) * (r + 20)).toFixed(1)}`, `${(Math.cos(b + 0.05) * r * 0.97).toFixed(1)} ${(Math.sin(b + 0.05) * r * 0.97).toFixed(1)}`);
  }
  return `<g><path d="M${pts.join(' L')} Z" fill="${toon('#ef8e3c')}" ${O(5)}/>
    <circle r="${r * 0.72}" fill="none" stroke="#ffc27a" stroke-width="5" opacity=".7"/>
    <path d="M${-r * 0.5} ${-r * 0.2} A${r * 0.55} ${r * 0.55} 0 0 1 ${r * 0.2} ${-r * 0.5}" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".7"/>
    <circle r="${r * 0.26}" fill="${toon('#6b6f80')}" ${O(5)}/><circle r="${r * 0.08}" fill="${INK}"/></g>`;
}

export function sawmill() {
  const logEnd = (x, y) => `<circle cx="${x}" cy="${y}" r="26" fill="#efcf96" ${O(4.5)}/><circle cx="${x}" cy="${y}" r="15" fill="none" stroke="#cf9f62" stroke-width="3"/><circle cx="${x}" cy="${y}" r="5" fill="#cf9f62"/>`;
  return `<g>${shadow(380, 30)}
    <rect x="-350" y="-40" width="700" height="40" rx="10" fill="${toon('#b98552')}" ${O(5)}/>
    <rect x="-320" y="-420" width="640" height="382" fill="#7a5640"/>
    <rect x="-320" y="-420" width="640" height="382" fill="${glow('sawroom', [[0, '#c9925a', 0.9], [1, '#7a5640', 0]])}"/>
    <rect x="-336" y="-430" width="30" height="392" rx="6" fill="${toon('#8a5a3a')}" ${O(5)}/>
    <rect x="306" y="-430" width="30" height="392" rx="6" fill="${toon('#8a5a3a')}" ${O(5)}/>
    <rect x="-380" y="-500" width="760" height="96" rx="10" fill="${toon('#8fb06a')}" ${O(5.5)}/>
    ${Array.from({ length: 13 }, (_, i) => `<path d="M${-350 + i * 58} -496 L${-350 + i * 58} -408" stroke="#6f9050" stroke-width="7"/>`).join('')}
    <rect x="-380" y="-500" width="760" height="96" rx="10" fill="none" ${O(5.5)}/>
    <rect x="-260" y="-150" width="420" height="34" rx="6" fill="${toon('#c08a52')}" ${O(5)}/>
    <rect x="-240" y="-120" width="22" height="80" fill="${toon('#7a4a2e')}" ${O(4)}/><rect x="120" y="-120" width="22" height="80" fill="${toon('#7a4a2e')}" ${O(4)}/>
    <g transform="translate(-20 -150)"><g data-p="log">
      <rect x="-200" y="-56" width="200" height="56" rx="24" fill="${toon('#9a6a44')}" ${O(5)}/>
      <ellipse cx="0" cy="-28" rx="16" ry="28" fill="#efcf96" ${O(4.5)}/>
    </g></g>
    <g transform="translate(60 -170)"><g data-p="blade">${blade(110)}</g></g>
    <g transform="translate(-330 -40)">
      ${[[-40, -26], [12, -26], [64, -26], [-14, -72], [38, -72], [12, -118]].map(([x, y]) => logEnd(x, y)).join('')}
    </g>
    <g transform="translate(250 -40)">
      ${[0, 1, 2, 3].map((i) => `<rect x="-60" y="${-26 - i * 20}" width="130" height="20" rx="4" fill="${toon('#ecc488')}" ${O(4)}/>`).join('')}
    </g>
  </g>`;
}

export function plotBed(w = 300, h = 120) {
  return `<g><rect x="${-w / 2 - 10}" y="${-h / 2 - 10}" width="${w + 20}" height="${h + 20}" rx="18" fill="${toon('#a8744a')}" ${O(5)}/>
    <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="12" fill="${toon('#7a5038')}"/>
    ${[-1, 0, 1].map((k) => `<path d="M${-w / 2 + 16} ${k * h / 3.4} Q0 ${k * h / 3.4 + 6} ${w / 2 - 16} ${k * h / 3.4}" fill="none" stroke="#5e3a28" stroke-width="5" stroke-linecap="round"/>`).join('')}</g>`;
}

export function sprout() {
  return `<g><path d="M0 0 C0 -10 0 -18 1 -26" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>
    <path d="M0 0 C0 -10 0 -18 1 -26" fill="none" stroke="#4a9a3a" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M0 -22 C-6 -38 -26 -42 -34 -32 C-26 -20 -10 -18 0 -22Z" fill="${toon('#7ad85a')}" ${O(4)}/>
    <path d="M2 -22 C8 -38 28 -42 36 -32 C28 -20 12 -18 2 -22Z" fill="${toon('#7ad85a')}" ${O(4)}/></g>`;
}

export function flower(color = '#ff8fb8', center = '#ffd23f') {
  return `<g><path d="M0 0 L0 -40" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M0 0 L0 -40" stroke="#4a9a3a" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M0 -14 C-14 -18 -26 -10 -28 -2 C-16 0 -6 -4 0 -14Z" fill="${toon('#7ad85a')}" ${O(3.5)}/>
    <g transform="translate(0 -52)"><g data-p="petals">${[0, 60, 120, 180, 240, 300].map((a) => `<ellipse cx="0" cy="-17" rx="12" ry="16" transform="rotate(${a})" fill="${toon(color)}" ${O(4)}/>`).join('')}
    <circle r="12" fill="${toon(center)}" ${O(4)}/></g></g></g>`;
}

export function coin() {
  return `<g><circle r="30" fill="${toon('#ffd35a')}" ${O(5)}/><circle r="20" fill="none" stroke="#e0a030" stroke-width="4"/>
    <path d="M0 10 L0 -4 M0 -2 C-4 -12 -14 -12 -16 -6 C-10 -2 -4 -2 0 -2 M0 -4 C4 -14 14 -14 16 -8 C10 -4 4 -4 0 -4" fill="none" stroke="#c88a20" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="-12" cy="-16" rx="7" ry="4" transform="rotate(-30 -12 -16)" fill="#fff" opacity=".7"/></g>`;
}

export function gem(color = '#8fe8ff') {
  return `<g><path d="M0 -34 L18 -12 L12 26 L-12 26 L-18 -12 Z" fill="${toon(color)}" ${O(4.5)}/>
    <path d="M0 -34 L-4 -10 L0 26 M-18 -12 L-4 -10 L18 -12" fill="none" stroke="#fff" stroke-width="3" opacity=".6"/></g>`;
}

export function nugget(color = '#f08a3a') {
  return `<g><path d="M-16 -8 L-6 -18 L12 -14 L18 2 L8 16 L-12 12 Z" fill="${toon(color)}" ${O(4)}/><path d="M-6 -12 L6 -10" stroke="#fff" stroke-width="3" opacity=".6" stroke-linecap="round"/></g>`;
}

export function log() {
  return `<g><rect x="-60" y="-24" width="120" height="48" rx="22" fill="${toon('#9a6a44')}" ${O(5)}/>
    <path d="M-40 -8 L20 -8 M-30 8 L30 8" stroke="#7a4e30" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="58" cy="0" rx="15" ry="24" fill="#efcf96" ${O(4.5)}/><ellipse cx="58" cy="0" rx="7" ry="12" fill="none" stroke="#cf9f62" stroke-width="3"/></g>`;
}

export function plank() {
  return `<g><rect x="-70" y="-14" width="140" height="28" rx="5" fill="${toon('#ecc488')}" ${O(4.5)}/>
    <path d="M-56 -4 Q-20 -8 10 -3 T56 -4 M-50 6 Q0 2 50 7" fill="none" stroke="#c99a5a" stroke-width="3" stroke-linecap="round"/></g>`;
}

export function heart(color = '#ff6b9a') {
  return `<path d="M0 24 C-40 -4 -36 -34 -16 -36 C-6 -37 -1 -30 0 -24 C1 -30 6 -37 16 -36 C36 -34 40 -4 0 24Z" fill="${toon(color)}" ${O(4.5)}/>
    <ellipse cx="-16" cy="-22" rx="7" ry="4" transform="rotate(-30 -16 -22)" fill="#fff" opacity=".7"/>`;
}

export function star(r = 30, color = '#ffe46a') {
  const p = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; p.push(`${(Math.cos(a) * rr).toFixed(1)} ${(Math.sin(a) * rr).toFixed(1)}`); }
  return `<path d="M${p.join(' L')} Z" fill="${color}" ${O(4)}/>`;
}

export function sparkle(r = 26, color = '#fff6c0') {
  return `<path d="M0 ${-r} C${r * 0.12} ${-r * 0.12} ${r * 0.12} ${-r * 0.12} ${r} 0 C${r * 0.12} ${r * 0.12} ${r * 0.12} ${r * 0.12} 0 ${r} C${-r * 0.12} ${r * 0.12} ${-r * 0.12} ${r * 0.12} ${-r} 0 C${-r * 0.12} ${-r * 0.12} ${-r * 0.12} ${-r * 0.12} 0 ${-r}Z" fill="${color}" ${O(3.5)}/>`;
}

/** A comic hit spark. */
export function bang(r = 70, color = '#fff6a0') {
  const p = [];
  for (let i = 0; i < 16; i++) { const a = (i * Math.PI) / 8, rr = i % 2 ? r * 0.5 : r * (0.85 + ((i * 37) % 5) * 0.05); p.push(`${(Math.cos(a) * rr).toFixed(1)} ${(Math.sin(a) * rr).toFixed(1)}`); }
  return `<path d="M${p.join(' L')} Z" fill="${color}" ${O(5)}/>`;
}

// --- Emoji stickers, drawn (die-cut look: a white border behind an ink outline) ---------------------------
const die = (d) => `<path d="${d}" fill="none" stroke="#fff" stroke-width="22" stroke-linejoin="round"/>`;
export const STICKERS = {
  skull: () => {
    const d = 'M-44 -12 C-48 -56 -22 -72 0 -72 C22 -72 48 -56 44 -12 C44 4 34 12 30 16 L30 36 L-30 36 L-30 16 C-34 12 -44 4 -44 -12Z';
    return `<g>${die(d)}<path d="${d}" fill="${toon('#f6f1e8')}" ${O(5)}/>
      <ellipse cx="-18" cy="-20" rx="13" ry="14" fill="#2a2033"/><ellipse cx="18" cy="-20" rx="13" ry="14" fill="#2a2033"/>
      <path d="M0 -2 L-7 10 L7 10Z" fill="#2a2033"/>
      <path d="M-16 20 L-16 34 M-5 20 L-5 34 M6 20 L6 34 M17 20 L17 34" stroke="${INK}" stroke-width="4" stroke-linecap="round"/></g>`;
  },
  fire: () => {
    const d = 'M0 -74 C12 -52 44 -40 42 -4 C40 26 18 40 0 40 C-18 40 -42 26 -42 -2 C-42 -26 -24 -34 -20 -52 C-12 -40 -6 -32 -4 -24 C2 -40 6 -56 0 -74Z';
    return `<g>${die(d)}<path d="${d}" fill="#ff5a2a" ${O(5)}/>
      <path d="M0 -40 C8 -26 26 -18 24 4 C22 22 10 30 0 30 C-12 30 -26 20 -24 4 C-22 -10 -10 -14 -8 -26 C-4 -18 -2 -14 0 -10 C4 -20 4 -30 0 -40Z" fill="#ffa13a"/>
      <path d="M0 -8 C6 0 14 6 12 16 C10 24 4 28 0 28 C-6 28 -12 22 -12 14 C-12 6 -4 2 0 -8Z" fill="#ffe46a"/></g>`;
  },
  laugh: () => {
    const d = 'M-50 0 A50 50 0 1 0 50 0 A50 50 0 1 0 -50 0Z';
    return `<g>${die(d)}<circle r="50" fill="${toon('#ffd23a')}" ${O(5)}/>
      <path d="M-58 -2 C-74 6 -78 24 -66 30 C-58 22 -54 12 -50 4Z M58 -2 C74 6 78 24 66 30 C58 22 54 12 50 4Z" fill="#6ec6ff" ${O(3.5)}/>
      <path d="M-32 -10 L-14 -18 L-32 -26 M32 -10 L14 -18 L32 -26" fill="none" ${O(6)}/>
      <path d="M-32 2 Q0 -2 32 2 Q28 40 0 42 Q-28 40 -32 2Z" fill="#7a2a3a" ${O(4.5)}/>
      <path d="M-28 4 Q0 0 28 4 L26 12 Q0 9 -26 12Z" fill="#fff"/>
      <ellipse cx="0" cy="32" rx="14" ry="7" fill="#ff7a9a"/></g>`;
  },
  check: () => {
    const d = 'M-46 -30 Q-46 -46 -30 -46 L30 -46 Q46 -46 46 -30 L46 30 Q46 46 30 46 L-30 46 Q-46 46 -46 30Z';
    return `<g>${die(d)}<path d="${d}" fill="${toon('#4cc35a')}" ${O(5)}/>
      <path d="M-24 0 L-6 18 L26 -18" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  },
  heart: () => `<g><path d="M0 34 C-56 -6 -50 -48 -22 -50 C-8 -51 -1 -42 0 -34 C1 -42 8 -51 22 -50 C50 -48 56 -6 0 34Z" fill="none" stroke="#fff" stroke-width="22" stroke-linejoin="round"/>
    <g transform="scale(1.4)">${heart()}</g></g>`,
  sparkle: () => `<g><g transform="scale(2)">${sparkle(26, '#fff6a0')}</g></g>`,
};

/** A grassy ground with lighter patches, tufts and little flowers, seeded so it never changes between frames. */
export function meadow(x, y, w, h, seed = 1, base = '#79c25a') {
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const bits = [`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${base}"/>`];
  for (let i = 0; i < 28; i++) bits.push(`<ellipse cx="${(x + r() * w).toFixed(0)}" cy="${(y + r() * h).toFixed(0)}" rx="${(60 + r() * 120).toFixed(0)}" ry="${(30 + r() * 50).toFixed(0)}" fill="#8fd06c" opacity=".55"/>`);
  for (let i = 0; i < 70; i++) { const cx = x + r() * w, cy = y + r() * h; bits.push(`<path d="M${cx.toFixed(0)} ${cy.toFixed(0)} q4 -12 8 0 q4 -14 8 0" fill="none" stroke="#5aa645" stroke-width="4" stroke-linecap="round"/>`); }
  for (let i = 0; i < 26; i++) {
    const cx = x + r() * w, cy = y + r() * h, c = ['#ffffff', '#ffd23f', '#ff8fb8', '#c8b0ff'][Math.floor(r() * 4)];
    bits.push(`<g transform="translate(${cx.toFixed(0)} ${cy.toFixed(0)})">${[0, 72, 144, 216, 288].map((a) => `<circle cx="0" cy="-6" r="5" transform="rotate(${a})" fill="${c}"/>`).join('')}<circle r="3.5" fill="#ffb03a"/></g>`);
  }
  return bits.join('');
}

/** Rocky cave floor. */
export function caveFloor(x, y, w, h, seed = 3) {
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const bits = [`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#5b4f6e"/>`];
  for (let i = 0; i < 30; i++) bits.push(`<ellipse cx="${(x + r() * w).toFixed(0)}" cy="${(y + r() * h).toFixed(0)}" rx="${(50 + r() * 110).toFixed(0)}" ry="${(24 + r() * 40).toFixed(0)}" fill="#6a5e80" opacity=".6"/>`);
  for (let i = 0; i < 40; i++) bits.push(`<ellipse cx="${(x + r() * w).toFixed(0)}" cy="${(y + r() * h).toFixed(0)}" rx="${(8 + r() * 16).toFixed(0)}" ry="${(6 + r() * 9).toFixed(0)}" fill="#7a6e90" stroke="${INK}" stroke-width="3"/>`);
  for (let i = 0; i < 12; i++) { const cx = x + r() * w, cy = y + r() * h; bits.push(`<g transform="translate(${cx.toFixed(0)} ${cy.toFixed(0)}) scale(${(0.5 + r() * 0.5).toFixed(2)})">${gem(r() < 0.5 ? '#8fe8ff' : '#d8b8ff')}</g>`); }
  return bits.join('');
}

/** The resource art from the game, by name, placed with its base at (x, y). */
export const RES = {
  oak: [192, 232, -96, -222], 'oak-v0': [192, 232, -96, -222], 'oak-v1': [192, 232, -96, -222], 'oak-v2': [192, 232, -96, -222],
  pine: [152, 222, -76, -212], 'oak-stump': [78, 51, -39, -41], copper: [164, 112, -82, -96], iron: [164, 112, -82, -96],
  crystal: [175, 152, -90, -136], 'crystal-rubble': [74, 36, -37, -22], obsidian: [196, 142, -100, -126],
};
export function res(name, x = 0, y = 0, s = 1, extra = '') {
  const [w, h, ox, oy] = RES[name];
  return `<image href="res/${name}.svg" x="${x + ox * s}" y="${y + oy * s}" width="${w * s}" height="${h * s}" ${extra}/>`;
}

export const PLAID = `<pattern id="plaid" patternUnits="userSpaceOnUse" width="28" height="28">
  <rect width="28" height="28" fill="#d9473f"/><rect x="0" y="10" width="28" height="7" fill="#a8302c" opacity=".7"/>
  <rect x="10" y="0" width="7" height="28" fill="#a8302c" opacity=".7"/><rect x="0" y="22" width="28" height="2" fill="#f08a70" opacity=".6"/></pattern>`;

/** A stone-paved yard. */
export function cobbles(x, y, w, h, seed = 9) {
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const bits = [`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#bfae98"/>`];
  for (let yy = y; yy < y + h; yy += 70) for (let xx = x + ((yy / 70) % 2) * 45; xx < x + w; xx += 90) {
    bits.push(`<rect x="${(xx + r() * 10).toFixed(0)}" y="${(yy + r() * 8).toFixed(0)}" width="${(72 + r() * 10).toFixed(0)}" height="${(54 + r() * 8).toFixed(0)}" rx="18" fill="${['#cfc0aa', '#c8b8a0', '#d6c8b4'][Math.floor(r() * 3)]}" stroke="#a8977f" stroke-width="4"/>`);
  }
  return bits.join('');
}
