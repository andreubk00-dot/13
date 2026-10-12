import Phaser from 'phaser';
export function makeArt(scene:Phaser.Scene){
 const make=(name:string,w:number,h:number,draw:(g:Phaser.GameObjects.Graphics)=>void)=>{const g=scene.make.graphics({x:0,y:0});draw(g);g.generateTexture(name,w,h);g.destroy();};
 const ellipse=(g:Phaser.GameObjects.Graphics,x:number,y:number,w:number,h:number,c:number,a=1)=>g.fillStyle(c,a).fillEllipse(x,y,w,h);
 make('tree',100,140,g=>{
  ellipse(g,50,123,68,22,0x081b1b,.3);g.fillStyle(0x403b30).fillRoundedRect(44,66,12,60,3);g.fillStyle(0x807251).fillRect(47,85,3,39);
  g.fillStyle(0x133333).fillTriangle(50,4,8,84,92,84);g.fillStyle(0x28524a).fillTriangle(50,16,4,105,96,105);g.fillStyle(0x427565).fillTriangle(50,11,20,71,80,71);g.fillStyle(0x568672).fillTriangle(50,11,27,60,50,60);g.fillStyle(0x335e52).fillTriangle(50,53,17,91,83,91);
 });
 for(const kind of ['rock','ore'])make(kind,80,70,g=>{ellipse(g,40,57,64,20,0x061e22,.3);g.fillStyle(0x243538).fillPoints([{x:10,y:49},{x:17,y:22},{x:37,y:10},{x:61,y:20},{x:72,y:48},{x:55,y:58},{x:28,y:59}],true);g.fillStyle(kind==='ore'?0x596674:0x718079).fillTriangle(17,22,37,10,51,35);g.fillStyle(0x465957).fillTriangle(17,22,51,35,10,49);g.fillStyle(0x82928a).fillTriangle(37,10,61,20,51,35);if(kind==='ore'){g.lineStyle(4,0xcba066).lineBetween(25,37,43,28).lineBetween(46,43,58,34);}});
 make('relic',80,90,g=>{ellipse(g,40,77,63,16,0x000000,.3);g.fillStyle(0x303b40).fillRoundedRect(13,36,54,39,4);g.fillStyle(0x586267).fillTriangle(10,37,40,17,70,37);g.lineStyle(2,0xdac281).strokeRect(22,42,36,23);g.fillStyle(0xe9ce7d).fillCircle(40,51,4);g.lineStyle(2,0x997b52).lineBetween(40,17,40,35);});
 make('player',52,68,g=>{ellipse(g,26,61,32,10,0x000000,.3);g.fillStyle(0x152a2e).fillRoundedRect(14,27,25,32,8);g.fillStyle(0xd2b678).fillTriangle(26,24,9,55,42,55);g.fillStyle(0xeee1b4).fillTriangle(26,27,16,47,29,48);g.fillStyle(0x294446).fillRoundedRect(17,9,21,23,9);g.fillStyle(0xefc69b).fillRoundedRect(22,17,15,10,4);g.fillStyle(0x263f40).fillRect(24,15,15,4);g.fillStyle(0x0b252b).fillRect(31,21,3,3);g.fillStyle(0x614f3b).fillRect(15,42,25,4);});
 for(const elite of [false,true])make(elite?'warden':'guard',64,80,g=>{ellipse(g,32,73,46,13,0x000000,.3);g.fillStyle(elite?0x554050:0x374a51).fillTriangle(32,16,10,65,54,65);g.fillStyle(elite?0xa67373:0x7c9296).fillRoundedRect(19,27,26,31,5);g.fillStyle(0x1a2c36).fillRoundedRect(17,9,30,28,8);g.lineStyle(3,elite?0xf2ac85:0xe6c186).lineBetween(24,22,29,22).lineBetween(36,22,41,22);g.fillStyle(0x546168).fillTriangle(16,15,8,2,24,12);g.fillTriangle(48,15,55,2,40,12);g.fillStyle(0x242f38).fillRect(20,57,9,14).fillRect(36,57,9,14);});
 make('spark',20,20,g=>{g.fillStyle(0xffd795).fillTriangle(10,0,0,10,10,20).fillTriangle(10,0,20,10,10,20);});
}
