import { createServer, defineConfig, type Plugin, type ResolvedConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

function prerender(): Plugin {
  let config: ResolvedConfig;

  return {
    name: 'prerender-static-html',
    enforce: 'post',
    apply: 'build',
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    generateBundle: {
      order: 'post',
      async handler(_options, bundle) {
        if (config.build.ssr) return;

        const page = bundle['index.html'];
        if (!page || page.type !== 'asset' || typeof page.source !== 'string') {
          this.error('Prerendering requires an index.html asset.');
        }

        const html = page.source;
        const marker = '<div id="root"></div>';
        if (!html.includes(marker)) {
          this.error('Prerendering requires an empty <div id="root"></div> in index.html.');
        }

        // Let Vite transform TSX before Node loads it. A separate configuration
        // keeps this build-only renderer from recursively loading this plugin.
        const renderer = await createServer({
          configFile: false,
          root: config.root,
          mode: config.mode,
          plugins: [react()],
          appType: 'custom',
          logLevel: 'error',
          server: { middlewareMode: true, hmr: false, watch: null },
          optimizeDeps: { noDiscovery: true, include: [] },
        });

        try {
          const { render } = await renderer.ssrLoadModule('/src/entry-server.tsx');
          const appHtml = render();
          if (typeof appHtml !== 'string' || !appHtml.trim()) {
            this.error('Prerendering returned no HTML. Refusing to ship an empty page.');
          }
          page.source = html.replace(marker, `<div id="root">${appHtml}</div>`);
        } finally {
          await renderer.close();
        }
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
  // stops with a clear module-not-found error. That is deliberate: a loud
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
