import Phaser from 'phaser';
import { TILE, WIDTH, HEIGHT, EDGE, connections, key, biomeAt, rng, isSheltered, type Cells, type Cell } from './world';
import type { WorldScene } from './game';

export function paintGround(scene: WorldScene) {
 const g = scene.grounds; g.clear();
 g.fillStyle(0x536a48).fillRect(0,0,WIDTH*TILE,HEIGHT*TILE);g.fillStyle(0x3d5a47).fillRect(0,29*TILE,EDGE*TILE,(HEIGHT-29)*TILE);g.fillStyle(0x455b57).fillRect(EDGE*TILE,0,(WIDTH-EDGE)*TILE,HEIGHT*TILE);g.fillStyle(0x7b7a64).fillRect(48*TILE,0,(WIDTH-48)*TILE,24*TILE);g.fillStyle(0x385d5a).fillRect(EDGE*TILE,33*TILE,(WIDTH-EDGE)*TILE,(HEIGHT-33)*TILE);
 const palettes = { meadow: [0x536a48, 0x91a969], forest: [0x3d5a47, 0x799b67], ruins: [0x455b57, 0x859c81], marsh: [0x385d5a, 0x75a7a0], quarry: [0x7b7a64, 0xb3ad87] };
 for (let x = 0; x < WIDTH; x++) for (let y = 0; y < HEIGHT; y++) {
  const b = biomeAt(x, y), p = palettes[b], r = rng(x * 1193 + y * 371 + 5), px = x * TILE, py = y * TILE;
  g.fillStyle(p[1], .035 + r() * .035).fillEllipse(px + 28, py + 32, 100, 72);
  if (b === 'marsh' && r() < .2) { g.fillStyle(0x263f48, .5).fillEllipse(px + 30, py + 35, 57, 26); g.lineStyle(1, 0x8bb8a9, .25).strokeEllipse(px + 29, py + 32, 33, 8); }
  if (b === 'ruins' && r() < .22) { for (let i = 0; i < 4; i++) { g.fillStyle(0x94a597, .13).fillRoundedRect(px + 5 + i % 2 * 25, py + 12 + Math.floor(i / 2) * 19, 22, 14, 3); } }
  for (let i = 0; i < 3; i++) {
   const xx = px + r() * TILE, yy = py + r() * TILE;
   if (b === 'quarry') { g.fillStyle(0xcec8a1, .3).fillEllipse(xx, yy, 5, 3); }
   else { g.lineStyle(1, p[1], .3).lineBetween(xx, yy, xx - 2, yy - 4).lineBetween(xx, yy, xx + 3, yy - 6); }
  }
  if (b === 'meadow' && r() < .13) { const fx = px + r() * 50 + 8, fy = py + r() * 50 + 8; g.lineStyle(1, 0x6d914e).lineBetween(fx, fy, fx, fy - 5); g.fillStyle(r() < .5 ? 0xe6d3a1 : 0xcaa299, .7).fillCircle(fx, fy - 6, 2); }
  if (b === 'forest' && r() < .12) { const fx = px + 20 + r() * 30; g.fillStyle(0xc0baa0).fillRoundedRect(fx, py + 39, 3, 6, 1); g.fillStyle(0xc48f65).fillEllipse(fx + 1, py + 37, 10, 6); }
 }
 g.lineStyle(32,0xafa47b,.14);g.beginPath();g.moveTo(0,16*TILE+32);for(let x=1;x<=EDGE;x++)g.lineTo(x*TILE,(16+Math.sin(x*.27)*1.2)*TILE+32);g.strokePath();
 // Natural fault, not a straight painted grid boundary.
 for (let y = 0; y < HEIGHT; y++) { const px = EDGE * TILE; g.fillStyle(0x203e42).fillPoints([{ x: px - 5, y: y * TILE }, { x: px + 9, y: y * TILE + 18 }, { x: px + 4, y: y * TILE + 48 }, { x: px + 11, y: y * TILE + 64 }, { x: px - 8, y: y * TILE + 64 }, { x: px - 13, y: y * TILE + 29 }], true); g.fillStyle(0xabd6b8, .35).fillEllipse(px - 2, y * TILE + 28, 4, 14); }
 g.fillStyle(0x938b69, .15).fillEllipse(9 * TILE + 32, 16 * TILE + 32, 290, 190);
 // Old masonry forms continuous stretches, corners and intersections.
 const walls: Cells = {}; for (const p of scene.ruins) walls[key(p.x, p.y)] = { wall: true };
 for (const p of scene.ruins) paintStructure(g, walls, p.x, p.y, 'wall', 0, true);
 for (const n of scene.worldData.nodes.filter(n => n.kind === 'relic')) { const x = n.x * TILE, y = n.y * TILE; g.fillStyle(0x87948b, .35).fillRoundedRect(x - 40, y - 32, 144, 138, 12); g.lineStyle(2, 0xaab5a0, .25).strokeRoundedRect(x - 34, y - 26, 132, 126, 10); }
}

