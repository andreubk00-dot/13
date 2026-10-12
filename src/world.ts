export const TILE = 64;
export const WIDTH = 44;
export const HEIGHT = 32;
export const EDGE = 25;
export type Resource = 'wood' | 'stone' | 'ore' | 'iron' | 'spark';
export type Bag = Record<Resource, number>;
export type Build = 'floor' | 'wall' | 'door' | 'roof' | 'fence' | 'furnace' | 'forge' | 'chest';
export type Station = { kind: 'furnace' | 'forge' | 'chest'; durability: number };
export type Cell = { floor?: boolean; wall?: boolean; door?: boolean; roof?: boolean; fence?: boolean; station?: Station };
export type Cells = Record<string, Cell>;
export const resourceNames: Record<Resource,string> = {wood:'Древесина',stone:'Камень',ore:'Железная руда',iron:'Железо',spark:'Искра'};
export const buildNames: Record<Build,string> = {floor:'Пол',wall:'Стена',door:'Дверь',roof:'Крыша',fence:'Забор',furnace:'Печь',forge:'Кузница',chest:'Сундук'};
export const costs: Record<Build,Partial<Bag>> = {floor:{wood:2},wall:{wood:3},door:{wood:4},roof:{wood:2},fence:{wood:2},furnace:{stone:10,wood:4},forge:{stone:8,wood:6,iron:3},chest:{wood:6}};
export const emptyBag = (): Bag => ({wood:0,stone:0,ore:0,iron:0,spark:0});
export const key = (x:number,y:number) => `${x},${y}`;
export function canAfford(bag:Bag, cost:Partial<Bag>) {return Object.entries(cost).every(([r,n])=>bag[r as Resource]>=n!);}
export function spend(bag:Bag,cost:Partial<Bag>) {if(!canAfford(bag,cost)) return false; for(const [r,n] of Object.entries(cost)) bag[r as Resource]-=n!;return true;}
export function isSheltered(cells:Cells,x:number,y:number):boolean {
  // A roof alone is insufficient: a closed wall/door boundary is required.
  const first=cells[key(x,y)]; if(!first?.floor || !first.roof || first.wall || first.door) return false;
  const queue=[[x,y]], seen=new Set<string>();
  for(let i=0;i<queue.length;i++) {
    const [cx,cy]=queue[i], k=key(cx,cy); if(seen.has(k)) continue; seen.add(k);
    const c=cells[k]; if(c?.wall || c?.door) continue;
    if(cx<=0 || cy<=0 || cx>=WIDTH-1 || cy>=HEIGHT-1 || !c?.floor || !c.roof) return false;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) queue.push([cx+dx,cy+dy]);
  }
  return true;
}
export function wearStation(station:Station,sheltered:boolean) {station.durability=Math.max(0,station.durability-(sheltered?2:4));}
export function placementError(cells:Cells,x:number,y:number,type:Build,occupied:boolean):string|undefined {
  if(x<1||y<1||x>=WIDTH-1||y>=HEIGHT-1)return 'За пределами доступной земли';
  if(x>=EDGE)return 'Строить можно на постоянной стороне мира';
  if(occupied)return 'Сначала освободи клетку';
  const c=cells[key(x,y)]||{};
  if(type==='floor')return c.floor?'Здесь уже есть пол':c.wall||c.fence?'Здесь стоит ограждение':undefined;
  if(type==='roof')return !c.floor?'Для крыши сначала нужен пол':c.roof?'Здесь уже есть крыша':undefined;
  if(type==='wall'||type==='door'||type==='fence')return c.wall||c.door||c.fence||c.station?'Клетка занята':undefined;
  return c.wall||c.door||c.fence||c.station?'Клетка занята':undefined;
}
export type Fragment = 0|1|2;
export const fragmentNames=['Основа · старая кузница','Механизм · стражи','Сердце · глубины'];
export type NodeKind = 'tree'|'rock'|'ore'|'relic';
export type WorldNode = {id:string;x:number;y:number;kind:NodeKind;hp:number;fragment?:Fragment};
export type EnemyData = {id:string;x:number;y:number;hp:number;elite:boolean};
export function rng(seed:number) {return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
export function generateWorld(cycle:number):{nodes:WorldNode[];enemies:EnemyData[];ruins:{x:number;y:number}[]} {
  const nodes:WorldNode[]=[];const taken=new Set<string>();
  for(const danger of [false,true]) {
    const rand=rng(danger?178+cycle*71:391);
    for(let n=0;n<(danger?75:155);n++) {
      const x=danger?EDGE+1+Math.floor(rand()*(WIDTH-EDGE-3)):2+Math.floor(rand()*(EDGE-4));
      const y=2+Math.floor(rand()*(HEIGHT-4)); const k=key(x,y);
      if(taken.has(k)||(!danger&&Math.hypot(x-9,y-16)<4)||(danger&&(Math.hypot(x-28,y-7)<3||Math.hypot(x-39,y-25)<3))) continue;
      taken.add(k);const roll=rand();const kind:NodeKind=roll<.56?'tree':roll<.84?'rock':'ore';
      nodes.push({id:`${danger?'d'+cycle:'s'}-${n}`,x,y,kind,hp:kind==='tree'?3:4});
    }
  }
  nodes.push({id:`relic0-${cycle}`,x:28,y:7,kind:'relic',hp:1,fragment:0},{id:`relic2-${cycle}`,x:39,y:25,kind:'relic',hp:1,fragment:2});
  const enemies:EnemyData[]=[{id:`guard-${cycle}`,x:29,y:16,hp:48,elite:false},{id:`guard2-${cycle}`,x:29,y:7,hp:48,elite:false},{id:`warden-${cycle}`,x:38,y:24,hp:100,elite:true},{id:`guard3-${cycle}`,x:35,y:22,hp:48,elite:false}];
  const ruins:{x:number;y:number}[]=[];
  const rand=rng(987+cycle*127);
  const protectedPositions=[...enemies.map(e=>({x:e.x,y:e.y})),{x:28,y:7},{x:39,y:25}];
  const safe=(x:number,y:number)=>!protectedPositions.some(p=>Math.abs(p.x-x)<=1&&Math.abs(p.y-y)<=1);
  for(const x of [29,33,37,41]){
    const gaps=[4,10,16,22,28].map(y=>y+Math.floor(rand()*3)-1);
    for(let y=2;y<30;y++)if(!gaps.includes(y)&&safe(x,y))ruins.push({x,y});
  }
  for(const y of [6,12,18,24,29])for(const left of [25,29,33,37]){
    const gap=left+1+Math.floor(rand()*3);
    for(let x=left+1;x<left+4;x++)if(x!==gap&&safe(x,y))ruins.push({x,y});
  }
  return {nodes:nodes.filter(n=>!ruins.some(r=>r.x===n.x&&r.y===n.y)),enemies,ruins};
}
export type SaveData={version:1;x:number;y:number;hp:number;bag:Bag;stash:Bag;cells:Cells;fragments:number[];stashFragments:number[];weapon:'hands'|'spear'|'storm';armor:boolean;learned:boolean;cycle:number;removed:string[];dead:string[];fires:number;time:number};
export function newGame():SaveData{return {version:1,x:9*TILE+32,y:16*TILE+32,hp:100,bag:emptyBag(),stash:emptyBag(),cells:{},fragments:[0,0,0],stashFragments:[0,0,0],weapon:'hands',armor:false,learned:false,cycle:0,removed:[],dead:[],fires:0,time:0};}
export function parseSave(raw:string|null):SaveData|null {
 if(!raw)return null;
 try{const s=JSON.parse(raw) as SaveData;if(s.version!==1||!Number.isFinite(s.x)||!Number.isFinite(s.y)||s.x<0||s.x>WIDTH*TILE||s.y<0||s.y>HEIGHT*TILE||!Number.isFinite(s.hp)||!Number.isFinite(s.time)||!Number.isInteger(s.cycle)||s.cycle<0||!['hands','spear','storm'].includes(s.weapon)||!s.cells||typeof s.cells!=='object'||!Array.isArray(s.removed)||!Array.isArray(s.dead))return null;
 for(const b of [s.bag,s.stash])if(!b||Object.keys(emptyBag()).some(k=>!Number.isFinite(b[k as Resource])||b[k as Resource]<0))return null;
 for(const f of [s.fragments,s.stashFragments])if(!Array.isArray(f)||f.length!==3||f.some(n=>!Number.isInteger(n)||n<0))return null;
 for(const [k,c] of Object.entries(s.cells)){if(!/^\d+,\d+$/.test(k)||!c||typeof c!=='object')return null;if(c.station&&(!['furnace','forge','chest'].includes(c.station.kind)||!Number.isFinite(c.station.durability)))return null;}
 return s;}catch{return null;}
}
