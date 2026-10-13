import type {Point,CharacterPose} from './character-motion';
import {projectRunJoint,mixPoint} from './run-animation.ts';
export const HERO_SIZE=208,HERO_FOOT=138,HERO_SCALE=.85;
export type Limb={root:Point;joint:Point;end:Point};
/** Clamp the endpoint too: unreachable targets must never stretch a forearm or shin. */
export function solveLimb(root:Point,target:Point,upper:number,lower:number,bend:number):Limb {
 const dx=target.x-root.x,dy=target.y-root.y,d=Math.hypot(dx,dy),nx=d>.0001?dx/d:0,ny=d>.0001?dy/d:1;
 const reach=Math.max(Math.abs(upper-lower)+.001,Math.min(upper+lower-.001,d));
 const along=(upper*upper-lower*lower+reach*reach)/(2*reach),height=Math.sqrt(Math.max(0,upper*upper-along*along));
 return {root,joint:{x:root.x+nx*along-ny*height*bend,y:root.y+ny*along+nx*height*bend},end:{x:root.x+nx*reach,y:root.y+ny*reach}};
}
export function transformPoint(point:Point,pivot:Point,angle:number):Point{return{x:pivot.x+point.x*Math.cos(angle)-point.y*Math.sin(angle),y:pivot.y+point.x*Math.sin(angle)+point.y*Math.cos(angle)};}

export function characterArm(pose:CharacterPose,facing:Point,sign:number):Limb {
 const side=Math.abs(facing.x),lean=pose.lean*(side*.85+.15),pivot={x:lean,y:74+pose.bob+pose.crouch},width=16-side*5,h=sign<0?pose.leftHand:pose.rightHand;
 const root=transformPoint({x:sign*width,y:-9},pivot,pose.turn),target=transformPoint({x:h.x*(1-side*.25),y:h.y-82},pivot,pose.turn);
 const base=solveLimb(root,target,17,17,-sign),sideName=sign<0?'L':'R',t=pose.running;
 return {root:mixPoint(base.root,projectRunJoint(`upper_arm.${sideName}.head`,pose,facing),t),joint:mixPoint(base.joint,projectRunJoint(`forearm.${sideName}.head`,pose,facing),t),end:mixPoint(base.end,projectRunJoint(`forearm.${sideName}.tail`,pose,facing),t)};
}
export function weaponTransform(pose:CharacterPose,facing:Point){return {hand:characterArm(pose,facing,1).end,angle:pose.weaponAngle+Math.atan2(facing.y,Math.abs(facing.x))*pose.aimWeight+pose.turn};}

/** Turn along the shortest arc, reaching the target exactly instead of wrapping through 360°. */
export function advanceAngle(from:number,to:number,dt:number,rate:number){const delta=Math.atan2(Math.sin(to-from),Math.cos(to-from)),limit=dt*rate;return Math.abs(delta)<=limit?to:from+Math.sign(delta)*limit;}