export function paintStructure(g: Phaser.GameObjects.Graphics, cells: Cells, x: number, y: number, kind: 'wall' | 'fence' | 'door', open = 0, stone = false) {
 const c = cells[key(x, y)] || {}, n = connections(cells, x, y, kind), cx = x * TILE + 32, cy = y * TILE + 32;
 const has = n.n || n.e || n.s || n.w, vertical = c.rotation === 1;
 const w = n.w || (!has && !vertical), e = n.e || (!has && !vertical), north = n.n || (!has && vertical), south = n.s || (!has && vertical);
 if (kind === 'door') {
  const v = (north || south) && !(w || e);
  const plank = (xx: number, yy: number, width: number, height: number) => { g.fillStyle(0x786042).fillRoundedRect(xx, yy, width, height, 2); g.lineStyle(2, 0xc0a171).strokeRoundedRect(xx, yy, width, height, 2); };
  if (v) { plank(cx - 12, cy - 32, 24, 9); plank(cx - 12, cy + 23, 24, 9); g.fillStyle(0x99734a).fillRoundedRect(cx - 5 - open * 17, cy - 21, 10 + open * 22, 42 * (1 - open) + 4, 2); g.lineStyle(2, 0xd0b486).lineBetween(cx - 6, cy - 16, cx - 6 - open * 15, cy + 17 * (1 - open)); }
  else { plank(cx - 32, cy - 13, 9, 26); plank(cx + 23, cy - 13, 9, 26); g.fillStyle(0x977148).fillRoundedRect(cx - 22, cy - 7 - open * 24, 44 * (1 - open) + 5, 14 + open * 18, 2); g.lineStyle(2, 0xd2b584).lineBetween(cx - 17, cy - 5 - open * 23, cx + 16 * (1 - open), cy - 5); }
  return;
 }
 const arms = [[w, cx - 32, cy, cx, cy], [e, cx, cy, cx + 32, cy], [north, cx, cy - 32, cx, cy], [south, cx, cy, cx, cy + 32]] as const;
 const thick = kind === 'fence' ? 6 : 22;
 for (const [visible, ax, ay, bx, by] of arms) if (visible) {
  g.lineStyle(thick + 6, 0x20362e, .2).lineBetween(ax + 5, ay + 11, bx + 5, by + 11);
  if (kind === 'fence') {
   g.lineStyle(5, 0x72583d).lineBetween(ax, ay, bx, by);
   g.lineStyle(4, 0xbf9f6f).lineBetween(ax, ay - 11, bx, by - 11);
   g.lineStyle(2, 0xe0c795).lineBetween(ax, ay - 13, bx, by - 13);
  } else {
   if(!stone&&ax!==bx){g.fillStyle(0x725039).fillRoundedRect(ax,ay-5,bx-ax,30,3);for(let row=0;row<3;row++){g.lineStyle(7,row===0?0xa27b4e:row===1?0x997046:0x876440).lineBetween(ax,ay+row*9,bx,by+row*9);g.lineStyle(1,0xc4a16b,.55).lineBetween(ax,ay+row*9-2,bx,by+row*9-2);}}
   g.lineStyle(thick, stone ? 0x536b69 : 0x78573e).lineBetween(ax, ay, bx, by);
   g.lineStyle(thick - 5, stone ? 0x93a49a : 0xb18b58).lineBetween(ax, ay - 6, bx, by - 6);
   g.lineStyle(2, stone ? 0xc2c9ad : 0xddbd86, .65).lineBetween(ax, ay - 14, bx, by - 14);
   if (ax !== bx) { for (let xx = ax + 8; xx < bx; xx += stone ? 17 : 22) g.lineStyle(1, stone ? 0x51696a : 0x755b3f).lineBetween(xx, ay - 13, xx, ay + 2); }
   else { for (let yy = ay + 8; yy < by; yy += 12) g.lineStyle(2, stone ? 0x6b8078 : 0x8f6b46).lineBetween(ax - 9, yy - 5, ax + 9, yy - 5); }
  }
 }
 if (kind === 'fence') { g.fillStyle(0x8b6946).fillRoundedRect(cx - 5, cy - 17, 10, 23, 2); g.fillStyle(0xe0c28d).fillRoundedRect(cx - 5, cy - 19, 10, 5, 2); }
 else if (!stone&& !((w&&e&&!north&&!south)||(north&&south&&!w&&!e))) { g.fillStyle(0x694f38).fillRoundedRect(cx-10,cy-5,20,29,3);g.fillStyle(0x8d6b48).fillCircle(cx, cy - 5, 10); g.lineStyle(2, 0xc7a677).strokeCircle(cx, cy - 5, 7); g.lineStyle(1, 0xddbf8d).strokeCircle(cx, cy - 5, 3); }
}

