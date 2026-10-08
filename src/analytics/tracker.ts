import { statsOrigin } from './origin';
import { LIMITS, OWNER_KEY, UTM_KEYS, type Beacon, type LinkClick, type PageView, type Utm } from './types';

const VISIT_KEY = 'kevinbell-visit';
const VISITOR_KEY = 'kevinbell-visitor';
const LAST_VISIT_KEY = 'kevinbell-last-visit';
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
  returning?: boolean;
}

interface BrowserIdentity {
  id: string;
  previouslyStored: boolean;
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

/**
 * The dashboard links to `/?stats-owner=1` so the owner can stop counting a
 * browser on a site the sign-in cookie doesn't reach.
 */
function claimOwner() {
  const url = new URL(location.href);
  if (url.searchParams.get('stats-owner') !== '1') return false;
  storageSet(local, OWNER_KEY, '1');
  url.searchParams.delete('stats-owner');
  history.replaceState(history.state, '', url);
  return true;
}

function trackingAllowed() {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (nav.globalPrivacyControl || nav.doNotTrack === '1') return false;
  return storageGet(local, OWNER_KEY) === null;
}

function visitorId(): BrowserIdentity {
  const saved = storageGet(local, VISITOR_KEY);
  if (saved && /^[0-9a-z]{16,40}$/.test(saved)) return { id: saved, previouslyStored: true };
  const id = randomId(10);
  storageSet(local, VISITOR_KEY, id);
  return { id: storageGet(local, VISITOR_KEY) === id ? id : '', previouslyStored: false };
}

/** Remember only the latest visit, so history need not be fetched or stored. */
function markVisit(id: string, identity: BrowserIdentity): boolean | undefined {
  if (!identity.id) return undefined;
  try {
    const storage = local();
    if (storage.getItem(VISITOR_KEY) !== identity.id) return undefined;
    const previous = storage.getItem(LAST_VISIT_KEY);
    storage.setItem(LAST_VISIT_KEY, id);
    if (storage.getItem(LAST_VISIT_KEY) !== id) return undefined;
    if (previous) return /^[0-9a-z]{6,10}-[0-9a-z]{8,40}$/.test(previous) ? previous !== id : undefined;
    // An existing visitor id predates this marker, so its history is unknown.
    return identity.previouslyStored ? undefined : false;
  } catch {
    // Blocked storage cannot establish whether this browser has visited before.
    return undefined;
  }
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

function newVisit(now: number, identity: BrowserIdentity): VisitState {
  const id = `${now.toString(36)}-${randomId(8)}`;
  return {
    id,
    returning: markVisit(id, identity),
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
  const ownerClaimed = claimOwner();
  // The explicit opt-out applies now even when storage cannot remember it.
  if (ownerClaimed || !trackingAllowed()) return;

  const endpoint = `${statsOrigin()}/api/collect`;
  let identity = visitorId();
  const now = Date.now();
  // A saved visit carries on across page loads in the same tab.
  const saved = savedVisit(now);
  let visit = saved ?? newVisit(now, identity);
  // Preserve the saved visit's original status, including an unknown legacy
  // status. Recording its marker still lets the next visit be recognized.
  if (saved) markVisit(saved.id, identity);
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
    // Another tab may have set the owner opt-out since this one was opened.
    if (!trackingAllowed()) return;
    const at = Date.now();
    visit.seq += 1;
    const beacon: Beacon = {
      v: 1,
      id: visit.id,
      visitor: identity.id,
      ...(typeof visit.returning === 'boolean' ? { returning: visit.returning } : {}),
      ...(typeof navigator.webdriver === 'boolean' ? { automation: { webdriver: navigator.webdriver } } : {}),
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
      if (navigator.sendBeacon?.(endpoint, body)) return;
    } catch {
      // Fall through to fetch.
    }
    // A plain-text POST needs no CORS preflight, even to another origin.
    fetch(endpoint, { method: 'POST', body, keepalive: true, credentials: 'omit', mode: 'no-cors' }).catch(() => {
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
    if (!trackingAllowed()) return;
    const at = Date.now();
    const idle = visit.hiddenAt !== null && at - visit.hiddenAt > IDLE_MS;
    if (idle || at - visit.startedAt > MAX_VISIT_MS) {
      // Coming back to a tab left open is a new visit, not a new referral.
      // Storage may have been cleared or blocked while this tab was hidden.
      identity = visitorId();
      visit = { ...newVisit(at, identity), referrer: '', utm: {} };
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
