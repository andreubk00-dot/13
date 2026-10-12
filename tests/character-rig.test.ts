import test from 'node:test';
import assert from 'node:assert/strict';
import {solveLimb,transformPoint} from '../src/character-rig.ts';
test('IK preserves both bone lengths for reachable, unreachable and coincident targets',()=>{
 for(const target of [{x:20,y:20},{x:100,y:-100},{x:0,y:0},{x:.1,y:0},{x:0,y:34}])for(const bend of [-1,1]){const limb=solveLimb({x:0,y:0},target,17,16,bend);assert.ok(Math.abs(Math.hypot(limb.joint.x,limb.joint.y)-17)<1e-8);assert.ok(Math.abs(Math.hypot(limb.end.x-limb.joint.x,limb.end.y-limb.joint.y)-16)<1e-8);}
});
test('shoulders and neck follow the same torso transform without changing their separation',()=>{
 const pivot={x:5,y:74};for(const turn of [-.2,0,.2]){const left=transformPoint({x:-16,y:-9},pivot,turn),right=transformPoint({x:16,y:-9},pivot,turn);assert.ok(Math.abs(Math.hypot(right.x-left.x,right.y-left.y)-32)<1e-9);}
});

test('weapons stay inside the texture throughout attacks in all eight directions',async()=>{
 const {CharacterMotion}=await import('../src/character-motion.ts');const {weaponTransform,HERO_SIZE}=await import('../src/character-rig.ts');
 for(const weapon of ['spear','storm'] as const)for(let direction=0;direction<8;direction++)for(const action of ['attack','harvest','dash'] as const){const m=new CharacterMotion();m.weapon=weapon;m.play(action);const facing={x:Math.cos(direction*Math.PI/4),y:Math.sin(direction*Math.PI/4)};
  for(let i=0;i<50;i++){m.step(.008,false,0);const {hand,angle}=weaponTransform(m.pose(),facing),tip={x:HERO_SIZE/2+(facing.x<0?-1:1)*(hand.x+Math.cos(angle)*(weapon==='spear'?59:49)),y:hand.y+Math.sin(angle)*(weapon==='spear'?59:49)};assert.ok(tip.x>2&&tip.x<HERO_SIZE-2&&tip.y>2&&tip.y<HERO_SIZE-2,`${weapon}/${action}/${direction} tip ${JSON.stringify(tip)}`);}
 }
});

test('direction changes use the shortest arc and finish before the contact frame',async()=>{
 const {advanceAngle}=await import('../src/character-rig.ts');const a=179*Math.PI/180,b=-179*Math.PI/180,next=advanceAngle(a,b,.001,18);assert.ok(Math.abs(next-a)<.02);let angle=0;for(let i=0;i<6;i++)angle=advanceAngle(angle,Math.PI,.016,34);assert.ok(Math.abs(angle-Math.PI)<1e-8);assert.equal(advanceAngle(0,Math.PI,0,18),0,'pause cannot rotate the body');
});
