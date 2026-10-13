export type MovementInput={x:number;y:number};
/** Fixed-step kinematic body. Acceleration and braking are independent of rendering FPS. */
export class LocomotionBody {
 vx=0;vy=0;distance=0;acceleration=0;private remainder=0;
 readonly maxSpeed=185;readonly accelerationRate=1050;readonly brakingRate=1550;
 reset(){this.vx=0;this.vy=0;this.remainder=0;this.distance=0;this.acceleration=0;}
 step(dt:number,input:MovementInput,move:(dx:number,dy:number)=>MovementInput){
  const before=Math.hypot(this.vx,this.vy);this.distance=0;this.remainder+=Math.min(dt,.1);const h=1/120;
  const magnitude=Math.hypot(input.x,input.y),scale=magnitude>1?1/magnitude:1,tx=input.x*scale*this.maxSpeed,ty=input.y*scale*this.maxSpeed;
  while(this.remainder+1e-10>=h){this.remainder-=h;const dx=tx-this.vx,dy=ty-this.vy,change=Math.hypot(dx,dy),limit=(magnitude<.001?this.brakingRate:this.accelerationRate)*h;
   if(change<=limit){this.vx=tx;this.vy=ty;}else{this.vx+=dx/change*limit;this.vy+=dy/change*limit;}
   const requested={x:this.vx*h,y:this.vy*h},actual=move(requested.x,requested.y);this.distance+=Math.hypot(actual.x,actual.y);
   if(Math.abs(actual.x-requested.x)>.001)this.vx=0;if(Math.abs(actual.y-requested.y)>.001)this.vy=0;
  }
  this.acceleration=(Math.hypot(this.vx,this.vy)-before)/Math.max(dt,.001);
 }
 get speed(){return Math.hypot(this.vx,this.vy);}
}
