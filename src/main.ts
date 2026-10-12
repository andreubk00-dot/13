import Phaser from 'phaser';
import { WorldScene, SAVE_KEY } from './game';
import { icon } from './icons';
import { buildNames, buildDescriptions, costs, resourceNames, gearInfo, rarityNames, fragmentNames, fragmentSources, inventoryItems, inventorySlots, isSheltered, canAfford, recipeError, biomeAt, biomeNames, equipmentDefense, WIDTH, HEIGHT, EDGE, TILE, type Build, type GearId, type Resource, type InventoryItem, type EquipmentSlot } from './world';
import '@fontsource/manrope/cyrillic-400.css';
import '@fontsource/manrope/cyrillic-600.css';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/unbounded/cyrillic-400.css';
import '@fontsource/unbounded/cyrillic-500.css';
import '@fontsource/unbounded/latin-400.css';
import './style.css';

type PanelMode = '' | 'bag' | 'build' | 'forge' | 'furnace' | 'chest' | 'map';
const scene = new WorldScene();
let panelMode: PanelMode = '', panelSignature = '', currentStation: string | null = null;
let buildCategory = 'house', buildFocus: Build = 'wall', forgeTab = 'equipment', recipeFocus: GearId = 'spear', selectedItem = '', portrait = '';
const slotNames: Record<EquipmentSlot, string> = { weapon: 'Оружие', head: 'Голова', body: 'Корпус', feet: 'Ноги' };
const slotIcons = { weapon: 'spear', head: 'helmet', body: 'armor', feet: 'boots' };
const app = document.querySelector<HTMLDivElement>('#app')!;
const $ = (id: string) => document.getElementById(id)!;
let hasSave = false; try { hasSave = !!localStorage.getItem(SAVE_KEY); } catch {}
const sigil = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="m24 4 19 20-19 20L5 24Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M14 24h10V14h10v20H14V14h5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="24" cy="24" r="3" fill="currentColor"/></svg>';
app.innerHTML = `<div id="game"></div><div id="hud">
 <header class="topbar"><div class="brand"><div class="sigil">${sigil}</div><div><strong>ЖИВОЙ ЛАБИРИНТ</strong><small>УБЕЖИЩЕ · ОБНОВЛЕНИЕ 04</small></div></div><div class="top-actions"><span class="cycle" id="cycle">Цикл 01</span><button class="utility" data-action="sound" aria-label="Включить звук">${icon('sound')}</button><button class="utility" data-action="help" aria-label="Помощь">${icon('help')}</button><button class="utility" data-action="pause" aria-label="Пауза">${icon('pause')}</button></div></header>
 <section class="vitals"><div class="portrait-frame" id="portrait-frame"></div><div class="vitals-body"><div class="vital-heading">${icon('heart')}<span>ЗДОРОВЬЕ</span><b id="health-text">100 / 100</b></div><div class="bar"><i id="health-bar"></i></div><div class="bar stamina"><i id="stamina-bar"></i></div><div class="vital-footer"><span>Выносливость</span><span id="defense">Защита 0</span></div></div></section>
 <div class="location"><span id="location-weather">${icon('sun')}</span><div><strong id="region-name">Тихая опушка</strong><small id="region-desc">Постоянная земля</small></div></div>
 <aside class="world-widget"><button class="mini-map-frame" data-panel="map" aria-label="Карта"><canvas id="minimap" width="152" height="116"></canvas><span class="mini-map-label">КАРТА МИРА ${icon('map')}</span></button><div class="quick-materials" id="quick-materials"></div><button class="bag-shortcut" data-panel="bag" aria-label="Рюкзак">${icon('backpack')}<span>Рюкзак <small id="bag-count">0 / 24</small></span><kbd>I</kbd></button></aside>
 <section class="objective"><button class="objective-toggle" data-action="objective" aria-label="Свернуть цель"><span class="eyebrow">ТВОЙ СЛЕДУЮЩИЙ ШАГ</span><span class="objective-arrow">−</span></button><div id="objective-content"><h3 id="quest-title">Дом начинается с тебя</h3><p id="quest-body">Собери древесину и камень, затем построй печь.</p><div class="objective-progress"><i id="quest-progress"></i></div></div></section>
 <div id="interaction" class="interaction"><kbd>E</kbd><span id="hint">Собирай материалы</span></div>
 <div id="build-strip" class="build-strip hidden"></div>
 <div class="hotbar-wrap"><div class="hotbar-top"><span>БЫСТРЫЙ ДОСТУП</span><div><button class="text-tool" data-panel="build" aria-label="Строить">${icon('hammer')}<span>Строить</span><kbd>B</kbd></button><button class="text-tool" data-action="forge" aria-label="Кузница">${icon('forge')}<span>Кузница</span><kbd>C</kbd></button></div></div><nav id="hotbar" class="hotbar" aria-label="Быстрый доступ"></nav><div class="controls"><span><kbd>WASD</kbd> движение</span><span><kbd>Space</kbd> удар</span><span><kbd>Shift</kbd> рывок</span></div></div>
 <div class="save-status" id="save-status">Сохранено локально</div><div id="toasts" class="toast-list" aria-live="polite"></div>
 <section id="panel" class="panel hidden" aria-label="Игровое окно"></section>
 <div class="mobile-pad"><button data-move="up" class="up" aria-label="Вверх">↑</button><button data-move="left" class="left" aria-label="Влево">←</button><button data-move="down" aria-label="Вниз">↓</button><button data-move="right" aria-label="Вправо">→</button></div><div class="mobile-actions"><button data-action="interact" aria-label="Взаимодействовать"><span>E</span></button><button data-action="attack" aria-label="Атаковать">${icon('storm')}</button><button data-action="dash" aria-label="Рывок">${icon('arrow')}</button></div>
 <div id="veil" class="veil"><div class="modal intro-modal"><div class="modal-sigil">${sigil}</div><div class="eyebrow">ЖИВОЙ ЛАБИРИНТ · УБЕЖИЩЕ</div><h1>Здесь будет<br>твой дом.</h1><p>Лес отдаст тебе первые материалы. Огонь превратит руду в железо. А город за разломом хранит чертежи, ради которых стоит отправиться в путь.</p><div class="intro-steps"><div>${icon('wood')}<span>Собирай</span></div><i></i><div>${icon('wall')}<span>Строй</span></div><i></i><div>${icon('forge')}<span>Создавай</span></div></div><button class="primary wide" data-action="start">${hasSave ? 'Продолжить путь' : 'Начать путь'} ${icon('arrow')}</button><small class="intro-note">WASD · E · Space &nbsp; / &nbsp; управление касанием</small></div></div>
 </div>`;

