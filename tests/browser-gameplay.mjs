import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {newGame,key,TILE,generateWorld} from '../src/world.ts';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(process.env.GAME_URL||'http://127.0.0.1:5173');
const diagnostics=()=>page.evaluate(()=>window.labyrinthDiagnostics);
async function load(s){await page.evaluate(s=>window.addEventListener('pagehide',()=>localStorage.setItem('living-labyrinth-v1',JSON.stringify(s)),{once:true}),s);await page.reload();await page.waitForFunction(()=>window.labyrinthDiagnostics?.ready);await page.getByRole('button',{name:'Продолжить путь'}).click();}
const base=newGame();base.bag={wood:100,stone:100,ore:50,iron:20,spark:10};base.weapon='spear';base.fragments=[2,1,1];
// The fixture starts with no structures: build an actual floor and station through input.
await load(base);
await page.getByRole('button',{name:'Строить',exact:true}).click();await page.locator('[data-build="floor"]').click();await page.getByRole('button',{name:'Закрыть',exact:true}).click();
await page.locator('#game canvas').click({position:{x:608,y:386}});
await page.waitForFunction(()=>window.labyrinthDiagnostics.cells['9,15']?.floor);
assert.equal((await diagnostics()).bag.wood,98,'floor consumes wood');
await page.getByRole('button',{name:'Строить',exact:true}).click();await page.locator('[data-build="furnace"]').click();await page.getByRole('button',{name:'Закрыть',exact:true}).click();
await page.locator('#game canvas').click({position:{x:608,y:386}});await page.waitForFunction(()=>window.labyrinthDiagnostics.cells['9,15']?.station);
await page.keyboard.press('Escape');await page.keyboard.press('e');await page.locator('[data-recipe="iron"]').click();
assert.equal((await diagnostics()).cells['9,15'].station.durability,96,'outdoor smelting consumes four durability');
assert.equal((await diagnostics()).bag.iron,21,'smelting produces iron');
const inside=newGame();inside.bag={wood:100,stone:100,ore:50,iron:20,spark:10};inside.weapon='spear';inside.fragments=[2,1,1];
for(let x=6;x<=10;x++)for(let y=14;y<=18;y++)inside.cells[key(x,y)]=x===6||x===10||y===14||y===18?{wall:true}:{floor:true,roof:true};
inside.cells['8,18']={door:true};inside.cells['8,16'].station={kind:'furnace',durability:100};inside.cells['9,15'].station={kind:'forge',durability:100};inside.cells['8,17'].station={kind:'chest',durability:100};
await load(inside);
await page.getByRole('button',{name:'Крафт',exact:true}).click();await page.locator('[data-recipe="iron"]').click();assert.equal((await diagnostics()).cells['8,16'].station.durability,98,'closed room halves wear');
await page.locator('[data-recipe="salvage"]').click();assert.deepEqual((await diagnostics()).fragments,[1,1,1],'salvage retains one of each required part');assert.equal((await diagnostics()).bag.wood,100,'duplicate becomes one ordinary wood after smelting');
await page.locator('[data-recipe="blueprint"]').click();assert.equal((await diagnostics()).learned,true);assert.deepEqual((await diagnostics()).fragments,[0,0,0]);
await page.locator('[data-recipe="storm"]').click();assert.equal((await diagnostics()).weapon,'storm');assert.equal((await diagnostics()).bag.iron,13);assert.equal((await diagnostics()).cells['9,15'].station.durability,98);
await page.locator('[data-recipe="armor"]').click();assert.equal((await diagnostics()).armor,true);assert.equal((await diagnostics()).cells['9,15'].station.durability,96);
await page.getByRole('button',{name:'Закрыть',exact:true}).click();await page.screenshot({path:'artifacts/built-base.png'});
// Save the real played state, reload, and confirm both knowledge and base persist.
await page.getByRole('button',{name:'Пауза',exact:true}).click();await page.reload();await page.waitForFunction(()=>window.labyrinthDiagnostics?.ready);await page.getByRole('button',{name:'Продолжить путь'}).click();assert.equal((await diagnostics()).weapon,'storm');assert.equal((await diagnostics()).cells['9,15'].station.durability,96);
// Combat fixture puts the player in striking range of the guard, away from resource obstacles.
const combat=newGame();combat.x=29*TILE+32;combat.y=16*TILE+32+55;combat.weapon='storm';combat.armor=true;combat.removed=generateWorld(0).nodes.filter(n=>Math.hypot(n.x-29,n.y-16)<3).map(n=>n.id);
await load(combat);await page.keyboard.down('w');await page.waitForTimeout(100);await page.keyboard.up('w');for(let i=0;i<3;i++){await page.keyboard.down('Space');await page.waitForFunction(()=>window.labyrinthDiagnostics.attackCooldown>0);await page.keyboard.up('Space');await page.waitForFunction(()=>window.labyrinthDiagnostics.attackCooldown===0);}
assert.ok((await diagnostics()).enemies<4,'combat defeats a real guard');assert.ok((await diagnostics()).fragments[1]>=1,'guard drops mechanism part');
await page.screenshot({path:'artifacts/labyrinth-combat.png'});
// Crossing back to the permanent world resets the changing side without deleting the base.
const crossing=newGame();crossing.x=25*TILE+10;crossing.y=16*TILE+32;crossing.cells['9,15']={floor:true};crossing.removed=generateWorld(0).nodes.filter(n=>Math.hypot(n.x-25,n.y-16)<3).map(n=>n.id);
await load(crossing);await page.keyboard.down('a');await page.waitForFunction(()=>window.labyrinthDiagnostics.cycle===1);await page.keyboard.up('a');assert.equal((await diagnostics()).cycle,1);assert.equal((await diagnostics()).cells['9,15'].floor,true);
assert.deepEqual(errors,[]);console.log('PASS: floor/station placement, outdoor and indoor smelting, duplicate salvage, blueprint assembly, forging weapon and armor, save restoration, combat loot, world cycle/base retention.');await browser.close();
