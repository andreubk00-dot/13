import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleRunJoint,RUN_DISTANCE} from '../src/run-animation.ts';
import {runCycle} from '../src/generated/run-cycle.ts';
const length=(a:number[],b:number[])=>Math.hypot(...a.map((n,i)=>n-b[i]));
test('the exported Blender run has stance, flight, leg compression and opposite arm swing',()=>{
 const planted=sampleRunJoint('foot.L.head',.10),later=sampleRunJoint('foot.L.head',.20);assert.ok(Math.abs(planted[2]-.065)<.001);assert.ok(Math.abs(later[2]-.065)<.001);assert.ok(Math.abs((later[1]-planted[1])*54+RUN_DISTANCE*.1)<.01,'stance must cancel ground travel');
 const airborne=[sampleRunJoint('foot.L.head',.425),sampleRunJoint('foot.R.head',.425)];assert.ok(airborne.every(p=>p[2]>.13),'both feet leave the ground');assert.ok(sampleRunJoint('hips.head',.425)[2]>sampleRunJoint('hips.head',.07)[2]+.08);assert.ok(sampleRunJoint('forearm.L.tail',0)[1]<sampleRunJoint('forearm.R.tail',0)[1]);
});
test('exported native bones keep their lengths throughout all Blender clips',()=>{
 for(const frames of Object.values(runCycle.clips))for(const name of ['thigh.L','shin.L','thigh.R','shin.R','upper_arm.L','forearm.L','upper_arm.R','forearm.R'] as const){const baseline=length(frames[0][name+'.head' as keyof typeof frames[0]],frames[0][name+'.tail' as keyof typeof frames[0]]);for(const f of frames)assert.ok(Math.abs(length(f[name+'.head' as keyof typeof f],f[name+'.tail' as keyof typeof f])-baseline)<.00001,`${name} cannot stretch`);}
});
test('sampling the Blender cycle wraps continuously and armed hands swing less',()=>{
 const a=sampleRunJoint('foot.L.head',1-.000001),b=sampleRunJoint('foot.L.head',0);assert.ok(length(a,b)<.0001);const loose=Math.abs(sampleRunJoint('forearm.R.tail',0)[1]-sampleRunJoint('forearm.R.tail',.5)[1]),armed=Math.abs(sampleRunJoint('forearm.R.tail',0,true)[1]-sampleRunJoint('forearm.R.tail',.5,true)[1]);assert.ok(armed<loose*.4);
});

test('a planted foot stays in the same world position while the body runs in any of eight directions',async()=>{
 const {CharacterMotion}=await import('../src/character-motion.ts'),{projectRunJoint}=await import('../src/run-animation.ts');
 for(let i=0;i<8;i++){const facing={x:Math.cos(i*Math.PI/4),y:Math.sin(i*Math.PI/4)},m=new CharacterMotion();m.action='run';m.speed=1;m.gait=.1*Math.PI*2;const a=projectRunJoint('foot.L.head',m.pose(),facing);m.gait=.2*Math.PI*2;const b=projectRunJoint('foot.L.head',m.pose(),facing),mirror=facing.x<0?-1:1;assert.ok(Math.hypot((b.x-a.x)*mirror+RUN_DISTANCE*.1*facing.x,b.y-a.y+RUN_DISTANCE*.1*facing.y)<.02,`foot must not slide in direction ${i}`);}
});
