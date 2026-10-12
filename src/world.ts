export const TILE = 64;
export const WIDTH = 76;
export const HEIGHT = 52;
export const EDGE = 25;
export const BACKPACK_SLOTS = 24;
export const STACK_SIZE = 99;
export type Resource = 'wood' | 'stone' | 'ore' | 'iron' | 'spark';
export type Bag = Record<Resource, number>;
export type Build = 'floor' | 'wall' | 'door' | 'roof' | 'fence' | 'furnace' | 'forge' | 'chest';
export type Station = { kind: 'furnace' | 'forge' | 'chest'; durability: number };
export type Cell = { floor?: boolean; wall?: boolean; door?: boolean; roof?: boolean; fence?: boolean; rotation?: 0 | 1; station?: Station };
export type Cells = Record<string, Cell>;
export type GearId = 'spear' | 'storm' | 'armor' | 'helmet' | 'boots';
export type EquipmentSlot = 'weapon' | 'head' | 'body' | 'feet';
export type Equipment = Record<EquipmentSlot, GearId | null>;
export const resourceNames: Record<Resource, string> = { wood: 'Древесина', stone: 'Камень', ore: 'Железная руда', iron: 'Железо', spark: 'Искра' };
export const buildNames: Record<Build, string> = { floor: 'Деревянный пол', wall: 'Бревенчатая стена', door: 'Дверь', roof: 'Черепичная крыша', fence: 'Деревянный забор', furnace: 'Каменная печь', forge: 'Кузница', chest: 'Сундук' };
export const buildDescriptions: Record<Build, string> = {
 floor: 'Основа помещения. Укладывается под станциями и крышей.', wall: 'Соединяется с соседними стенами и дверями, образуя углы.',
 door: 'Проём в стене. Автоматически открывается при приближении.', roof: 'Укрывает помещение. Становится прозрачной, когда ты внутри.',
 fence: 'Соединённые секции ограды. Поворачиваются по соседям.', furnace: 'Переплавляет железную руду. В помещении изнашивается медленнее.',
 forge: 'Создание снаряжения и изучение составных чертежей.', chest: 'Хранит материалы и части чертежей, защищая их при гибели.',
};
export const costs: Record<Build, Partial<Bag>> = { floor: { wood: 2 }, wall: { wood: 3 }, door: { wood: 4 }, roof: { wood: 2 }, fence: { wood: 2 }, furnace: { stone: 10, wood: 4 }, forge: { stone: 8, wood: 6, iron: 3 }, chest: { wood: 6 } };
export const gearInfo: Record<GearId, { name: string; slot: EquipmentSlot; rarity: 'common' | 'crafted' | 'relic'; description: string; damage?: number; defense?: number; cost: Partial<Bag> }> = {
 spear: { name: 'Каменное копьё', slot: 'weapon', rarity: 'common', description: 'Длинный выпад. Надёжное первое оружие.', damage: 20, cost: { wood: 5, stone: 3 } },
 storm: { name: 'Клинок бурь', slot: 'weapon', rarity: 'relic', description: 'Реликтовый клинок. Требует собранный чертёж.', damage: 38, cost: { iron: 8, spark: 3 } },
 armor: { name: 'Железный нагрудник', slot: 'body', rarity: 'crafted', description: 'Защищает корпус. Сочетается с остальными частями брони.', defense: 6, cost: { iron: 5, wood: 4 } },
 helmet: { name: 'Железный шлем', slot: 'head', rarity: 'crafted', description: 'Защита головы. Видна на персонаже.', defense: 2, cost: { iron: 3, wood: 2 } },
 boots: { name: 'Укреплённые сапоги', slot: 'feet', rarity: 'crafted', description: 'Дополнительная защита ног.', defense: 2, cost: { iron: 2, wood: 3 } },
};
export const rarityNames = { common: 'Обыденное', crafted: 'Искусное', relic: 'Реликтовое' };
export const emptyBag = (): Bag => ({ wood: 0, stone: 0, ore: 0, iron: 0, spark: 0 });
export const key = (x: number, y: number) => `${x},${y}`;
export function canAfford(bag: Bag, cost: Partial<Bag>) { return Object.entries(cost).every(([r, n]) => bag[r as Resource] >= n!); }
export function spend(bag: Bag, cost: Partial<Bag>) { if (!canAfford(bag, cost)) return false; for (const [r, n] of Object.entries(cost)) bag[r as Resource] -= n!; return true; }
export function connections(cells: Cells, x: number, y: number, kind: 'wall' | 'fence' | 'door') {
 const match = (c?: Cell) => kind === 'fence' ? !!(c?.fence||c?.door) : kind==='door'?!!(c?.wall||c?.door||c?.fence):!!(c?.wall || c?.door);
 return { n: match(cells[key(x, y - 1)]), e: match(cells[key(x + 1, y)]), s: match(cells[key(x, y + 1)]), w: match(cells[key(x - 1, y)]) };
}
export function isSheltered(cells: Cells, x: number, y: number): boolean {
 const first = cells[key(x, y)]; if (!first?.floor || !first.roof || first.wall || first.door) return false;
 const queue = [[x, y]], seen = new Set<string>();
 for (let i = 0; i < queue.length; i++) {
  const [cx, cy] = queue[i], k = key(cx, cy); if (seen.has(k)) continue; seen.add(k);
  const c = cells[k]; if (c?.wall || c?.door) continue;
  if (cx <= 0 || cy <= 0 || cx >= WIDTH - 1 || cy >= HEIGHT - 1 || !c?.floor || !c.roof) return false;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) queue.push([cx + dx, cy + dy]);
 }
 return true;
}
export function wearStation(station: Station, sheltered: boolean) { station.durability = Math.max(0, station.durability - (sheltered ? 2 : 4)); }
export function placementError(cells: Cells, x: number, y: number, type: Build, occupied: boolean): string | undefined {
 if (x < 1 || y < 1 || x >= WIDTH - 1 || y >= HEIGHT - 1) return 'За пределами доступной земли';
 if (x >= EDGE) return 'Строить можно на постоянной стороне мира';
 if (occupied) return 'Сначала освободи клетку';
 const c = cells[key(x, y)] || {};
 if (type === 'floor') return c.floor ? 'Здесь уже есть пол' : c.wall || c.fence || c.door ? 'Здесь стоит ограждение' : undefined;
 if (type === 'roof') return !c.floor ? 'Для крыши сначала нужен пол' : c.roof ? 'Здесь уже есть крыша' : undefined;
 if (type === 'wall' || type === 'door' || type === 'fence') return c.wall || c.door || c.fence || c.station ? 'Клетка занята' : undefined;
 return c.wall || c.door || c.fence || c.station ? 'Клетка занята' : undefined;
}
export type Fragment = 0 | 1 | 2;
export const fragmentNames = ['Основа', 'Механизм', 'Сердце'];
export const fragmentSources = ['Старая кузница · север лабиринта', 'Механические стражи', 'Глубинные руины · юго-восток'];
export type Biome = 'meadow' | 'forest' | 'marsh' | 'ruins' | 'quarry';
export const biomeNames: Record<Biome, string> = { meadow: 'Тихая опушка', forest: 'Старый лес', marsh: 'Туманные низины', ruins: 'Затерянный город', quarry: 'Пепельный карьер' };
export function biomeAt(x: number, y: number): Biome {
 if (x < EDGE) return y > 28 ? 'forest' : 'meadow';
 if (x > 47 && y < 24) return 'quarry';
 if (y > 32) return 'marsh';
 return 'ruins';
}
export type NodeKind = 'tree' | 'rock' | 'ore' | 'relic';
export type WorldNode = { id: string; x: number; y: number; kind: NodeKind; hp: number; fragment?: Fragment; variant?: number };
export type EnemyData = { id: string; x: number; y: number; hp: number; elite: boolean };
export function rng(seed: number) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function generateWorld(cycle: number): { nodes: WorldNode[]; enemies: EnemyData[]; ruins: { x: number; y: number }[] } {
 const nodes: WorldNode[] = [], taken = new Set<string>();
 // Keep the original resource identities and positions so existing bases/saves survive.
 for (const danger of [false, true]) {
  const rand = rng(danger ? 178 + cycle * 71 : 391);
  for (let n = 0; n < (danger ? 75 : 155); n++) {
   const x = danger ? EDGE + 1 + Math.floor(rand() * (44 - EDGE - 3)) : 2 + Math.floor(rand() * (EDGE - 4));
   const y = 2 + Math.floor(rand() * 28), k = key(x, y);
   if (taken.has(k) || (!danger && Math.hypot(x - 9, y - 16) < 4) || (danger && (Math.hypot(x - 28, y - 7) < 3 || Math.hypot(x - 39, y - 25) < 3))) continue;
   taken.add(k); const roll = rand(), kind: NodeKind = roll < .56 ? 'tree' : roll < .84 ? 'rock' : 'ore';
   nodes.push({ id: `${danger ? 'd' + cycle : 's'}-${n}`, x, y, kind, hp: kind === 'tree' ? 3 : 4, variant: n % 3 });
  }
 }
 const extra = rng(735 + cycle * 59), stable = rng(816);
 for (let n = 0; n < 620; n++) {
  const x = 2 + Math.floor(extra() * (WIDTH - 4)), y = 2 + Math.floor(extra() * (HEIGHT - 4));
  if (x < 44 && y < 32) continue;
  if (x < EDGE) continue;
  const k = key(x, y); if (taken.has(k)) continue; taken.add(k);
  const roll = extra(), b = biomeAt(x, y), kind: NodeKind = roll < (b === 'quarry' ? .15 : .55) ? 'tree' : roll < .78 ? 'rock' : 'ore';
  nodes.push({ id: `d${cycle}-extra-${n}`, x, y, kind, hp: kind === 'tree' ? 3 : 4, variant: n % 3 });
 }
 for (let n = 0; n < 95; n++) {
  const x = 2 + Math.floor(stable() * (EDGE - 4)), y = 32 + Math.floor(stable() * (HEIGHT - 34)), k = key(x, y);
  if (taken.has(k)) continue; taken.add(k); const kind: NodeKind = stable() < .7 ? 'tree' : 'rock';
  nodes.push({ id: `s-extra-${n}`, x, y, kind, hp: kind === 'tree' ? 3 : 4, variant: n % 3 });
 }
 const relics = [{ x: 28, y: 7, f: 0 }, { x: 39, y: 25, f: 2 }, { x: 57, y: 10, f: 0 }, { x: 67, y: 43, f: 2 }];
 relics.forEach((r, i) => nodes.push({ id: `relic${i}-${cycle}`, x: r.x, y: r.y, kind: 'relic', hp: 1, fragment: r.f as Fragment }));
 const enemies: EnemyData[] = [
  { id: `guard-${cycle}`, x: 29, y: 16, hp: 48, elite: false }, { id: `guard2-${cycle}`, x: 29, y: 7, hp: 48, elite: false },
  { id: `warden-${cycle}`, x: 38, y: 24, hp: 100, elite: true }, { id: `guard3-${cycle}`, x: 35, y: 22, hp: 48, elite: false },
  { id: `quarry-${cycle}`, x: 56, y: 10, hp: 100, elite: true }, { id: `marsh-${cycle}`, x: 66, y: 43, hp: 100, elite: true },
  ...[ [48, 18], [59, 29], [40, 39], [33, 43], [69, 17], [62, 37] ].map(([x, y], i) => ({ id: `wanderer${i}-${cycle}`, x, y, hp: 48, elite: false })),
 ];
 const ruins: { x: number; y: number }[] = [], rand = rng(987 + cycle * 127);
 const protectedPositions = [...enemies, ...relics];
 const safe = (x: number, y: number) => !protectedPositions.some(p => Math.abs(p.x - x) <= 1 && Math.abs(p.y - y) <= 1);
 for (const x of [29, 33, 37, 41, 49, 53, 61, 65, 69]) {
  const maxY = x < 44 ? 30 : 48;
  const gaps = [4, 10, 16, 22, 28, 34, 40, 46].map(y => y + Math.floor(rand() * 3) - 1);
  for (let y = 2; y < maxY; y++) if (!gaps.includes(y) && safe(x, y)) ruins.push({ x, y });
 }
 for (const y of [6, 12, 18, 24, 29, 36, 44]) for (const left of [25, 29, 33, 37, 49, 53, 61, 65]) {
  const gap = left + 1 + Math.floor(rand() * 3);
  for (let x = left + 1; x < left + 4; x++) if (x !== gap && safe(x, y)) ruins.push({ x, y });
 }
 return { nodes: nodes.filter(n => !ruins.some(r => r.x === n.x && r.y === n.y) && (n.kind === 'relic' || !protectedPositions.some(p => Math.hypot(p.x - n.x, p.y - n.y) < 1.8))), enemies, ruins };
}
export type GroundLoot={id:string;x:number;y:number;bag:Bag;fragments:number[];gear:Record<GearId,number>};
export type SaveData = { drops:GroundLoot[];version: 2; x: number; y: number; hp: number; bag: Bag; stash: Bag; cells: Cells; fragments: number[]; stashFragments: number[]; weapon: 'hands' | 'spear' | 'storm'; armor: boolean; learned: boolean; cycle: number; removed: string[]; dead: string[]; fires: number; time: number; gear: Record<GearId, number>; equipment: Equipment; inventoryOrder: string[]; hotbar: string[] };
export function newGame(): SaveData { return { drops:[],version: 2, x: 9 * TILE + 32, y: 16 * TILE + 32, hp: 100, bag: emptyBag(), stash: emptyBag(), cells: {}, fragments: [0, 0, 0], stashFragments: [0, 0, 0], weapon: 'hands', armor: false, learned: false, cycle: 0, removed: [], dead: [], fires: 0, time: 0, gear: { spear: 0, storm: 0, armor: 0, helmet: 0, boots: 0 }, equipment: { weapon: null, head: null, body: null, feet: null }, inventoryOrder: [], hotbar: ['action:gather', 'action:attack', 'build:wall', 'build:floor', 'build:furnace', 'build:forge', 'action:bag', 'action:build'] }; }
export type InventoryItem = { id: string; kind: Resource | GearId | 'fragment'; quantity: number; fragment?: number; equipped?: boolean };
export function inventoryItems(s: SaveData): InventoryItem[] {
 const entries: InventoryItem[] = [];
 for (const r of Object.keys(resourceNames) as Resource[]) for (let n = 0, left = s.bag[r]; left > 0; n++, left -= STACK_SIZE) entries.push({ id: `${r}:${n}`, kind: r, quantity: Math.min(STACK_SIZE, left) });
 s.fragments.forEach((count, f) => { for (let n = 0, left = count; left > 0; n++, left -= STACK_SIZE) entries.push({ id: `fragment${f}:${n}`, kind: 'fragment', quantity: Math.min(STACK_SIZE, left), fragment: f }); });
 for (const g of Object.keys(gearInfo) as GearId[]) { const loose = s.gear[g] - Number(Object.values(s.equipment).includes(g)); for (let n = 0; n < loose; n++) entries.push({ id: `gear-${g}:${n}`, kind: g, quantity: 1 }); }
 return entries.sort((a, b) => { const ai = s.inventoryOrder.indexOf(a.id), bi = s.inventoryOrder.indexOf(b.id); return (ai < 0 ? 10000 : ai) - (bi < 0 ? 10000 : bi); });
}
export function equipmentDefense(s: SaveData) { return Object.values(s.equipment).reduce((sum, id) => sum + (id ? gearInfo[id].defense || 0 : 0), 0); }
export function equip(s: SaveData, id: GearId | null, slot: EquipmentSlot) {
 if (id && (!Object.hasOwn(gearInfo,id) || s.gear[id] < 1 || gearInfo[id].slot !== slot)) return false;
 const previous = s.equipment[slot]; s.equipment[slot] = id;
 if (inventoryItems(s).length > BACKPACK_SLOTS) { s.equipment[slot] = previous; return false; }
 s.weapon = s.equipment.weapon === 'spear' || s.equipment.weapon === 'storm' ? s.equipment.weapon : 'hands'; s.armor = !!s.equipment.body; return true;
}
export function canAdd(s: SaveData, resource: Resource, quantity: number) { const next = { ...s, bag: { ...s.bag, [resource]: s.bag[resource] + quantity } }; return inventoryItems(next).length <= BACKPACK_SLOTS; }
export function recipeError(s: SaveData, recipe: string, station?: Station, distance = Infinity): string | undefined {
 if (!['iron', 'blueprint', 'salvage', ...Object.keys(gearInfo)].includes(recipe)) return 'Неизвестный рецепт';
 const expected = recipe === 'iron' ? 'furnace' : 'forge';
 if (!station || station.kind !== expected || distance >= 115) return recipe === 'iron' ? 'Подойди к печи' : 'Крафт доступен только у кузницы';
 if (station.durability <= 0) return 'Станция сломана — сначала почини её';
 if (recipe === 'blueprint') return s.learned ? 'Чертёж уже изучен' : s.fragments.some(n => n < 1) ? 'Нужны все три разные части' : undefined;
 if (recipe === 'salvage') return s.fragments.some(n => n > (s.learned ? 0 : 1)) ? undefined : 'Нет дубликатов';
 if (recipe === 'storm' && !s.learned) return 'Нужен собранный чертёж клинка бурь';
 if (recipe in gearInfo && s.gear[recipe as GearId] >= 1) return 'Этот предмет уже создан';
 const cost = recipe === 'iron' ? { ore: 2, wood: 1 } : gearInfo[recipe as GearId].cost;
 return canAfford(s.bag, cost) ? undefined : 'Не хватает материалов';
}
export function parseSave(raw: string | null): SaveData | null {
 if (!raw) return null;
 try {
  const s = JSON.parse(raw); if (![1, 2].includes(s.version) || !Number.isFinite(s.x) || !Number.isFinite(s.y) || s.x < 0 || s.x > WIDTH * TILE || s.y < 0 || s.y > HEIGHT * TILE || !Number.isFinite(s.hp) || s.hp < 0 || s.hp > 100 || !Number.isFinite(s.time) || typeof s.learned !== 'boolean' || typeof s.armor !== 'boolean' || !Number.isInteger(s.cycle) || s.cycle < 0 || !['hands', 'spear', 'storm'].includes(s.weapon) || !s.cells || typeof s.cells !== 'object' || Array.isArray(s.cells) || !Array.isArray(s.removed) || !Array.isArray(s.dead) || s.removed.some((x: unknown) => typeof x !== 'string') || s.dead.some((x: unknown) => typeof x !== 'string')) return null;
  for (const b of [s.bag, s.stash]) if (!b || Object.keys(emptyBag()).some(k => !Number.isSafeInteger(b[k]) || b[k] < 0)) return null;
  for (const f of [s.fragments, s.stashFragments]) if (!Array.isArray(f) || f.length !== 3 || f.some((n: number) => !Number.isSafeInteger(n) || n < 0)) return null;
  for (const [k, value] of Object.entries(s.cells)) { const c = value as Cell; if (!/^\d+,\d+$/.test(k) || !c || typeof c !== 'object') return null; const [x, y] = k.split(',').map(Number); if (x >= EDGE || y >= HEIGHT) return null; if (c.station && (!['furnace', 'forge', 'chest'].includes(c.station.kind) || !Number.isFinite(c.station.durability) || c.station.durability < 0 || c.station.durability > 100)) return null; }
  if (s.version === 1) { const fresh = newGame(); s.gear = fresh.gear; s.equipment = fresh.equipment; s.inventoryOrder = []; s.hotbar = fresh.hotbar; if (s.weapon !== 'hands') { s.gear[s.weapon] = 1; s.equipment.weapon = s.weapon; } if (s.armor) { s.gear.armor = 1; s.equipment.body = 'armor'; } s.version = 2; }
  s.drops??=[];if(!Array.isArray(s.drops)||s.drops.some((d:GroundLoot)=>typeof d.id!=='string'||!Number.isFinite(d.x)||!Number.isFinite(d.y)||d.x<0||d.x>WIDTH*TILE||d.y<0||d.y>HEIGHT*TILE||!d.bag||Object.keys(resourceNames).some(r=>!Number.isSafeInteger(d.bag[r as Resource])||d.bag[r as Resource]<0)||!Array.isArray(d.fragments)||d.fragments.length!==3||d.fragments.some(n=>!Number.isSafeInteger(n)||n<0)||!d.gear||Object.keys(gearInfo).some(g=>!Number.isSafeInteger(d.gear[g as GearId])||d.gear[g as GearId]<0)))return null;
  if (!s.gear || !s.equipment || Object.keys(gearInfo).some(g => !Number.isSafeInteger(s.gear[g]) || s.gear[g] < 0)) return null;
  for (const slot of ['weapon', 'head', 'body', 'feet'] as EquipmentSlot[]) { const id = s.equipment[slot] as GearId | null; if (id !== null && (!gearInfo[id] || gearInfo[id].slot !== slot || s.gear[id] < 1)) return null; }
  if (!Array.isArray(s.inventoryOrder) || s.inventoryOrder.some((id: unknown) => typeof id !== 'string') || !Array.isArray(s.hotbar) || s.hotbar.length !== 8 || s.hotbar.some((id: unknown) => !validHotbarValue(id))) return null;
  s.weapon = s.equipment.weapon || 'hands'; s.armor = !!s.equipment.body; return s as SaveData;
 } catch { return null; }
}

