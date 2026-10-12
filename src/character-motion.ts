export type CharacterAction = 'idle' | 'walk' | 'attack' | 'harvest' | 'dash' | 'hurt' | 'craft' | 'build' | 'pickup' | 'respawn';
export const actionDuration: Partial<Record<CharacterAction, number>> = {attack:.4,harvest:.36,dash:.2,hurt:.28,craft:.65,build:.35,pickup:.32,respawn:.8};
export type Point = {x:number;y:number};
export type FootPose = Point & {roll:number; planted:boolean};
export type CharacterPose = { action:CharacterAction; progress:number; bob:number; lean:number; turn:number; headTilt:number; stride:number; lift:number; leftHand:Point; rightHand:Point; leftFoot:FootPose; rightFoot:FootPose; weaponAngle:number; aimWeight:number; cloth:number; crouch:number };
type Channel='lean'|'turn'|'headTilt'|'crouch'|'lx'|'ly'|'rx'|'ry'|'angle'|'aim';
type Keyframe={at:number} & Partial<Record<Channel,number>>;
const smooth=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
/** Shape-preserving Hermite interpolation: continuous velocity without overshooting joints. */
export function sampleTrack(keys:Keyframe[],channel:Channel,p:number){
 const value=(i:number)=>keys[i][channel]||0;
 const slope=(i:number)=>{if(i===0||i===keys.length-1)return 0;const a=(value(i)-value(i-1))/(keys[i].at-keys[i-1].at),b=(value(i+1)-value(i))/(keys[i+1].at-keys[i].at);return a*b<=0?0:2*a*b/(a+b);};
 let i=0;while(i<keys.length-2&&p>keys[i+1].at)i++;
 const h=keys[i+1].at-keys[i].at,t=Math.max(0,Math.min(1,(p-keys[i].at)/h)),t2=t*t,t3=t2*t;
 return (2*t3-3*t2+1)*value(i)+(t3-2*t2+t)*h*slope(i)+(-2*t3+3*t2)*value(i+1)+(t3-t2)*h*slope(i+1);
}
const fist:Keyframe[]=[{at:0},{at:.18,rx:-4,ry:-15,lx:7,ly:-13,lean:-2,turn:-.07},{at:.30,rx:15,ry:-15,lx:9,ly:-15,lean:5,turn:.1},{at:.5,rx:9,ry:-8,lx:5,ly:-8,lean:3,turn:.06},{at:1}];
const slash:Keyframe[]=[{at:0},{at:.18,rx:-9,ry:-22,lx:4,ly:-10,lean:-3,turn:-.12,angle:-.7,aim:.25},{at:.3,rx:15,ry:-8,lx:6,ly:-12,lean:6,turn:.13,angle:1.05,aim:1},{at:.5,rx:11,ry:4,lx:3,ly:-5,lean:4,turn:.09,angle:1.65,aim:.7},{at:.76,rx:3,ry:-2,angle:.45,aim:.2},{at:1}];
const thrust:Keyframe[]=[{at:0},{at:.18,rx:-8,ry:-6,lx:24,ly:-6,lean:-3,turn:-.05,angle:1.05,aim:1},{at:.3,rx:17,ry:-6,lx:35,ly:-6,lean:7,turn:.06,angle:1.05,aim:1},{at:.46,rx:14,ry:-6,lx:32,ly:-6,lean:5,angle:1.05,aim:1},{at:.75,rx:1,ry:-3,lx:10,ly:-3,angle:.4,aim:.35},{at:1}];
const downward:Keyframe[]=[{at:0},{at:.18,rx:-5,ry:-25,lx:3,ly:-8,lean:-2,turn:-.05,angle:-.5},{at:.333,rx:9,ry:5,lx:6,ly:-3,lean:6,crouch:4,turn:.08,angle:1.8,aim:.5},{at:.5,rx:8,ry:6,lx:4,ly:-2,lean:5,crouch:3,angle:1.6,aim:.4},{at:1}];
const hammer:Keyframe[]=[{at:0},{at:.25,rx:-3,ry:-30,lx:7,ly:-10,lean:-2,angle:-.5},{at:.42,rx:8,ry:2,lx:9,ly:-6,lean:5,crouch:2,angle:1.7},{at:.6,rx:6,ry:4,lx:6,ly:-4,lean:3,crouch:1,angle:1.4},{at:1}];
const dash:Keyframe[]=[{at:0},{at:.18,rx:-8,ry:-9,lx:-7,ly:-12,lean:15,crouch:8,turn:.20,headTilt:-.08,angle:.6},{at:.65,rx:-6,ry:-7,lx:-5,ly:-9,lean:12,crouch:6,turn:.16,angle:.5},{at:1}];
const hurt:Keyframe[]=[{at:0},{at:.16,rx:-5,ry:-7,lx:-3,ly:-6,lean:-8,crouch:3,headTilt:-.14,turn:-.04},{at:.48,rx:-2,ry:-3,lx:-1,ly:-2,lean:-4,crouch:1,headTilt:-.06},{at:1}];
const pickup:Keyframe[]=[{at:0},{at:.46,rx:8,ry:12,lx:6,ly:-3,lean:7,crouch:18,turn:.15,headTilt:.12},{at:.65,rx:7,ry:4,lx:4,ly:-2,lean:4,crouch:10,turn:.08},{at:1}];
const rise:Keyframe[]=[{at:0},{at:.12,lean:-6,crouch:14,rx:4,ry:5,lx:-2,ly:7,headTilt:-.1},{at:.5,lean:2,crouch:6,rx:3,ry:2,lx:1,ly:3,headTilt:.03},{at:1}];
/** Sagittal foot path. During stance its speed cancels ground travel; swing clears the ground. */
export function footCycle(phase:number,speed:number):FootPose {
 const p=((phase%(Math.PI*2))+Math.PI*2)%(Math.PI*2)/(Math.PI*2),stance=p<.6,q=stance?p/.6:(p-.6)/.4;
 return {x:(stance?21.6-43.2*q:-21.6+43.2*smooth(q))*speed,y:134-(stance?0:Math.sin(q*Math.PI)*8*speed),roll:(stance?(.12*smooth((q-.75)/.25)):-.16*Math.sin(q*Math.PI))*speed,planted:stance};
}
function blendPose(a:CharacterPose,b:CharacterPose,t:number):CharacterPose {
 const mix=(x:number,y:number)=>x+(y-x)*t,out={...b};
 for(const k of ['bob','lean','turn','headTilt','stride','lift','weaponAngle','aimWeight','cloth','crouch'] as const)out[k]=mix(a[k],b[k]);
 for(const k of ['leftHand','rightHand'] as const)out[k]={x:mix(a[k].x,b[k].x),y:mix(a[k].y,b[k].y)};
 for(const k of ['leftFoot','rightFoot'] as const)out[k]={...b[k],x:mix(a[k].x,b[k].x),y:mix(a[k].y,b[k].y),roll:mix(a[k].roll,b[k].roll)};
 return out;
}
export class CharacterMotion {
 action:CharacterAction='idle'; elapsed=0; clock=0; gait=0; speed=0; contacts=0; weapon:'hands'|'spear'|'storm'='hands';
 private contacted=false;private transition:CharacterPose|null=null;private transitionTime=1;private cloth=0;private clothVelocity=0;
 play(action:CharacterAction){this.transition=this.pose();this.transitionTime=0;this.action=action;this.elapsed=0;this.contacted=false;}
 reset(){this.action='idle';this.elapsed=0;this.speed=0;this.gait=0;this.contacted=false;this.transition=null;this.cloth=0;this.clothVelocity=0;}
 step(dt:number,moving:boolean,distance?:number){
  this.clock+=dt;this.transitionTime+=dt;this.speed+=(Number(moving)-this.speed)*(1-Math.exp(-dt*14));
  // 72 texture pixels per gait cycle; WorldScene supplies actual displacement, including collisions.
  if(this.action!=='dash')this.gait+=(distance??(moving?185*dt/.85:0))/72*Math.PI*2;
  let contact=false;
  if(actionDuration[this.action]){this.elapsed+=dt;if((this.action==='attack'||this.action==='harvest')&&!this.contacted&&this.elapsed>=.12){this.contacted=true;this.contacts++;contact=true;}
   if(this.elapsed>=actionDuration[this.action]!){this.action=moving?'walk':'idle';this.elapsed=0;}
  }else this.action=moving?'walk':'idle';
  const target=-this.rawPose().lean*.55-this.speed*3,steps=Math.max(1,Math.ceil(dt/.016));
  for(let i=0;i<steps;i++){const h=dt/steps;this.clothVelocity+=((target-this.cloth)*65-this.clothVelocity*14)*h;this.cloth+=this.clothVelocity*h;}
  return contact;
 }
 private rawPose():CharacterPose {
  const a=this.action,p=Math.min(1,this.elapsed/(actionDuration[a]||1)),s=Math.sin(this.gait),lf=footCycle(this.gait,this.speed),rf=footCycle(this.gait+Math.PI,this.speed);
  const pose:CharacterPose={action:a,progress:p,bob:Math.sin(this.clock*2.1)*.45+this.speed*(4.5-Math.cos(this.gait*2)*.7),lean:this.speed*1.4,turn:Math.sin(this.gait)*.025*this.speed,headTilt:Math.sin(this.clock*1.3)*.012,stride:lf.x,lift:134-lf.y,leftHand:{x:-20-s*4*this.speed,y:101+Math.cos(this.gait)*1.5*this.speed},rightHand:{x:20+s*4*this.speed,y:101-Math.cos(this.gait)*1.5*this.speed},leftFoot:lf,rightFoot:rf,weaponAngle:-1.05+s*.055*this.speed,aimWeight:0,cloth:this.cloth,crouch:0};
  let keys:Keyframe[]|undefined;
  if(a==='attack')keys=this.weapon==='spear'?thrust:this.weapon==='storm'?slash:fist;
  else if(a==='harvest')keys=this.weapon==='hands'?fist:downward;
  else if(a==='craft'||a==='build')keys=hammer;
  else if(a==='dash')keys=dash;else if(a==='hurt')keys=hurt;else if(a==='pickup')keys=pickup;else if(a==='respawn')keys=rise;
  if(keys){for(const k of ['lean','turn','headTilt','crouch'] as const)pose[k]+=sampleTrack(keys,k,p);
   pose.leftHand.x+=sampleTrack(keys,'lx',p);pose.leftHand.y+=sampleTrack(keys,'ly',p);pose.rightHand.x+=sampleTrack(keys,'rx',p);pose.rightHand.y+=sampleTrack(keys,'ry',p);pose.weaponAngle+=sampleTrack(keys,'angle',p);pose.aimWeight=sampleTrack(keys,'aim',p);
  }
  if(a==='dash'){const push=Math.sin(p*Math.PI);pose.leftFoot={x:pose.leftFoot.x*(1-push)-10*push,y:134-3*push,roll:.14*push,planted:push<.2};pose.rightFoot={x:pose.rightFoot.x*(1-push)+14*push,y:134-5*push,roll:-.12*push,planted:push<.2};pose.bob-=2*push;}
  return pose;
 }
 pose():CharacterPose {const target=this.rawPose();return this.transition&&this.transitionTime<.065?blendPose(this.transition,target,smooth(this.transitionTime/.065)):target;}
}
