import { KITCHEN_PLANS } from '../kitchenUpgrades';
import type { CraftPresentation } from './types';
export function kitchenPresentation(level: number): CraftPresentation {
  const plan=KITCHEN_PLANS[level-1], timber=Object.keys(plan.cost).find((m)=>m.endsWith('plank'))!;
  const parts=level===1 ? ['stone','frame','walls','roof','copper','flower'] : ['frame','walls','roof',...Object.keys(plan.cost).filter((m)=>m!==timber)];
  const reveal=240+parts.length*560;
  return {
    id:plan.art,model:`assets/crafting3d/${plan.art}.glb`,scene:'building',duration:reveal+1200,eyebrow:'BRAM · CLOVER’S KITCHEN',
    layers:[{id:'base',initial:true},...parts.map((id)=>({id}))],
    roles:Object.fromEntries(Object.keys(plan.cost).map((m)=>[m,m===timber?'Kitchen frame, shelves and roof':m==='stone'?'Oven and footing':m==='flower'?'Poppy’s window boxes':m==='crystal'?'Bright cupboard glazing':m==='iron'?'Strong pantry brackets':m==='herb'?'Poppy’s drying herbs':'Oven hood and cookware'])),
    targets:parts.map((part,i)=>({material:(['frame','walls','roof'].includes(part)?timber:part) as keyof typeof plan.cost,part,at:240+i*560,duration:480,contact:'solid',sound:'craftStitch'})),
    phases:[{at:0,stage:'frame',text:'Bram keeps Clover’s home and adds to the kitchen.'},{at:reveal,stage:'reveal',text:plan.perk,sound:'ding'}],
    sceneLabel:`${plan.name} adds to Granny’s original blue house.`,pattern:'a kitchen for the village',intro:'Clover keeps her home. Bram makes room for the neighbours.',finished:plan.perk,
  };
}
export const KITCHEN_EXTENSION_PRESENTATION=kitchenPresentation(1);
export const KITCHEN_PRESENTATIONS=KITCHEN_PLANS.map((_,i)=>kitchenPresentation(i+1));
