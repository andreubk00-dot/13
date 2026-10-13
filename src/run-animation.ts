import {runCycle} from './generated/run-cycle.ts';
import type {CharacterPose,Point} from './character-motion';
export const RUN_DISTANCE=runCycle.cycleDistance*runCycle.metresToPixels;
export type RunJoint=keyof typeof runCycle.clips.Run[number];
export function sampleRunJoint(name:RunJoint,phase:number,armed=false):[number,number,number]{
 const frames=armed?runCycle.clips.Run_Armed:runCycle.clips.Run;
 const f=((phase%1)+1)%1*frames.length,i=Math.floor(f),t=f-i,a=frames[i][name],b=frames[(i+1)%frames.length][name];
 return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
}
export function projectRunJoint(name:RunJoint,pose:CharacterPose,facing:Point):Point{
 let [x,y,z]=sampleRunJoint(name,pose.runPhase,pose.armed);const scale=runCycle.metresToPixels;
 if(!name.startsWith('thigh')&&!name.startsWith('shin')&&!name.startsWith('foot')&&!name.startsWith('hips')){const hip=sampleRunJoint('hips.head',pose.runPhase,pose.armed),dy=y-hip[1],dz=z-hip[2],angle=pose.inertiaLean; y=hip[1]+dy*Math.cos(angle)+dz*Math.sin(angle);z=hip[2]-dy*Math.sin(angle)+dz*Math.cos(angle);}
 const mirror=facing.x<0?-1:1;return {x:(x*facing.y+y*facing.x)*scale*mirror,y:138-z*scale+(-x*facing.x+y*facing.y)*scale};
}
export const mixPoint=(a:Point,b:Point,t:number):Point=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
