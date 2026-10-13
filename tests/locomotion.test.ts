import test from 'node:test';
import assert from 'node:assert/strict';
import {LocomotionBody} from '../src/locomotion.ts';
function simulate(fps:number,input:(time:number)=>{x:number;y:number},duration:number){const body=new LocomotionBody();let x=0,y=0;for(let i=0;i<duration*fps;i++)body.step(1/fps,input(i/fps),(dx,dy)=>{x+=dx;y+=dy;return{x:dx,y:dy};});return {body,x,y};}
test('running accelerates, brakes to rest and does not gain speed diagonally',()=>{
 const b=new LocomotionBody(),move=(x:number,y:number)=>({x,y});b.step(1/60,{x:1,y:0},move);assert.ok(b.speed>0&&b.speed<40);for(let i=0;i<30;i++)b.step(1/60,{x:1,y:1},move);assert.ok(Math.abs(b.speed-185)<1e-8);for(let i=0;i<10;i++)b.step(1/60,{x:0,y:0},move);assert.equal(b.speed,0);
});
test('fixed-step movement is consistent at 30, 60 and 120 fps',()=>{
 const a=simulate(30,()=>({x:1,y:0}),1),b=simulate(60,()=>({x:1,y:0}),1),c=simulate(120,()=>({x:1,y:0}),1);assert.ok(Math.abs(a.x-b.x)<1e-6);assert.ok(Math.abs(b.x-c.x)<1e-6);
});
test('reversal crosses zero velocity, rather than flipping instantly',()=>{
 const b=simulate(120,()=>({x:1,y:0}),.5).body;b.step(1/60,{x:-1,y:0},(x,y)=>({x,y}));assert.ok(b.vx>0);for(let i=0;i<30;i++)b.step(1/60,{x:-1,y:0},(x,y)=>({x,y}));assert.equal(b.vx,-185);
});
test('a wall cancels the blocked velocity while allowing motion along it',()=>{
 const b=new LocomotionBody();for(let i=0;i<60;i++)b.step(1/60,{x:1,y:1},(_x,y)=>({x:0,y}));assert.equal(b.vx,0);assert.ok(b.vy>0);assert.ok(b.distance>0);
});

test('render rates above the physics rate do not halve the run animation blend',async()=>{
 const {CharacterMotion}=await import('../src/character-motion.ts');for(const fps of [60,120,240]){const body=new LocomotionBody(),motion=new CharacterMotion();for(let i=0;i<fps;i++){body.step(1/fps,{x:1,y:0},(x,y)=>({x,y}));motion.step(1/fps,body.speed>1,body.distance/.85,body.speed,body.acceleration);}assert.ok(motion.pose().running>.99,`full-speed run at ${fps} fps`);}
});