function toast(message: string, bad = false) { const node = document.createElement('div'); node.className = 'toast' + (bad ? ' bad' : ''); node.innerHTML = icon(bad ? 'help' : 'check'); const text = document.createElement('span'); text.textContent = message; node.append(text); $('toasts').append(node); while ($('toasts').children.length > 3) $('toasts').firstChild?.remove(); setTimeout(() => node.remove(), 4000); }
scene.onToast = toast;
function header(iconName: string, title: string, subtitle: string) { return `<div class="panel-header"><div class="panel-heading">${icon(iconName)}<div><small>${subtitle}</small><h2>${title}</h2></div></div><button class="utility close" data-action="close" aria-label="Закрыть">${icon('close')}</button></div>`; }
function setPanel(mode: PanelMode, toggle = true) { panelMode = toggle && panelMode === mode ? '' : mode; scene.uiBlocked = !!panelMode; $('hud').classList.toggle('has-panel',!!panelMode); panelSignature = ''; renderPanel(true); updateHotbar(); }
function itemName(item: InventoryItem) { return item.kind === 'fragment' ? `Часть чертежа: ${fragmentNames[item.fragment!]}` : item.kind in gearInfo ? gearInfo[item.kind as GearId].name : resourceNames[item.kind as Resource]; }
function itemIcon(item: InventoryItem) { return icon(item.kind === 'fragment' ? 'fragment'+item.fragment : item.kind); }
function materials(cost: Partial<Record<Resource, number>>, compact = false) { return `<div class="materials ${compact ? 'compact' : ''}">${Object.entries(cost).map(([r, n]) => `<div class="material ${scene.state.bag[r as Resource] < n! ? 'missing' : ''}" title="${resourceNames[r as Resource]}">${icon(r)}<span>${compact ? n : `<b>${Math.min(scene.state.bag[r as Resource], n!)} / ${n}</b><small>${resourceNames[r as Resource]}</small>`}</span></div>`).join('')}</div>`; }
function stationDistance() { if (!currentStation || !scene.actor) return Infinity; const [x, y] = currentStation.split(',').map(Number); return Math.hypot((x + .5) * TILE - scene.actor.x, (y + .5) * TILE - scene.actor.y); }
function stationStatus() { const station = currentStation && scene.state.cells[currentStation]?.station; if (!station) return ''; const [x, y] = currentStation!.split(',').map(Number); const covered = isSheltered(scene.state.cells, x, y); return `<div class="station-status"><span class="station-cover ${covered ? 'covered' : ''}">${icon(covered ? 'roof' : 'sun')}${covered ? 'В помещении' : 'На улице'}<small>Износ ${covered ? 2 : 4}% за операцию</small></span><span class="durability"><b>${station.durability}%</b><small>Прочность</small><i style="--durability:${station.durability}%"></i></span></div>`; }
function repairFooter() { const st = currentStation && scene.state.cells[currentStation]?.station; return `<div class="station-footer"><span>${icon('hammer')} Обслуживание <small>2 древесины + 2 камня</small></span><button class="secondary" data-action="repair" ${!st || st.durability === 100 || !canAfford(scene.state.bag, { wood: 2, stone: 2 }) ? 'disabled' : ''}>Починить</button></div>`; }
function renderPanel(force = false) {
 const p = $('panel'); p.classList.toggle('hidden', !panelMode); p.className = `panel ${panelMode ? 'panel-' + panelMode : 'hidden'}`; if (!panelMode) return;
 const s = scene.state;
 const signature = JSON.stringify([panelMode, s.bag, s.fragments, s.gear, s.equipment, s.inventoryOrder, s.learned, s.stash, s.stashFragments, buildFocus, buildCategory, forgeTab, recipeFocus, selectedItem, scene.selectedRotation, currentStation && s.cells[currentStation]?.station]);
 if (!force && signature === panelSignature) { if (panelMode === 'map') drawMap('map-canvas'); return; } panelSignature = signature;
 if (panelMode === 'bag') renderBag(p);
 if (panelMode === 'build') renderBuild(p);
 if (panelMode === 'forge') renderForge(p);
 if (panelMode === 'furnace') renderFurnace(p);
 if (panelMode === 'chest') renderChest(p);
 if (panelMode === 'map') { p.innerHTML = header('map', 'Земля за разломом', 'ПУТЕВОДИТЕЛЬ') + `<div class="map-layout"><canvas id="map-canvas" width="640" height="438"></canvas><aside><div class="eyebrow">МИР 76 × 52</div><h3>Пять разных мест</h3>${Object.values(biomeNames).map((n, i) => `<div class="map-legend"><i style="background:${['#627953', '#42634b', '#3d6663', '#637872', '#8c8a70'][i]}"></i>${n}</div>`).join('')}<div class="map-objective">${icon('fragment')}<div><b>Чертёж клинка бурь</b>${fragmentSources.map(n => `<small>${n}</small>`).join('')}</div></div><p class="note">Земля слева от разлома постоянна. Возвращение домой перестраивает лабиринт. Добычу можно защитить в сундуке.</p></aside></div>`; drawMap('map-canvas'); }
}
function renderBag(p: HTMLElement) {
 const s = scene.state, slots = inventorySlots(s);
 let chosen = inventoryItems(s).find(i => i.id === selectedItem);
 const equippedId = selectedItem.startsWith('equipped:') ? selectedItem.slice(9) as GearId : null;
 if (equippedId && gearInfo[equippedId] && Object.values(s.equipment).includes(equippedId)) chosen = { id: selectedItem, kind: equippedId, quantity: 1, equipped: true };
 p.innerHTML = header('backpack', 'Рюкзак', 'СОБРАННОЕ В ПУТИ') + `<div class="pack-layout"><aside class="equipment"><div class="eyebrow">ЭКИПИРОВКА</div><div class="paper-doll"><img src="${portrait}" alt="Путник">${(['head','body','feet'] as EquipmentSlot[]).map(slot=>s.equipment[slot]?`<span class="paper-gear paper-${slot}">${icon(s.equipment[slot]!)}</span>`:'').join('')}<span>Защита ${equipmentDefense(s)}</span></div><div class="equipment-grid">${(Object.keys(slotNames) as EquipmentSlot[]).map(slot => { const g = s.equipment[slot]; return `<button class="equipment-slot ${g ? 'filled rarity-' + gearInfo[g].rarity : ''}" data-equip-slot="${slot}" ${g ? `data-equipped="${g}" draggable="true"` : ''} title="${g ? gearInfo[g].name : slotNames[slot]}" aria-label="${slotNames[slot]}: ${g ? gearInfo[g].name : 'пусто'}">${icon(g || slotIcons[slot])}<small>${slotNames[slot]}</small></button>`; }).join('')}</div></aside><div class="pack-content"><div class="pack-heading"><span>ПРЕДМЕТЫ</span><b>${inventoryItems(s).length} / 24 <small>слотов</small></b></div><div class="pack-grid">${slots.map((i, n) => `<button class="item-slot ${i ? 'occupied ' + (i.kind in gearInfo ? 'rarity-' + gearInfo[i.kind as GearId].rarity : i.kind === 'fragment' ? 'rarity-relic' : '') : ''} ${i?.id === selectedItem ? 'selected' : ''}" data-inventory-index="${n}" ${i ? `data-item="${i.id}" draggable="true" title="${itemName(i)}" aria-label="${itemName(i)}"` : 'aria-label="Пустой слот"'}>${i ? itemIcon(i) + `<b>${i.quantity}</b>${i.kind === 'fragment' ? `<small class="fragment-number">${i.fragment! + 1}</small>` : ''}` : `<span class="empty-dot"></span>`}</button>`).join('')}</div><p class="pack-note">Перетащи снаряжение в его слот или на хотбар. Предметы можно переставлять между клетками.</p></div><aside class="item-detail">${chosen ? detailItem(chosen) : `<div class="empty-detail">${icon('backpack')}<h3>Всё нужное — с собой</h3><p>Выбери предмет, чтобы узнать о нём больше.</p></div>`}</aside></div>`;
}
function detailItem(item: InventoryItem) {
 const gear = item.kind in gearInfo ? gearInfo[item.kind as GearId] : null;
 return `<div class="detail-icon ${gear ? 'rarity-' + gear.rarity : ''}">${itemIcon(item)}</div><small class="eyebrow">${gear ? rarityNames[gear.rarity] : item.kind === 'fragment' ? 'ЧАСТЬ ЧЕРТЕЖА' : 'МАТЕРИАЛ'}</small><h3>${itemName(item)}</h3><p>${gear ? gear.description : item.kind === 'fragment' ? fragmentSources[item.fragment!] + '. Собирается и изучается в кузнице.' : item.kind === 'wood' ? 'Основа строительства. Нужна для пола, стен, ограды и топлива печи.' : item.kind === 'ore' ? 'Переплавляется в железо в печи.' : item.kind === 'iron' ? 'Используется для кузницы, оружия и брони.' : item.kind === 'spark' ? 'Редкий материал стражей для реликтового оружия.' : 'Основа печи и кузницы.'}</p>${gear ? `<div class="item-stat"><span>${gear.damage ? 'Урон' : 'Защита'}</span><b>${gear.damage || gear.defense}</b></div><button class="primary wide" ${item.equipped ? `data-unequip="${gear.slot}"` : `data-equip="${item.kind}"`}>${item.equipped ? 'Снять' : 'Экипировать'}</button>` : `<div class="item-stat"><span>В стеке</span><b>${item.quantity} / 99</b></div>`}${!item.equipped?`<button class="secondary wide leave-item" data-drop-item="${item.id}">Оставить на земле</button>`:''}`;
}
function renderBuild(p: HTMLElement) {
 const list: Record<string, Build[]> = { house: ['floor', 'wall', 'door', 'roof'], workshops: ['furnace', 'forge', 'chest'], outside: ['fence'] };
 p.innerHTML = header('hammer', 'Архитектура убежища', 'СТРОИТЕЛЬСТВО') + `<div class="tabs">${[['house', 'Дом'], ['workshops', 'Мастерские'], ['outside', 'Ограда']].map(([id, n]) => `<button data-build-tab="${id}" class="${id === buildCategory ? 'active' : ''}">${n}</button>`).join('')}</div><div class="construction-layout"><div class="construction-grid">${list[buildCategory].map(b => `<button class="build-card ${buildFocus === b ? 'selected' : ''}" data-build="${b}" data-drag-value="build:${b}" draggable="true">${icon(b)}<strong>${buildNames[b]}</strong>${materials(costs[b], true)}</button>`).join('')}<button class="build-card dismantle-card" data-action="dismantle">${icon('dismantle')}<strong>Разобрать</strong><small>Сначала снимается крыша</small></button></div><aside class="construction-detail"><div class="build-preview ${scene.selectedRotation === 1 ? 'rotated' : ''}">${icon(buildFocus)}</div><h3>${buildNames[buildFocus]}</h3><p>${buildDescriptions[buildFocus]}</p>${materials(costs[buildFocus])}${['wall', 'door', 'fence'].includes(buildFocus) ? `<button class="rotation-control secondary" data-action="rotate">${icon('rotate')} ${scene.selectedRotation ? 'Вертикально' : 'Горизонтально'} <kbd>R</kbd></button><small class="note">При соединении направление определяют соседи.</small>` : ''}<button class="primary wide" data-action="place-build" ${!canAfford(scene.state.bag, costs[buildFocus]) ? 'disabled' : ''}>Разместить ${icon('arrow')}</button></aside></div><div class="panel-bottom-note">${icon('floor')} По клеткам · рядом с персонажем · Esc — отмена</div>`;
}
function renderForge(p: HTMLElement) {
 const st = currentStation && scene.state.cells[currentStation]?.station;
 if (!st || st.kind !== 'forge') { setPanel('', false); return; }
 p.innerHTML = header('forge', 'Кузница', 'МАСТЕРСКАЯ СНАРЯЖЕНИЯ') + stationStatus() + `<div class="tabs"><button data-forge-tab="equipment" class="${forgeTab === 'equipment' ? 'active' : ''}">Снаряжение</button><button data-forge-tab="blueprints" class="${forgeTab === 'blueprints' ? 'active' : ''}">Чертежи <span class="tab-badge">${scene.state.learned ? '1' : '0'}</span></button></div>`;
 if (forgeTab === 'equipment') {
  const info = gearInfo[recipeFocus], error = recipeError(scene.state, recipeFocus, st, stationDistance());
  p.innerHTML += `<div class="forge-layout"><div class="recipe-list">${(Object.keys(gearInfo) as GearId[]).map(id => `<button class="recipe-card rarity-${gearInfo[id].rarity} ${recipeFocus === id ? 'selected' : ''}" data-select-recipe="${id}">${icon(id)}<span><strong>${gearInfo[id].name}</strong><small>${rarityNames[gearInfo[id].rarity]}${id === 'storm' && !scene.state.learned ? ' · нужен чертёж' : scene.state.gear[id] ? ' · создано' : ''}</small></span></button>`).join('')}</div><aside class="recipe-detail"><div class="recipe-art rarity-${info.rarity}">${icon(recipeFocus)}</div><div class="eyebrow">${rarityNames[info.rarity]}</div><h3>${info.name}</h3><p>${info.description}</p><div class="item-stat"><span>${info.damage ? 'Урон' : 'Защита'}</span><b>${info.damage || info.defense}</b></div>${materials(info.cost)}<button class="primary wide" data-recipe="${recipeFocus}" ${error ? 'disabled' : ''}>${scene.state.gear[recipeFocus] ? 'Уже создано' : 'Создать предмет'} ${icon('hammer')}</button><small class="recipe-feedback">${error || 'После создания предмет появится в рюкзаке.'}</small></aside></div>`;
 } else {
  p.innerHTML += `<div class="blueprint-workspace"><div class="blueprint-title">${icon('blueprint')}<div><div class="eyebrow">РЕЛИКТОВОЕ ОРУЖИЕ</div><h3>Чертёж клинка бурь</h3><p>${scene.state.learned ? 'Изучен. Рецепт доступен во вкладке снаряжения.' : 'Собери три разные части, чтобы открыть рецепт.'}</p></div></div><div class="blueprint-parts">${fragmentNames.map((n, i) => `<div class="blueprint-part ${scene.state.fragments[i] > 0 || scene.state.learned ? 'found' : ''}">${icon('fragment'+i)}<span class="part-index">0${i + 1}</span><strong>${n}</strong><small>${fragmentSources[i]}</small><b>${scene.state.learned ? 'Изучено' : scene.state.fragments[i] + ' / 1'}</b></div>`).join('')}</div><button class="primary" data-recipe="blueprint" ${recipeError(scene.state, 'blueprint', st, stationDistance()) ? 'disabled' : ''}>${scene.state.learned ? 'Чертёж изучен' : 'Собрать и изучить'}</button><div class="duplicate-row"><span>Повторные части → обычная древесина<small>Недостающие части нельзя получить обменом.</small></span><button class="secondary" data-recipe="salvage" ${recipeError(scene.state, 'salvage', st, stationDistance()) ? 'disabled' : ''}>Разобрать дубликаты</button></div></div>`;
 }
 p.innerHTML += repairFooter();
}
function renderFurnace(p: HTMLElement) {
 const st = currentStation && scene.state.cells[currentStation]?.station; if (!st || st.kind !== 'furnace') { setPanel('', false); return; }
 const error = recipeError(scene.state, 'iron', st, stationDistance());
 p.innerHTML = header('furnace', 'Каменная печь', 'ПЕРЕПЛАВКА') + stationStatus() + `<div class="smelting"><div class="smelting-input">${materials({ ore: 2, wood: 1 })}</div>${icon('arrow')}<div class="smelting-output">${icon('iron')}<strong>Железный слиток</strong><small>1 за операцию</small></div></div><button class="primary wide" data-recipe="iron" ${error ? 'disabled' : ''}>Переплавить ${icon('furnace')}</button><p class="recipe-feedback">${error || 'Топливо и руда расходуются только при переплавке.'}</p>` + repairFooter();
}
function renderChest(p: HTMLElement) {
 p.innerHTML = header('chest', 'Хранилище убежища', 'СУНДУК') + `<p class="note">Материалы и части чертежей здесь сохраняются при гибели.</p><div class="chest-grid">${(Object.keys(resourceNames) as Resource[]).map(r => `<div class="stored-item">${icon(r)}<span>${resourceNames[r]}</span><b>${scene.state.stash[r]}</b></div>`).join('')}${fragmentNames.map((n, f) => `<div class="stored-item">${icon('fragment')}<span>${n} чертежа</span><b>${scene.state.stashFragments[f]}</b></div>`).join('')}</div><div class="chest-actions"><button class="primary" data-action="deposit">Убрать материалы</button><button class="secondary" data-action="withdraw">Забрать материалы</button></div>`;
}

