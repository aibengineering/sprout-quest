// The combat lab (dev builds, from the dev panel in the game): climb the Battle Tower from any floor, gear up for any
// stage, change your level, handling and weapon, raise the XP rate, and start a fight with any monsters.
import { CHECKPOINTS } from '../balance';
import { GEAR, GEAR_ORDER, MONSTERS, STYLE_NAMES, ZONES, type MonsterKind, type Style } from '../data';
import { G, persist } from '../game/context';
import { startBattle } from '../game/fights';
import { XP_RATES, openCamp, setFloor, setXpRate } from '../game/tower';
import { MASTERY_MAX, playerStats } from '../rules';
import { TOWER, checkpointFor } from '../tower';
import { kitSave, towerLink } from './towerLink';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&${{ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot' }[c]};`);
const value = (id: string) => (document.getElementById(id) as HTMLSelectElement | HTMLInputElement | null)?.value ?? '';

/** The lab's last choices, so it reopens where you left it. */
const last = { floor: '1', monster: 'slime', lv: '', count: '1' };

const style = (): Style => GEAR[G.save.equip.weapon]?.style ?? 'sword';

/** A balance checkpoint's gear and level, keeping your class (see towerLink.ts). */
const gearUp = (checkpoint: string) => kitSave(G.save, checkpoint, style());

function equip(id: string) {
  const s = G.save;
  if (!s.owned.includes(id)) s.owned.push(id);
  s.equip.weapon = id;
}

/** Opens the lab. Resolves once it's closed, or once a fight has started ('away'). */
export async function lab(): Promise<'away' | 'close'> {
  const s = G.save, cls = style(), hand = s.mastery[cls];
  const opt = (v: string | number, label: string, on: boolean) => `<option value="${v}"${on ? ' selected' : ''}>${esc(label)}</option>`;
  const floors = TOWER.map((f) => opt(f.n, `${f.n}. ${f.label} (Lv ${f.foes[0].lv})`, String(f.n) === last.floor)).join('');
  const inTower = !!s.tower;
  const kits = CHECKPOINTS.filter((c) => c.id !== 'prologue').map((c) => opt(c.id, `${c.label} (Lv ${c.lv})`, false)).join('');
  const weapons = (Object.keys(STYLE_NAMES) as Style[]).map((k) => `<optgroup label="${STYLE_NAMES[k]}">${
    GEAR_ORDER.map((id) => GEAR[id]).filter((g) => g.slot === 'weapon' && g.style === k).map((g) => opt(g.id, `${'★'.repeat(g.tier ?? 0) || '☆'} ${g.name}`, g.id === s.equip.weapon)).join('')
  }</optgroup>`).join('');
  const monsters = (Object.keys(MONSTERS) as MonsterKind[]).map((k) => opt(k, `${MONSTERS[k].name}${MONSTERS[k].boss ? ' 👑' : ''}`, k === last.monster)).join('');
  const r = await G.ui.dialog(
    `<div class="big" style="font-size:22px">⚔️ Combat lab</div>
     <p class="dev-note">Dev builds only. Changes apply to this slot's save.</p>
     ${inTower ? `<div class="dev-h">🗼 Skip the run ahead</div>
     <div class="dev-row"><select id="lab-floor">${floors}</select></div>
     <div class="dev-row lab-btns"><button class="go" data-dialog="jump">Jump there, geared up for it</button></div>
     <div class="dev-row"><div class="dev-info"><b>🔗 Link to this run</b><small>Its floor, level, gear, handling and materials, to start again from here</small></div>
       <button class="go ghost" data-dialog="link">Copy link</button></div>` : ''}
     <div class="dev-h">You</div>
     <div class="dev-row"><div class="dev-info"><b>Level ${s.lv}</b></div>
       <button class="go ghost" data-dialog="lv:-1">−</button><button class="go ghost" data-dialog="lv:1">+</button></div>
     <div class="dev-row"><div class="dev-info"><b>${STYLE_NAMES[cls]} handling ${hand.lv}</b></div>
       <button class="go ghost" data-dialog="hand:-1">−</button><button class="go ghost" data-dialog="hand:1">+</button></div>
     ${inTower ? `<div class="dev-row"><div class="dev-info"><b>XP rate ×${G.xpRate}</b><small>Every fight's XP in the tower run</small></div>
       ${XP_RATES.map((n) => `<button class="go${n === G.xpRate ? '' : ' ghost'}" data-dialog="rate:${n}">×${n}</button>`).join('')}</div>` : ''}
     <div class="dev-row"><select id="lab-weapon">${weapons}</select><button class="go" data-dialog="weapon">Wield</button></div>
     <div class="dev-row"><select id="lab-kit">${kits}</select><button class="go" data-dialog="kit">Gear up</button></div>
     <div class="dev-h">Any fight</div>
     <div class="dev-row"><select id="lab-monster">${monsters}</select>
       <input id="lab-lv" type="number" min="1" max="30" placeholder="Lv" value="${esc(last.lv)}">
       <select id="lab-count">${[1, 2, 3].map((n) => opt(n, `×${n}`, String(n) === last.count)).join('')}</select></div>
     <div class="dev-row lab-btns"><button class="go" data-dialog="fight">Fight</button></div>`,
    [['close', 'Close']],
    'dev-panel',
  );
  last.floor = value('lab-floor') || last.floor;
  last.monster = value('lab-monster') || last.monster;
  last.lv = value('lab-lv');
  last.count = value('lab-count') || last.count;
  const [act, arg] = r.split(':');
  switch (act) {
    case 'link': {
      const url = towerLink(s, G.xpRate);
      let copied = false;
      try {
        await navigator.clipboard.writeText(url);
        copied = true;
      } catch {
        // Plain http has no clipboard: the link is shown to copy by hand.
      }
      await G.ui.dialog(
        `<div class="big" style="font-size:20px">🔗 Link to this run</div><p class="dev-note">${copied ? 'Copied!' : 'Copy it from here:'}</p>
         <input class="lab-link" readonly value="${esc(url)}" onfocus="this.select()">`,
        [['ok', 'OK']],
        'dev-panel',
      );
      return lab();
    }
    case 'jump':
      gearUp(checkpointFor(TOWER[Number(last.floor) - 1]).id);
      setFloor(Number(last.floor));
      void openCamp();
      return 'away';
    case 'kit':
      gearUp(value('lab-kit'));
      break;
    case 'lv':
      s.lv = Math.max(1, Math.min(30, s.lv + Number(arg)));
      s.xp = 0;
      s.hp = playerStats(s).maxHp;
      break;
    case 'hand':
      hand.lv = Math.max(1, Math.min(MASTERY_MAX, hand.lv + Number(arg)));
      hand.xp = 0;
      break;
    case 'rate':
      setXpRate(Number(arg));
      break;
    case 'weapon':
      equip(value('lab-weapon'));
      break;
    case 'away': {
      const kind = last.monster as MonsterKind, def = MONSTERS[kind];
      const zone = ZONES.find((z) => z.monsters.some((m) => m.kind === kind) || z.guardian?.kind === kind) ?? ZONES.find((z) => z.id === 'peak')!;
      const lv = Number(last.lv) || (zone.guardian?.kind === kind ? zone.guardian.lv : kind === 'dragon' ? 20 : zone.lv[0]);
      const n = def.boss ? 1 : Number(last.count);
      persist();
      s.hp = playerStats(s).maxHp;
      startBattle(zone, Array.from({ length: n }, () => ({ kind, lv, golden: false })), !!def.boss);
      return 'away';
    }
    default:
      return 'close';
  }
  persist();
  return lab();
}

export const LAB_CSS = `
.dev-panel select, .dev-panel input { font: inherit; font-size: 14px; padding: 6px 8px; border-radius: 10px; border: 2px solid rgba(90, 58, 106, 0.25); background: #fff; min-width: 0; }
.dev-panel select { flex: 1; }
.dev-panel #lab-lv { width: 64px; }
.dev-panel .lab-btns { justify-content: flex-end; background: none; padding-top: 0; }
.dev-panel .lab-link { width: 100%; font-size: 12px; }
`;
