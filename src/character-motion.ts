export type CharacterAction = 'idle' | 'walk' | 'attack' | 'harvest' | 'dash' | 'hurt' | 'craft' | 'build' | 'pickup' | 'respawn';
export const actionDuration: Partial<Record<CharacterAction, number>> = {attack:.4,harvest:.36,dash:.2,hurt:.28,craft:.65,build:.35,pickup:.32,respawn:.8};
export type Point = {x:number;y:number};
export type CharacterPose = { action:CharacterAction; progress:number; bob:number; lean:number; turn:number; headTilt:number; stride:number; lift:number; leftHand:Point; rightHand:Point; weaponAngle:number; cloth:number; crouch:number };
const smooth = (v:number) => { const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t); };
/** Animation clock advances only with simulation time. A strike emits one contact event. */
export class CharacterMotion {
 action:CharacterAction='idle'; elapsed=0; clock=0; gait=0; speed=0; contacts=0; private contacted=false;
 play(action:CharacterAction){this.action=action;this.elapsed=0;this.contacted=false;}
 reset(){this.action='idle';this.elapsed=0;this.speed=0;this.contacted=false;}
 step(dt:number,moving:boolean){
  this.clock+=dt;this.speed+=(Number(moving)-this.speed)*Math.min(1,dt*12);this.gait+=dt*10*this.speed;
  let contact=false;
  if(actionDuration[this.action]){this.elapsed+=dt;if((this.action==='attack'||this.action==='harvest')&&!this.contacted&&this.elapsed>=.12){this.contacted=true;this.contacts++;contact=true;}
   if(this.elapsed>=actionDuration[this.action]!){this.action=moving?'walk':'idle';this.elapsed=0;}
  }else this.action=moving?'walk':'idle';
  return contact;
 }
 pose():CharacterPose {
  const a=this.action,p=Math.min(1,this.elapsed/(actionDuration[a]||1)),s=Math.sin(this.gait),stride=s*15*this.speed;
  const pose:CharacterPose={action:a,progress:p,bob:Math.sin(this.clock*2.5)*.8-Math.abs(s)*2.6*this.speed,lean:0,turn:0,headTilt:Math.sin(this.clock*1.3)*.025,stride,lift:Math.max(0,Math.cos(this.gait))*5*this.speed,leftHand:{x:-20-stride*.4,y:103+s*2*this.speed},rightHand:{x:20+stride*.4,y:100-s*2*this.speed},weaponAngle:-1.2+stride*.015,cloth:Math.sin(this.clock*3)*1.8-stride*.2,crouch:0};
  if(a==='attack'||a==='harvest'||a==='craft'||a==='build'){
   const wind=smooth(p/.15),strike=smooth((p-.15)/.15),recover=smooth((p-.4)/.6),swing=-wind+strike*2-recover;
   pose.turn=swing*.2;pose.lean=swing*6;pose.headTilt=swing*.12;pose.rightHand={x:20+swing*18,y:83-swing*9};pose.leftHand={x:-16+swing*6,y:89+wind*3};pose.weaponAngle=-1.25+ swing*1.65;pose.crouch=Math.max(0,swing)*3;
   if(a!=='attack'){pose.rightHand={x:16+swing*10,y:77+swing*25};pose.weaponAngle=-1.6+swing*2.2;pose.lean=swing*4;}
  }
  if(a==='dash'){const rush=Math.sin(p*Math.PI);pose.lean=10+6*rush;pose.crouch=4+5*rush;pose.leftHand={x:-28,y:89};pose.rightHand={x:6,y:84};pose.weaponAngle=-.5;pose.stride=16;pose.cloth=-12;}
  if(a==='hurt'){const impact=Math.sin(p*Math.PI);pose.lean=-11*impact;pose.crouch=5*impact;pose.headTilt=-.2*impact;pose.leftHand={x:-28,y:82};pose.rightHand={x:28,y:85};}
  if(a==='pickup'){pose.crouch=Math.sin(p*Math.PI)*15;pose.lean=8*Math.sin(p*Math.PI);pose.rightHand={x:24,y:108};}
  if(a==='respawn'){pose.crouch=(1-smooth(p))*20;pose.lean=-12*(1-smooth(p));pose.headTilt=-.25*(1-p);}
  return pose;
 }
}
