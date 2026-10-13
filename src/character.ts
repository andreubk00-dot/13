import Phaser from 'phaser';
import {CharacterMotion,type Point} from './character-motion';
import {characterAtlas,type SpriteRect} from './generated/character-atlas';
import type {SaveData} from './world';
export const HERO_SIZE=208,HERO_FOOT=138,HERO_SCALE=.85;
const SCALE=1.5;
export function preloadCharacter(scene:Phaser.Scene){characterAtlas.atlases.forEach((file,i)=>scene.load.image('kaykit-'+i,'./character/'+file));}
export function characterImages(scene:Phaser.Scene){return characterAtlas.atlases.map((_file,i)=>scene.textures.get('kaykit-'+i).getSourceImage() as HTMLImageElement);}
export function facingDirection(facing:Point){return ((Math.round(Math.atan2(facing.x,facing.y)/(Math.PI/4))%8)+8)%8;}
export function paintArtistCharacter(c:CanvasRenderingContext2D,images:HTMLImageElement[],clip:string,direction:number,phase:number,equipment:SaveData['equipment']){
 const animation=characterAtlas.clips[clip];
 const frame=Math.min(animation.frames-1,Math.floor(Math.max(0,phase)*(animation.loop?animation.frames:animation.frames-1)));
 const sprites=animation.sprites[direction][frame];
 const draw=(r:SpriteRect)=>{const [atlas,x,y,w,h,ox,oy]=r;if(!w||!h)return;c.drawImage(images[atlas],x,y,w,h,HERO_SIZE/2+(ox-characterAtlas.width/2)*SCALE,HERO_FOOT+(oy-characterAtlas.ground)*SCALE,w*SCALE,h*SCALE);};
 c.clearRect(0,0,HERO_SIZE,HERO_SIZE);
 c.fillStyle='#0b252e38';c.beginPath();c.ellipse(HERO_SIZE/2,HERO_FOOT+1,24,6,0,0,Math.PI*2);c.fill();
 const weapon=equipment.weapon==='storm'?4:equipment.weapon==='spear'?5:0;
 const behind=direction>=3&&direction<=5;
 if(weapon&&behind)draw(sprites[weapon]);
 draw(sprites[0]);
 if(equipment.feet)draw(sprites[3]);
 if(equipment.body)draw(sprites[2]);
 if(equipment.head)draw(sprites[1]);
 if(weapon&&!behind)draw(sprites[weapon]);
 return frame;
}
export class CharacterRenderer {
 motion=new CharacterMotion();texture:Phaser.Textures.CanvasTexture;renders=0;frame=0;direction=0;source='KayKit Rogue';clip='idle';
 private images:HTMLImageElement[];private lastSequence=-1;private lastDirection=-1;private lastGear='';private blendStart=-1;
 private previous=document.createElement('canvas');
 constructor(scene:Phaser.Scene){
  this.images=characterImages(scene);this.texture=scene.textures.createCanvas('hero-live',HERO_SIZE,HERO_SIZE)!;
  this.previous.width=HERO_SIZE;this.previous.height=HERO_SIZE;
  // Only the live 208px canvas needs a GPU texture. Keep the trimmed source atlases on the CPU.
  characterAtlas.atlases.forEach((_file,i)=>scene.textures.remove('kaykit-'+i));
 }
 portrait(equipment:SaveData['equipment']){
  const full=document.createElement('canvas');full.width=HERO_SIZE;full.height=HERO_SIZE;paintArtistCharacter(full.getContext('2d')!,this.images,'idle',0,0,equipment);
  const thumb=document.createElement('canvas');thumb.width=72;thumb.height=88;thumb.getContext('2d')!.drawImage(full,60,32,88,112,2,0,68,88);return thumb.toDataURL();
 }
 draw(facing:Point,equipment:SaveData['equipment']){
  this.motion.weapon=equipment.weapon==='spear'||equipment.weapon==='storm'?equipment.weapon:'hands';
  this.direction=facingDirection(facing);this.clip=this.motion.clip();
  const gear=JSON.stringify(equipment),changed=this.lastSequence!==this.motion.sequence||this.lastDirection!==this.direction||this.lastGear!==gear;
  if(changed){this.previous.getContext('2d')!.clearRect(0,0,HERO_SIZE,HERO_SIZE);this.previous.getContext('2d')!.drawImage(this.texture.getSourceImage() as HTMLCanvasElement,0,0);this.blendStart=this.motion.clock;this.lastSequence=this.motion.sequence;this.lastDirection=this.direction;this.lastGear=gear;}
  const c=this.texture.getContext();this.frame=paintArtistCharacter(c,this.images,this.clip,this.direction,this.motion.phase(),equipment);
  const t=Math.min(1,(this.motion.clock-this.blendStart)/.06);
  if(t<1&&this.renders>0){c.globalAlpha=1-t;c.drawImage(this.previous,0,0);c.globalAlpha=1;}
  this.texture.refresh();this.renders++;
 }
}
