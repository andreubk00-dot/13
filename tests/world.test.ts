import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isSheltered,wearStation,emptyBag,spend,placementError,generateWorld,newGame,parseSave,key,connections,structureBlocked,recipeError,inventoryItems,inventorySlots,equip,equipmentDefense,canAdd,gearInfo,biomeAt,WIDTH,HEIGHT,collectLoot,emptyGear,validHotbarValue,roofCoversPoint,type Cells,type Station} from '../src/world.ts';
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
 const a=generateWorld(0),b=generateWorld(1);assert.deepEqual(a.nodes.filter(n=>n.id.startsWith('s-')),b.nodes.filter(n=>n.id.startsWith('s-')));assert.notDeepEqual(a.nodes.filter(n=>n.id.startsWith('d')),b.nodes.filter(n=>n.id.startsWith('d')));assert.equal(a.nodes.filter(n=>n.kind==='relic').length,4);assert.ok(a.enemies.length>0);
});
test('save validates values and accepts a clean new game',()=>{
 const s=newGame();assert.deepEqual(parseSave(JSON.stringify(s)),s);assert.equal(parseSave('{'),null);assert.equal(parseSave(JSON.stringify({...s,version:999})),null);assert.equal(parseSave(JSON.stringify({...s,bag:{...s.bag,wood:-1}})),null);assert.equal(parseSave(JSON.stringify({...s,fragments:[-1,0,0]})),null);
});

test('all sixteen connection patterns are resolved from neighbors, doors join walls',()=>{
 for(let mask=0;mask<16;mask++){
  const cells:Cells={'6,6':{wall:true}};const neighbors=[[6,5],[7,6],[6,7],[5,6]];
  neighbors.forEach(([x,y],i)=>{if(mask&(1<<i))cells[key(x,y)]=i===1?{door:true}:{wall:true};});
  assert.deepEqual(Object.values(connections(cells,6,6,'wall')),neighbors.map((_,i)=>!!(mask&(1<<i))));
 }
 assert.deepEqual(connections({'6,6':{fence:true},'7,6':{wall:true}},6,6,'fence'),{n:false,e:false,s:false,w:false});
});
test('wall collision matches its orientation and connected stretches have no gaps',()=>{
 const horizontal:Cells={'6,6':{wall:true,rotation:0}};
 assert.equal(structureBlocked(horizontal,6*64+4,6*64+32,4),true);
 assert.equal(structureBlocked(horizontal,6*64+32,6*64+3,4),false);
 const vertical:Cells={'6,6':{wall:true,rotation:1}};
 assert.equal(structureBlocked(vertical,6*64+32,6*64+3,4),true);
 assert.equal(structureBlocked(vertical,6*64+3,6*64+32,4),false);
 horizontal['7,6']={wall:true};assert.equal(structureBlocked(horizontal,7*64,6*64+32,4),true);
});
test('equipment and blueprint operations require the right live station within reach',()=>{
 const s=newGame();s.bag={wood:30,stone:30,ore:30,iron:30,spark:30};s.fragments=[2,1,1];
 for(const recipe of ['spear','storm','armor','helmet','boots','blueprint','salvage']){
  assert.ok(recipeError(s,recipe));assert.ok(recipeError(s,recipe,{kind:'furnace',durability:100},10));assert.ok(recipeError(s,recipe,{kind:'forge',durability:100},116));assert.ok(recipeError(s,recipe,{kind:'forge',durability:0},10));
 }
 assert.equal(recipeError(s,'spear',{kind:'forge',durability:100},60),undefined);
 assert.ok(recipeError(s,'storm',{kind:'forge',durability:100},60));s.learned=true;assert.equal(recipeError(s,'storm',{kind:'forge',durability:100},60),undefined);
 assert.ok(recipeError(s,'iron',{kind:'forge',durability:100},60));assert.equal(recipeError(s,'iron',{kind:'furnace',durability:100},60),undefined);
});
test('backpack uses real stacks; empty slot positions persist',()=>{
 const s=newGame();s.bag.wood=100;assert.deepEqual(inventoryItems(s).map(i=>i.quantity),[99,1]);
 s.inventoryOrder=['','','wood:0'];assert.equal(inventorySlots(s)[2]?.id,'wood:0');assert.equal(inventorySlots(s)[0]?.id,'wood:1');
 s.bag.wood=99*24;assert.equal(canAdd(s,'stone',1),false);assert.equal(canAdd(s,'wood',1),false);
});
test('equipping swaps owned items without deleting them and rejects wrong armor slots',()=>{
 const s=newGame();s.gear.spear=1;s.gear.storm=1;s.gear.armor=1;s.gear.helmet=1;
 assert.equal(equip(s,'spear','weapon'),true);assert.equal(s.weapon,'spear');assert.equal(equip(s,'storm','weapon'),true);assert.equal(s.gear.spear,1);assert.equal(inventoryItems(s).some(i=>i.kind==='spear'),true);
 assert.equal(equip(s,'armor','head'),false);assert.equal(equip(s,'boots','feet'),false);assert.equal(equip(s,'armor','body'),true);assert.equal(equip(s,'helmet','head'),true);assert.equal(equipmentDefense(s),8);assert.equal(equip(s,null,'body'),true);assert.equal(equipmentDefense(s),2);
});
test('first-release saves migrate without losing the base, gear, resources or knowledge',()=>{
 const old:any={...newGame(),version:1,weapon:'storm',armor:true,learned:true,cells:{'9,15':{floor:true,roof:true,station:{kind:'furnace',durability:72}}}};
 delete old.gear;delete old.equipment;delete old.hotbar;delete old.inventoryOrder;old.bag.wood=123;
 const s=parseSave(JSON.stringify(old));assert.ok(s);assert.equal(s.version,2);assert.equal(s.bag.wood,123);assert.equal(s.cells['9,15'].station?.durability,72);assert.equal(s.gear.storm,1);assert.equal(s.equipment.weapon,'storm');assert.equal(s.equipment.body,'armor');assert.equal(s.learned,true);
});
test('expanded world includes five visually distinct regions and resources beyond the old edges',()=>{
 assert.ok(WIDTH*HEIGHT>44*32*2);assert.equal(new Set([[9,16],[10,40],[30,16],[60,10],[65,40]].map(([x,y])=>biomeAt(x,y))).size,5);
 const w=generateWorld(0);assert.ok(w.nodes.some(n=>n.x>44));assert.ok(w.nodes.some(n=>n.y>32));assert.ok(w.enemies.some(e=>e.x>44));
});

