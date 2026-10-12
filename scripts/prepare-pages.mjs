import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
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
