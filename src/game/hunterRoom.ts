import { drawMonsterAt } from '../assets';
import { HUNTS, hunting } from '../hunts';
import { MONSTERS } from '../data';
import { hintPill, paintShell } from '../roomArt';
import { spriteScale } from '../battle/monsters';
import { G, paused } from './context';
import { huntBoard, inspectTrophy, visitHunter } from './hunting';
import type { RoomPlay } from './rooms';
const metals = { bronze: '#b98250', silver: '#c5d3df', gold: '#efc55d' };
export const HUNTER_PLAY: RoomPlay = {
  setup(room) {
    room.actors.add({ id: 'room:rook', name: 'Rook', look: { kind: 'walker', name: 'rook' }, x: 7, y: 8.2, face: Math.PI / 2, label: 'Talk', talk: visitHunter });
    room.painter = {
      floor(ctx, ts) { paintShell(ctx, room, ts, { boards: ['#a58765', '#9b7c5b', '#796044'], board: .65, wall: '#705744', stripe: null, wainscot: '#574334', wood: '#594332', logs: true }); },
      obj(ctx, o, ts) {
        if (o.id === 'hunt:board') {
          ctx.fillStyle = '#5e4031';
          ctx.beginPath();
          ctx.roundRect(o.x * ts, (o.y - .6) * ts, o.w * ts, 1.25 * ts, ts * .08);
          ctx.fill();
          ctx.fillStyle = '#eee0bc';
          for (const x of [.16, .65, 1.12])
            ctx.fillRect((o.x + x) * ts, (o.y - .4) * ts, .35 * ts, .66 * ts);
          ctx.fillStyle = '#765446';
          ctx.font = `900 ${ts * .2}px Nunito`;
          ctx.textAlign = 'center';
          ctx.fillText('HUNTS', (o.x + o.w / 2) * ts, (o.y - .08) * ts);
          return (o.y - .6) * ts;
        }
        const kind = o.id!.slice(7), d = HUNTS.find(d => d.kind === kind)!;
        const h = hunting(G.save), rank = (['gold', 'silver', 'bronze'] as const).find(r => h.trophies.includes(`${kind}:${r}`));
        ctx.fillStyle = '#5b4134';
        ctx.fillRect(o.x * ts, (o.y + .35) * ts, o.w * ts, .25 * ts);
        ctx.fillStyle = rank ? metals[rank] : '#887868';
        ctx.beginPath();
        ctx.ellipse((o.x + o.w / 2) * ts, (o.y + .35) * ts, .48 * ts, .12 * ts, 0, 0, Math.PI * 2);
        ctx.fill();
        if (rank)
          drawMonsterAt(ctx, `trophy:${kind}`, d.kind, false, 0, true, (o.x + o.w / 2) * ts, (o.y + .28) * ts, ts * .49 * spriteScale(d.kind), { tint: metals[rank], tintAmount: .92 });
        else {
          ctx.strokeStyle = '#b8a58a';
          ctx.lineWidth = ts * .03;
          ctx.strokeRect((o.x + .55) * ts, (o.y - .35) * ts, .5 * ts, .6 * ts);
        }
        ctx.fillStyle = '#ead9b6';
        ctx.font = `800 ${ts * .19}px Nunito`;
        ctx.textAlign = 'center';
        ctx.fillText(MONSTERS[d.kind].name, (o.x + o.w / 2) * ts, (o.y + .82) * ts, o.w * ts);
        return (o.y - .7) * ts;
      }, over() { },
    };
  },
  enter() { G.over.carried = null; },
  async act(o) { if (o.id === 'hunt:board')
    await paused(huntBoard);
  else if (o.id?.startsWith('trophy:'))
    await inspectTrophy(o.id.slice(7)); },
  tick() { return false; },
  hud(ctx, vw) { hintPill(ctx, vw, G.save.hunting?.active?.status === 'defeated' ? '🏹 Bring the commission to Rook' : '🏆 Hunt board by the door · trophies on the shelves'); },
};
