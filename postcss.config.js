/* Tailwind is compiled here, at build time.
   This must stay wired up: src/index.css is nothing but `@tailwind` directives
   plus the progressive-enhancement rules, so an empty plugin list ships a page
   with no styles at all — for every visitor, not just the no-JS ones.
   `tailwindcss` and `autoprefixer` are declared in package.json devDependencies
   so the deploy server's install actually provides them. */
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
