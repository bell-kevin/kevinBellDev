import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createServer, defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const ROOT_DIV = '<div id="root"></div>';

/**
 * Renders <App /> to static HTML at build time and inlines it into the built
 * index.html, so the shipped page is fully readable and navigable with
 * JavaScript disabled. The client bundle then hydrates that same markup.
 *
 * This deliberately lives inside the Vite config rather than in a separate
 * `vite build && node scripts/prerender.mjs` npm script. Deploy pipelines
 * (bolt.new's included) invoke `vite build` directly and never run the rest
 * of the npm script, which silently shipped an empty <div id="root"> — a
 * blank page for anyone without JavaScript. As a plugin the step runs for
 * every build, however it was started.
 */
function prerender(): Plugin {
  let outDir = '';
  let root = '';
  let isSsrBuild = false;

  return {
    name: 'prerender-static-html',
    apply: 'build',

    configResolved(config) {
      root = config.root;
      outDir = path.resolve(config.root, config.build.outDir);
      // The nested server below performs the SSR render itself; if someone
      // ever adds a real SSR build target, don't try to prerender into it.
      isSsrBuild = Boolean(config.build.ssr);
    },

    // closeBundle runs once the client output is fully written to disk.
    async closeBundle() {
      if (isSsrBuild) return;

      const indexPath = path.join(outDir, 'index.html');
      const template = await readFile(indexPath, 'utf8');
      if (!template.includes(ROOT_DIV)) {
        throw new Error(`Could not find ${ROOT_DIV} in ${indexPath} — nothing to prerender into.`);
      }

      // A dev server in middleware mode is only used as a module runner here;
      // it never listens on a port. `apply: 'build'` keeps this plugin out of
      // that nested server, so it cannot recurse.
      const ssr = await createServer({
        root,
        logLevel: 'error',
        server: { middlewareMode: true },
        appType: 'custom',
      });

      try {
        const { render } = await ssr.ssrLoadModule('/src/entry-server.tsx');
        const appHtml: string = render();
        if (!appHtml.trim()) {
          throw new Error('Prerender produced empty markup.');
        }

        await writeFile(indexPath, template.replace(ROOT_DIV, `<div id="root">${appHtml}</div>`));
        this.info(`prerendered index.html (+${(appHtml.length / 1024).toFixed(1)} kB of static markup)`);
      } finally {
        await ssr.close();
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), prerender()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
