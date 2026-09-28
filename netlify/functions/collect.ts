import type { Config, Context } from '@netlify/functions';
import { LIMITS, UTM_KEYS, type Beacon, type LinkClick, type PageView, type Utm, type Visit } from '../../src/analytics/types';
import { readSession } from '../lib/session';
import { isBot, parseUserAgent } from '../lib/useragent';
import { visitKey, visitStore } from '../lib/visits';

// Records visits for the private stats page. POST takes the tracker's beacons
// (src/analytics/tracker.ts); GET is the <noscript> image in index.html, which
// counts visitors browsing with JavaScript disabled.

export const config: Config = {
  path: '/api/collect',
  method: ['GET', 'POST'],
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};

const MAX_BODY = 64 * 1024;
const TRANSPARENT_GIF = Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), (char) => char.charCodeAt(0));

const noContent = () => new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
const pixel = () => new Response(TRANSPARENT_GIF, { headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' } });

const text = (value: unknown, max: number = LIMITS.text) => (typeof value === 'string' ? value.slice(0, max) : '');
const count = (value: unknown, max: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.round(Math.min(Math.max(value, 0), max)) : 0;
const records = (value: unknown, max: number) =>
  (Array.isArray(value) ? value : []).filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null).slice(0, max);

/** Validates a beacon and returns it with the time its id encodes. */
function parseBeacon(body: unknown, now: number): { beacon: Beacon; startedAt: number } | null {
  if (typeof body !== 'object' || body === null) return null;
  const raw = body as Record<string, unknown>;
  const id = typeof raw.id === 'string' ? /^([0-9a-z]{6,10})-[0-9a-z]{8,40}$/.exec(raw.id) : null;
  if (raw.v !== 1 || !id || typeof raw.seq !== 'number' || !Number.isInteger(raw.seq) || raw.seq < 1) return null;
  const startedAt = parseInt(id[1], 36);
  if (Math.abs(now - startedAt) > LIMITS.visitMs) return null;

  const visitor = text(raw.visitor, 40);
  const utm: Utm = {};
  const rawUtm = typeof raw.utm === 'object' && raw.utm !== null ? (raw.utm as Record<string, unknown>) : {};
  for (const key of UTM_KEYS) if (typeof rawUtm[key] === 'string') utm[key] = text(rawUtm[key]);

  const pages: PageView[] = records(raw.pages, LIMITS.pages).map((page) => ({
    path: text(page.path),
    title: text(page.title),
    at: count(page.at, LIMITS.visitMs),
  }));
  const clicks: LinkClick[] = records(raw.clicks, LIMITS.clicks).map((click) => ({
    href: text(click.href),
    label: text(click.label),
    section: text(click.section, 40),
    at: count(click.at, LIMITS.visitMs),
  }));

  return {
    startedAt,
    beacon: {
      v: 1,
      id: raw.id as string,
      visitor: /^[0-9a-z]*$/.test(visitor) ? visitor : '',
      seq: count(raw.seq, 1_000_000),
      referrer: text(raw.referrer),
      utm,
      language: text(raw.language, 40),
      timeZone: text(raw.timeZone, 60),
      screen: text(raw.screen, 20),
      viewport: text(raw.viewport, 20),
      pages,
      clicks,
      engagedMs: count(raw.engagedMs, LIMITS.visitMs),
      maxScroll: count(raw.maxScroll, 100),
    },
  };
}

/** What the server knows about a request, as the start of a new visit. */
function newVisit(id: string, req: Request, context: Context, now: number): Visit {
  const userAgent = req.headers.get('user-agent') ?? '';
  const geo = context.geo ?? {};
  return {
    id,
    visitor: '',
    seq: 0,
    js: true,
    start: now,
    end: now,
    ip: context.ip ?? '',
    location: {
      city: geo.city,
      region: geo.subdivision?.name,
      country: geo.country?.name,
      countryCode: geo.country?.code,
      postalCode: geo.postalCode,
      timezone: geo.timezone,
      latitude: geo.latitude,
      longitude: geo.longitude,
    },
    ...parseUserAgent(userAgent),
    userAgent: userAgent.slice(0, 500),
    referrer: '',
    utm: {},
    language: '',
    timeZone: '',
    screen: '',
    viewport: '',
    pages: [],
    clicks: [],
    engagedMs: 0,
    maxScroll: 0,
  };
}

async function recordBeacon(req: Request, context: Context, now: number) {
  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin) return new Response('Forbidden', { status: 403 });

  const body = await req.text();
  if (body.length > MAX_BODY) return new Response('Payload too large', { status: 413 });
  let parsed: ReturnType<typeof parseBeacon> = null;
  try {
    parsed = parseBeacon(JSON.parse(body), now);
  } catch {
    // Treated as invalid below.
  }
  if (!parsed) return new Response('Bad request', { status: 400 });

  const { beacon, startedAt } = parsed;
  const store = visitStore();
  const key = visitKey(beacon.id, startedAt);

  // Beacons from one visit can arrive together (a click as the tab closes).
  // Conditional writes keep the newest snapshot without losing either.
  for (let attempt = 0; attempt < 10; attempt++) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 10 + Math.random() * 40 * attempt));
    const existing = await store.getWithMetadata(key, { type: 'json' });
    const current = existing?.data as Visit | undefined;
    if (current && current.seq >= beacon.seq) break;

    const base = current ?? newVisit(beacon.id, req, context, now);
    const visit: Visit = {
      ...base,
      visitor: base.visitor || beacon.visitor,
      seq: beacon.seq,
      end: now,
      referrer: beacon.referrer,
      utm: beacon.utm,
      language: beacon.language,
      timeZone: beacon.timeZone,
      screen: beacon.screen,
      viewport: beacon.viewport,
      pages: beacon.pages,
      clicks: beacon.clicks,
      engagedMs: Math.max(base.engagedMs, beacon.engagedMs),
      maxScroll: Math.max(base.maxScroll, beacon.maxScroll),
    };
    const result = current
      ? await store.setJSON(key, visit, { onlyIfMatch: existing?.etag })
      : await store.setJSON(key, visit, { onlyIfNew: true });
    if (result.modified) break;
  }
  return noContent();
}

async function recordNoScript(req: Request, context: Context, now: number) {
  const id = `${now.toString(36)}-${Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(36).padStart(2, '0')).join('')}`;
  const visit = newVisit(id, req, context, now);
  let path = '/';
  try {
    path = new URL(req.headers.get('referer') ?? '').pathname;
  } catch {
    // Browsers may withhold the referrer; the site has one page anyway.
  }
  visit.js = false;
  visit.seq = 1;
  visit.language = text(req.headers.get('accept-language')?.split(',')[0], 40);
  visit.pages = [{ path, title: '', at: 0 }];
  await visitStore().setJSON(visitKey(id, now), visit, { onlyIfNew: true });
}

export default async (req: Request, context: Context) => {
  const now = Date.now();
  const optedOut = req.headers.get('sec-gpc') === '1' || req.headers.get('dnt') === '1';
  // Skip crawlers, visitors asking not to be tracked, and the signed-in owner.
  const skip = optedOut || isBot(req.headers.get('user-agent') ?? '') || (await readSession(req)) !== null;

  if (req.method === 'GET') {
    if (!skip) await recordNoScript(req, context, now);
    return pixel();
  }
  return skip ? noContent() : recordBeacon(req, context, now);
};
