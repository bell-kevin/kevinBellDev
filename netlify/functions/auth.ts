import type { Config } from '@netlify/functions';
import {
  OWNER_GITHUB_ID,
  STATE_COOKIE,
  clearSessionCookie,
  cookieHeader,
  oauthConfig,
  randomToken,
  readCookie,
  sessionCookie,
} from '../lib/session';

// "Sign in with GitHub" for the private stats page at /stats/. GitHub proves
// who is signing in; only the account in OWNER_GITHUB_ID gets a session.
// Nothing is requested beyond the public profile, and the GitHub token is
// revoked as soon as the account id has been read.

export const config: Config = {
  path: ['/api/auth/login', '/api/auth/callback', '/api/auth/logout'],
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};

const USER_AGENT = 'kevinbell.dev-stats';

function redirect(location: string, cookies: string[] = [], status = 302) {
  const headers = new Headers({ Location: location, 'Cache-Control': 'no-store' });
  for (const cookie of cookies) headers.append('Set-Cookie', cookie);
  return new Response(null, { status, headers });
}

/** Back to the stats page, which explains the error when there is one. */
const toStats = (error?: string, cookies: string[] = []) =>
  redirect(error ? `/stats/?error=${error}` : '/stats/', [cookieHeader(STATE_COOKIE, '', 0), ...cookies]);

function sameText(a: string, b: string) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

function login(url: URL) {
  const config = oauthConfig();
  if (!config) return toStats('config');
  const state = randomToken();
  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: `${url.origin}/api/auth/callback`,
    state,
    allow_signup: 'false',
  }).toString();
  return redirect(authorize.toString(), [cookieHeader(STATE_COOKIE, state, 600)]);
}

async function callback(req: Request, url: URL) {
  const config = oauthConfig();
  if (!config) return toStats('config');
  if (url.searchParams.has('error')) return toStats('denied');

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expected = readCookie(req, STATE_COOKIE);
  if (!code || !state || !expected || !sameText(state, expected)) return toStats('state');

  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: `${url.origin}/api/auth/callback`,
    }),
  });
  const { access_token: token } = (await tokenResponse.json().catch(() => ({}))) as { access_token?: string };
  if (!token) return toStats('github');

  const userResponse = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': USER_AGENT },
  });
  const user = (await userResponse.json().catch(() => ({}))) as { id?: number; login?: string };

  // The token was only needed to read the account id.
  await fetch(`https://api.github.com/applications/${config.clientId}/token`, {
    method: 'DELETE',
    headers: {
      Authorization: `Basic ${btoa(`${config.clientId}:${config.clientSecret}`)}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': USER_AGENT,
    },
    body: JSON.stringify({ access_token: token }),
    signal: AbortSignal.timeout(3000),
  }).catch(() => undefined);

  if (!userResponse.ok) return toStats('github');
  if (user.id !== OWNER_GITHUB_ID) return toStats('forbidden');
  return toStats(undefined, [await sessionCookie({ id: user.id, login: user.login ?? '' })]);
}

export default async (req: Request) => {
  const url = new URL(req.url);
  if (url.pathname === '/api/auth/login' && req.method === 'GET') return login(url);
  if (url.pathname === '/api/auth/callback' && req.method === 'GET') return callback(req, url);
  // A form POST, so a link on another site cannot sign the owner out.
  if (url.pathname === '/api/auth/logout' && req.method === 'POST') return redirect('/stats/', [clearSessionCookie()], 303);
  return new Response('Method not allowed', { status: 405 });
};
