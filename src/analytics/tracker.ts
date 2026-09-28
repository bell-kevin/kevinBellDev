import { LIMITS, OWNER_KEY, UTM_KEYS, type Beacon, type LinkClick, type PageView, type Utm } from './types';

const ENDPOINT = '/api/collect';
const VISIT_KEY = 'kevinbell-visit';
const VISITOR_KEY = 'kevinbell-visitor';
/** Coming back after this long hidden starts a new visit. */
const IDLE_MS = 30 * 60 * 1000;
/** A tab left open counts at most this long per stretch of being visible. */
const MAX_STRETCH_MS = 30 * 60 * 1000;
/** Well inside the server's limit on how long a visit may keep reporting. */
const MAX_VISIT_MS = 24 * 60 * 60 * 1000;

interface VisitState {
  id: string;
  seq: number;
  startedAt: number;
  hiddenAt: number | null;
  referrer: string;
  utm: Utm;
  pages: PageView[];
  clicks: LinkClick[];
  engagedMs: number;
  maxScroll: number;
}

function storageGet(storage: () => Storage, key: string) {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
}

function storageSet(storage: () => Storage, key: string, value: string) {
  try {
    storage().setItem(key, value);
  } catch {
    // Without storage, visits are still counted but not linked together.
  }
}

const local = () => window.localStorage;
const session = () => window.sessionStorage;

function randomId(bytes: number) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(36).padStart(2, '0')).join('');
}

function trackingAllowed() {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (nav.globalPrivacyControl || nav.doNotTrack === '1' || nav.webdriver) return false;
  return storageGet(local, OWNER_KEY) === null;
}

function visitorId() {
  let id = storageGet(local, VISITOR_KEY);
  if (!id || !/^[0-9a-z]{16,40}$/.test(id)) {
    id = randomId(10);
    storageSet(local, VISITOR_KEY, id);
  }
  return id;
}

function externalReferrer() {
  try {
    const referrer = new URL(document.referrer);
    return referrer.origin === location.origin ? '' : document.referrer;
  } catch {
    return '';
  }
}

function currentUtm() {
  const params = new URLSearchParams(location.search);
  const utm: Utm = {};
  for (const key of UTM_KEYS) {
    const value = params.get(`utm_${key}`);
    if (value) utm[key] = value.slice(0, LIMITS.text);
  }
  return utm;
}

function newVisit(now: number): VisitState {
  return {
    id: `${now.toString(36)}-${randomId(8)}`,
    seq: 0,
    startedAt: now,
    hiddenAt: null,
    referrer: externalReferrer(),
    utm: currentUtm(),
    pages: [],
    clicks: [],
    engagedMs: 0,
    maxScroll: 0,
  };
}

function savedVisit(now: number) {
  try {
    const saved = JSON.parse(storageGet(session, VISIT_KEY) ?? 'null') as VisitState | null;
    if (!saved || typeof saved.id !== 'string' || !Array.isArray(saved.pages)) return null;
    if (now - saved.startedAt > MAX_VISIT_MS) return null;
    if (saved.hiddenAt !== null && now - saved.hiddenAt > IDLE_MS) return null;
    return saved;
  } catch {
    return null;
  }
}

/** The visible text of a link, leaving out screen-reader-only additions. */
function linkLabel(link: HTMLAnchorElement) {
  const label = link.getAttribute('aria-label');
  if (label) return label;
  const parts: string[] = [];
  const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.parentElement?.closest('.sr-only')) parts.push(node.textContent ?? '');
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function linkSection(link: HTMLAnchorElement) {
  const region = link.closest('section[id], header, footer');
  return region ? region.id || region.tagName.toLowerCase() : 'page';
}

function scrollDepth() {
  const height = document.documentElement.scrollHeight;
  if (!height) return 0;
  return Math.min(100, Math.round(((window.scrollY + window.innerHeight) / height) * 100));
}

