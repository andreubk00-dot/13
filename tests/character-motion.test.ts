import test from 'node:test';
import assert from 'node:assert/strict';
import {CharacterMotion} from '../src/character-motion.ts';
test('a strike has a wind-up and exactly one contact, even with uneven frame times',()=>{
 for(const action of ['attack','harvest'] as const){const m=new CharacterMotion();m.play(action);assert.equal(m.step(.08,false),false);assert.equal(m.step(.07,false),true);assert.equal(m.step(.1,false),false);assert.equal(m.step(.2,false),false);assert.equal(m.contacts,1);assert.equal(m.action,'idle');}
});
test('cancelling a wind-up with dash cannot deliver the old strike',()=>{
 const m=new CharacterMotion();m.play('attack');m.step(.06,false);m.play('dash');for(let i=0;i<8;i++)assert.equal(m.step(.05,true),false);assert.equal(m.contacts,0);assert.equal(m.action,'run');
});
test('movement eases into rest without abruptly resetting the stride',()=>{
 const m=new CharacterMotion();m.step(.1,true);const first=m.pose();m.step(.1,true);assert.notEqual(m.pose().stride,first.stride);const speed=m.speed;m.step(.016,false);assert.ok(m.speed>0&&m.speed<speed);
});

test('every action starts from the current pose without teleporting limbs',()=>{
 const m=new CharacterMotion();m.step(.06,true);const before=m.pose();
 for(const action of ['attack','harvest','dash','hurt','craft','pickup','respawn'] as const){const start=m.pose();m.play(action);const after=m.pose();for(const field of ['leftHand','rightHand','leftFoot','rightFoot'] as const){assert.equal(after[field].x,start[field].x);assert.equal(after[field].y,start[field].y);}assert.equal(after.turn,start.turn);m.step(.018,false);}
 assert.ok(Number.isFinite(before.leftHand.x));
});

test('ending an action returns to the same resting pose without a hand or weapon snap',()=>{
 for(const weapon of ['hands','spear','storm'] as const)for(const action of ['attack','harvest','craft','build','dash','hurt','pickup','respawn'] as const){const m=new CharacterMotion();m.weapon=weapon;m.play(action);const duration={attack:.4,harvest:.36,craft:.65,build:.35,dash:.2,hurt:.28,pickup:.32,respawn:.8}[action];m.step(duration-.0001,false);const a=m.pose();m.step(.0002,false);const b=m.pose();assert.ok(Math.hypot(a.rightHand.x-b.rightHand.x,a.rightHand.y-b.rightHand.y)<.05,`${weapon}/${action} wrist`);assert.ok(Math.abs(a.weaponAngle-b.weaponAngle)<.005,`${weapon}/${action} weapon`);}
});

test('stance feet cancel travelled distance and swing feet clear the ground',async()=>{
 const {footCycle}=await import('../src/character-motion.ts');const start=footCycle(.1*Math.PI*2,1),end=footCycle(.2*Math.PI*2,1);assert.ok(Math.abs((end.x-start.x)+72*.1)<1e-8);assert.equal(start.y,134);assert.equal(end.y,134);assert.equal(start.planted,true);assert.ok(footCycle(.8*Math.PI*2,1).y<128);assert.equal(footCycle(.8*Math.PI*2,1).planted,false);
 const m=new CharacterMotion();m.step(.1,true,12);const gait=m.gait;m.step(.1,false,0);assert.equal(m.gait,gait,'a collision cannot advance the footfall clock');
});

test('spear thrust, blade slash and punch use different wrist and weapon trajectories',()=>{
 const poses=['hands','spear','storm'].map(weapon=>{const m=new CharacterMotion();m.weapon=weapon as 'hands'|'spear'|'storm';m.play('attack');m.step(.2,false);return m.pose();});assert.notEqual(poses[0].rightHand.y,poses[1].rightHand.y);assert.notEqual(poses[1].weaponAngle,poses[2].weaponAngle);assert.ok(poses[1].aimWeight>.9);
});

test('dash uses one push and landing instead of accelerating the walk cycle',()=>{
 const m=new CharacterMotion();m.step(.04,true,8);const gait=m.gait;m.play('dash');m.step(.1,true,69);assert.equal(m.gait,gait);assert.ok(m.pose().leftFoot.y<134&&m.pose().rightFoot.y<134);m.step(.11,false,0);assert.equal(m.action,'idle');
});
