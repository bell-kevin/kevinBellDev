// Sign-in for the private stats page. Only one GitHub account may sign in.
// Sessions are a signed cookie; nothing about them is stored server side.

/** github.com/bell-kevin */
export const OWNER_GITHUB_ID = 8269880;

const SESSION_COOKIE = '__Host-stats-session';
export const STATE_COOKIE = '__Host-stats-oauth';
const SESSION_SECONDS = 14 * 24 * 60 * 60;

export interface Session {
  id: number;
  login: string;
  /** Expiry in epoch seconds. */
  exp: number;
}

const encoder = new TextEncoder();

/** The GitHub OAuth app's credentials, set as Netlify environment variables. */
export function oauthConfig() {
  const clientId = Netlify.env.get('GITHUB_CLIENT_ID');
  const clientSecret = Netlify.env.get('GITHUB_CLIENT_SECRET');
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(text: string) {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export function randomToken() {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

// The cookie key is derived from the OAuth client secret, so rotating that
// secret on GitHub and in Netlify also signs out every session.
async function signingKey(secret: string) {
  const base = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const derived = await crypto.subtle.sign('HMAC', base, encoder.encode('kevinbell.dev stats session v1'));
  return crypto.subtle.importKey('raw', derived, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export function readCookie(req: Request, name: string) {
  for (const part of (req.headers.get('cookie') ?? '').split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return value.join('=');
  }
  return null;
}

export function cookieHeader(name: string, value: string, maxAge: number) {
  return `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

export async function sessionCookie(user: { id: number; login: string }) {
  const config = oauthConfig();
  if (!config) throw new Error('GitHub sign-in is not configured.');
  const session: Session = { id: user.id, login: user.login, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS };
  const payload = encoder.encode(JSON.stringify(session));
  const signature = await crypto.subtle.sign('HMAC', await signingKey(config.clientSecret), payload);
  return cookieHeader(SESSION_COOKIE, `${base64url(payload)}.${base64url(new Uint8Array(signature))}`, SESSION_SECONDS);
}

export const clearSessionCookie = () => cookieHeader(SESSION_COOKIE, '', 0);

export async function readSession(req: Request): Promise<Session | null> {
  const config = oauthConfig();
  const [payload, signature, extra] = readCookie(req, SESSION_COOKIE)?.split('.') ?? [];
  if (!config || !payload || !signature || extra !== undefined) return null;
  try {
    const bytes = fromBase64url(payload);
    const valid = await crypto.subtle.verify('HMAC', await signingKey(config.clientSecret), fromBase64url(signature), bytes);
    if (!valid) return null;
    const session = JSON.parse(new TextDecoder().decode(bytes)) as Session;
    if (session.id !== OWNER_GITHUB_ID || session.exp * 1000 <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}
