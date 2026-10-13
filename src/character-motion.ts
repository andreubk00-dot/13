export type CharacterAction='idle'|'walk'|'run'|'attack'|'harvest'|'dash'|'hurt'|'craft'|'build'|'pickup'|'respawn';
export type Point={x:number;y:number};
// Gameplay timing is independent of the source clip's authoring frame rate.
export const actionDuration:Partial<Record<CharacterAction,number>>={attack:.72,harvest:.64,dash:.2,hurt:.42,craft:.9,build:.65,pickup:.7,respawn:1.2};
export const RUN_DISTANCE=120;
export const contactTime={attack:.28,harvest:.25};
export class CharacterMotion {
 action:CharacterAction='idle';elapsed=0;clock=0;gait=0;speed=0;contacts=0;sequence=0;weapon:'hands'|'spear'|'storm'='hands';private contacted=false;
 play(action:CharacterAction){this.action=action;this.elapsed=0;this.contacted=false;this.sequence++;}
 reset(){this.action='idle';this.elapsed=0;this.speed=0;this.gait=0;this.contacted=false;this.sequence++;}
 step(dt:number,moving:boolean,distance?:number,velocity?:number,_acceleration=0){
  this.clock+=dt;
  const target=velocity!==undefined?Math.min(1,velocity/185):Number(moving);
  this.speed+=(target-this.speed)*(1-Math.exp(-dt*14));
  if(this.action!=='dash')this.gait+=(distance??(moving?185*dt/.85:0))/RUN_DISTANCE*Math.PI*2;
  let contact=false;
  if(actionDuration[this.action]){
   this.elapsed+=dt;
   if((this.action==='attack'||this.action==='harvest')&&!this.contacted&&this.elapsed>=contactTime[this.action]){this.contacted=true;this.contacts++;contact=true;}
   if(this.elapsed>=actionDuration[this.action]!){this.action=moving?'run':'idle';this.elapsed=0;this.sequence++;}
  }else {const next=moving?'run':'idle';if(next!==this.action){this.action=next;this.sequence++;}}
  return contact;
 }
 clip(){
  if(this.action==='attack')return this.weapon==='spear'?'thrust':this.weapon==='storm'?'slash':'punch';
  if(this.action==='harvest')return this.weapon==='hands'?'punch':'harvest';
  if(this.action==='build')return 'craft';
  if(this.action==='walk')return 'run';
  return this.action;
 }
 phase(){
  if(this.action==='run'||this.action==='walk')return ((this.gait/(Math.PI*2))%1+1)%1;
  if(this.action==='idle')return (this.clock/(25.6/24))%1;
  const p=Math.min(1,this.elapsed/actionDuration[this.action]!);
  // The strike's author contact pose is sampled exactly when damage is applied.
  if(this.action==='attack'||this.action==='harvest'){
   const contact=this.clip()==='punch'?.43:this.clip()==='thrust'?.45:.4;
   const at=contactTime[this.action]/actionDuration[this.action]!;
   return p<at?p/at*contact:contact+(p-at)/(1-at)*(1-contact);
  }
  return p;
 }
 pose(){return {action:this.action,progress:this.phase(),running:(this.action==='run'||this.action==='walk')?this.speed:0,runPhase:this.gait/(Math.PI*2)};}
}
