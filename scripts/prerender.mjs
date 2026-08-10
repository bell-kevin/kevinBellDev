// Renders <App /> to static HTML after `vite build` and inlines it into
// dist/index.html, so the site is fully readable and navigable without
// JavaScript. The client bundle then hydrates the same markup.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = path.join(root, 'dist', 'index.html');
const ROOT_DIV = '<div id="root"></div>';

const vite = await createServer({
  root,
  logLevel: 'error',
  server: { middlewareMode: true },
  appType: 'custom',
});

try {
  const template = await readFile(indexPath, 'utf8');
  if (!template.includes(ROOT_DIV)) {
    throw new Error(`Could not find ${ROOT_DIV} in dist/index.html — nothing to prerender into.`);
  }

  const { render } = await vite.ssrLoadModule('/src/entry-server.tsx');
  const appHtml = render();
  if (!appHtml.trim()) {
    throw new Error('Prerender produced empty markup.');
  }

  await writeFile(indexPath, template.replace(ROOT_DIV, `<div id="root">${appHtml}</div>`));
  console.log(`prerendered dist/index.html (+${(appHtml.length / 1024).toFixed(1)} kB of static markup)`);
} finally {
  await vite.close();
}