export function structureBlocked(cells: Cells, px: number, py: number, radius = 13): boolean {
 const gx = Math.floor(px / TILE), gy = Math.floor(py / TILE);
 for (let x = gx - 1; x <= gx + 1; x++) for (let y = gy - 1; y <= gy + 1; y++) {
  const c = cells[key(x, y)]; if (!c) continue;
  const cx = x * TILE + 32, cy = y * TILE + 32;
  if (c.station && Math.abs(px - cx) < 22 + radius && Math.abs(py - cy) < 22 + radius) return true;
  if (!c.wall && !c.fence) continue;
  const conn = connections(cells, x, y, c.wall ? 'wall' : 'fence');
  const has = conn.n || conn.e || conn.s || conn.w;
  const half = c.wall ? 11 : 5;
  const left = conn.w || (!has && c.rotation !== 1) ? 32 : half;
  const right = conn.e || (!has && c.rotation !== 1) ? 32 : half;
  const up = conn.n || (!has && c.rotation === 1) ? 32 : half;
  const down = conn.s || (!has && c.rotation === 1) ? 32 : half;
  const horizontal = px > cx - left - radius && px < cx + right + radius && Math.abs(py - cy) < half + radius;
  const vertical = py > cy - up - radius && py < cy + down + radius && Math.abs(px - cx) < half + radius;
  if (horizontal || vertical) return true;
 }
 return false;
}

