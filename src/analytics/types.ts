// The contract between the tracker in the browser (src/analytics/tracker.ts),
// the Netlify Functions that store visits (netlify/), and the private
// dashboard (src/stats/). Keep all three in step when changing it.

/** Set in local storage by the stats page after signing in, so the owner's own visits are skipped. */
export const OWNER_KEY = 'kevinbell-stats-owner';

export const UTM_KEYS = ['source', 'medium', 'campaign', 'term', 'content'] as const;
export type UtmKey = typeof UTM_KEYS[number];
export type Utm = Partial<Record<UtmKey, string>>;

export interface PageView {
  path: string;
  title: string;
  /** Milliseconds after the visit started. */
  at: number;
}

export interface LinkClick {
  /** The link's href attribute as written, such as `#skills` or `mailto:…`. */
  href: string;
  /** The visible link text, without screen-reader-only additions. */
  label: string;
  /** The id or tag of the page region holding the link, such as `contact`. */
  section: string;
  /** Milliseconds after the visit started. */
  at: number;
}

/**
 * What the browser sends. Every beacon carries the whole visit so far, so a
 * lost or reordered beacon costs nothing once a later one arrives.
 */
export interface Beacon {
  v: 1;
  /** `<start time in base 36>-<random>`. Also decides which day stores it. */
  id: string;
  /** Random id remembered in local storage to recognize returning visitors. */
  visitor: string;
  /** Increases with every beacon, so the server keeps only the newest. */
  seq: number;
  referrer: string;
  utm: Utm;
  language: string;
  timeZone: string;
  screen: string;
  viewport: string;
  pages: PageView[];
  clicks: LinkClick[];
  /** Time the page was visible, in milliseconds. */
  engagedMs: number;
  /** Furthest point scrolled, as a percentage of the page. */
  maxScroll: number;
}

export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown';

export interface Visit {
  id: string;
  visitor: string;
  seq: number;
  /** False for browsers with JavaScript disabled, counted by a <noscript> image. */
  js: boolean;
  /** Server time of the first and latest beacon, in epoch milliseconds. */
  start: number;
  end: number;
  ip: string;
  location: {
    city?: string;
    region?: string;
    country?: string;
    countryCode?: string;
    postalCode?: string;
    timezone?: string;
    latitude?: number;
    longitude?: number;
  };
  browser: string;
  browserVersion: string;
  os: string;
  device: DeviceType;
  userAgent: string;
  referrer: string;
  utm: Utm;
  language: string;
  timeZone: string;
  screen: string;
  viewport: string;
  pages: PageView[];
  clicks: LinkClick[];
  engagedMs: number;
  maxScroll: number;
}

export interface StatsResponse {
  viewer: { login: string };
  from: number;
  to: number;
  visits: Visit[];
}

export const LIMITS = {
  pages: 50,
  clicks: 100,
  text: 300,
  /** Longest a visit may keep reporting. Also bounds when a day is final. */
  visitMs: 36 * 60 * 60 * 1000,
} as const;
