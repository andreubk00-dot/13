import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isSheltered,wearStation,emptyBag,spend,placementError,generateWorld,newGame,parseSave,key,type Cells,type Station} from '../src/world.ts';
test('closed room with floor and roof protects equipment; a missing wall or roof does not',()=>{
 const cells:Cells={};for(let x=4;x<=8;x++)for(let y=4;y<=8;y++)cells[key(x,y)]=x===4||x===8||y===4||y===8?{wall:true}:{floor:true,roof:true};
 cells[key(4,6)]={door:true};assert.equal(isSheltered(cells,6,6),true);
 delete cells[key(7,7)].roof;assert.equal(isSheltered(cells,6,6),false);cells[key(7,7)].roof=true;
 delete cells[key(4,6)];assert.equal(isSheltered(cells,6,6),false);
});
test('isolated roof is not a protected building',()=>assert.equal(isSheltered({'5,5':{floor:true,roof:true}},5,5),false));
test('outdoor operation uses exactly twice the durability, zero is the lower limit',()=>{
 const inside:Station={kind:'furnace',durability:100},outside:Station={kind:'furnace',durability:100};wearStation(inside,true);wearStation(outside,false);assert.equal(100-outside.durability,2*(100-inside.durability));outside.durability=1;wearStation(outside,false);assert.equal(outside.durability,0);
});
test('failed purchase cannot consume partial resources',()=>{const b=emptyBag();b.wood=10;assert.equal(spend(b,{wood:5,stone:3}),false);assert.equal(b.wood,10);b.stone=3;assert.equal(spend(b,{wood:5,stone:3}),true);assert.equal(b.wood,5);assert.equal(b.stone,0);});
test('roof requires a floor; dangerous zone cannot be built on; stations cannot overlap',()=>{
 assert.ok(placementError({},6,6,'roof',false));assert.equal(placementError({'6,6':{floor:true}},6,6,'roof',false),undefined);assert.ok(placementError({},26,6,'floor',false));assert.ok(placementError({'6,6':{station:{kind:'furnace',durability:100}}},6,6,'forge',false));
});
test('safe resources persist between cycles while dangerous resources change',()=>{
 const a=generateWorld(0),b=generateWorld(1);assert.deepEqual(a.nodes.filter(n=>n.id.startsWith('s-')),b.nodes.filter(n=>n.id.startsWith('s-')));assert.notDeepEqual(a.nodes.filter(n=>n.id.startsWith('d')),b.nodes.filter(n=>n.id.startsWith('d')));assert.equal(a.nodes.filter(n=>n.kind==='relic').length,2);assert.ok(a.enemies.length>0);
});
test('save validates values and accepts a clean new game',()=>{
 const s=newGame();assert.deepEqual(parseSave(JSON.stringify(s)),s);assert.equal(parseSave('{'),null);assert.equal(parseSave(JSON.stringify({...s,version:2})),null);assert.equal(parseSave(JSON.stringify({...s,bag:{...s.bag,wood:-1}})),null);assert.equal(parseSave(JSON.stringify({...s,fragments:[-1,0,0]})),null);
});
