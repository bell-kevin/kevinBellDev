import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

function prerender(): Plugin {
  return {
    name: 'prerender-static-html',
    enforce: 'post',
    apply: 'build',
    closeBundle: {
      sequential: true,
      order: 'post',
      async handler() {
        const root = dirname(fileURLToPath(import.meta.url));
        const distPath = resolve(root, 'dist/index.html');
        let html: string;
        try {
          html = readFileSync(distPath, 'utf-8');
        } catch {
          return;
        }

        const marker = '<div id="root"></div>';
        if (!html.includes(marker)) return;

        const { render } = await import('./src/entry-server.tsx');
        const appHtml = render();
        const rendered = html.replace(marker, `<div id="root">${appHtml}</div>`);
        writeFileSync(distPath, rendered);

        const added = Buffer.byteLength(rendered) - Buffer.byteLength(html);
        console.log(
          `prerendered dist/index.html (+${(added / 1024).toFixed(1)} kB of static markup)`
        );
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), prerender()],
  // PostCSS is configured inline, on purpose, instead of in a postcss.config.js.
  //
  // Passing an object here makes Vite skip its search for a PostCSS config file
  // entirely. That matters: this project's builds have repeatedly picked up a
  // stale or half-synced postcss.config.js and either failed to resolve
  // `tailwindcss` or silently emitted a ~1 kB stylesheet, shipping the whole
  // site unstyled. With the plugins named here they are resolved from this file,
  // through the same import graph Vite already had to load, and a leftover
  // postcss.config.js sitting on disk is simply ignored.
  //
  // If `tailwindcss` is not installed, the imports above fail and the build
  // stops with a clear module-not-found error. That is deliberate — a loud
  // failure is correct here, because the quiet alternative is a live site with
  // no CSS. The fix is always `npm install`, never removing these plugins.
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