export function startTracking() {
  if (!trackingAllowed()) return;

  const visitor = visitorId();
  const now = Date.now();
  // A saved visit carries on across page loads in the same tab.
  let visit = savedVisit(now) ?? newVisit(now);
  visit.hiddenAt = null;
  let visibleSince: number | null = document.visibilityState === 'visible' ? now : null;
  let dirty = false;

  const persist = () => storageSet(session, VISIT_KEY, JSON.stringify(visit));

  const stretch = (at: number) => (visibleSince === null ? 0 : Math.min(at - visibleSince, MAX_STRETCH_MS));

  const recordPage = () => {
    if (visit.pages.length < LIMITS.pages) {
      visit.pages.push({ path: location.pathname, title: document.title.slice(0, LIMITS.text), at: Date.now() - visit.startedAt });
    }
    visit.maxScroll = Math.max(visit.maxScroll, scrollDepth());
  };

  const send = () => {
    const at = Date.now();
    visit.seq += 1;
    const beacon: Beacon = {
      v: 1,
      id: visit.id,
      visitor,
      seq: visit.seq,
      referrer: visit.referrer,
      utm: visit.utm,
      language: navigator.language,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
      screen: `${screen.width}x${screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      pages: visit.pages,
      clicks: visit.clicks,
      engagedMs: visit.engagedMs + stretch(at),
      maxScroll: visit.maxScroll,
    };
    persist();
    dirty = false;

    const body = JSON.stringify(beacon);
    try {
      if (navigator.sendBeacon?.(ENDPOINT, body)) return;
    } catch {
      // Fall through to fetch.
    }
    fetch(ENDPOINT, { method: 'POST', body, keepalive: true, credentials: 'omit' }).catch(() => {
      // Analytics must never disturb the page.
    });
  };

  const hide = () => {
    const at = Date.now();
    if (visibleSince !== null) {
      visit.engagedMs += stretch(at);
      visibleSince = null;
      dirty = true;
    }
    visit.hiddenAt = at;
    if (dirty) send();
    else persist();
  };

  const show = () => {
    const at = Date.now();
    const idle = visit.hiddenAt !== null && at - visit.hiddenAt > IDLE_MS;
    if (idle || at - visit.startedAt > MAX_VISIT_MS) {
      // Coming back to a tab left open is a new visit, not a new referral.
      visit = { ...newVisit(at), referrer: '', utm: {} };
      recordPage();
      dirty = true;
    }
    visit.hiddenAt = null;
    visibleSince = at;
    if (dirty) send();
  };

  const recordClick = (event: MouseEvent) => {
    if (event.type === 'auxclick' && event.button !== 1) return;
    const link = (event.target as Element | null)?.closest?.('a[href]');
    if (!(link instanceof HTMLAnchorElement) || visit.clicks.length >= LIMITS.clicks) return;
    const href = (link.getAttribute('href') ?? '').slice(0, LIMITS.text);
    visit.clicks.push({
      href,
      label: linkLabel(link).slice(0, LIMITS.text),
      section: linkSection(link),
      at: Date.now() - visit.startedAt,
    });
    // Links within the page wait for the next beacon; others may leave the page.
    if (href.startsWith('#')) {
      dirty = true;
      persist();
    } else {
      send();
    }
  };

  let scrollQueued = false;
  const recordScroll = () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      scrollQueued = false;
      const depth = scrollDepth();
      if (depth > visit.maxScroll) {
        visit.maxScroll = depth;
        dirty = true;
      }
    });
  };

  recordPage();
  send();

  document.addEventListener('visibilitychange', () => (document.visibilityState === 'hidden' ? hide() : show()));
  window.addEventListener('pagehide', hide);
  window.addEventListener('pageshow', (event) => {
    if (event.persisted && document.visibilityState === 'visible') show();
  });
  document.addEventListener('click', recordClick, { capture: true });
  document.addEventListener('auxclick', recordClick, { capture: true });
  window.addEventListener('scroll', recordScroll, { passive: true });
}
