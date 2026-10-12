import Phaser from 'phaser';

export function makeArt(scene: Phaser.Scene) {
 const make = (name: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
  const t = scene.textures.createCanvas(name, w, h)!; const c = t.getContext(); c.lineJoin = 'round'; c.lineCap = 'round'; draw(c); t.refresh();
 };
 const ellipse = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => { c.fillStyle = color; c.beginPath(); c.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2); c.fill(); };
 const round = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string) => { c.fillStyle = color; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); };
 const line = (c: CanvasRenderingContext2D, x: number, y: number, xx: number, yy: number, color: string, width = 2) => { c.strokeStyle = color; c.lineWidth = width; c.beginPath(); c.moveTo(x, y); c.lineTo(xx, yy); c.stroke(); };
 for (let v = 0; v < 4; v++) make('tree' + v, 136, 172, c => {
  ellipse(c, 74, 153, 86, 23, '#14262c40');
  round(c, 63, 87, 14, 64, 4, v === 1 ? '#ccc5a5' : '#63513e');
  line(c, 69, 99, 69, 147, v === 1 ? '#f1dfba' : '#ae8c5d', 3);
  line(c, 67, 112, 45, 86, '#68543f', 7); line(c, 71, 113, 94, 78, '#68543f', 6);
  if (v === 3) { line(c, 68, 100, 50, 30, '#81765d', 8); line(c, 51, 45, 31, 38, '#81765d', 5); line(c, 55, 61, 82, 42, '#81765d', 6); line(c, 71, 90, 107, 55, '#81765d', 6); line(c, 93, 70, 112, 75, '#81765d', 4); ellipse(c, 43, 41, 34, 19, '#778275'); return; }
  const tones = v === 1 ? ['#4e7257', '#779963', '#92ad76', '#b0be89'] : v === 2 ? ['#264e55', '#42726c', '#63978a', '#87af90'] : ['#315c49', '#487d57', '#739a62', '#a0b77a'];
  const gradient = c.createLinearGradient(0, 10, 0, 126); gradient.addColorStop(0, tones[2]); gradient.addColorStop(1, tones[0]); c.fillStyle = gradient;
  c.beginPath(); c.moveTo(27, 120); c.bezierCurveTo(4, 116, 15, 91, 24, 84); c.bezierCurveTo(9, 65, 27, 45, 44, 48); c.bezierCurveTo(28, 21, 51, 7, 72, 21); c.bezierCurveTo(94, 7, 112, 30, 98, 47); c.bezierCurveTo(124, 42, 137, 68, 115, 84); c.bezierCurveTo(142, 109, 113, 132, 89, 122); c.bezierCurveTo(72, 142, 47, 132, 43, 119); c.closePath(); c.fill();
  ellipse(c, 58, 39, 43, 27, tones[3] + '66'); ellipse(c, 39, 63, 43, 24, tones[2] + '80'); ellipse(c, 87, 75, 56, 36, tones[2] + '80'); ellipse(c, 62, 105, 46, 24, tones[1] + '99');
  for (let i = 0; i < 12; i++) { const x = 31 + (i * 19 % 67), y = 30 + (i * 29 % 77); ellipse(c, x, y, 7, 3, tones[3] + '65'); }
  if (v === 1) { line(c, 64, 125, 72, 127, '#665e50', 2); line(c, 67, 137, 75, 135, '#665e50', 2); }
 });
 for (const kind of ['rock', 'ore']) for (let v = 0; v < 2; v++) make(kind + v, 88, 76, c => {
  ellipse(c, 45, 65, 69, 18, '#10262b42');
  c.fillStyle = kind === 'ore' ? '#647b80' : v ? '#9e9a87' : '#8a9991';
  c.beginPath(); c.moveTo(10, 55); c.lineTo(15, 31); c.quadraticCurveTo(24, 10, 41, 16); c.lineTo(66, 23); c.lineTo(78, 49); c.lineTo(65, 65); c.lineTo(26, 66); c.closePath(); c.fill();
  c.fillStyle = kind === 'ore' ? '#9bafb0' : '#bdc2ab'; c.beginPath(); c.moveTo(17, 31); c.lineTo(41, 16); c.lineTo(66, 23); c.lineTo(49, 42); c.closePath(); c.fill();
  c.fillStyle = kind === 'ore' ? '#435e67' : '#667a74'; c.beginPath(); c.moveTo(49, 42); c.lineTo(78, 49); c.lineTo(65, 65); c.lineTo(40, 65); c.closePath(); c.fill();
  line(c, 17, 31, 49, 42, '#d1d5b980', 2);
  if (kind === 'ore') for (const [x, y] of [[28, 35], [54, 31], [52, 53]]) { line(c, x, y, x + 8, y - 4, '#e0ac79', 5); line(c, x + 1, y - 2, x + 5, y - 4, '#f4d4a2', 2); }
 });
 make('relic', 100, 112, c => { ellipse(c, 50, 98, 79, 19, '#10262b45'); round(c, 13, 45, 74, 49, 7, '#425b62'); round(c, 16, 39, 68, 13, 5, '#91a6a1'); round(c, 28, 59, 44, 25, 4, '#213d49'); c.strokeStyle = '#c9b68c'; c.lineWidth = 2; c.strokeRect(32, 62, 36, 18); line(c, 38, 73, 47, 67, '#a7d6bd', 2); line(c, 47, 67, 58, 75, '#a7d6bd', 2); round(c, 35, 17, 28, 20, 3, '#8daaa1'); line(c, 42, 21, 57, 28, '#d5dfb7', 2); ellipse(c, 50, 94, 25, 6, '#b6d8a955'); });
 for (const direction of ['front', 'back', 'side']) for (let frame = 0; frame < 8; frame++) make(`player-${direction}-${frame}`, 72, 88, c => {
  const walk = Math.sin(frame / 8 * Math.PI * 2), lift = Math.abs(walk) * 1.4, bob = frame === 0 ? 0 : lift;
  ellipse(c, 36, 80, 39, 11, '#15283150');
  const left = direction === 'side' ? -walk * 3 : walk * 4, right = -left;
  round(c, 25, 58 + left, 9, 18, 4, '#283e4d'); round(c, 39, 58 + right, 9, 18, 4, '#283e4d');
  round(c, 23, 72 + left, 12, 8, 3, '#50423b'); round(c, 38, 72 + right, 13, 8, 3, '#50423b'); line(c, 25, 74 + left, 32, 74 + left, '#ab8c65', 2); line(c, 40, 74 + right, 48, 74 + right, '#ab8c65', 2);
  round(c, 20, 34 - bob, 11, 25, 5, '#ae754e'); round(c, 43, 34 - bob, 10, 25, 5, '#885d46');
  ellipse(c, 23, 56 - bob - walk * 2, 9, 10, '#e0bda0'); ellipse(c, 49, 56 - bob + walk * 2, 9, 10, '#d5ac88');
  round(c, 25, 32 - bob, 23, 32, 7, '#bf8a5b'); round(c, 25, 48 - bob, 23, 16, 4, '#a97750');
  line(c, 26, 35 - bob, 44, 54 - bob, '#674d3b', 4); round(c, 22, 49 - bob, 11, 13, 3, '#6c5745'); line(c, 26, 57 - bob, 30, 57 - bob, '#c0a078', 2);
  round(c, 23, 52 - bob, 26, 4, 2, '#614a3d'); round(c, 35, 52 - bob, 5, 5, 1, '#d6b888');
  ellipse(c, 36, 25 - bob, 26, 28, '#523e33');
  if (direction !== 'back') { ellipse(c, direction === 'side' ? 39 : 36, 26 - bob, 20, 23, '#dfbb97'); c.fillStyle = '#614b38'; c.beginPath(); c.moveTo(24, 22 - bob); c.quadraticCurveTo(24, 7 - bob, 38, 10 - bob); c.quadraticCurveTo(51, 11 - bob, 48, 22 - bob); c.lineTo(40, 18 - bob); c.lineTo(33, 21 - bob); c.closePath(); c.fill();
   if (direction === 'front') { ellipse(c, 32, 26 - bob, 2.5, 3, '#243c45'); ellipse(c, 41, 26 - bob, 2.5, 3, '#243c45'); line(c, 34, 32 - bob, 38, 32 - bob, '#a7745a', 1); } else { ellipse(c, 44, 26 - bob, 3, 3, '#243c45'); line(c, 46, 31 - bob, 49, 31 - bob, '#b48667', 1); }
  } else { round(c, 25, 11 - bob, 22, 26, 9, '#654e3a'); round(c, 25, 37 - bob, 21, 19, 5, '#5e6e60'); line(c, 28, 44 - bob, 43, 44 - bob, '#94a080', 3); }
  round(c, 25, 33 - bob, 24, 6, 3, '#cbd7b3'); if (direction !== 'back') round(c, 40, 36 - bob, 5, 12, 2, '#bbc6a0');
 });
 for (const elite of [false, true]) make(elite ? 'warden' : 'guard', 80, 104, c => {
  ellipse(c, 40, 93, 53, 14, '#0f20294d'); round(c, 25, 65, 12, 26, 4, '#394d5b'); round(c, 44, 65, 12, 26, 4, '#394d5b'); round(c, 20, 87, 19, 8, 3, '#2a3b48'); round(c, 43, 87, 19, 8, 3, '#2a3b48');
  round(c, 15, 36, 14, 29, 5, '#536775'); round(c, 53, 36, 14, 29, 5, '#536775'); round(c, 23, 31, 36, 40, 8, elite ? '#a2746a' : '#7f9696');
  line(c, 27, 42, 53, 42, '#b8c3b1', 3); line(c, 40, 38, 40, 64, '#445765', 3); round(c, 22, 12, 36, 29, 9, '#415761'); round(c, 28, 23, 24, 10, 3, '#203940');
  ellipse(c, 33, 28, 5, 3, elite ? '#ffa778' : '#cfdeb0'); ellipse(c, 47, 28, 5, 3, elite ? '#ffa778' : '#cfdeb0');
  round(c, 34, 9, 12, 5, 2, '#a3b8ae'); if (elite) { line(c, 22, 15, 15, 4, '#c9b18b', 5); line(c, 57, 15, 63, 4, '#c9b18b', 5); }
 });
 make('loot',56,64,c=>{ellipse(c,28,55,40,10,'#172d2940');round(c,12,23,32,32,10,'#b59b69');round(c,18,16,20,15,4,'#d6c396');line(c,17,29,39,29,'#766444',3);line(c,28,16,28,11,'#d9cf9f',2);ellipse(c,28,10,5,5,'#e5e7b7');});
 make('spark', 20, 20, c => { ellipse(c, 10, 10, 12, 12, '#a9dbc2'); ellipse(c, 10, 10, 5, 5, '#e3f0c8'); });
}