function drawMap(id: string) {
 const c = document.querySelector<HTMLCanvasElement>('#' + id); if (!c || !scene.actor) return;
 const ctx = c.getContext('2d')!, sx = c.width / WIDTH, sy = c.height / HEIGHT;
 const colors = { meadow: '#627953', forest: '#42634b', marsh: '#3d6663', ruins: '#637872', quarry: '#8c8a70' };
 for (let x = 0; x < WIDTH; x++) for (let y = 0; y < HEIGHT; y++) { ctx.fillStyle = colors[biomeAt(x, y)]; ctx.fillRect(x * sx, y * sy, Math.ceil(sx), Math.ceil(sy)); }
 ctx.fillStyle = '#b6cba7'; ctx.fillRect(EDGE * sx, 0, Math.max(1, sx * .2), c.height);
 if (id === 'map-canvas') { for (const r of scene.ruins) { ctx.fillStyle = '#304c4d'; ctx.fillRect(r.x * sx, r.y * sy, sx, sy); } }
 for (const [k, v] of Object.entries(scene.state.cells)) { const [x, y] = k.split(',').map(Number); ctx.fillStyle = v.station ? '#e8c797' : '#baae83'; ctx.fillRect(x * sx, y * sy, Math.max(2, sx), Math.max(2, sy)); }
 for (const n of scene.nodes.filter(n => n.data.kind === 'relic')) { ctx.fillStyle = '#e4ca8c'; ctx.beginPath(); ctx.arc(n.data.x * sx, n.data.y * sy, id === 'minimap' ? 2 : 5, 0, Math.PI * 2); ctx.fill(); }
 const px = scene.actor.x / TILE * sx, py = scene.actor.y / TILE * sy; ctx.fillStyle = '#f4efcc'; ctx.beginPath(); ctx.arc(px, py, id === 'minimap' ? 3 : 6, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#243e37'; ctx.lineWidth = 1; ctx.stroke();
}
function mission(): [string, string, number] {
 const s = scene.state, c = Object.values(s.cells);
 if (s.gear.storm) return ['Клинок обрёл хозяина', 'Экипируй клинок в рюкзаке. Развивай убежище и исследуй дальние районы.', 100];
 if (s.learned) return ['Реликт в твоих руках', 'Собери 8 железа и 3 искры. Создай клинок бурь у кузницы.', 85];
 if (s.fragments.every(n => n >= 1)) return ['Собери знания воедино', 'Вернись к кузнице и изучи составной чертёж.', 75];
 if (c.some(v => v.station?.kind === 'forge')) return ['Первое снаряжение', 'Создай копьё в кузнице, экипируй его в рюкзаке и отправляйся за разлом.', 60];
 if (c.some(v => v.station?.kind === 'furnace')) return ['Первые слитки', 'Переплавь руду. Для кузницы нужны 3 железа, 8 камня и 6 древесины.', 40];
 if (c.some(v => v.floor || v.wall)) return ['Дом обретает форму', 'Соедини стены, оставь дверь, уложи пол и накрой помещение крышей.', 25];
 return ['Дом начинается с тебя', 'Собери древесину и камень. Построй печь, чтобы получить железо для кузницы.', 10];
}
function hotbarName(value: string) { const [kind, name] = value.split(':'); return kind === 'build' ? buildNames[name as Build] || 'Постройка' : kind === 'gear' ? gearInfo[name as GearId]?.name || 'Предмет' : kind === 'resource' ? resourceNames[name as Resource] || 'Материал' : ({ gather: 'Добыча', attack: 'Оружие', bag: 'Рюкзак', build: 'Строительство', map: 'Карта' } as Record<string, string>)[name] || 'Пусто'; }
function hotbarIcon(value: string) { const [kind, name] = value.split(':'); return kind === 'action' ? ({ gather: 'pick', attack: scene.state.weapon === 'hands' ? 'spear' : scene.state.weapon, bag: 'backpack', build: 'hammer', map: 'map' } as Record<string, string>)[name] || 'empty' : name; }
let hotbarSignature = '';
function updateHotbar() {
 const sig = JSON.stringify([scene.state.hotbar, scene.state.weapon, scene.activeTool, panelMode, scene.selected, scene.state.bag, scene.state.gear]); if (sig === hotbarSignature) return; hotbarSignature = sig;
 $('hotbar').innerHTML = scene.state.hotbar.map((value, i) => { const [kind, name] = value.split(':'), selected = kind === 'build' ? scene.selected === name : name === scene.activeTool; const amount = kind === 'resource' ? scene.state.bag[name as Resource] : undefined; return `<button class="hotbar-slot ${selected ? 'active' : ''} ${kind === 'gear' && name in gearInfo ? 'rarity-' + gearInfo[name as GearId].rarity : ''}" data-hotbar="${i}" data-value="${value}" aria-label="${hotbarName(value)}" title="${hotbarName(value)} · ${i + 1}"><kbd>${i + 1}</kbd>${icon(hotbarIcon(value))}${amount !== undefined ? `<b>${amount}</b>` : ''}<span class="slot-name">${hotbarName(value)}</span></button>`; }).join('');
}
function activateSlot(index: number) {
 const [kind, name] = scene.state.hotbar[index].split(':');
 if (kind === 'build' && name in buildNames) { scene.selected = name as Build; scene.dismantling = false; scene.activeTool = 'build'; setPanel('', false); }
 else if (kind === 'gear' && name in gearInfo) { scene.equipItem(name as GearId, gearInfo[name as GearId].slot); scene.activeTool = 'attack'; setPanel('', false); }
 else if (kind === 'resource') { selectedItem = `${name}:0`; setPanel('bag'); }
 else if (kind === 'action') { if (name === 'bag' || name === 'build' || name === 'map') setPanel(name); else { setPanel('', false); scene.chooseTool(name); } }
 scene.onUI();
}
scene.onQuickSlot = activateSlot;
scene.onPanel = () => { const mode = scene.activeTool === 'bag' ? 'bag' : scene.activeTool === 'map' ? 'map' : 'build'; setPanel(mode); };
scene.onStation = (station, k) => { currentStation = k; scene.stationKey = k; forgeTab = 'equipment'; setPanel(station.kind === 'forge' ? 'forge' : station.kind === 'furnace' ? 'furnace' : 'chest', false); };
scene.onUI = () => {
 const s = scene.state;
 if (scene.actor && !portrait) { const source = scene.textures.get('player-front-0').getSourceImage() as HTMLCanvasElement; portrait = source.toDataURL(); $('portrait-frame').innerHTML = `<img src="${portrait}" alt="Путник">`; }
 $('health-text').textContent = Math.ceil(s.hp) + ' / 100'; $('health-bar').style.width = Math.max(0, s.hp) + '%'; $('stamina-bar').style.width = scene.stamina + '%'; $('defense').textContent = 'Защита ' + equipmentDefense(s);
 $('cycle').textContent = 'Цикл ' + String(s.cycle + 1).padStart(2, '0'); const b = biomeAt(Math.floor(s.x / TILE), Math.floor(s.y / TILE)); $('region-name').textContent = biomeNames[b]; $('region-desc').textContent = s.x >= EDGE * TILE ? 'Земля меняющегося города' : 'Постоянная земля · твой дом';
 $('bag-count').textContent = inventoryItems(s).length + ' / 24'; $('quick-materials').innerHTML = ['wood', 'stone', 'ore'].map(r => `<span title="${resourceNames[r as Resource]}">${icon(r)}<b>${s.bag[r as Resource]}</b></span>`).join('');
 if (scene.actor) $('hint').textContent = scene.hint().replace(/^E · /, '');
 const [title, body, progress] = mission(); $('quest-title').textContent = title; $('quest-body').textContent = body; $('quest-progress').style.width = progress + '%';
 $('save-status').textContent = scene.storageAvailable ? 'Сохранено локально' : 'Сохранение недоступно';
 const strip = $('build-strip'); strip.classList.toggle('hidden', !scene.selected && !scene.dismantling);
 if (scene.selected || scene.dismantling) strip.innerHTML = scene.dismantling ? `${icon('dismantle')}<span><b>Разбор постройки</b><small>Крыша → станция → стены / пол</small></span><button class="utility" data-action="cancel-build" aria-label="Отменить строительство">${icon('close')}</button>` : `${icon(scene.selected!)}<span><b>${buildNames[scene.selected!]}</b><small>Щелчок по клетке · Esc — отмена</small></span>${materials(costs[scene.selected!], true)}${['wall', 'door', 'fence'].includes(scene.selected!) ? `<button class="utility" data-action="rotate" aria-label="Повернуть постройку">${icon('rotate')}</button>` : ''}<button class="utility" data-action="cancel-build" aria-label="Отменить строительство">${icon('close')}</button>`;
 updateHotbar(); drawMap('minimap'); renderPanel();
};

function modal(content: string) { scene.paused = true; $('veil').classList.remove('hidden'); $('veil').innerHTML = `<div class="modal">${content}</div>`; }
function resume() { scene.paused = false; $('veil').classList.add('hidden'); }
function cancelBuild() { scene.selected = null; scene.dismantling = false; scene.activeTool = 'gather'; scene.onUI(); }
app.addEventListener('click', event => {
 const el = (event.target as HTMLElement).closest<HTMLButtonElement>('button'); if (!el || el.disabled) return;
 if (el.dataset.panel) { setPanel(el.dataset.panel as PanelMode); return; }
 if (el.dataset.hotbar !== undefined) { activateSlot(Number(el.dataset.hotbar)); return; }
 if (el.dataset.buildTab) { buildCategory = el.dataset.buildTab; const first: Record<string, Build> = { house: 'wall', workshops: 'furnace', outside: 'fence' }; buildFocus = first[buildCategory]; renderPanel(true); return; }
 if (el.dataset.build) { buildFocus = el.dataset.build as Build; renderPanel(true); return; }
 if (el.dataset.selectRecipe) { recipeFocus = el.dataset.selectRecipe as GearId; renderPanel(true); return; }
 if (el.dataset.forgeTab) { forgeTab = el.dataset.forgeTab; renderPanel(true); return; }
 if (el.dataset.recipe) { scene.craft(el.dataset.recipe); renderPanel(true); $('panel').classList.remove('operation-flash');requestAnimationFrame(()=>$('panel').classList.add('operation-flash'));return; }
 if (el.dataset.item) { selectedItem = el.dataset.item; renderPanel(true); return; }
 if (el.dataset.equipped) { selectedItem = 'equipped:' + el.dataset.equipped; renderPanel(true); return; }
 if (el.dataset.equip) { const id = el.dataset.equip as GearId; scene.equipItem(id, gearInfo[id].slot); selectedItem = 'equipped:' + id; renderPanel(true); return; }
 if(el.dataset.dropItem){scene.dropItem(el.dataset.dropItem);selectedItem='';renderPanel(true);return;}
 if (el.dataset.unequip) { scene.equipItem(null, el.dataset.unequip as EquipmentSlot); selectedItem = ''; renderPanel(true); return; }
 switch (el.dataset.action) {
  case 'start': case 'resume': resume(); break;
  case 'close': setPanel('', false); break;
  case 'place-build': scene.selected = buildFocus; scene.activeTool = 'build'; scene.dismantling = false; setPanel('', false); scene.onUI(); break;
  case 'dismantle': scene.selected = null; scene.dismantling = true; scene.activeTool = 'build'; setPanel('', false); scene.onUI(); break;
  case 'rotate': scene.selectedRotation = scene.selectedRotation === 0 ? 1 : 0; renderPanel(true); scene.onUI(); break;
  case 'cancel-build': cancelBuild(); break;
  case 'forge': scene.openForge(); break;
  case 'repair': if (currentStation) scene.repair(currentStation); renderPanel(true); break;
  case 'deposit': scene.transfer(true); renderPanel(true); break;
  case 'withdraw': scene.transfer(false); renderPanel(true); break;
  case 'objective': $('objective-content').classList.toggle('hidden'); break;
  case 'sound': scene.soundEnabled = !scene.soundEnabled; el.classList.toggle('enabled', scene.soundEnabled); el.setAttribute('aria-label', scene.soundEnabled ? 'Выключить звук' : 'Включить звук'); scene.playTone(440, .12); break;
  case 'help': modal(`<div class="eyebrow">ПУТЕВОДИТЕЛЬ</div><h1>Дом. Кузница.<br>Лабиринт.</h1><p><b>WASD</b> — движение, <b>E</b> — добыча и станции, <b>Space</b> — удар, <b>Shift</b> — рывок.<br><b>I / Tab</b> — рюкзак, <b>B</b> — строительство, <b>C</b> — кузница рядом, <b>1–8</b> — хотбар.</p><p>Стены и заборы соединяются с соседями. <b>R</b> поворачивает отдельную секцию перед размещением. Дверь открывается автоматически.</p><p>Защищённое помещение: замкнутые стены с дверью, пол и крыша над всем интерьером. Износ внутри — 2%, на улице — 4% за операцию.</p><p>Снаряжение и чертежи создаются только у кузницы. Готовые предметы появляются в рюкзаке; надень их в соответствующие слоты.</p><button class="primary wide" data-action="resume">Продолжить</button>`); break;
  case 'pause': scene.save(); modal(`<div class="eyebrow">ПАУЗА</div><h1>Твой мир<br>подождёт.</h1><p>${scene.storageAvailable ? 'Прогресс сохранён в этом браузере.' : 'Браузер не позволяет сохранить прогресс.'}</p><div class="modal-actions"><button class="primary" data-action="resume">Продолжить</button><button class="secondary" data-action="reset-confirm">Новый мир</button></div>`); break;
  case 'reset-confirm': modal(`<div class="eyebrow">НОВЫЙ МИР</div><h1>Начать сначала?</h1><p>Текущая база, рюкзак и изученные чертежи будут удалены. Это действие нельзя отменить.</p><div class="modal-actions"><button class="secondary" data-action="resume">Отмена</button><button class="primary" data-action="reset">Начать заново</button></div>`); break;
  case 'reset': setPanel('', false); scene.reset(); resume(); break;
  case 'interact': scene.interact(); break;
  case 'attack': if (scene.dismantling) scene.dismantle(Math.floor((scene.actor.x + scene.facing.x * 70) / TILE), Math.floor((scene.actor.y + scene.facing.y * 70) / TILE)); else if (scene.selected) scene.placeAhead(); else scene.attack(); break;
  case 'dash': scene.dash(); break;
 }
});

app.addEventListener('dragstart', event => {
 const el = (event.target as HTMLElement).closest<HTMLElement>('[draggable="true"]'); if (!el || !event.dataTransfer) return;
 const payload = el.dataset.item ? { item: el.dataset.item } : el.dataset.equipped ? { equipped: el.dataset.equipped } : { value: el.dataset.dragValue };
 event.dataTransfer.setData('application/x-labyrinth', JSON.stringify(payload)); event.dataTransfer.effectAllowed = 'move';
});
app.addEventListener('dragover', event => { if ((event.target as HTMLElement).closest('[data-hotbar],[data-inventory-index],[data-equip-slot]')) event.preventDefault(); });
app.addEventListener('drop', event => {
 event.preventDefault(); if (!event.dataTransfer) return;
 let data: { item?: string; equipped?: GearId; value?: string }; try { data = JSON.parse(event.dataTransfer.getData('application/x-labyrinth')); } catch { return; }
 const target = (event.target as HTMLElement).closest<HTMLElement>('[data-hotbar],[data-inventory-index],[data-equip-slot]'); if (!target) return;
 const item = data.item && inventoryItems(scene.state).find(i => i.id === data.item), gear = data.equipped || (item && item.kind in gearInfo ? item.kind as GearId : null);
 if(gear&&!Object.hasOwn(gearInfo,gear))return;
 if (target.dataset.hotbar !== undefined) { const value = data.value || (gear ? 'gear:' + gear : item && item.kind in resourceNames ? 'resource:' + item.kind : null); if (value) scene.assignHotbar(Number(target.dataset.hotbar), value); }
 else if (target.dataset.equipSlot && gear) scene.equipItem(gear, target.dataset.equipSlot as EquipmentSlot);
 else if (target.dataset.inventoryIndex !== undefined) {
  if (data.equipped) scene.equipItem(null, gearInfo[data.equipped].slot);
  else if (data.item) { const slots = inventorySlots(scene.state).map(i => i?.id || ''); const from = slots.indexOf(data.item), to = Number(target.dataset.inventoryIndex); if (from >= 0 && to >= 0 && to < slots.length) { [slots[from], slots[to]] = [slots[to], slots[from]]; scene.state.inventoryOrder = slots; scene.save(); scene.onUI(); } }
 }
 renderPanel(true);
});
window.addEventListener('keydown', event => {
 const target = event.target as HTMLElement; if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
 const k = event.key.toLowerCase(), handled = ['b', 'i', 'tab', 'c', 'r', 'escape'].includes(k) || /^[1-8]$/.test(k); if (!handled || !scene.actor) return;
 event.preventDefault(); event.stopImmediatePropagation(); if (event.repeat) return;
 if (scene.paused) { if (k === 'escape') resume(); return; }
 if (k === 'escape') { if (panelMode) setPanel('', false); else cancelBuild(); }
 else if (k === 'b') setPanel('build'); else if (k === 'i' || k === 'tab') setPanel('bag'); else if (k === 'c') scene.openForge();
 else if (k === 'r') { scene.selectedRotation = scene.selectedRotation === 0 ? 1 : 0; renderPanel(true); scene.onUI(); }
 else activateSlot(Number(k) - 1);
}, true);
const held = new Map<number, string>();
function updateDirections() { const values = [...held.values()]; scene.mobile.x = Number(values.includes('right')) - Number(values.includes('left')); scene.mobile.y = Number(values.includes('down')) - Number(values.includes('up')); }
app.addEventListener('pointerdown', e => { const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-move]'); if (!b) return; e.preventDefault(); b.setPointerCapture(e.pointerId); held.set(e.pointerId, b.dataset.move!); updateDirections(); });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) app.addEventListener(ev, e => { held.delete((e as PointerEvent).pointerId); updateDirections(); });
window.addEventListener('blur', () => { held.clear(); updateDirections(); scene.save(); if (scene.actor && !scene.paused) modal(`<div class="eyebrow">ПАУЗА</div><h1>Ты вернулся.</h1><p>Игра была приостановлена, пока окно оставалось без фокуса.</p><button class="primary wide" data-action="resume">Продолжить</button>`); });
window.addEventListener('pagehide', () => scene.save());
new Phaser.Game({ type: Phaser.AUTO, parent: 'game', backgroundColor: '#536a48', scale: { mode: Phaser.Scale.RESIZE, width: innerWidth, height: innerHeight }, scene: [scene], render: { antialias: true }, input: { activePointers: 3 } });
Object.defineProperty(window, 'labyrinthDiagnostics', { get: () => ({ ready: !!scene.actor, paused: scene.paused, uiBlocked: scene.uiBlocked, panel: panelMode, position: { x: scene.state.x, y: scene.state.y }, bag: { ...scene.state.bag }, cells: JSON.parse(JSON.stringify(scene.state.cells)), equipment: { ...scene.state.equipment }, gear: { ...scene.state.gear }, weapon: scene.state.weapon, fragments: [...scene.state.fragments], learned: scene.state.learned, armor: scene.state.armor, stash: { ...scene.state.stash }, hotbar: [...scene.state.hotbar], cycle: scene.state.cycle, enemies: scene.enemies.length, enemyDetails: scene.enemies.map(e => ({ id: e.id, hp: e.hp, x: e.sprite.x, y: e.sprite.y })), facing: { ...scene.facing }, health: scene.state.hp, stamina: scene.stamina, attackCooldown: scene.attackTimer, nodes: scene.nodes.length, doorOpen: Object.fromEntries(scene.doorOpen), selected: scene.selected, rotation: scene.selectedRotation, camera: { x: scene.cameras.main.worldView.x, y: scene.cameras.main.worldView.y, zoom: scene.cameras.main.zoom }, sheltered: Object.fromEntries(Object.entries(scene.state.cells).filter(([,c])=>c.station).map(([k])=>{const [x,y]=k.split(',').map(Number);return [k,isSheltered(scene.state.cells,x,y)];})), drops:JSON.parse(JSON.stringify(scene.state.drops)),inventoryOrder:[...scene.state.inventoryOrder],saveVersion:scene.state.version, actorTexture:scene.actor?.texture.key, animation:scene.character?{action:scene.character.motion.action,elapsed:scene.character.motion.elapsed,gait:scene.character.motion.gait,contacts:scene.character.motion.contacts,renders:scene.character.renders,pose:scene.character.motion.pose()}:null }) });
