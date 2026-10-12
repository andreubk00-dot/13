import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
try {
 const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }); const errors = []; page.on('pageerror', e => errors.push(e.message));
 await page.goto(process.env.GAME_URL || 'http://127.0.0.1:5173'); await page.waitForFunction(() => window.labyrinthDiagnostics?.ready);
 await page.getByRole('button', { name: 'Начать путь' }).click();
 const before = await page.evaluate(() => window.labyrinthDiagnostics.position.x); await page.keyboard.down('d'); await page.waitForFunction(x => window.labyrinthDiagnostics.position.x > x + 15, before); await page.keyboard.up('d');
 await page.keyboard.press('i'); assert.equal(await page.locator('.item-slot').count(), 24); assert.equal(await page.locator('[data-equip-slot]').count(), 4); await page.keyboard.press('Escape');
 await page.getByRole('button', { name: 'Строить', exact: true }).click(); await page.locator('[data-build="wall"]').click(); await page.keyboard.press('Escape');
 await page.keyboard.press('c'); assert.equal(await page.evaluate(() => window.labyrinthDiagnostics.panel), '', 'no global crafting far from the forge');
 await page.getByRole('button', { name: 'Карта', exact: true }).click(); assert.ok(await page.locator('#map-canvas').isVisible()); await page.keyboard.press('Escape');
 assert.equal(await page.locator('.hotbar-slot').count(), 8); assert.equal(await page.getByText('Мастерство', { exact: true }).count(), 0); assert.equal(await page.locator('#hud svg.game-icon').count() > 15, true);
 await page.screenshot({ path: 'artifacts/v2-gameplay-desktop.png' });
 await page.getByRole('button', { name: 'Пауза', exact: true }).click(); assert.equal(await page.evaluate(() => window.labyrinthDiagnostics.paused), true); await page.getByRole('button', { name: 'Продолжить', exact: true }).click();
 const saved = await page.evaluate(() => window.labyrinthDiagnostics.position.x); await page.reload(); await page.waitForFunction(() => window.labyrinthDiagnostics?.ready); await page.getByRole('button', { name: 'Продолжить путь' }).click(); assert.ok(Math.abs((await page.evaluate(() => window.labyrinthDiagnostics.position.x)) - saved) < 3);
 await page.setViewportSize({ width: 390, height: 844 }); await page.getByRole('button', { name: 'Рюкзак', exact: true }).first().click(); assert.equal(await page.locator('.item-slot').count(), 24); assert.equal(await page.locator('.mobile-pad').isVisible(), false, 'mobile controls do not cover dialogs');
 assert.equal(await page.evaluate(() => document.getElementById('panel').scrollWidth <= document.getElementById('panel').clientWidth + 1), true, 'mobile panel does not overflow horizontally');
 await page.screenshot({ path: 'artifacts/v2-inventory-mobile.png' }); await page.keyboard.press('Escape');
 const start = await page.evaluate(() => window.labyrinthDiagnostics.position.x); const right = page.getByRole('button', { name: 'Вправо', exact: true }); const bounds = await right.boundingBox(); await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2); await page.mouse.down(); await page.waitForFunction(x => window.labyrinthDiagnostics.position.x > x + 5, start); await page.mouse.up();
 await page.screenshot({ path: 'artifacts/v2-gameplay-mobile.png' }); assert.deepEqual(errors, []);
 console.log('PASS: engine, movement, 24 backpack cells, four armor/weapon slots, eight quick slots, station-only crafting, original SVG icons, map, pause, save restoration and mobile panels.');
} finally { await browser.close(); }
