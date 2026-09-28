// kevinbell.dev is published from Bolt, which uploads static files only, so
// the Netlify Functions behind the statistics run on a separate Netlify
// project. Pages on kevinbell.dev report visits there, and that project's
// /stats/ page is the dashboard.
//
// Once kevinbell.dev is served by that project, set STATS_ORIGIN to '' and
// point the <noscript> image in index.html back at /api/collect.
export const STATS_ORIGIN = 'https://kevinbell-dev.netlify.app';

/** Hosts whose pages report to STATS_ORIGIN instead of to themselves. */
export const REMOTE_HOSTS = ['kevinbell.dev', 'www.kevinbell.dev'];

/** Where this page finds /api/ and /stats/: '' for its own site. */
export function statsOrigin() {
  return STATS_ORIGIN && REMOTE_HOSTS.includes(location.hostname) ? STATS_ORIGIN : '';
}
