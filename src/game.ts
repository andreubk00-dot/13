import Phaser from 'phaser';
import {makeArt} from './art';
import {paintGround,paintBuildings,paintStructure} from './rendering';
import {TILE,WIDTH,HEIGHT,EDGE,key,generateWorld,newGame,parseSave,costs,spend,canAfford,placementError,isSheltered,wearStation,buildNames,resourceNames,emptyBag,fragmentNames,type Build,type Resource,type SaveData,type WorldNode,type Station,type Fragment,structureBlocked,inventoryItems,BACKPACK_SLOTS,gearInfo,equip,equipmentDefense,canAdd,recipeError,biomeAt,biomeNames,type GearId,type EquipmentSlot,validHotbarValue,roofCoversPoint,collectLoot,emptyGear,type GroundLoot} from './world';
export const SAVE_KEY='living-labyrinth-v1';
type LiveNode={data:WorldNode;sprite:Phaser.GameObjects.Sprite};
type Enemy={id:string;sprite:Phaser.GameObjects.Sprite;hp:number;elite:boolean;homeX:number;homeY:number;wind:number;cooldown:number;flash:number};
export class WorldScene extends Phaser.Scene {
 state:SaveData=newGame(); actor!:Phaser.GameObjects.Sprite; grounds!:Phaser.GameObjects.Graphics; buildings!:Phaser.GameObjects.Graphics; roofs!:Phaser.GameObjects.Graphics; ghost!:Phaser.GameObjects.Graphics;gear!:Phaser.GameObjects.Graphics;
 lootSprites=new Map<string,Phaser.GameObjects.Sprite>();groundTiles:Phaser.GameObjects.Image[]=[];worldData=generateWorld(0);doorOpen=new Map<string,number>();nodeIndex=new Map<string,LiveNode>();ruinIndex=new Set<string>();uiBlocked=false;selectedRotation:0|1=0;onQuickSlot:(i:number)=>void=()=>{};nodes:LiveNode[]=[];enemies:Enemy[]=[];ruins:{x:number;y:number}[]=[];dismantling=false;ambientTimer=0;keys!:Record<string,Phaser.Input.Keyboard.Key>;stamina=100;paused=true;selected:Build|null=null;activeTool='gather';facing={x:1,y:0};attackTimer=0;hurtTimer=0;dashTimer=0;saveTimer=0;uiTimer=0;walkTime=0;wasDanger=false;excursion=false;mobile={x:0,y:0};mouseTile={x:0,y:0};hasMouse=false;storageAvailable=true;onUI:()=>void=()=>{};onToast:(text:string,bad?:boolean)=>void=()=>{};onStation:(station:Station,k:string)=>void=()=>{};onPanel:()=>void=()=>{};audio:AudioContext|null=null;soundEnabled=false;stationKey:string|null=null;groundCycle=-1;
 constructor(){super('world');}
 create(){
  try{const raw=localStorage.getItem(SAVE_KEY);const loaded=parseSave(raw);if(loaded){this.state=loaded;if(raw&&JSON.parse(raw).version===1&&!localStorage.getItem(SAVE_KEY+'-backup'))localStorage.setItem(SAVE_KEY+'-backup',raw);}else if(raw)this.onToast('Сохранение повреждено. Начат новый мир.',true);}catch{this.storageAvailable=false;}
  this.worldData=generateWorld(this.state.cycle);this.ruins=this.worldData.ruins;makeArt(this);this.grounds=this.add.graphics().setDepth(-100);this.buildings=this.add.graphics().setDepth(1);this.roofs=this.add.graphics().setDepth(10000);this.ghost=this.add.graphics().setDepth(10001);this.gear=this.add.graphics();
  this.drawGround();this.drawBuildings();this.loadEntities();
  this.actor=this.add.sprite(this.state.x,this.state.y,'player-front-0').setOrigin(.5,.85).setDepth(this.state.y);
  this.cameras.main.setBounds(0,0,WIDTH*TILE,HEIGHT*TILE);this.cameras.main.startFollow(this.actor,true,.08,.08);this.cameras.main.setZoom(innerWidth<600?1:1.05);
  this.keys=this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE,SHIFT,B,C,ESC,I,TAB,R,ONE,TWO,THREE,FOUR,FIVE,SIX,SEVEN,EIGHT') as Record<string,Phaser.Input.Keyboard.Key>;
  this.input.keyboard!.addCapture(['SPACE','UP','DOWN','LEFT','RIGHT','TAB']);
  this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{this.hasMouse=true;this.mouseTile={x:Math.floor(p.worldX/TILE),y:Math.floor(p.worldY/TILE)};});
  this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{if(this.paused||this.uiBlocked)return;this.hasMouse=true;this.mouseTile={x:Math.floor(p.worldX/TILE),y:Math.floor(p.worldY/TILE)};if(this.dismantling)this.dismantle(this.mouseTile.x,this.mouseTile.y);else if(this.selected)this.build(this.mouseTile.x,this.mouseTile.y);else{const dx=p.worldX-this.actor.x,dy=p.worldY-this.actor.y;const l=Math.hypot(dx,dy)||1;this.facing={x:dx/l,y:dy/l};this.attack();}});
  this.events.once('shutdown',()=>{this.input.keyboard?.removeAllListeners();});
  this.drawEquipment();this.wasDanger=this.state.x>=EDGE*TILE;this.excursion=this.wasDanger;this.onUI();
 }
 drawGround(){
  this.grounds.setVisible(true);paintGround(this);
  // Rasterize static terrain once, then use small GPU textures that fit mobile limits.
  const canvas=document.createElement('canvas');canvas.width=WIDTH*TILE;canvas.height=HEIGHT*TILE;
  this.grounds.generateTexture(canvas,canvas.width,canvas.height);this.grounds.clear().setVisible(false);
  for(const tile of this.groundTiles){const textureKey=tile.texture.key;tile.destroy();this.textures.remove(textureKey);}this.groundTiles=[];
  for(let x=0;x<canvas.width;x+=512)for(let y=0;y<canvas.height;y+=512){
   const width=Math.min(512,canvas.width-x),height=Math.min(512,canvas.height-y),id=`terrain-${x}-${y}`;
   const texture=this.textures.createCanvas(id,width,height)!;texture.getContext().drawImage(canvas,x,y,width,height,0,0,width,height);texture.refresh();
   this.groundTiles.push(this.add.image(x,y,id).setOrigin(0).setDepth(-100));
  }
 }

 drawBuildings(){paintBuildings(this);}
 loadEntities(){
  this.nodes.forEach(n=>n.sprite.destroy());this.enemies.forEach(e=>e.sprite.destroy());this.nodes=[];this.enemies=[];
  const w=this.worldData=generateWorld(this.state.cycle);this.ruins=w.ruins;this.ruinIndex=new Set(w.ruins.map(p=>key(p.x,p.y)));this.nodeIndex.clear();for(const sprite of this.lootSprites.values())sprite.destroy();this.lootSprites.clear();for(const loot of this.state.drops)this.drawLoot(loot);
  for(const n of w.nodes){if(this.state.removed.includes(n.id)||this.state.cells[key(n.x,n.y)])continue;const variant=biomeAt(n.x,n.y)==='quarry'?3:(n.variant||0)%3;const texture=n.kind==='tree'?'tree'+variant:n.kind==='relic'?'relic':n.kind+(n.variant||0)%2;const s=this.add.sprite(n.x*TILE+32,n.y*TILE+48,texture).setOrigin(.5,n.kind==='tree'?.89:.85).setDepth(n.y*TILE+48);const live={data:{...n},sprite:s};this.nodes.push(live);this.nodeIndex.set(key(n.x,n.y),live);}
  for(const e of w.enemies){if(this.state.dead.includes(e.id))continue;const s=this.add.sprite(e.x*TILE+32,e.y*TILE+32,e.elite?'warden':'guard').setOrigin(.5,.85).setDepth(e.y*TILE+32);if(e.elite)s.setScale(1.3);this.enemies.push({id:e.id,sprite:s,hp:e.hp,elite:e.elite,homeX:s.x,homeY:s.y,wind:0,cooldown:0,flash:0});}
 }
 solid(x:number,y:number,body=13){
  if(x<body||y<body||x>WIDTH*TILE-body||y>HEIGHT*TILE-body)return true;
  if(structureBlocked(this.state.cells,x,y,body))return true;
  const gx=Math.floor(x/TILE),gy=Math.floor(y/TILE);
  for(let cx=gx-1;cx<=gx+1;cx++)for(let cy=gy-1;cy<=gy+1;cy++){
   if(this.ruinIndex.has(key(cx,cy))&&Math.abs(cx*TILE+32-x)<31+body&&Math.abs(cy*TILE+32-y)<31+body)return true;
   const n=this.nodeIndex.get(key(cx,cy));if(n&&n.data.kind!=='relic'&&Math.hypot(n.sprite.x-x,n.sprite.y-y)<(n.data.kind==='tree'?16:24)+body)return true;
  }
  return false;
 }
 move(sprite:Phaser.GameObjects.Sprite,dx:number,dy:number){const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/6));for(let i=0;i<steps;i++){if(!this.solid(sprite.x+dx/steps,sprite.y))sprite.x+=dx/steps;if(!this.solid(sprite.x,sprite.y+dy/steps))sprite.y+=dy/steps;}}
 update(_time:number,delta:number){
  if(!this.actor||this.paused||this.uiBlocked)return;const dt=Math.min(delta,100)/1000;
  this.state.time+=dt;this.attackTimer=Math.max(0,this.attackTimer-dt);this.hurtTimer=Math.max(0,this.hurtTimer-dt);this.dashTimer=Math.max(0,this.dashTimer-dt);
  let dx=(this.keys.D.isDown||this.keys.RIGHT.isDown?1:0)-(this.keys.A.isDown||this.keys.LEFT.isDown?1:0)+this.mobile.x,dy=(this.keys.S.isDown||this.keys.DOWN.isDown?1:0)-(this.keys.W.isDown||this.keys.UP.isDown?1:0)+this.mobile.y;
  const moving=Math.hypot(dx,dy)>0;if(moving){const l=Math.hypot(dx,dy);dx/=l;dy/=l;this.facing={x:dx,y:dy};this.walkTime+=dt;}
  if(Phaser.Input.Keyboard.JustDown(this.keys.SHIFT))this.dash();
  const speed=this.dashTimer>0?590:185;this.move(this.actor,(this.dashTimer>0?this.facing.x:dx)*speed*dt,(this.dashTimer>0?this.facing.y:dy)*speed*dt);
  const direction=Math.abs(this.facing.y)>Math.abs(this.facing.x)*.7?(this.facing.y<0?'back':'front'):'side';const frame=moving?Math.floor(this.walkTime*11)%8:0;this.actor.setTexture(`player-${direction}-${frame}`).setFlipX(direction==='side'&&this.facing.x<0).setDepth(this.actor.y);if(this.attackTimer<.17)this.actor.setScale(1,1+Math.sin(this.state.time*2)*.005).setRotation(0);
  this.actor.setAlpha(this.hurtTimer>.1?Math.sin(this.state.time*45)>.0?.35:.9:1);this.stamina=Math.min(100,this.stamina+dt*19);
  if(Phaser.Input.Keyboard.JustDown(this.keys.E))this.interact();if(Phaser.Input.Keyboard.JustDown(this.keys.SPACE)){if(this.dismantling)this.dismantle(Math.floor((this.actor.x+this.facing.x*70)/TILE),Math.floor((this.actor.y+this.facing.y*70)/TILE));else if(this.selected)this.placeAhead();else this.attack();}
  if(Phaser.Input.Keyboard.JustDown(this.keys.B))this.chooseTool('build');
  if(Phaser.Input.Keyboard.JustDown(this.keys.I)||Phaser.Input.Keyboard.JustDown(this.keys.TAB))this.chooseTool('bag');
  if(Phaser.Input.Keyboard.JustDown(this.keys.C))this.openForge();
  if(Phaser.Input.Keyboard.JustDown(this.keys.R))this.rotateSelection();
  if(Phaser.Input.Keyboard.JustDown(this.keys.ESC)){this.selected=null;this.dismantling=false;this.activeTool='gather';this.onUI();}
  ['ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT'].forEach((k,i)=>{if(Phaser.Input.Keyboard.JustDown(this.keys[k]))this.onQuickSlot(i);});
  this.updateEnemies(dt);
  this.ambientTimer+=dt;
  for(const n of this.nodes)if(Math.abs(n.sprite.x-this.actor.x)<1000&&Math.abs(n.sprite.y-this.actor.y)<800&&n.data.kind==='tree'&&!this.tweens.isTweening(n.sprite)){
   n.sprite.setRotation(Math.sin(this.state.time*1.2+n.data.x)*.012);
   let hidesBuilding=false;for(let x=n.data.x-1;x<=n.data.x+1;x++)for(let y=n.data.y-2;y<=n.data.y;y++)if(this.state.cells[key(x,y)])hidesBuilding=true;
   const hidesPlayer=Math.abs(this.actor.x-n.sprite.x)<54&&this.actor.y<n.sprite.y+15&&this.actor.y>n.sprite.y-135;
   n.sprite.setAlpha(Phaser.Math.Linear(n.sprite.alpha,(hidesBuilding||hidesPlayer) ? .38 : 1,Math.min(1,dt*8)));
  }
  if(this.ambientTimer>.7){this.ambientTimer=0;for(const [k,c]of Object.entries(this.state.cells)){if(c.station?.kind!=='furnace'||c.station.durability<=0)continue;const [x,y]=k.split(',').map(Number);if(Math.hypot(this.actor.x-x*TILE,this.actor.y-y*TILE)>800)continue;const smoke=this.add.circle(x*TILE+43,y*TILE-9,5,0xd4d0b3,.35).setDepth(y*TILE+70);this.tweens.add({targets:smoke,x:x*TILE+52,y:y*TILE-60,alpha:0,scaleX:2,scaleY:2,duration:1500,onComplete:()=>smoke.destroy()});}}

  const danger=this.actor.x>=EDGE*TILE;if(danger&&!this.wasDanger){this.excursion=true;this.onToast('За разломом. Части чертежа находятся здесь.',true);}
  if(!danger&&this.wasDanger&&this.excursion){this.excursion=false;this.state.cycle++;this.state.removed=this.state.removed.filter(id=>id.startsWith('s'));this.state.dead=[];this.loadEntities();this.drawGround();this.state.hp=Math.min(100,this.state.hp+25);this.onToast('Ты вернулся. Лабиринт перестроился · здоровье +25');this.save();}
  this.wasDanger=danger;this.state.x=this.actor.x;this.state.y=this.actor.y;
  const cell=this.state.cells[key(Math.floor(this.actor.x/TILE),Math.floor(this.actor.y/TILE))];this.roofs.setAlpha(roofCoversPoint(this.state.cells,this.actor.x,this.actor.y) ? .12 : .95);
  let doorChanged=false;for(const [k,c]of Object.entries(this.state.cells)){if(!c.door)continue;const [x,y]=k.split(',').map(Number),near=Math.hypot((x+.5)*TILE-this.actor.x,(y+.5)*TILE-this.actor.y)<98;const old=this.doorOpen.get(k)||0,next=Phaser.Math.Clamp(old+(near?dt*6:-dt*5),0,1);if(Math.abs(next-old)>.001){this.doorOpen.set(k,next);doorChanged=true;}}if(doorChanged)this.drawBuildings();
  this.drawEquipment();this.drawGhost();this.uiTimer+=dt;this.saveTimer+=dt;if(this.uiTimer>.12){this.uiTimer=0;this.onUI();}if(this.saveTimer>5){this.saveTimer=0;this.save();}
 }
 updateEnemies(dt:number){
  for(const e of [...this.enemies]){
   e.cooldown=Math.max(0,e.cooldown-dt);const dx=this.actor.x-e.sprite.x,dy=this.actor.y-e.sprite.y,d=Math.hypot(dx,dy);
   if(e.wind>0){e.wind-=dt;e.sprite.setTint(0xffbf97);if(e.wind<=0){e.sprite.clearTint();e.cooldown=e.elite?1.4:1.0;this.enemySwing(e);if(d<(e.elite?100:74)&&this.dashTimer<=0&&this.hurtTimer<=0){const damage=Math.max(3,(e.elite?26:14)-equipmentDefense(this.state));this.state.hp-=damage;this.hurtTimer=.8;this.cameras.main.shake(140,.003);this.playTone(95,.12);this.floatText(this.actor.x,this.actor.y-50,'−'+damage,'#efac94');if(this.state.hp<=0){this.die();return;}}}}
   else if(d<65&&e.cooldown<=0){e.wind=e.elite?.65:.48;}
   else if(d<360&&d>48){const direction=this.enemyDirection(e,dx,dy,d);this.move(e.sprite,direction.x*(e.elite?78:100)*dt,direction.y*(e.elite?78:100)*dt);e.sprite.setRotation(Math.sin(this.state.time*9)*.04);}
   else if(d>450){const hx=e.homeX-e.sprite.x,hy=e.homeY-e.sprite.y,hd=Math.hypot(hx,hy);if(hd>10)this.move(e.sprite,hx/hd*60*dt,hy/hd*60*dt);}
   e.sprite.setDepth(e.sprite.y).setFlipX(dx<0);
  }
 }
 enemyDirection(e:Enemy,dx:number,dy:number,d:number){
  const step=28;
  if(!this.solid(e.sprite.x+dx/d*step,e.sprite.y+dy/d*step))return {x:dx/d,y:dy/d};
  const sx=Math.floor(e.sprite.x/TILE),sy=Math.floor(e.sprite.y/TILE),tx=Math.floor(this.actor.x/TILE),ty=Math.floor(this.actor.y/TILE);
  const queue:{x:number;y:number;first?:{x:number;y:number}}[]=[{x:sx,y:sy}],seen=new Set([key(sx,sy)]);
  for(let i=0;i<queue.length&&i<600;i++){
   const v=queue[i];if(v.x===tx&&v.y===ty&&v.first){const nx=(v.first.x+.5)*TILE-e.sprite.x,ny=(v.first.y+.5)*TILE-e.sprite.y,l=Math.hypot(nx,ny)||1;return {x:nx/l,y:ny/l};}
   for(const [ox,oy]of [[1,0],[-1,0],[0,1],[0,-1]]){const x=v.x+ox,y=v.y+oy,k=key(x,y);if(seen.has(k)||x<EDGE||y<1||x>=WIDTH-1||y>=HEIGHT-1||this.solid((x+.5)*TILE,(y+.5)*TILE))continue;seen.add(k);queue.push({x,y,first:v.first||{x,y}});}
  }
  return {x:0,y:0};
 }
 enemySwing(e:Enemy){const g=this.add.graphics().setDepth(e.sprite.y+100);g.lineStyle(e.elite?7:4,0xe7a992,.75).strokeCircle(e.sprite.x,e.sprite.y-16,e.elite?67:47);this.tweens.add({targets:g,alpha:0,duration:220,onComplete:()=>g.destroy()});}
 attack(){
  if(this.attackTimer>0||this.paused||this.uiBlocked)return;if(this.stamina<12){this.onToast('Нужно перевести дух',true);return;}this.stamina-=12;this.attackTimer=.4;
  const {x,y}=this.actor;const angle=Math.atan2(this.facing.y,this.facing.x);const color=this.state.weapon==='storm'?0xa6e3d5:0xe5cf9b;
  const arc=this.add.graphics().setDepth(y+200);arc.lineStyle(this.state.weapon==='hands'?4:7,color,.85);arc.beginPath();arc.arc(x,y-18,this.state.weapon==='hands'?42:68,angle-.8,angle+.8);arc.strokePath();this.tweens.add({targets:arc,alpha:0,duration:240,onComplete:()=>arc.destroy()});
  this.tweens.add({targets:this.actor,scaleX:1.12,scaleY:.9,duration:80,yoyo:true});this.playTone(this.state.weapon==='storm'?520:240,.06);
  const reach=this.state.weapon==='hands'?76:112;
  let hit=false;
  for(const e of [...this.enemies]){const dx=e.sprite.x-x,dy=e.sprite.y-y,d=Math.hypot(dx,dy);if(d<reach&&(dx*this.facing.x+dy*this.facing.y)/Math.max(d,1)>-.2){hit=true;const damage=this.state.weapon==='storm'?38:this.state.weapon==='spear'?20:9;e.hp-=damage;this.floatText(e.sprite.x,e.sprite.y-63,String(damage),'#ead7a4');e.sprite.setTint(0xffffff);this.time.delayedCall(100,()=>e.sprite.active&&e.sprite.clearTint());this.move(e.sprite,this.facing.x*12,this.facing.y*12);if(e.hp<=0)this.kill(e);}}
  if(!hit){const node=this.closestNode(90);if(node&&node.data.kind!=='relic')this.harvest(node);}
 }
 kill(e:Enemy){
  this.state.dead.push(e.id);const loot:GroundLoot={id:'loot-'+Date.now()+'-'+e.id,x:e.sprite.x,y:e.sprite.y,bag:{...emptyBag(),ore:e.elite?5:2,spark:e.elite?2:1},fragments:[0,1,0],gear:emptyGear()};const received=collectLoot(this.state,loot);if(!received){this.state.drops.push(loot);this.drawLoot(loot);}
  this.burst(e.sprite.x,e.sprite.y,0xe5b884);this.enemies=this.enemies.filter(v=>v!==e);this.tweens.add({targets:e.sprite,alpha:0,scaleX:.2,scaleY:.2,duration:260,onComplete:()=>e.sprite.destroy()});this.onToast(received?'Механизм чертежа +1 · искра +'+(e.elite?2:1):'Рюкзак заполнен. Добыча осталась на земле.',!received);this.save();
 }
 closestNode(range:number){return this.nodes.filter(n=>Math.hypot(n.sprite.x-this.actor.x,n.sprite.y-this.actor.y)<range).sort((a,b)=>Math.hypot(a.sprite.x-this.actor.x,a.sprite.y-this.actor.y)-Math.hypot(b.sprite.x-this.actor.x,b.sprite.y-this.actor.y))[0];}
 harvest(n:LiveNode){
  if(this.attackTimer<=0){this.attackTimer=.32;this.playTone(n.data.kind==='tree'?180:400,.035);}n.data.hp--;
  this.tweens.add({targets:this.actor,scaleX:1.07,scaleY:.92,duration:80,yoyo:true});this.tweens.add({targets:n.sprite,angle:5,duration:55,yoyo:true,repeat:1});this.burst(n.sprite.x,n.sprite.y-35,n.data.kind==='tree'?0xa5b57f:0xa6a995,4);
  if(n.data.hp<=0){const res:Resource=n.data.kind==='tree'?'wood':n.data.kind==='ore'?'ore':'stone';const qty=res==='wood'?6:res==='ore'?4:5;if(!canAdd(this.state,res,qty)){n.data.hp=1;this.onToast('Рюкзак заполнен. Убери материалы в сундук.',true);return;}this.state.bag[res]+=qty;this.floatText(n.sprite.x,n.sprite.y-60,`+${qty} ${resourceNames[res]}`,'#e2d3a5');this.state.removed.push(n.data.id);this.nodeIndex.delete(key(n.data.x,n.data.y));this.nodes=this.nodes.filter(v=>v!==n);this.tweens.add({targets:n.sprite,alpha:0,scaleX:.8,scaleY:.6,duration:250,onComplete:()=>n.sprite.destroy()});this.save();}
 }
 interact(){
  if(this.paused||this.uiBlocked)return;let nearest:{k:string;s:Station;d:number}|null=null;
  for(const [k,c] of Object.entries(this.state.cells)){if(!c.station)continue;const [x,y]=k.split(',').map(Number),d=Math.hypot((x+.5)*TILE-this.actor.x,(y+.5)*TILE-this.actor.y);if(d<115&&(!nearest||d<nearest.d))nearest={k,s:c.station,d};}
  const dropped=this.state.drops.filter(d=>Math.hypot(d.x-this.actor.x,d.y-this.actor.y)<95).sort((a,b)=>Math.hypot(a.x-this.actor.x,a.y-this.actor.y)-Math.hypot(b.x-this.actor.x,b.y-this.actor.y))[0];if(dropped&&(!nearest||Math.hypot(dropped.x-this.actor.x,dropped.y-this.actor.y)<nearest.d)){if(!collectLoot(this.state,dropped)){this.onToast('Освободи место в рюкзаке',true);return;}this.state.drops=this.state.drops.filter(d=>d.id!==dropped.id);this.lootSprites.get(dropped.id)?.destroy();this.lootSprites.delete(dropped.id);this.onToast('Добыча подобрана');this.save();this.onUI();return;}
  if(nearest){this.stationKey=nearest.k;this.onStation(nearest.s,nearest.k);return;}
  const n=this.closestNode(95);if(!n){this.onToast('Подойди к дереву, камню или рабочей станции');return;}
  if(n.data.kind==='relic'){if(this.enemies.some(e=>Math.hypot(e.sprite.x-n.sprite.x,e.sprite.y-n.sprite.y)<190)){this.onToast('Сначала справься со стражем руин',true);return;}
   const f=n.data.fragment as Fragment;const fragments=[...this.state.fragments];fragments[f]++;if(inventoryItems({...this.state,fragments}).length>BACKPACK_SLOTS){this.onToast('Освободи место для части чертежа',true);return;}this.state.fragments=fragments;this.state.removed.push(n.data.id);this.nodeIndex.delete(key(n.data.x,n.data.y));this.nodes=this.nodes.filter(v=>v!==n);this.burst(n.sprite.x,n.sprite.y-30,0xffd59a,16);n.sprite.destroy();this.onToast('Найдена часть: '+fragmentNames[f]);this.playTone(740,.2);this.save();
  }else if(this.attackTimer<=0)this.harvest(n);
 }
 dash(){if(this.paused||this.uiBlocked||this.dashTimer>0||this.stamina<30)return;this.stamina-=30;this.dashTimer=.2;this.burst(this.actor.x,this.actor.y,0xc3d2b5,6);this.playTone(170,.08);}
 chooseTool(tool:string){this.activeTool=tool;this.selected=null;this.dismantling=false;if(tool==='build'||tool==='bag'||tool==='map')this.onPanel();else this.onUI();}
 placeAhead(){if(this.selected){const x=Math.floor((this.actor.x+this.facing.x*70)/TILE),y=Math.floor((this.actor.y+this.facing.y*70)/TILE);this.build(x,y);}}
 canBuild(x:number,y:number,b:Build){
  if(Math.hypot((x+.5)*TILE-this.actor.x,(y+.5)*TILE-this.actor.y)>TILE*4)return 'Подойди ближе к месту строительства';
  if((b==='wall'||b==='fence'||b==='furnace'||b==='forge'||b==='chest')&&Math.floor(this.actor.x/TILE)===x&&Math.floor(this.actor.y/TILE)===y)return 'Нельзя строить на месте персонажа';
  const occupied=this.nodes.some(n=>n.data.x===x&&n.data.y===y);
  return placementError(this.state.cells,x,y,b,occupied);
 }
 build(x:number,y:number){
  const b=this.selected;if(!b)return;const error=this.canBuild(x,y,b);if(error){this.onToast(error,true);return;}if(!spend(this.state.bag,costs[b])){this.onToast('Не хватает материалов',true);return;}
  const c=this.state.cells[key(x,y)]??={};if(b==='furnace'||b==='forge'||b==='chest')c.station={kind:b,durability:100};else {c[b]=true;if(b==='wall'||b==='door'||b==='fence')c.rotation=this.selectedRotation;}
  this.drawBuildings();this.burst(x*TILE+32,y*TILE+32,0xd5c997,10);const ring=this.add.graphics().setDepth(10002);ring.lineStyle(2,0xe4d6a6).strokeRect(x*TILE,y*TILE,TILE,TILE);this.tweens.add({targets:ring,alpha:0,duration:350,onComplete:()=>ring.destroy()});this.playTone(330,.07);this.save();this.onUI();
 }
 dismantle(x:number,y:number){
  if(Math.hypot((x+.5)*TILE-this.actor.x,(y+.5)*TILE-this.actor.y)>TILE*4){this.onToast('Подойди ближе',true);return;}
  const c=this.state.cells[key(x,y)];if(!c){this.onToast('Здесь нечего разбирать');return;}
  let part:Build|undefined;
  if(c.roof){delete c.roof;part='roof';}else if(c.station){part=c.station.kind;delete c.station;}else for(const b of ['wall','door','fence','floor'] as const){if(c[b]){delete c[b];part=b;break;}}
  if(!c.wall&&!c.door&&!c.fence)delete c.rotation;if(Object.keys(c).length===0)delete this.state.cells[key(x,y)];
  this.drawBuildings();this.burst(x*TILE+32,y*TILE+32,0xc7b381);this.save();this.onToast(`${part?buildNames[part]:'Постройка'} разобрана · материалы не возвращаются`);this.onUI();
 }
 rotateSelection(){if(!this.selected)return;this.selectedRotation=this.selectedRotation===0?1:0;this.onUI();}
 openForge(){const entry=this.nearStation('forge');if(!entry){this.onToast('Крафт и чертежи доступны только у кузницы',true);return;}this.stationKey=entry[0];this.onStation(entry[1].station!,entry[0]);}
 nearStation(kind:string){return Object.entries(this.state.cells).find(([k,c])=>{const [x,y]=k.split(',').map(Number);return c.station?.kind===kind&&Math.hypot((x+.5)*TILE-this.actor.x,(y+.5)*TILE-this.actor.y)<115;});}
 equipItem(id:GearId|null,slot:EquipmentSlot){if(!equip(this.state,id,slot)){this.onToast('Нельзя надеть предмет или рюкзак заполнен',true);return;}this.save();this.drawEquipment();this.onUI();}
 reorderItem(from:string,to:string){const ids=inventoryItems(this.state).map(i=>i.id);const a=ids.indexOf(from),b=ids.indexOf(to);if(a<0||b<0)return;ids.splice(a,1);ids.splice(b,0,from);this.state.inventoryOrder=ids;this.save();this.onUI();}
 drawLoot(loot:GroundLoot){const sprite=this.add.sprite(loot.x,loot.y,'loot').setOrigin(.5,.85).setDepth(loot.y);this.lootSprites.set(loot.id,sprite);}
 dropItem(id:string){const item=inventoryItems(this.state).find(i=>i.id===id);if(!item)return;
  const loot:GroundLoot={id:'dropped-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),x:this.actor.x+this.facing.x*32,y:this.actor.y+this.facing.y*32,bag:emptyBag(),fragments:[0,0,0],gear:emptyGear()};
  if(item.kind==='fragment'){this.state.fragments[item.fragment!]-=item.quantity;loot.fragments[item.fragment!]=item.quantity;}
  else if(item.kind in gearInfo){this.state.gear[item.kind as GearId]--;loot.gear[item.kind as GearId]=1;}
  else{this.state.bag[item.kind as Resource]-=item.quantity;loot.bag[item.kind as Resource]=item.quantity;}
  this.state.drops.push(loot);this.drawLoot(loot);this.save();this.onUI();this.onToast('Предмет оставлен на земле · E — подобрать');
 }
 assignHotbar(index:number,value:string){if(index<0||index>7||!validHotbarValue(value))return;this.state.hotbar[index]=value;this.save();this.onUI();}
 drawEquipment(){
  const g=this.gear;g.clear();g.setDepth(this.actor.y+1).setAlpha(this.actor.alpha);const x=this.actor.x,y=this.actor.y;
  if(this.state.equipment.body){g.fillStyle(0x77999a).fillRoundedRect(x-9,y-41,19,19,5);g.lineStyle(1,0xc0d2ba).lineBetween(x-6,y-38,x+7,y-38).lineBetween(x+1,y-37,x+1,y-27);}
  if(this.state.equipment.head){g.fillStyle(0x7d9899).fillRoundedRect(x-12,y-68,25,13,6);g.lineStyle(2,0xc1cfb5).lineBetween(x,y-66,x,y-58);}
  if(this.state.equipment.feet){g.fillStyle(0x79948e).fillRoundedRect(x-11,y-8,11,5,2).fillRoundedRect(x+4,y-8,11,5,2);}
  if(this.state.weapon==='hands')return;
  const direction=this.facing.x<0?-1:1,swing=this.attackTimer>0?Math.sin((.4-this.attackTimer)/.4*Math.PI)*1.5:0;
  const angle=-.95*direction+swing*direction,length=this.state.weapon==='spear'?45:34,hx=x+direction*17,hy=y-28,tx=hx+Math.cos(angle)*length*direction,ty=hy+Math.sin(angle)*length*direction,nx=-Math.sin(angle)*direction,ny=Math.cos(angle)*direction;
  g.lineStyle(this.state.weapon==='spear'?3:5,this.state.weapon==='spear'?0xb49264:0x88caba).lineBetween(hx,hy,tx,ty);
  g.fillStyle(this.state.weapon==='spear'?0xb6c7b8:0xd6f3d2).fillTriangle(tx+Math.cos(angle)*8*direction,ty+Math.sin(angle)*8*direction,tx+nx*5,ty+ny*5,tx-nx*5,ty-ny*5);
  if(this.state.weapon==='storm')g.lineStyle(3,0xd4b880).lineBetween(hx+nx*7,hy+ny*7,hx-nx*7,hy-ny*7);
 }
 drawGhost(){
  const g=this.ghost;g.clear();if(!this.selected&&!this.dismantling)return;
  const x=this.hasMouse?this.mouseTile.x:Math.floor((this.actor.x+this.facing.x*70)/TILE),y=this.hasMouse?this.mouseTile.y:Math.floor((this.actor.y+this.facing.y*70)/TILE);
  const valid=this.dismantling?!!this.state.cells[key(x,y)]:!!this.selected&&!this.canBuild(x,y,this.selected)&&canAfford(this.state.bag,costs[this.selected]);
  for(let dx=-4;dx<=4;dx++)for(let dy=-4;dy<=4;dy++){const cx=Math.floor(this.actor.x/TILE)+dx,cy=Math.floor(this.actor.y/TILE)+dy;g.lineStyle(1,0xb5c8a7,.15).strokeRect(cx*TILE,cy*TILE,TILE,TILE);}
  if(this.selected&&(this.selected==='wall'||this.selected==='fence'||this.selected==='door')){const preview={...this.state.cells,[key(x,y)]:{[this.selected]:true,rotation:this.selectedRotation}};paintStructure(g,preview,x,y,this.selected);}
  g.fillStyle(valid?0xd9c793:0xd58a80,.25).fillRect(x*TILE,y*TILE,TILE,TILE);g.lineStyle(2,valid?0xe7d6a2:0xe0a199).strokeRect(x*TILE+1,y*TILE+1,TILE-2,TILE-2);
 }
 craft(recipe:string){
  if(this.paused)return;
  const expected=recipe==='iron'?'furnace':'forge',target=Object.entries(this.state.cells).find(([k,c])=>k===this.stationKey&&c.station?.kind===expected);
  const distance=target?(()=>{const [x,y]=target[0].split(',').map(Number);return Math.hypot((x+.5)*TILE-this.actor.x,(y+.5)*TILE-this.actor.y);})():Infinity;
  const error=recipeError(this.state,recipe,target?.[1].station,distance);if(error){this.onToast(error,true);return;}
  const station=target![1].station!;
  if(recipe==='blueprint'){this.state.fragments=this.state.fragments.map(n=>n-1);this.state.learned=true;this.onToast('Чертёж клинка бурь изучен');}
  else if(recipe==='salvage'){let total=0;const fragments=this.state.fragments.map(n=>{const extra=Math.max(0,n-(this.state.learned?0:1));total+=extra;return n-extra;});const next={...this.state,fragments,bag:{...this.state.bag,wood:this.state.bag.wood+total}};if(inventoryItems(next).length>BACKPACK_SLOTS){this.onToast('Освободи место для материалов',true);return;}this.state.fragments=fragments;this.state.bag=next.bag;this.onToast(`Дубликаты разобраны · древесина +${total}`);}
  else if(recipe==='iron'){const bag={...this.state.bag};spend(bag,{ore:2,wood:1});bag.iron++;if(inventoryItems({...this.state,bag}).length>BACKPACK_SLOTS){this.onToast('Рюкзак заполнен',true);return;}this.state.bag=bag;this.onToast('Железный слиток создан');}
  else{const id=recipe as GearId;const next={...this.state,gear:{...this.state.gear,[id]:this.state.gear[id]+1},bag:{...this.state.bag}};spend(next.bag,gearInfo[id].cost);if(inventoryItems(next).length>BACKPACK_SLOTS){this.onToast('Освободи место в рюкзаке',true);return;}this.state.bag=next.bag;this.state.gear=next.gear;this.onToast(`${gearInfo[id].name} создан · находится в рюкзаке`);}
  const [x,y]=target![0].split(',').map(Number);wearStation(station,isSheltered(this.state.cells,x,y));this.burst((x+.5)*TILE,(y+.5)*TILE,0xf3bc76,9);this.drawBuildings();this.playTone(620,.13);this.save();this.onUI();
 }
 repair(k:string){const s=this.state.cells[k]?.station;if(!s)return;const [x,y]=k.split(',').map(Number);if(Math.hypot((x+.5)*TILE-this.actor.x,(y+.5)*TILE-this.actor.y)>=115){this.onToast('Подойди к станции',true);return;}if(s.durability===100){this.onToast('Ремонт не требуется');return;}if(!spend(this.state.bag,{wood:2,stone:2})){this.onToast('Нужно 2 древесины и 2 камня',true);return;}s.durability=100;this.drawBuildings();this.save();this.onUI();this.onToast('Станция восстановлена');}
 transfer(deposit:boolean){
  const chest=Object.entries(this.state.cells).some(([k,c])=>{const [x,y]=k.split(',').map(Number);return c.station?.kind==='chest'&&Math.hypot((x+.5)*TILE-this.actor.x,(y+.5)*TILE-this.actor.y)<115;});if(!chest){this.onToast('Подойди к сундуку',true);return;}
  if(!deposit){const next={...this.state,bag:Object.fromEntries(Object.keys(emptyBag()).map(r=>[r,this.state.bag[r as Resource]+this.state.stash[r as Resource]])) as import('./world').Bag,fragments:this.state.fragments.map((n,i)=>n+this.state.stashFragments[i])};if(inventoryItems(next).length>BACKPACK_SLOTS){this.onToast('В рюкзаке недостаточно места',true);return;}}
  const from=deposit?this.state.bag:this.state.stash,to=deposit?this.state.stash:this.state.bag;for(const r of Object.keys(emptyBag()) as Resource[]){to[r]+=from[r];from[r]=0;}
  const ff=deposit?this.state.fragments:this.state.stashFragments,tf=deposit?this.state.stashFragments:this.state.fragments;ff.forEach((n,i)=>{tf[i]+=n;ff[i]=0;});this.save();this.onUI();this.onToast(deposit?'Материалы и части чертежей убраны в сундук':'Содержимое сундука забрано');
 }
 die(){this.state.hp=100;this.state.bag=Object.fromEntries(Object.entries(this.state.bag).map(([r,n])=>[r,Math.floor(n/2)])) as import('./world').Bag;this.state.fragments=[0,0,0];this.actor.setPosition(9*TILE+32,16*TILE+32);this.state.x=this.actor.x;this.state.y=this.actor.y;this.hurtTimer=2;this.state.cycle++;this.state.dead=[];this.state.removed=this.state.removed.filter(id=>id.startsWith('s'));this.loadEntities();this.drawGround();this.wasDanger=false;this.excursion=false;this.onToast('Ты очнулся у убежища. Половина материалов и все части в рюкзаке потеряны.',true);this.save();}
 save(){if(!this.actor)return;this.state.x=this.actor.x;this.state.y=this.actor.y;try{localStorage.setItem(SAVE_KEY,JSON.stringify(this.state));this.storageAvailable=true;}catch{this.storageAvailable=false;}}
 reset(){try{localStorage.removeItem(SAVE_KEY);}catch{}this.state=newGame();this.actor.setPosition(this.state.x,this.state.y);this.stamina=100;this.wasDanger=false;this.excursion=false;this.selected=null;this.dismantling=false;this.doorOpen.clear();this.drawBuildings();this.drawGround();this.loadEntities();this.save();this.onUI();}
 floatText(x:number,y:number,text:string,color:string){const t=this.add.text(x,y,text,{fontFamily:'Manrope, sans-serif',fontSize:'13px',color,stroke:'#1a3033',strokeThickness:3}).setOrigin(.5).setDepth(10010);this.tweens.add({targets:t,y:y-45,alpha:0,duration:1100,ease:'Cubic.Out',onComplete:()=>t.destroy()});}
 burst(x:number,y:number,color:number,count=8){for(let i=0;i<count;i++){const g=this.add.rectangle(x,y-15,3+Math.random()*3,3+Math.random()*3,color).setDepth(10005);this.tweens.add({targets:g,x:x+(Math.random()-.5)*80,y:y-15-Math.random()*60,alpha:0,angle:120,duration:350+Math.random()*250,onComplete:()=>g.destroy()});}}
 playTone(freq:number,duration:number){if(!this.soundEnabled)return;try{this.audio??=new AudioContext();void this.audio.resume();const o=this.audio.createOscillator(),g=this.audio.createGain();o.type='triangle';o.frequency.setValueAtTime(freq,this.audio.currentTime);o.frequency.exponentialRampToValueAtTime(freq*.55,this.audio.currentTime+duration);g.gain.setValueAtTime(.035,this.audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,this.audio.currentTime+duration);o.connect(g);g.connect(this.audio.destination);o.start();o.stop(this.audio.currentTime+duration);}catch{this.soundEnabled=false;}}
 hint(){
  if(this.dismantling)return 'Разбор: нажми на постройку · материалы не возвращаются';
  if(this.selected)return `Строительство: ${buildNames[this.selected]} · щелчок по клетке`;
  const station=Object.entries(this.state.cells).filter(([,c])=>c.station).map(([k,c])=>{const [x,y]=k.split(',').map(Number);return {s:c.station!,d:Math.hypot((x+.5)*TILE-this.actor.x,(y+.5)*TILE-this.actor.y)};}).filter(e=>e.d<115).sort((a,b)=>a.d-b.d)[0];
  const drop=this.state.drops.map(d=>Math.hypot(d.x-this.actor.x,d.y-this.actor.y)).filter(d=>d<95).sort((a,b)=>a-b)[0];
  if(drop!==undefined&&(!station||drop<station.d))return 'Подобрать оставленную добычу';
  if(station)return `${buildNames[station.s.kind]} · прочность ${station.s.durability}%`;
  const n=this.closestNode(95);if(n)return n.data.kind==='relic'?'Исследовать руины':n.data.kind==='tree'?'Рубить дерево':n.data.kind==='ore'?'Добывать железную руду':'Добывать камень';
  return this.actor.x>=EDGE*TILE?'Стражи охраняют чертежи · Space — удар · Shift — рывок':'Подойди к ресурсу или станции';
 }

}
