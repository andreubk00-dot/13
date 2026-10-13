import { cp, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const built = path.join(root, 'dist');
const output = path.join(root, 'docs');
const html = await readFile(path.join(built, 'index.html'), 'utf8');
if (!html.includes('./assets/')) throw new Error('Build must use relative asset URLs for GitHub project Pages.');
await mkdir(output, { recursive: true });
await cp(built, output, { recursive: true });
await writeFile(path.join(output, '.nojekyll'), '');
console.log('GitHub Pages files prepared in docs/ (main branch, /docs source).');

await mkdir(path.join(output, 'downloads'), { recursive: true });
await copyFile(path.join(root, 'assets/vendor/kaykit/hero.blend'), path.join(output, 'downloads/hero.blend'));
await copyFile(path.join(root, 'assets/vendor/kaykit/README.md'), path.join(output, 'downloads/character-guide.md'));

await copyFile(path.join(root,'assets/vendor/kaykit/LICENSE.txt'),path.join(output,'downloads/character-license.txt'));
await copyFile(path.join(root,'assets/vendor/kaykit/Rogue.glb'),path.join(output,'downloads/Rogue.glb'));
