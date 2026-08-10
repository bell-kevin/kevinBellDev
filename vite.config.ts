import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
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
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