export function paintBuildings(scene: WorldScene) {
 const g = scene.buildings, r = scene.roofs; g.clear(); r.clear();
 for (const [k, c] of Object.entries(scene.state.cells)) {
  const [cx, cy] = k.split(',').map(Number), x = cx * TILE, y = cy * TILE;
  if (c.floor) { const boundary=(dx:number,dy:number)=>!!(scene.state.cells[key(cx+dx,cy+dy)]?.wall||scene.state.cells[key(cx+dx,cy+dy)]?.door);const left=boundary(-1,0)?32:0,right=boundary(1,0)?32:0,top=boundary(0,-1)?32:0,bottom=boundary(0,1)?32:0;g.fillStyle(0x98764f).fillRect(x-left,y-top,TILE+left+right,TILE+top+bottom);for(let row=y-top;row<y+TILE+bottom;row+=16)g.lineStyle(1,0x69563e,.6).lineBetween(x-left,row,x+TILE+right,row);g.fillStyle(0x98764f).fillRect(x, y, TILE, TILE); for (let i = 0; i < 4; i++) { g.lineStyle(1, 0x69563e, .7).lineBetween(x, y + i * 16, x + TILE, y + i * 16); g.lineStyle(1, 0xc6a370, .3).lineBetween(x + 4, y + i * 16 + 4, x + 58, y + i * 16 + 4); g.fillStyle(0x67573f, .5).fillCircle(x + 6, y + i * 16 + 8, 1).fillCircle(x + 58, y + i * 16 + 8, 1); } }
 }
 for (const [k, c] of Object.entries(scene.state.cells)) {
  const [cx, cy] = k.split(',').map(Number), x = cx * TILE, y = cy * TILE;
  if (c.wall) paintStructure(g, scene.state.cells, cx, cy, 'wall');
  if (c.fence) paintStructure(g, scene.state.cells, cx, cy, 'fence');
  if (c.door) paintStructure(g, scene.state.cells, cx, cy, 'door', scene.doorOpen.get(k) || 0);
  if (c.station) {
   const s = c.station; g.fillStyle(0x20332c, .3).fillEllipse(x + 36, y + 49, 51, 19);
   if (s.kind === 'furnace') { g.fillStyle(0x536966).fillRoundedRect(x + 10, y + 8, 44, 46, 5); g.fillStyle(0xa9b2a0).fillRoundedRect(x + 9, y + 5, 46, 10, 3); g.fillStyle(0x7c9183).fillRect(x + 38, y - 12, 11, 22); g.lineStyle(1, 0x384f4e).lineBetween(x + 12, y + 24, x + 51, y + 24).lineBetween(x + 23, y + 16, x + 23, y + 24).lineBetween(x + 43, y + 24, x + 43, y + 39); g.fillStyle(0x21393a).fillRoundedRect(x + 21, y + 30, 23, 21, 6); g.fillStyle(s.durability ? 0xe9a95e : 0x485b52).fillEllipse(x + 33, y + 44, 13, 12); g.fillStyle(0xf8d98f).fillEllipse(x + 35, y + 46, 5, 7); }
   if (s.kind === 'forge') { g.fillStyle(0x614b36).fillRoundedRect(x + 13, y + 33, 37, 24, 5); g.fillStyle(0x9d7b4d).fillEllipse(x + 31, y + 34, 39, 12); g.fillStyle(0x66868b).fillRect(x + 25, y + 22, 11, 14); g.fillStyle(0xb7cac1).fillPoints([{ x: x + 9, y: y + 14 }, { x: x + 46, y: y + 14 }, { x: x + 56, y: y + 8 }, { x: x + 56, y: y + 22 }, { x: x + 37, y: y + 28 }, { x: x + 19, y: y + 24 }], true); g.lineStyle(2, 0xe0e7d0).lineBetween(x + 13, y + 15, x + 44, y + 15); g.lineStyle(3, 0xae8351).lineBetween(x + 16, y + 29, x + 10, y + 40); g.fillStyle(0x7b9b98).fillRect(x + 10, y + 28, 11, 5); }
   if (s.kind === 'chest') { g.fillStyle(0x7a563c).fillRoundedRect(x + 11, y + 19, 43, 34, 4); g.fillStyle(0xc39b65).fillRoundedRect(x + 11, y + 14, 43, 15, 4); g.lineStyle(3, 0xdfc28b).lineBetween(x + 20, y + 15, x + 20, y + 51).lineBetween(x + 45, y + 15, x + 45, y + 51); g.fillStyle(0xe9d09c).fillRoundedRect(x + 29, y + 27, 7, 8, 1); }
   if (s.kind !== 'chest') { g.fillStyle(0x233831, .6).fillRoundedRect(x + 14, y + 58, 36, 3, 1); g.fillStyle(s.durability < 25 ? 0xd18d73 : isSheltered(scene.state.cells, cx, cy) ? 0xadd39c : 0xd4b278).fillRect(x + 14, y + 58, 36 * s.durability / 100, 3); }
  }
  if (c.roof) {
   const boundary=(dx:number,dy:number)=>!!(scene.state.cells[key(cx+dx,cy+dy)]?.wall||scene.state.cells[key(cx+dx,cy+dy)]?.door);const left=boundary(-1,0)?32:0,right=boundary(1,0)?32:0,top=boundary(0,-1)?32:0,bottom=boundary(0,1)?32:0;r.fillStyle(0x986c52).fillRect(x-left,y-top,TILE+left+right,TILE+top+bottom);for(let row=y-top;row<y+TILE+bottom;row+=16)r.lineStyle(1,0x77594a,.8).lineBetween(x-left,row,x+TILE+right,row);
   const neigh = (dx: number, dy: number) => !!scene.state.cells[key(cx + dx, cy + dy)]?.roof;
   r.fillStyle(0x77594a).fillRect(x, y, TILE, TILE);
   for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) { const xx = x + col * 16, yy = y + row * 16; r.fillStyle((row + col) % 2 ? 0xa7785a : 0x986c52).fillRoundedRect(xx + 1, yy, 15, 15, 3); r.lineStyle(1, 0xc49970, .5).lineBetween(xx + 3, yy + 2, xx + 13, yy + 2); }
   r.lineStyle(3, 0x4c4736); if (!neigh(-1, 0)) r.lineBetween(x, y, x, y + TILE); if (!neigh(1, 0)) r.lineBetween(x + TILE, y, x + TILE, y + TILE); if (!neigh(0, -1)) r.lineBetween(x, y, x + TILE, y); if (!neigh(0, 1)) r.lineBetween(x, y + TILE, x + TILE, y + TILE);
  }
 }
}