test('full backpack rejects an entire loot bundle atomically; freeing room allows collection',()=>{
 const s=newGame();s.bag.wood=99*24;const loot={bag:{...emptyBag(),ore:2,spark:1},fragments:[0,1,0],gear:emptyGear()};
 assert.equal(collectLoot(s,loot),false);assert.equal(s.bag.ore,0);assert.equal(s.fragments[1],0);s.bag.wood=99*21;assert.equal(collectLoot(s,loot),true);assert.equal(s.bag.ore,2);assert.equal(s.fragments[1],1);assert.equal(inventoryItems(s).length,24);
});
test('hotbar rejects unknown or injected values and accepts only supported actions/items',()=>{
 assert.equal(validHotbarValue('gear:storm'),true);assert.equal(validHotbarValue('build:wall'),true);assert.equal(validHotbarValue('action:bag'),true);assert.equal(validHotbarValue('resource:wood'),true);assert.equal(validHotbarValue('gear:missing'),false);assert.equal(validHotbarValue('action:<script>'),false);assert.equal(validHotbarValue('build:wall:extra'),false);
 const s=newGame();s.hotbar[0]='gear:missing';assert.equal(parseSave(JSON.stringify(s)),null);
});
test('roof coverage reaches the boundary wall, but does not spill into the outside',()=>{
 const c:Cells={'8,8':{floor:true,roof:true},'7,8':{wall:true}};assert.equal(roofCoversPoint(c,8*64-20,8*64+32),true);assert.equal(roofCoversPoint(c,7*64+10,8*64+32),false);
});

test('a doorway joins fence sections as a gate without making fences protect a room',()=>{
 const cells:Cells={'5,5':{fence:true},'6,5':{door:true},'7,5':{fence:true}};
 assert.equal(connections(cells,5,5,'fence').e,true);assert.equal(connections(cells,7,5,'fence').w,true);assert.deepEqual(connections(cells,6,5,'door'),{n:false,e:true,s:false,w:true});
 cells['6,6']={floor:true,roof:true};assert.equal(isSheltered(cells,6,6),false);
});
