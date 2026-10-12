import Phaser from 'phaser';
import {makeArt} from './art';
import {TILE,WIDTH,HEIGHT,EDGE,key,generateWorld,newGame,parseSave,costs,spend,canAfford,placementError,isSheltered,wearStation,buildNames,resourceNames,emptyBag,fragmentNames,type Build,type Resource,type SaveData,type WorldNode,type Station,type Fragment} from './world';
export const SAVE_KEY='living-labyrinth-v1';
type LiveNode={data:WorldNode;sprite:Phaser.GameObjects.Sprite};
type Enemy={id:string;sprite:Phaser.GameObjects.Sprite;hp:number;elite:boolean;homeX:number;homeY:number;wind:number;cooldown:number;flash:number};
export class WorldScene extends Phaser.Scene {
 state:SaveData=newGame(); actor!:Phaser.GameObjects.Sprite; grounds!:Phaser.GameObjects.Graphics; buildings!:Phaser.GameObjects.Graphics; roofs!:Phaser.GameObjects.Graphics; ghost!:Phaser.GameObjects.Graphics;gear!:Phaser.GameObjects.Graphics;
 nodes:LiveNode[]=[];enemies:Enemy[]=[];ruins:{x:number;y:number}[]=[];dismantling=false;ambientTimer=0;keys!:Record<string,Phaser.Input.Keyboard.Key>;stamina=100;paused=true;selected:Build|null=null;activeTool='gather';facing={x:1,y:0};attackTimer=0;hurtTimer=0;dashTimer=0;saveTimer=0;uiTimer=0;walkTime=0;wasDanger=false;excursion=false;mobile={x:0,y:0};mouseTile={x:0,y:0};hasMouse=false;storageAvailable=true;onUI:()=>void=()=>{};onToast:(text:string,bad?:boolean)=>void=()=>{};onStation:(station:Station,k:string)=>void=()=>{};onPanel:()=>void=()=>{};audio:AudioContext|null=null;soundEnabled=false;stationKey:string|null=null;groundCycle=-1;
 constructor(){super('world');}
 create(){
  try{const raw=localStorage.getItem(SAVE_KEY);const loaded=parseSave(raw);if(loaded)this.state=loaded;else if(raw)this.onToast('Сохранение повреждено. Начат новый мир.',true);}catch{this.storageAvailable=false;}
  makeArt(this);this.grounds=this.add.graphics().setDepth(-100);this.buildings=this.add.graphics().setDepth(1);this.roofs=this.add.graphics().setDepth(10000);this.ghost=this.add.graphics().setDepth(10001);this.gear=this.add.graphics();
  this.drawGround();this.drawBuildings();this.loadEntities();
  this.actor=this.add.sprite(this.state.x,this.state.y,'player').setOrigin(.5,.85).setDepth(this.state.y);
  this.cameras.main.setBounds(0,0,WIDTH*TILE,HEIGHT*TILE);this.cameras.main.startFollow(this.actor,true,.08,.08);this.cameras.main.setZoom(innerWidth<600?.85:1);
  this.keys=this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE,SHIFT,B,C,ESC,ONE,TWO,THREE,FOUR,FIVE') as Record<string,Phaser.Input.Keyboard.Key>;
  this.input.keyboard!.addCapture(['SPACE','UP','DOWN','LEFT','RIGHT']);
  this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{this.hasMouse=true;this.mouseTile={x:Math.floor(p.worldX/TILE),y:Math.floor(p.worldY/TILE)};});
  this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{if(this.paused)return;this.hasMouse=true;this.mouseTile={x:Math.floor(p.worldX/TILE),y:Math.floor(p.worldY/TILE)};if(this.dismantling)this.dismantle(this.mouseTile.x,this.mouseTile.y);else if(this.selected)this.build(this.mouseTile.x,this.mouseTile.y);else{const dx=p.worldX-this.actor.x,dy=p.worldY-this.actor.y;const l=Math.hypot(dx,dy)||1;this.facing={x:dx/l,y:dy/l};this.attack();}});
  this.events.once('shutdown',()=>{this.input.keyboard?.removeAllListeners();});
  this.drawEquipment();this.wasDanger=this.state.x>=EDGE*TILE;this.excursion=this.wasDanger;this.onUI();
 }
 drawGround(){
  const g=this.grounds;g.clear();
  for(let x=0;x<WIDTH;x++)for(let y=0;y<HEIGHT;y++){
   const danger=x>=EDGE,hash=(x*193+y*71+this.state.cycle*(danger?13:0))%11;
   g.fillStyle(danger?[0x273139,0x2c353b,0x28373b][hash%3]:[0x324e45,0x365247,0x3a574a][hash%3]).fillRect(x*TILE,y*TILE,TILE,TILE);
   if(!danger){g.lineStyle(1,0x6e8d62,.27);for(let i=0;i<3;i++){const px=x*TILE+12+(hash*7+i*13)%41,py=y*TILE+15+(hash*11+i*9)%38;g.lineBetween(px,py,px+2,py-4);g.lineBetween(px+2,py-4,px+5,py);}}
   else{g.lineStyle(1,0x65828b,.14);g.lineBetween(x*TILE+10,y*TILE+31,x*TILE+42,y*TILE+35);if(hash<3){g.fillStyle(0x72a5a2,.35).fillCircle(x*TILE+22,y*TILE+18,2);}}
  }
  // The permanent fault marks the border of the changing city.
  for(let y=0;y<HEIGHT;y++){g.fillStyle(0x132b32).fillRect(EDGE*TILE-8,y*TILE,16,TILE);g.fillStyle(0xb8b28c,.5).fillRect(EDGE*TILE-2,y*TILE+10,4,16);}
  g.lineStyle(3,0x718a73,.25).strokeCircle(9*TILE+32,16*TILE+32,150);
  g.lineStyle(1,0xbac095,.3).strokeCircle(9*TILE+32,16*TILE+32,153);
  // Ruin foundations identify blueprint destinations.
  for(const [x,y] of [[28,7],[39,25]]){g.fillStyle(0x263038).fillRoundedRect((x-1)*TILE,(y-1)*TILE,TILE*3,TILE*3,5);g.lineStyle(2,0x687279,.6).strokeRect((x-1)*TILE+5,(y-1)*TILE+5,TILE*3-10,TILE*3-10);g.fillStyle(0x697576).fillRect((x-1)*TILE,y*TILE-50,30,35).fillRect((x+1)*TILE+30,(y+1)*TILE,30,35);}
  for(const {x,y} of generateWorld(this.state.cycle).ruins){
    const px=x*TILE,py=y*TILE;
    g.fillStyle(0x111f2a,.4).fillRect(px+10,py+13,56,50);
    g.fillStyle(0x46545b).fillRoundedRect(px+3,py-4,58,60,3);
    g.fillStyle(0x7e8985).fillRoundedRect(px+3,py-9,58,14,3);
    g.lineStyle(2,0x293d44).lineBetween(px+3,py+21,px+60,py+21).lineBetween(px+3,py+40,px+60,py+40).lineBetween(px+32,py+5,px+32,py+20).lineBetween(px+20,py+22,px+20,py+39).lineBetween(px+41,py+41,px+41,py+55);
    g.fillStyle(0x9eb391,.3).fillRect(px+6,py-5,17,3);
  }
  this.groundCycle=this.state.cycle;
 }
 drawBuildings(){
  const g=this.buildings,r=this.roofs;g.clear();r.clear();
  for(const [k,c] of Object.entries(this.state.cells)){
   const [cx,cy]=k.split(',').map(Number),x=cx*TILE,y=cy*TILE;
   if(c.floor){g.fillStyle(0x82684b).fillRect(x+1,y+1,62,62);g.lineStyle(1,0x4d4b39).strokeRect(x+1,y+1,62,62);for(let i=1;i<4;i++)g.lineBetween(x+2,y+i*16,x+62,y+i*16);g.fillStyle(0xb39a68,.5).fillRect(x+4,y+3,54,2);}
   if(c.wall){g.fillStyle(0x132b2e,.4).fillRect(x+8,y+12,57,54);g.fillStyle(0x3b493e).fillRoundedRect(x+3,y-8,58,66,3);g.fillStyle(0x9b835a).fillRoundedRect(x+3,y-10,58,17,3);g.lineStyle(2,0x5f654b).lineBetween(x+6,y+14,x+58,y+14).lineBetween(x+6,y+35,x+58,y+35);g.fillStyle(0x766d4e).fillRect(x+6,y+8,5,45).fillRect(x+53,y+8,5,45);}
   if(c.door){g.fillStyle(0x9b835a).fillRect(x+3,y-9,9,66).fillRect(x+52,y-9,9,66).fillRect(x+3,y-9,58,10);g.fillStyle(0x526053,.45).fillRect(x+15,y+4,34,51);g.lineStyle(2,0xa6976c).strokeRect(x+15,y+4,34,51);g.fillStyle(0xe1c482).fillCircle(x+41,y+31,3);}
   if(c.fence){g.lineStyle(7,0x81724e).lineBetween(x+5,y+25,x+59,y+25).lineBetween(x+5,y+46,x+59,y+46);g.fillStyle(0xb09864).fillRoundedRect(x+5,y+11,7,48,2).fillRoundedRect(x+51,y+11,7,48,2);}
   if(c.station){const s=c.station;g.fillStyle(0x0b282b,.4).fillEllipse(x+34,y+51,52,21);
    if(s.kind==='furnace'){g.fillStyle(0x6f7770).fillRoundedRect(x+12,y+9,40,45,5);g.fillStyle(0x465953).fillRect(x+36,y-8,12,23);g.fillStyle(0x192c2e).fillRoundedRect(x+20,y+28,23,21,5);g.fillStyle(s.durability>0?0xe7a366:0x485153).fillTriangle(x+23,y+47,x+30,y+30,x+36,y+47);g.fillStyle(0xffd78c).fillTriangle(x+29,y+47,x+36,y+35,x+39,y+47);}
    if(s.kind==='forge'){g.fillStyle(0x796950).fillRoundedRect(x+12,y+32,42,23,4);g.fillStyle(0xa0aba2).fillPoints([{x:x+8,y:y+19},{x:x+49,y:y+19},{x:x+57,y:y+10},{x:x+57,y:y+26},{x:x+38,y:y+32},{x:x+19,y:y+31}],true);g.fillStyle(0x596d6b).fillRect(x+25,y+29,10,12);}
    if(s.kind==='chest'){g.fillStyle(0x66523e).fillRoundedRect(x+10,y+19,44,34,4);g.fillStyle(0xaa8653).fillRoundedRect(x+10,y+14,44,14,4);g.lineStyle(3,0xc4ad77).lineBetween(x+18,y+15,x+18,y+50).lineBetween(x+46,y+15,x+46,y+50);g.fillStyle(0xe4cc91).fillRect(x+29,y+27,7,8);}
    const covered=isSheltered(this.state.cells,cx,cy);g.fillStyle(0x12282c).fillRect(x+12,y+58,40,3);g.fillStyle(s.durability<25?0xd48a78:covered?0xb5c78e:0xc4a977).fillRect(x+12,y+58,40*s.durability/100,3);
   }
   if(c.roof){r.fillStyle(0x344844,.75).fillRect(x,y-8,TILE,TILE);r.lineStyle(1,0x9d9c76,.3).strokeRect(x,y-8,TILE,TILE);for(let i=0;i<4;i++)r.lineBetween(x,y+i*16-8,x+TILE,y+i*16-8);}
  }
 }
 loadEntities(){
  this.nodes.forEach(n=>n.sprite.destroy());this.enemies.forEach(e=>e.sprite.destroy());this.nodes=[];this.enemies=[];
  const w=generateWorld(this.state.cycle);this.ruins=w.ruins;
  for(const n of w.nodes){if(this.state.removed.includes(n.id))continue;const s=this.add.sprite(n.x*TILE+32,n.y*TILE+48,n.kind).setOrigin(.5,n.kind==='tree'?.89:.85).setDepth(n.y*TILE+48);this.nodes.push({data:{...n},sprite:s});}
  for(const e of w.enemies){if(this.state.dead.includes(e.id))continue;const s=this.add.sprite(e.x*TILE+32,e.y*TILE+32,e.elite?'warden':'guard').setOrigin(.5,.85).setDepth(e.y*TILE+32);if(e.elite)s.setScale(1.3);this.enemies.push({id:e.id,sprite:s,hp:e.hp,elite:e.elite,homeX:s.x,homeY:s.y,wind:0,cooldown:0,flash:0});}
 }
 solid(x:number,y:number,body=13){
  if(x<body||y<body||x>WIDTH*TILE-body||y>HEIGHT*TILE-body)return true;
  for(const [dx,dy] of [[-body,-body],[body,-body],[-body,body],[body,body]]){const c=this.state.cells[key(Math.floor((x+dx)/TILE),Math.floor((y+dy)/TILE))];if(c?.wall||c?.fence||c?.station)return true;}
  if(this.ruins.some(r=>Math.abs(r.x*TILE+32-x)<31+body&&Math.abs(r.y*TILE+32-y)<31+body))return true;
  return this.nodes.some(n=>n.data.kind!=='relic'&&Math.hypot(n.sprite.x-x,n.sprite.y-y)<(n.data.kind==='tree'?22:26)+body);
 }
 move(sprite:Phaser.GameObjects.Sprite,dx:number,dy:number){if(!this.solid(sprite.x+dx,sprite.y))sprite.x+=dx;if(!this.solid(sprite.x,sprite.y+dy))sprite.y+=dy;}
 update(_time:number,delta:number){
  if(!this.actor||this.paused)return;const dt=Math.min(delta,40)/1000;
  this.state.time+=dt;this.attackTimer=Math.max(0,this.attackTimer-dt);this.hurtTimer=Math.max(0,this.hurtTimer-dt);this.dashTimer=Math.max(0,this.dashTimer-dt);
  let dx=(this.keys.D.isDown||this.keys.RIGHT.isDown?1:0)-(this.keys.A.isDown||this.keys.LEFT.isDown?1:0)+this.mobile.x,dy=(this.keys.S.isDown||this.keys.DOWN.isDown?1:0)-(this.keys.W.isDown||this.keys.UP.isDown?1:0)+this.mobile.y;
  const moving=Math.hypot(dx,dy)>0;if(moving){const l=Math.hypot(dx,dy);dx/=l;dy/=l;this.facing={x:dx,y:dy};this.walkTime+=dt;}
  if(Phaser.Input.Keyboard.JustDown(this.keys.SHIFT))this.dash();
  const speed=this.dashTimer>0?590:185;this.move(this.actor,(this.dashTimer>0?this.facing.x:dx)*speed*dt,(this.dashTimer>0?this.facing.y:dy)*speed*dt);
  this.actor.setFlipX(this.facing.x<0).setDepth(this.actor.y);if(this.attackTimer<.17){this.actor.setScale(1+(moving?Math.sin(this.walkTime*17)*.025:Math.sin(this.state.time*2)*.009),1-(moving?Math.sin(this.walkTime*17)*.028:Math.sin(this.state.time*2)*.009));this.actor.setRotation(moving?Math.sin(this.walkTime*8)*.035:0);}
  this.actor.setAlpha(this.hurtTimer>.1?Math.sin(this.state.time*45)>.0?.35:.9:1);this.stamina=Math.min(100,this.stamina+dt*19);
  if(Phaser.Input.Keyboard.JustDown(this.keys.E))this.interact();if(Phaser.Input.Keyboard.JustDown(this.keys.SPACE)){if(this.dismantling)this.dismantle(Math.floor((this.actor.x+this.facing.x*70)/TILE),Math.floor((this.actor.y+this.facing.y*70)/TILE));else if(this.selected)this.placeAhead();else this.attack();}
  if(Phaser.Input.Keyboard.JustDown(this.keys.B)){this.onPanel();}
  if(Phaser.Input.Keyboard.JustDown(this.keys.C)){this.activeTool='craft';this.selected=null;this.onPanel();}
  if(Phaser.Input.Keyboard.JustDown(this.keys.ESC)){this.selected=null;this.dismantling=false;this.activeTool='gather';this.onUI();}
  for(const [k,tool] of [['ONE','gather'],['TWO','attack'],['THREE','build'],['FOUR','craft'],['FIVE','map']] as const){if(Phaser.Input.Keyboard.JustDown(this.keys[k]))this.chooseTool(tool);}
  this.updateEnemies(dt);
  this.ambientTimer+=dt;
  for(const n of this.nodes)if(n.data.kind==='tree'&&!this.tweens.isTweening(n.sprite))n.sprite.setRotation(Math.sin(this.state.time*1.2+n.data.x)*.012);
  if(this.ambientTimer>.7){this.ambientTimer=0;for(const [k,c]of Object.entries(this.state.cells)){if(c.station?.kind!=='furnace'||c.station.durability<=0)continue;const [x,y]=k.split(',').map(Number);if(Math.hypot(this.actor.x-x*TILE,this.actor.y-y*TILE)>800)continue;const smoke=this.add.circle(x*TILE+43,y*TILE-9,5,0xd4d0b3,.35).setDepth(y*TILE+70);this.tweens.add({targets:smoke,x:x*TILE+52,y:y*TILE-60,alpha:0,scaleX:2,scaleY:2,duration:1500,onComplete:()=>smoke.destroy()});}}

  const danger=this.actor.x>=EDGE*TILE;if(danger&&!this.wasDanger){this.excursion=true;this.onToast('За разломом. Части чертежа находятся здесь.',true);}
  if(!danger&&this.wasDanger&&this.excursion){this.excursion=false;this.state.cycle++;this.state.removed=this.state.removed.filter(id=>id.startsWith('s-'));this.state.dead=[];this.loadEntities();this.drawGround();this.state.hp=Math.min(100,this.state.hp+25);this.onToast('Ты вернулся. Лабиринт перестроился · здоровье +25');this.save();}
  this.wasDanger=danger;this.state.x=this.actor.x;this.state.y=this.actor.y;
  const cell=this.state.cells[key(Math.floor(this.actor.x/TILE),Math.floor(this.actor.y/TILE))];this.roofs.setAlpha(cell?.roof ? .14 : .7);
  this.drawEquipment();this.drawGhost();this.uiTimer+=dt;this.saveTimer+=dt;if(this.uiTimer>.12){this.uiTimer=0;this.onUI();}if(this.saveTimer>5){this.saveTimer=0;this.save();}
 }
 updateEnemies(dt:number){
  for(const e of [...this.enemies]){
   e.cooldown=Math.max(0,e.cooldown-dt);const dx=this.actor.x-e.sprite.x,dy=this.actor.y-e.sprite.y,d=Math.hypot(dx,dy);
   if(e.wind>0){e.wind-=dt;e.sprite.setTint(0xffbf97);if(e.wind<=0){e.sprite.clearTint();e.cooldown=e.elite?1.4:1.0;this.enemySwing(e);if(d<(e.elite?100:74)&&this.dashTimer<=0&&this.hurtTimer<=0){this.state.hp-=this.state.armor?e.elite?17:8:e.elite?26:14;this.hurtTimer=.8;this.cameras.main.shake(140,.003);this.playTone(95,.12);this.floatText(this.actor.x,this.actor.y-50,'−'+(this.state.armor?e.elite?17:8:e.elite?26:14),'#efac94');if(this.state.hp<=0){this.die();return;}}}}
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
  if(this.attackTimer>0||this.paused)return;if(this.stamina<12){this.onToast('Нужно перевести дух',true);return;}this.stamina-=12;this.attackTimer=.4;
  const {x,y}=this.actor;const angle=Math.atan2(this.facing.y,this.facing.x);const color=this.state.weapon==='storm'?0xa6e3d5:0xe5cf9b;
  const arc=this.add.graphics().setDepth(y+200);arc.lineStyle(this.state.weapon==='hands'?4:7,color,.85);arc.beginPath();arc.arc(x,y-18,this.state.weapon==='hands'?42:68,angle-.8,angle+.8);arc.strokePath();this.tweens.add({targets:arc,alpha:0,duration:240,onComplete:()=>arc.destroy()});
  this.tweens.add({targets:this.actor,scaleX:1.12,scaleY:.9,duration:80,yoyo:true});this.playTone(this.state.weapon==='storm'?520:240,.06);
  const reach=this.state.weapon==='hands'?76:112;
  let hit=false;
  for(const e of [...this.enemies]){const dx=e.sprite.x-x,dy=e.sprite.y-y,d=Math.hypot(dx,dy);if(d<reach&&(dx*this.facing.x+dy*this.facing.y)/Math.max(d,1)>-.2){hit=true;const damage=this.state.weapon==='storm'?38:this.state.weapon==='spear'?20:9;e.hp-=damage;this.floatText(e.sprite.x,e.sprite.y-63,String(damage),'#ead7a4');e.sprite.setTint(0xffffff);this.time.delayedCall(100,()=>e.sprite.active&&e.sprite.clearTint());this.move(e.sprite,this.facing.x*12,this.facing.y*12);if(e.hp<=0)this.kill(e);}}
  if(!hit){const node=this.closestNode(90);if(node&&node.data.kind!=='relic')this.harvest(node);}
 }
 kill(e:Enemy){
  this.state.dead.push(e.id);this.state.bag.ore+=e.elite?5:2;this.state.bag.spark+=e.elite?2:1;this.state.fragments[1]++;
  this.burst(e.sprite.x,e.sprite.y,0xe5b884);this.enemies=this.enemies.filter(v=>v!==e);this.tweens.add({targets:e.sprite,alpha:0,scaleX:.2,scaleY:.2,duration:260,onComplete:()=>e.sprite.destroy()});this.onToast('Механизм чертежа +1 · искра +'+(e.elite?2:1));this.save();
 }
 closestNode(range:number){return this.nodes.filter(n=>Math.hypot(n.sprite.x-this.actor.x,n.sprite.y-this.actor.y)<range).sort((a,b)=>Math.hypot(a.sprite.x-this.actor.x,a.sprite.y-this.actor.y)-Math.hypot(b.sprite.x-this.actor.x,b.sprite.y-this.actor.y))[0];}
 harvest(n:LiveNode){
  if(this.attackTimer<=0){this.attackTimer=.32;this.playTone(n.data.kind==='tree'?180:400,.035);}n.data.hp--;
  this.tweens.add({targets:this.actor,scaleX:1.07,scaleY:.92,duration:80,yoyo:true});this.tweens.add({targets:n.sprite,angle:5,duration:55,yoyo:true,repeat:1});this.burst(n.sprite.x,n.sprite.y-35,n.data.kind==='tree'?0xa5b57f:0xa6a995,4);
  if(n.data.hp<=0){const res:Resource=n.data.kind==='tree'?'wood':n.data.kind==='ore'?'ore':'stone';const qty=res==='wood'?6:res==='ore'?4:5;this.state.bag[res]+=qty;this.floatText(n.sprite.x,n.sprite.y-60,`+${qty} ${resourceNames[res]}`,'#e2d3a5');this.state.removed.push(n.data.id);this.nodes=this.nodes.filter(v=>v!==n);this.tweens.add({targets:n.sprite,alpha:0,scaleX:.8,scaleY:.6,duration:250,onComplete:()=>n.sprite.destroy()});this.save();}
 }
 interact(){
  if(this.paused)return;let nearest:{k:string;s:Station;d:number}|null=null;
  for(const [k,c] of Object.entries(this.state.cells)){if(!c.station)continue;const [x,y]=k.split(',').map(Number),d=Math.hypot((x+.5)*TILE-this.actor.x,(y+.5)*TILE-this.actor.y);if(d<115&&(!nearest||d<nearest.d))nearest={k,s:c.station,d};}
  if(nearest){this.stationKey=nearest.k;this.onStation(nearest.s,nearest.k);return;}
  const n=this.closestNode(95);if(!n){this.onToast('Подойди к дереву, камню или рабочей станции');return;}
  if(n.data.kind==='relic'){if(this.enemies.some(e=>Math.hypot(e.sprite.x-n.sprite.x,e.sprite.y-n.sprite.y)<190)){this.onToast('Сначала справься со стражем руин',true);return;}
   const f=n.data.fragment as Fragment;this.state.fragments[f]++;this.state.removed.push(n.data.id);this.nodes=this.nodes.filter(v=>v!==n);this.burst(n.sprite.x,n.sprite.y-30,0xffd59a,16);n.sprite.destroy();this.onToast('Найдена часть: '+fragmentNames[f]);this.playTone(740,.2);this.save();
  }else if(this.attackTimer<=0)this.harvest(n);
 }
 dash(){if(this.paused||this.dashTimer>0||this.stamina<30)return;this.stamina-=30;this.dashTimer=.2;this.burst(this.actor.x,this.actor.y,0xc3d2b5,6);this.playTone(170,.08);}
 chooseTool(tool:string){this.activeTool=tool;this.selected=null;this.dismantling=false;if(tool==='build'||tool==='craft'||tool==='map')this.onPanel();else this.onUI();}
 placeAhead(){if(this.selected){const x=Math.floor((this.actor.x+this.facing.x*70)/TILE),y=Math.floor((this.actor.y+this.facing.y*70)/TILE);this.build(x,y);}}
 canBuild(x:number,y:number,b:Build){
  if(Math.hypot((x+.5)*TILE-this.actor.x,(y+.5)*TILE-this.actor.y)>TILE*4)return 'Подойди ближе к месту строительства';
  if((b==='wall'||b==='fence'||b==='furnace'||b==='forge'||b==='chest')&&Math.floor(this.actor.x/TILE)===x&&Math.floor(this.actor.y/TILE)===y)return 'Нельзя строить на месте персонажа';
  const occupied=this.nodes.some(n=>n.data.x===x&&n.data.y===y);
  return placementError(this.state.cells,x,y,b,occupied);
 }
 build(x:number,y:number){
  const b=this.selected;if(!b)return;const error=this.canBuild(x,y,b);if(error){this.onToast(error,true);return;}if(!spend(this.state.bag,costs[b])){this.onToast('Не хватает материалов',true);return;}
  const c=this.state.cells[key(x,y)]??={};if(b==='furnace'||b==='forge'||b==='chest')c.station={kind:b,durability:100};else c[b]=true;
  this.drawBuildings();this.burst(x*TILE+32,y*TILE+32,0xd5c997,10);const ring=this.add.graphics().setDepth(10002);ring.lineStyle(2,0xe4d6a6).strokeRect(x*TILE,y*TILE,TILE,TILE);this.tweens.add({targets:ring,alpha:0,duration:350,onComplete:()=>ring.destroy()});this.playTone(330,.07);this.save();this.onUI();
 }
 dismantle(x:number,y:number){
  if(Math.hypot((x+.5)*TILE-this.actor.x,(y+.5)*TILE-this.actor.y)>TILE*4){this.onToast('Подойди ближе',true);return;}
  const c=this.state.cells[key(x,y)];if(!c){this.onToast('Здесь нечего разбирать');return;}
  let part:Build|undefined;
  if(c.roof){delete c.roof;part='roof';}else if(c.station){part=c.station.kind;delete c.station;}else for(const b of ['wall','door','fence','floor'] as const){if(c[b]){delete c[b];part=b;break;}}
  if(Object.keys(c).length===0)delete this.state.cells[key(x,y)];
  this.drawBuildings();this.burst(x*TILE+32,y*TILE+32,0xc7b381);this.save();this.onToast(`${part?buildNames[part]:'Постройка'} разобрана · материалы не возвращаются`);this.onUI();
 }
 drawEquipment(){
  const g=this.gear;g.clear();g.setDepth(this.actor.y+1).setAlpha(this.actor.alpha);
  const x=this.actor.x,y=this.actor.y;
  if(this.state.armor){g.fillStyle(0x7c9999).fillRoundedRect(x-7,y-26,16,12,3);g.lineStyle(1,0xbbc9b1).lineBetween(x-5,y-24,x+7,y-24).lineBetween(x+1,y-24,x+1,y-16);}
  if(this.state.weapon==='hands')return;
  const swing=this.attackTimer>0?Math.sin((.4-this.attackTimer)/.4*Math.PI)*1.6:0;
  const direction=(this.actor.flipX?-1:1),angle=-1.0*direction+swing*direction;
  const length=this.state.weapon==='spear'?42:31;
  const hx=x+direction*13,hy=y-19,tx=hx+Math.cos(angle)*length*direction,ty=hy+Math.sin(angle)*length*direction;
  const nx=-Math.sin(angle)*direction,ny=Math.cos(angle)*direction;
  g.lineStyle(this.state.weapon==='spear'?3:4,this.state.weapon==='spear'?0xb39762:0x80cbbc).lineBetween(hx,hy,tx,ty);
  g.fillStyle(this.state.weapon==='spear'?0xc0c4b0:0xd6f3d2).fillTriangle(tx+Math.cos(angle)*8*direction,ty+Math.sin(angle)*8*direction,tx+nx*5,ty+ny*5,tx-nx*5,ty-ny*5);
  if(this.state.weapon==='storm'){g.lineStyle(2,0xd4b880).lineBetween(hx+nx*6,hy+ny*6,hx-nx*6,hy-ny*6);g.fillStyle(0xbcdfb8,.6+.3*Math.sin(this.state.time*3)).fillCircle(tx,ty,2);}
 }
 drawGhost(){
  const g=this.ghost;g.clear();if(!this.selected&&!this.dismantling)return;
  const x=this.hasMouse?this.mouseTile.x:Math.floor((this.actor.x+this.facing.x*70)/TILE),y=this.hasMouse?this.mouseTile.y:Math.floor((this.actor.y+this.facing.y*70)/TILE);
  const valid=this.dismantling?!!this.state.cells[key(x,y)]:!!this.selected&&!this.canBuild(x,y,this.selected)&&canAfford(this.state.bag,costs[this.selected]);
  for(let dx=-4;dx<=4;dx++)for(let dy=-4;dy<=4;dy++){const cx=Math.floor(this.actor.x/TILE)+dx,cy=Math.floor(this.actor.y/TILE)+dy;g.lineStyle(1,0xb5c8a7,.15).strokeRect(cx*TILE,cy*TILE,TILE,TILE);}
  g.fillStyle(valid?0xd9c793:0xd58a80,.25).fillRect(x*TILE,y*TILE,TILE,TILE);g.lineStyle(2,valid?0xe7d6a2:0xe0a199).strokeRect(x*TILE+1,y*TILE+1,TILE-2,TILE-2);
 }
 craft(recipe:string){
  if(this.paused)return;
  const nearby=(kind:string)=>Object.entries(this.state.cells).find(([k,c])=>{const [x,y]=k.split(',').map(Number);return c.station?.kind===kind&&Math.hypot((x+.5)*TILE-this.actor.x,(y+.5)*TILE-this.actor.y)<115;});
  let target:[string,import('./world').Cell]|undefined;
  let cost:Partial<import('./world').Bag>={};
  if(recipe==='spear'){if(this.state.weapon!=='hands'){this.onToast('Оружие этого уровня уже есть');return;}cost={wood:5,stone:3};}
  if(recipe==='iron'){target=nearby('furnace');cost={ore:2,wood:1};}
  if(recipe==='armor'){if(this.state.armor){this.onToast('Броня уже надета');return;}target=nearby('forge');cost={iron:5,wood:4};}
  if(recipe==='storm'){if(this.state.weapon==='storm'){this.onToast('Клинок бурь уже создан');return;}target=nearby('forge');cost={iron:8,spark:3};if(!this.state.learned){this.onToast('Сначала собери чертёж из трёх разных частей',true);return;}}
  if(recipe==='blueprint'){if(this.state.learned)return;if(this.state.fragments.some(n=>n<1)){this.onToast('Нужны все три разные части чертежа',true);return;}this.state.fragments=this.state.fragments.map(n=>n-1);this.state.learned=true;this.onToast('Чертёж клинка бурь изучен навсегда');this.save();this.onUI();return;}
  if(recipe==='salvage'){let total=0;this.state.fragments=this.state.fragments.map(n=>{const surplus=Math.max(0,n-(this.state.learned?0:1));total+=surplus;return n-surplus;});if(!total){this.onToast('Нет дубликатов для разбора');return;}this.state.bag.wood+=total;this.onToast(`Разобрано ${total} дубликатов · древесина +${total}`);this.save();this.onUI();return;}
  if(recipe!=='spear'&&!target){this.onToast('Подойди к '+(recipe==='iron'?'печи':'кузнице'),true);return;}
  if(target&&target[1].station!.durability<=0){this.onToast('Станция сломана. Сначала почини её.',true);return;}
  if(!spend(this.state.bag,cost)){this.onToast('Не хватает материалов',true);return;}
  if(recipe==='spear')this.state.weapon='spear';if(recipe==='iron')this.state.bag.iron++;if(recipe==='armor')this.state.armor=true;if(recipe==='storm')this.state.weapon='storm';
  if(target){const [x,y]=target[0].split(',').map(Number);wearStation(target[1].station!,isSheltered(this.state.cells,x,y));this.burst((x+.5)*TILE,(y+.5)*TILE,0xf3bc76,8);this.drawBuildings();}
  this.onToast(recipe==='iron'?'Железный слиток +1':recipe==='spear'?'Каменное копьё создано':recipe==='armor'?'Броня создана и надета':'Реликтовый клинок бурь создан');this.playTone(620,.13);this.save();this.onUI();
 }
 repair(k:string){const s=this.state.cells[k]?.station;if(!s)return;const [x,y]=k.split(',').map(Number);if(Math.hypot((x+.5)*TILE-this.actor.x,(y+.5)*TILE-this.actor.y)>=115){this.onToast('Подойди к станции',true);return;}if(s.durability===100){this.onToast('Ремонт не требуется');return;}if(!spend(this.state.bag,{wood:2,stone:2})){this.onToast('Нужно 2 древесины и 2 камня',true);return;}s.durability=100;this.drawBuildings();this.save();this.onUI();this.onToast('Станция восстановлена');}
 transfer(deposit:boolean){
  const chest=Object.entries(this.state.cells).some(([k,c])=>{const [x,y]=k.split(',').map(Number);return c.station?.kind==='chest'&&Math.hypot((x+.5)*TILE-this.actor.x,(y+.5)*TILE-this.actor.y)<115;});if(!chest){this.onToast('Подойди к сундуку',true);return;}
  const from=deposit?this.state.bag:this.state.stash,to=deposit?this.state.stash:this.state.bag;for(const r of Object.keys(emptyBag()) as Resource[]){to[r]+=from[r];from[r]=0;}
  const ff=deposit?this.state.fragments:this.state.stashFragments,tf=deposit?this.state.stashFragments:this.state.fragments;ff.forEach((n,i)=>{tf[i]+=n;ff[i]=0;});this.save();this.onUI();this.onToast(deposit?'Материалы и части чертежей убраны в сундук':'Содержимое сундука забрано');
 }
 die(){this.state.hp=100;this.state.bag=Object.fromEntries(Object.entries(this.state.bag).map(([r,n])=>[r,Math.floor(n/2)])) as import('./world').Bag;this.state.fragments=[0,0,0];this.actor.setPosition(9*TILE+32,16*TILE+32);this.state.x=this.actor.x;this.state.y=this.actor.y;this.hurtTimer=2;this.state.cycle++;this.state.dead=[];this.state.removed=this.state.removed.filter(id=>id.startsWith('s-'));this.loadEntities();this.drawGround();this.wasDanger=false;this.excursion=false;this.onToast('Ты очнулся у убежища. Половина материалов и все части в рюкзаке потеряны.',true);this.save();}
 save(){if(!this.actor)return;this.state.x=this.actor.x;this.state.y=this.actor.y;try{localStorage.setItem(SAVE_KEY,JSON.stringify(this.state));this.storageAvailable=true;}catch{this.storageAvailable=false;}}
 reset(){try{localStorage.removeItem(SAVE_KEY);}catch{}this.state=newGame();this.actor.setPosition(this.state.x,this.state.y);this.stamina=100;this.wasDanger=false;this.excursion=false;this.selected=null;this.drawBuildings();this.drawGround();this.loadEntities();this.save();this.onUI();}
 floatText(x:number,y:number,text:string,color:string){const t=this.add.text(x,y,text,{fontFamily:'Manrope, sans-serif',fontSize:'13px',color,stroke:'#1a3033',strokeThickness:3}).setOrigin(.5).setDepth(10010);this.tweens.add({targets:t,y:y-45,alpha:0,duration:1100,ease:'Cubic.Out',onComplete:()=>t.destroy()});}
 burst(x:number,y:number,color:number,count=8){for(let i=0;i<count;i++){const g=this.add.rectangle(x,y-15,3+Math.random()*3,3+Math.random()*3,color).setDepth(10005);this.tweens.add({targets:g,x:x+(Math.random()-.5)*80,y:y-15-Math.random()*60,alpha:0,angle:120,duration:350+Math.random()*250,onComplete:()=>g.destroy()});}}
 playTone(freq:number,duration:number){if(!this.soundEnabled)return;try{this.audio??=new AudioContext();void this.audio.resume();const o=this.audio.createOscillator(),g=this.audio.createGain();o.type='triangle';o.frequency.setValueAtTime(freq,this.audio.currentTime);o.frequency.exponentialRampToValueAtTime(freq*.55,this.audio.currentTime+duration);g.gain.setValueAtTime(.035,this.audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,this.audio.currentTime+duration);o.connect(g);g.connect(this.audio.destination);o.start();o.stop(this.audio.currentTime+duration);}catch{this.soundEnabled=false;}}
 hint(){if(this.dismantling)return 'Разбор: нажми на свою постройку · материалы не возвращаются · Esc — отмена';if(this.selected)return `Строительство: ${buildNames[this.selected]} · нажми на клетку · Esc — отмена`;
 const n=this.closestNode(95);if(n)return n.data.kind==='relic'?'E · исследовать руины':`E · ${n.data.kind==='tree'?'рубить дерево':n.data.kind==='ore'?'добывать руду':'добывать камень'}`;
 for(const [k,c] of Object.entries(this.state.cells)){const [x,y]=k.split(',').map(Number);if(c.station&&Math.hypot((x+.5)*TILE-this.actor.x,(y+.5)*TILE-this.actor.y)<115)return `E · ${buildNames[c.station.kind]} · прочность ${c.station.durability}%`;}
 return this.actor.x>=EDGE*TILE?'Стражи охраняют чертежи · Space — удар · Shift — рывок':'Собирай материалы · B — строительство · C — крафт';}
}
