import Phaser from 'phaser';
import {CharacterMotion,type CharacterPose,type Point} from './character-motion';
import type {SaveData} from './world';
import {solveLimb,transformPoint,characterArm,weaponTransform,advanceAngle,HERO_SIZE,HERO_FOOT} from './character-rig';
export {HERO_SIZE,HERO_FOOT,HERO_SCALE} from './character-rig';
const tau=Math.PI*2;
function oval(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,color:string){c.fillStyle=color;c.beginPath();c.ellipse(x,y,w/2,h/2,0,0,tau);c.fill();}
function stroke(c:CanvasRenderingContext2D,a:Point,b:Point,color:string,width:number){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}
function box(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,color:string,r=4){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
export function paintCharacter(c:CanvasRenderingContext2D,pose:CharacterPose,facing:Point,equipment:SaveData['equipment'],trail:Point[]=[]){
 c.clearRect(0,0,HERO_SIZE,HERO_SIZE);c.save();c.lineCap='round';c.lineJoin='round';
 oval(c,HERO_SIZE/2,139,48-pose.crouch*.4,12,'#0b252e45');
 const side=Math.abs(facing.x),back=facing.y<-.38,profile=side>.86,mirror=facing.x<0;
 c.translate(HERO_SIZE/2,HERO_FOOT);if(mirror)c.scale(-1,1);c.translate(0,-HERO_FOOT);
 const lean=pose.lean*(side*.85+.15),bob=pose.bob+pose.crouch;
 const center=lean*.5,width=16-side*5,pivot={x:center+lean*.5,y:74+bob};
 const attached=(x:number,y:number)=>transformPoint({x,y},pivot,pose.turn);
 if(trail.length>1&&equipment.weapon==='storm'){c.strokeStyle='#b2e2cd65';c.lineWidth=3;c.beginPath();trail.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();}
 const boot=(foot:Point,near:boolean,roll:number)=>{
  c.save();c.translate(foot.x,foot.y);c.rotate(roll);foot={x:0,y:0};
  const col=equipment.feet?(near?'#718f92':'#49656d'):(near?'#554239':'#3c3333');
  box(c,foot.x-6,foot.y-7,profile?18:14,10,col,4);stroke(c,{x:foot.x-4,y:foot.y+2},{x:foot.x+(profile?10:6),y:foot.y+2},'#202f37',3);
  stroke(c,{x:foot.x-3,y:foot.y-4},{x:foot.x+5,y:foot.y-4},equipment.feet?'#c6d8c5':'#b09166',2);c.restore();
 };
 // Solve knees in the forward/up plane, then project depth into the facing direction.
 // Knees flex forward; front views no longer produce a bow-legged diamond.
 const leg=(sign:number,near:boolean)=>{
  const foot=sign<0?pose.leftFoot:pose.rightFoot,hip=attached(sign*6,22);
  const lateral=side>.2?sign*(7-side*3):hip.x,forwardHip=side>.2?(hip.x-lateral)/side:0;
  const limb=solveLimb({x:forwardHip,y:hip.y-forwardHip*facing.y*.28},{x:foot.x,y:foot.y},20,21,-1);
  const project=(p:Point)=>({x:lateral+p.x*side,y:p.y+p.x*facing.y*.28});
  const start={x:hip.x,y:hip.y},knee=project(limb.joint),end=project(limb.end);
  stroke(c,start,knee,'#263944',11);stroke(c,start,knee,near?'#566975':'#3d515f',8);stroke(c,knee,end,near?'#41596a':'#2c4251',8);boot(end,near,foot.roll*side);
 };
 leg(-1,false);leg(1,true);
 const armRig=(sign:number)=>characterArm(pose,facing,sign);
 const arm=(sign:number,near:boolean)=>{
  const {root:a,joint:e,end:h}=armRig(sign);stroke(c,a,e,'#4a3833',12);stroke(c,a,e,near?'#c58c5d':'#96664c',9);stroke(c,e,h,'#4a3833',9);stroke(c,e,h,near?'#b88253':'#825942',6);oval(c,h.x,h.y,8,9,near?'#e8c49e':'#c79977');
  const angle=Math.atan2(h.y-e.y,h.x-e.x);c.save();c.translate(h.x,h.y);c.rotate(angle-Math.PI/2);box(c,-4,-6,8,4,'#57443c',2);c.restore();
 };
 const weapon=(tool:boolean)=>{
  const {hand:h,angle}=weaponTransform(pose,facing);
  c.save();c.translate(h.x,h.y);c.rotate(angle);
  if(tool){stroke(c,{x:-6,y:0},{x:27,y:0},'#704e35',4);box(c,19,-8,12,16,'#91a3a0',3);stroke(c,{x:21,y:-5},{x:28,y:-5},'#d4ddd0',2);}
  else if(equipment.weapon==='spear'){stroke(c,{x:-15,y:0},{x:47,y:0},'#5b4231',5);stroke(c,{x:-15,y:-1},{x:47,y:-1},'#bd9965',2);c.fillStyle='#c5d7c7';c.beginPath();c.moveTo(59,0);c.lineTo(43,-6);c.lineTo(46,0);c.lineTo(43,6);c.closePath();c.fill();stroke(c,{x:46,y:0},{x:57,y:0},'#658482',1);}
  else if(equipment.weapon==='storm'){stroke(c,{x:-8,y:0},{x:4,y:0},'#665239',5);stroke(c,{x:3,y:-8},{x:3,y:8},'#d4b986',4);c.fillStyle='#7fbeaf';c.beginPath();c.moveTo(6,-5);c.lineTo(41,-4);c.lineTo(49,0);c.lineTo(39,6);c.lineTo(6,4);c.closePath();c.fill();stroke(c,{x:8,y:-3},{x:42,y:-2},'#e4f5d8',2);stroke(c,{x:12,y:0},{x:35,y:0},'#bfded1',1);}
  c.restore();
 };
 const tool=['craft','build'].includes(pose.action);
 arm(-1,false);if(back) {weapon(tool);arm(1,false);}
 // Coat silhouette, seams, belt and attached satchel move with the torso.
 c.save();c.translate(pivot.x,pivot.y);c.rotate(pose.turn);
 c.fillStyle='#4c3933';c.beginPath();c.moveTo(-width-1,-14);c.quadraticCurveTo(0,-24,width+1,-14);c.lineTo(width+3,26);c.quadraticCurveTo(0,31,-width-3,26);c.closePath();c.fill();
 const coat=c.createLinearGradient(-width,0,width,0);coat.addColorStop(0,'#b17950');coat.addColorStop(.55,'#cf9869');coat.addColorStop(1,'#9f684b');
 c.fillStyle=coat;c.beginPath();c.moveTo(-width,-13);c.quadraticCurveTo(0,-23,width,-13);c.lineTo(width+1,24);c.quadraticCurveTo(0,27,-width-1,24);c.closePath();c.fill();
 stroke(c,{x:0,y:-7},{x:0,y:24},'#82593f',1.5);stroke(c,{x:-width+3,y:23},{x:width-2,y:23},'#d7ae78',2);
 if(equipment.body){box(c,-width,-11,width*2,27,'#3b5561',6);box(c,-width+2,-12,width*2-4,24,'#789b9a',5);stroke(c,{x:-width+4,y:-8},{x:width-4,y:-8},'#d1dfc3',2);stroke(c,{x:0,y:-7},{x:0,y:10},'#b7cebd',2);box(c,-width-3,-13,10,9,'#8fb1a9');box(c,width-7,-13,10,9,'#688b91');}
 stroke(c,{x:-width,y:13},{x:width,y:13},'#594338',5);box(c,0,10,6,6,'#d7b97e',1);
 if(back){box(c,-width+1,-11,width*2-2,30,'#3d514e',6);box(c,-width+3,-12,width*2-6,25,'#677966',5);box(c,-width+3,-8,width*2-6,7,'#8c9b79',3);stroke(c,{x:-width+6,y:2},{x:width-6,y:2},'#a5ad85',2);box(c,-7,11,14,8,'#485b50',3);}
 else{stroke(c,{x:-width+1,y:-15},{x:width-3,y:14},'#614737',4);box(c,-width-4,12,12,14,'#604b3d',3);box(c,-width-3,12,10,5,'#8d7251',2);oval(c,-width+2,18,3,3,'#ccb079');}
 c.restore();
 // Scarf tails lag behind movement, instead of scaling the entire sprite.
 c.save();c.translate(pivot.x,pivot.y);c.rotate(pose.turn);c.fillStyle='#a4b88f';c.beginPath();c.moveTo(8,-14);c.lineTo(12+pose.cloth,8);c.lineTo(18+pose.cloth,5);c.lineTo(14,-16);c.closePath();c.fill();c.restore();
 const head=attached(0,-32),hx=head.x,hy=head.y;
 c.save();c.translate(hx,hy);c.rotate(pose.headTilt+pose.turn*.35);
 oval(c,0,1,profile?27:32,35,'#493a33');
 if(!back){oval(c,profile?3:0,3,profile?23:27,30,'#e4bd96');oval(c,profile?-9:-14,4,7,9,'#cf9d79');
  c.fillStyle='#594435';c.beginPath();c.moveTo(-15,-3);c.quadraticCurveTo(-17,-21,1,-19);c.quadraticCurveTo(18,-19,15,-4);c.lineTo(9,-9);c.lineTo(4,-6);c.lineTo(-3,-10);c.lineTo(-9,-2);c.closePath();c.fill();stroke(c,{x:-7,y:-14},{x:8,y:-15},'#876443',2);
  if(profile){oval(c,10,1,3.2,4,'#243b43');c.fillStyle='#e4bd96';c.beginPath();c.moveTo(12,3);c.lineTo(18,7);c.lineTo(12,9);c.fill();stroke(c,{x:10,y:12},{x:14,y:12},'#9b6d53',1.4);}
  else{oval(c,-6,2,3,4,'#243b43');oval(c,7,2,3,4,'#243b43');stroke(c,{x:-8,y:-3},{x:-4,y:-3},'#70513c',1.5);stroke(c,{x:5,y:-3},{x:9,y:-3},'#70513c',1.5);stroke(c,{x:-2,y:12},{x:4,y:12},'#a57557',1.3);}
 }else{oval(c,0,0,30,33,'#655039');stroke(c,{x:-7,y:-11},{x:3,y:-14},'#92714d',2);stroke(c,{x:8,y:-8},{x:11,y:3},'#7b5e42',2);}
 if(equipment.head){c.fillStyle='#749592';c.beginPath();c.moveTo(-16,-1);c.quadraticCurveTo(-18,-23,0,-23);c.quadraticCurveTo(18,-22,16,-1);c.lineTo(11,1);c.lineTo(9,-7);c.lineTo(-9,-7);c.lineTo(-11,1);c.closePath();c.fill();stroke(c,{x:0,y:-20},{x:0,y:-8},'#d2dfc7',3);stroke(c,{x:-13,y:-6},{x:13,y:-6},'#3c5a63',2);}
 c.restore();
 c.save();c.translate(pivot.x,pivot.y);c.rotate(pose.turn);box(c,-14,-18,28,7,'#d0dbb5',4);stroke(c,{x:-10,y:-16},{x:10,y:-16},'#eff0cc',1.5);c.restore();
 if(!back){arm(1,true);weapon(tool);}
 c.restore();
}
export class CharacterRenderer {
 motion=new CharacterMotion(); texture:Phaser.Textures.CanvasTexture; renders=0; private trail:Point[]=[];private lastClock=-1;private viewAngle:number|null=null;
 constructor(scene:Phaser.Scene){this.texture=scene.textures.createCanvas('hero-live',HERO_SIZE,HERO_SIZE)!;}
 draw(facing:Point,equipment:SaveData['equipment']){
  this.motion.weapon=equipment.weapon==='spear'||equipment.weapon==='storm'?equipment.weapon:'hands';const pose=this.motion.pose();
  const dt=this.lastClock<0?0:Math.max(0,Math.min(.1,this.motion.clock-this.lastClock)),target=Math.atan2(facing.y,facing.x);
  this.viewAngle=this.viewAngle===null?target:advanceAngle(this.viewAngle,target,dt,pose.action==='attack'||pose.action==='harvest'?34:18);
  const view={x:Math.cos(this.viewAngle),y:Math.sin(this.viewAngle)};
  if(pose.action==='attack'&&equipment.weapon==='storm'&&this.motion.elapsed>.065&&this.motion.elapsed<.23){
   if(this.lastClock!==this.motion.clock){const {hand,angle}=weaponTransform(pose,view);this.trail.push({x:hand.x+Math.cos(angle)*49,y:hand.y+Math.sin(angle)*49});if(this.trail.length>4)this.trail.shift();}
  }else this.trail=[];
  this.lastClock=this.motion.clock;paintCharacter(this.texture.getContext(),pose,view,equipment,this.trail);this.texture.refresh();this.renders++;
 }
}
