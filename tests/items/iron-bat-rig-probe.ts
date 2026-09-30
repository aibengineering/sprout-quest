// Browser-only probe using the production loader, attachment code and toon renderer.
import { Box3, Mesh, Vector3 } from 'three';
import { GEAR } from '../../src/data';
import { MOVESETS } from '../../src/weapons';
import { drawModel, handOf, loadModel } from '../../src/models';
import { carriedWeapon } from '../../src/weaponPose';

(window as any).ironBatRigProbe = async (id: string) => {
  const weapon = await loadModel(`wpn_${id}`), hero = await loadModel('hero_tunic');
  if (!weapon || !hero) throw Error(`${id}: model failed to load`);
  if (!hero.root.getObjectByName('arm1') || !hero.root.getObjectByName('bodyPivot')) throw Error('Hero rig missing');
  const bounds = new Box3().setFromObject(weapon.root), extent = bounds.getSize(new Vector3());
  let triangles=0, gripTriangles=0;
  weapon.root.traverse(o => {const m=o as Mesh; if(m.isMesh) triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;});
  if (id==='batwhip') {
    if (!weapon.grip) throw Error('Uncoiled grip missing');
    weapon.grip.traverse(o=>{const m=o as Mesh;if(m.isMesh)gripTriangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;});
    const gb = new Box3().setFromObject(weapon.grip);
    if (!gripTriangles || gb.max.x>.23 || gb.min.x>-.08) throw Error(`Whip grip contains coils or loses pommel: ${gb.min.x}..${gb.max.x}`);
  }
  const canvas=document.createElement('canvas'); canvas.width=700;canvas.height=330;
  canvas.style.cssText='position:fixed;left:0;top:0;z-index:9999;background:#f4ece2;width:700px;height:330px';
  document.querySelector('#iron-bat-probe')?.remove();canvas.id='iron-bat-probe';document.body.append(canvas);
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='#f4ece2';ctx.fillRect(0,0,700,330);
  const g=GEAR[id], size=MOVESETS[g.style!].size;
  for(const [i,at] of ['carried','hand','extended'].entries()) {
    const held=at==='carried'?carriedWeapon(g,size):{id:`wpn_${id}`,at:'hand' as const,ang:0,lift:.2,scale:size*.7,off:at==='extended'?.2:0,uncoiled:id==='batwhip'&&at==='extended'};
    const x=90+i*210,y=272,unit=140;
    const drawn=drawModel(ctx,`iron-bat-${id}-${at}`,'hero_tunic',{anim:'idle',phase:0,yaw:.8,held,bold:true},x,y,unit,{},f=>ctx.drawImage(f.img,f.x,f.y,f.w,f.h,x-f.ax,y-f.ay,f.w,f.h));
    if(!drawn||!handOf(`iron-bat-${id}-${at}`,unit))throw Error(`${id}: ${at} attachment failed`);
    ctx.fillStyle='#49384d';ctx.font='16px sans-serif';ctx.fillText(at,x-30,310);
  }
  return {id,triangles,gripTriangles,extent:extent.toArray()};
};
