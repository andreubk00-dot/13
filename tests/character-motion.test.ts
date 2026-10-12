import test from 'node:test';
import assert from 'node:assert/strict';
import {CharacterMotion} from '../src/character-motion.ts';
test('a strike has a wind-up and exactly one contact, even with uneven frame times',()=>{
 for(const action of ['attack','harvest'] as const){const m=new CharacterMotion();m.play(action);assert.equal(m.step(.08,false),false);assert.equal(m.step(.07,false),true);assert.equal(m.step(.1,false),false);assert.equal(m.step(.2,false),false);assert.equal(m.contacts,1);assert.equal(m.action,'idle');}
});
test('cancelling a wind-up with dash cannot deliver the old strike',()=>{
 const m=new CharacterMotion();m.play('attack');m.step(.06,false);m.play('dash');for(let i=0;i<8;i++)assert.equal(m.step(.05,true),false);assert.equal(m.contacts,0);assert.equal(m.action,'walk');
});
test('movement eases into rest without abruptly resetting the stride',()=>{
 const m=new CharacterMotion();m.step(.1,true);const first=m.pose();m.step(.1,true);assert.notEqual(m.pose().stride,first.stride);const speed=m.speed;m.step(.016,false);assert.ok(m.speed>0&&m.speed<speed);
});
