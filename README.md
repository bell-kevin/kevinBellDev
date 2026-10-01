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

## Visitor statistics

A private dashboard at https://kevinbell.dev/stats/ shows visits in aggregate
and one by one: when, approximate location and network, browser, device,
referring site, time with the page visible, how far down the page people
scrolled, and which links they clicked. Only the GitHub account `bell-kevin`
can sign in.

How it fits together:

- `src/analytics/tracker.ts` runs on the public page in production builds and
  sends the visit to `/api/collect` when it starts, when an outbound link is
  clicked, and when the tab is hidden or closed. It skips browsers that send
  Global Privacy Control or Do Not Track, automated browsers, and any browser
  that has signed in to the dashboard.
- Visitors with JavaScript disabled are counted by the `<noscript>` image in
  `index.html`.
- `netlify/functions/` holds the server side: `collect` adds the IP address,
  location, and parsed browser to each visit; `auth` handles GitHub sign-in;
  `stats` serves the data to the signed-in owner; `compact` runs daily. Visits
  are kept in a Netlify Blobs store named `visits`, which needs no setup.
- `stats/index.html` and `src/stats/` are the dashboard.

Hosting, for now: kevinbell.dev is published from Bolt, whose Publish button
uploads static files only, so the functions run on a separate Netlify project,
`kevinbell-dev`, which deploys `main` from GitHub automatically. Pages on
kevinbell.dev send visits to https://kevinbell-dev.netlify.app, and
kevinbell.dev/stats/ forwards to the dashboard there. When kevinbell.dev moves
to that project, set `STATS_ORIGIN` in `src/analytics/origin.ts` to `''` and
point the `<noscript>` image in `index.html` back at `/api/collect`.

The dashboard has the same Auto, Light, and Dark theme control as the main
page; Auto follows the operating system. Browsers remember the choice per site,
so while the dashboard runs on the Netlify project, a choice made on
kevinbell.dev doesn't carry over: pick it once on the dashboard.

### Enabling sign-in

1. Create a GitHub OAuth app at https://github.com/settings/applications/new
   with the homepage URL `https://kevinbell.dev` and the authorization
   callback URL `https://kevinbell.dev/api/auth/callback`.
2. Generate a client secret for it.
3. In the Netlify project that runs the functions, under Environment
   variables, add `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` (mark the
   secret as secret), then redeploy. The OAuth app needs a redirect URI for
   each address the dashboard is used from, such as
   `https://kevinbell-dev.netlify.app/api/auth/callback`.

Sign-in asks GitHub for nothing but the public profile. Sessions last 14 days;
generating a new client secret and updating it in Netlify signs every session
out. To let a different account in, change `OWNER_GITHUB_ID` in
`netlify/lib/session.ts`. The dashboard's footnote has a link that stops
counting your browser on kevinbell.dev, which the sign-in cookie on the
Netlify project can't reach.

### Working on the dashboard

`npm run dev` serves the dashboard at http://localhost:5173/stats/ with sample
data, because the Vite dev server doesn't run Netlify Functions. Use
`netlify dev` from the Netlify CLI to run the functions and a local Blobs store
together. `npm run typecheck` checks the functions as well as the site.

## Readability

Keep normal text at or above the [WCAG enhanced contrast target of 7:1](https://www.w3.org/WAI/WCAG22/Understanding/contrast-enhanced.html)
in both themes, including button and link hover states. Check the hero's
decorative layers as well as solid backgrounds when changing the palette.
Verify the theme selection and keyboard focus remain visible in the operating
system's high-contrast mode, and check the layout with enlarged text.
