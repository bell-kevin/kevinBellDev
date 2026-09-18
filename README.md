# Kevin Bell

Personal website at https://kevinbell.dev/.

## Development

Use Node.js 22.12+ or a newer supported LTS release.

```sh
npm ci
npm run dev
```

## Production and JavaScript-free preview

```sh
npm run typecheck
npm run lint
npm run build
npm run preview
```

Deploy the generated `dist/` directory. The build prerenders `src/App.tsx` into
`dist/index.html` through the plugin in `vite.config.ts`. The browser hydrates
that same content when JavaScript is available, so there is only one copy of
the page to maintain. A prerendering failure stops the build instead of
publishing an empty page.

Test with JavaScript disabled using the production preview, since the
development server renders the application in the browser. Check navigation,
theme choices, and contact links at phone, tablet, and desktop widths.

The Auto theme follows the operating system preference. Light and Dark can be
selected without JavaScript. With JavaScript enabled, the chosen setting is
also remembered in local storage when the browser allows it.