export function inventorySlots(s: SaveData): (InventoryItem | null)[] {
 const items = inventoryItems(s), remaining = new Map(items.map(i => [i.id, i]));
 const slots: (InventoryItem | null)[] = Array.from({ length: Math.max(BACKPACK_SLOTS, items.length) }, () => null);
 s.inventoryOrder.forEach((id, index) => { if (index < slots.length && remaining.has(id)) { slots[index] = remaining.get(id)!; remaining.delete(id); } });
 for (const item of remaining.values()) { const empty = slots.indexOf(null); if (empty >= 0) slots[empty] = item; }
 return slots;
}

export function validHotbarValue(value: unknown): value is string {
 if(typeof value!=='string')return false;const parts=value.split(':');if(parts.length!==2)return false;
 const [kind,name]=parts;return kind==='action'?['gather','attack','bag','build','map'].includes(name):kind==='gear'?Object.hasOwn(gearInfo,name):kind==='build'?Object.hasOwn(buildNames,name):kind==='resource'?Object.hasOwn(resourceNames,name):false;
}
export function roofCoversPoint(cells: Cells, px:number, py:number) {
 const x=Math.floor(px/TILE),y=Math.floor(py/TILE);
 for(let cx=x-1;cx<=x+1;cx++)for(let cy=y-1;cy<=y+1;cy++){
  if(!cells[key(cx,cy)]?.roof)continue;
  const boundary=(dx:number,dy:number)=>!!(cells[key(cx+dx,cy+dy)]?.wall||cells[key(cx+dx,cy+dy)]?.door);
  if(px>=cx*TILE-(boundary(-1,0)?32:0)&&px<=(cx+1)*TILE+(boundary(1,0)?32:0)&&py>=cy*TILE-(boundary(0,-1)?32:0)&&py<=(cy+1)*TILE+(boundary(0,1)?32:0))return true;
 }
 return false;
}

export function collectLoot(s:SaveData,loot:Pick<GroundLoot,'bag'|'fragments'|'gear'>):boolean{
 const next={...s,bag:{...s.bag},fragments:[...s.fragments],gear:{...s.gear}};
 for(const r of Object.keys(resourceNames) as Resource[])next.bag[r]+=loot.bag[r];
 loot.fragments.forEach((n,i)=>next.fragments[i]+=n);
 for(const id of Object.keys(gearInfo) as GearId[])next.gear[id]+=loot.gear[id];
 if(inventoryItems(next).length>BACKPACK_SLOTS)return false;
 s.bag=next.bag;s.fragments=next.fragments;s.gear=next.gear;return true;
}
export function emptyGear():Record<GearId,number>{return {spear:0,storm:0,armor:0,helmet:0,boots:0};}
