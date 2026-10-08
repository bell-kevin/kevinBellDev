import type { Visit } from '../analytics/types';
import type { VisitInsight } from './signals';

const numberFormat = new Intl.NumberFormat();
const compactFormat = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });
const dateTime = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const longDateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'short' });

export const formatNumber = (value: number) => numberFormat.format(value);
export const formatCompact = (value: number) => (value < 10_000 ? numberFormat.format(value) : compactFormat.format(value));
export const formatDateTime = (ms: number) => dateTime.format(ms);
export const formatLongDateTime = (ms: number) => longDateTime.format(ms);
export function formatPercent(part: number, whole: number) {
  const percent = whole ? Math.round((part / whole) * 100) : 0;
  return part > 0 && percent === 0 ? '<1%' : `${percent}%`;
}
export const plural = (value: number, [one, many]: [string, string]) => `${formatNumber(value)} ${value === 1 ? one : many}`;

export function formatDuration(ms: number) {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${String(seconds % 60).padStart(2, '0')}s`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}

/** `+1:05` style offsets for a visit's timeline. */
export function formatOffset(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = String(seconds % 60).padStart(2, '0');
  return hours ? `+${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `+${minutes}:${rest}`;
}

export function flag(countryCode?: string) {
  if (!countryCode || !/^[A-Z]{2}$/.test(countryCode)) return '';
  return String.fromCodePoint(...[...countryCode].map((char) => 127397 + char.charCodeAt(0)));
}

export function place(visit: Visit) {
  const { city, region, country } = visit.location;
  return [city, region, country].filter(Boolean).join(', ') || 'Unknown location';
}

export function shortPlace(visit: Visit) {
  const { city, country, countryCode } = visit.location;
  if (city) return `${city}, ${countryCode ?? country ?? ''}`.replace(/, $/, '');
  return country ?? 'Unknown';
}

const languageNames = (() => {
  try {
    return new Intl.DisplayNames(undefined, { type: 'language' });
  } catch {
    return null;
  }
})();

export function languageName(tag: string) {
  if (!tag) return 'Unknown';
  try {
    return languageNames?.of(tag) ?? tag;
  } catch {
    return tag;
  }
}

/** Where a visit came from: the referring site, a campaign, or neither. */
export function source(visit: Visit) {
  if (visit.referrer) {
    try {
      return new URL(visit.referrer).hostname.replace(/^www\./, '') || visit.referrer;
    } catch {
      return visit.referrer;
    }
  }
  if (visit.utm.source) return visit.utm.source;
  return visit.js ? 'Direct / no referrer' : 'Unknown (pixel request)';
}

export function browserName(visit: Visit) {
  return visit.browserVersion ? `${visit.browser} ${visit.browserVersion}` : visit.browser;
}

export function deviceName(visit: Visit) {
  return visit.device === 'unknown' ? 'Unknown' : visit.device[0].toUpperCase() + visit.device.slice(1);
}

export function visitorKey(visit: Visit) {
  // A shared IP and user agent are not a stable browser identity.
  return visit.visitor ? `browser:${visit.visitor}` : `visit:${visit.id}`;
}

export function returnLabel(value: VisitInsight['returning']) {
  return {
    returning: 'Return visit',
    'first-observed': 'First observed',
    possible: 'Possible repeat',
    unknown: 'Return unknown',
  }[value];
}
