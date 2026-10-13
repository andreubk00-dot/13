import test from 'node:test';
import assert from 'node:assert/strict';
import {CharacterMotion,actionDuration,contactTime,RUN_DISTANCE} from '../src/character-motion.ts';
test('a strike has a wind-up and exactly one contact at the author strike pose',()=>{
 for(const action of ['attack','harvest'] as const){const m=new CharacterMotion();m.play(action);assert.equal(m.step(contactTime[action]-.01,false),false);assert.equal(m.step(.01,false),true);assert.equal(m.step(.1,false),false);m.step(actionDuration[action]!,false);assert.equal(m.contacts,1);assert.equal(m.action,'idle');}
});
test('cancelling the wind-up with dash cannot deliver the old strike',()=>{
 const m=new CharacterMotion();m.play('attack');m.step(.06,false);m.play('dash');for(let i=0;i<8;i++)assert.equal(m.step(.05,true),false);assert.equal(m.contacts,0);assert.equal(m.action,'run');
});
test('the ready run cycle advances with travelled distance and stops against a wall',()=>{
 const m=new CharacterMotion();m.step(.1,true,RUN_DISTANCE/4);assert.ok(Math.abs(m.phase()-.25)<1e-8);const gait=m.gait;m.step(.1,true,0);assert.equal(m.gait,gait);m.step(.1,false,0);assert.equal(m.clip(),'idle');
});
test('hands, spear and sword select different original artist clips',()=>{
 const m=new CharacterMotion();m.play('attack');assert.equal(m.clip(),'punch');m.weapon='spear';assert.equal(m.clip(),'thrust');m.weapon='storm';assert.equal(m.clip(),'slash');m.play('harvest');assert.equal(m.clip(),'harvest');
});
test('all one-shot clips finish and return to the current movement state',()=>{
 for(const action of Object.keys(actionDuration) as (keyof typeof actionDuration)[]){const m=new CharacterMotion();m.play(action);m.step(actionDuration[action]!+.01,true);assert.equal(m.action,'run');assert.ok(Number.isFinite(m.phase()));}
});
test('the strike clip reaches its contact frame when gameplay damage fires',()=>{
 for(const [weapon,phase] of [['hands',.43],['spear',.45],['storm',.4]] as const){const m=new CharacterMotion();m.weapon=weapon;m.play('attack');assert.equal(m.step(contactTime.attack,false),true);assert.ok(Math.abs(m.phase()-phase)<1e-8);}
});
