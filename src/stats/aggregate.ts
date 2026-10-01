import type { Visit } from '../analytics/types';
import { browserName, deviceName, flag, languageName, source, visitorKey } from './format';

export interface Range {
  id: string;
  label: string;
  days: number;
  unit: 'hour' | 'day' | 'week';
}

export const RANGES: Range[] = [
  { id: 'today', label: 'Today', days: 1, unit: 'hour' },
  { id: '7d', label: '7 days', days: 7, unit: 'day' },
  { id: '30d', label: '30 days', days: 30, unit: 'day' },
  { id: '90d', label: '90 days', days: 90, unit: 'day' },
  { id: '12m', label: '12 months', days: 365, unit: 'week' },
];

/** Local midnight `days - 1` days ago through the end of today. */
export function rangeBounds(range: Range, now = new Date()) {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (range.days - 1)).getTime();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  return { from, to };
}

export interface Summary {
  visits: number;
  visitors: number;
  returningVisitors: number;
  averageEngagedMs: number;
  clicks: number;
  countries: number;
  withoutJs: number;
}

export function summarize(visits: Visit[]): Summary {
  const perVisitor = new Map<string, number>();
  for (const visit of visits) perVisitor.set(visitorKey(visit), (perVisitor.get(visitorKey(visit)) ?? 0) + 1);
  const measured = visits.filter((visit) => visit.js);
  return {
    visits: visits.length,
    visitors: perVisitor.size,
    returningVisitors: [...perVisitor.values()].filter((count) => count > 1).length,
    averageEngagedMs: measured.length ? measured.reduce((sum, visit) => sum + visit.engagedMs, 0) / measured.length : 0,
    clicks: visits.reduce((sum, visit) => sum + visit.clicks.length, 0),
    countries: new Set(visits.map((visit) => visit.location.countryCode).filter(Boolean)).size,
    withoutJs: visits.length - measured.length,
  };
}

export interface Row {
  key: string;
  label: string;
  detail?: string;
  value: number;
}

function tally(entries: Iterable<Omit<Row, 'value'>>): Row[] {
  const rows = new Map<string, Row>();
  for (const entry of entries) {
    const row = rows.get(entry.key);
    if (row) row.value += 1;
    else rows.set(entry.key, { ...entry, value: 1 });
  }
  return [...rows.values()].sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

const simple = (visits: Visit[], label: (visit: Visit) => string) =>
  tally(visits.map((visit) => {
    const text = label(visit);
    return { key: text, label: text };
  }));

export interface Breakdown {
  id: string;
  title: string;
  unit: string;
  rows: Row[];
}

export function breakdowns(visits: Visit[]): Breakdown[] {
  return [
    {
      id: 'countries',
      title: 'Countries',
      unit: 'visits',
      rows: tally(visits.map((visit) => ({
        key: visit.location.countryCode ?? '?',
        label: `${flag(visit.location.countryCode)} ${visit.location.country ?? 'Unknown'}`.trim(),
      }))),
    },
    {
      // A country's first-level division: a US state, a Canadian province, and so on.
      id: 'regions',
      title: 'States and regions',
      unit: 'visits',
      rows: tally(visits.map((visit) => {
        const { region, countryCode } = visit.location;
        return {
          key: `${region}|${countryCode}`,
          label: region ?? 'Unknown',
          detail: countryCode,
        };
      })),
    },
    {
      id: 'cities',
      title: 'Cities',
      unit: 'visits',
      rows: tally(visits.map((visit) => {
        const { city, region, countryCode } = visit.location;
        return {
          key: `${city}|${region}|${countryCode}`,
          label: city ?? 'Unknown',
          detail: [region, countryCode].filter(Boolean).join(', '),
        };
      })),
    },
    { id: 'sources', title: 'Sources', unit: 'visits', rows: simple(visits, source) },
    {
      id: 'links',
      title: 'Links clicked',
      unit: 'clicks',
      rows: tally(visits.flatMap((visit) => visit.clicks.map((click) => ({
        key: `${click.href}|${click.section}`,
        label: click.label || click.href,
        detail: `${click.href} · ${click.section}`,
      })))),
    },
    { id: 'browsers', title: 'Browsers', unit: 'visits', rows: simple(visits, (visit) => visit.browser) },
    { id: 'versions', title: 'Browser versions', unit: 'visits', rows: simple(visits, browserName) },
    { id: 'os', title: 'Operating systems', unit: 'visits', rows: simple(visits, (visit) => visit.os) },
    { id: 'devices', title: 'Devices', unit: 'visits', rows: simple(visits, deviceName) },
    { id: 'languages', title: 'Languages', unit: 'visits', rows: simple(visits, (visit) => languageName(visit.language)) },
    { id: 'screens', title: 'Screen sizes', unit: 'visits', rows: simple(visits, (visit) => visit.screen || 'Unknown') },
  ];
}

export interface Bucket {
  start: number;
  label: string;
  detail: string;
  value: number;
}

const hourLabel = new Intl.DateTimeFormat(undefined, { hour: 'numeric' });
const dayLabel = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const dayDetail = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

/** Visit counts per hour, day, or week of the range, in local time. */
export function timeline(visits: Visit[], range: Range, from: number, to: number): Bucket[] {
  const origin = new Date(from);
  const starts: number[] = [];
  for (let i = 0; ; i++) {
    const start =
      range.unit === 'hour'
        ? new Date(origin.getFullYear(), origin.getMonth(), origin.getDate(), i).getTime()
        : new Date(origin.getFullYear(), origin.getMonth(), origin.getDate() + i * (range.unit === 'week' ? 7 : 1)).getTime();
    if (start >= to) break;
    starts.push(start);
  }

  const counts = new Array<number>(starts.length).fill(0);
  for (const visit of visits) {
    // Binary search for the last bucket starting at or before the visit.
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (starts[mid] <= visit.start) low = mid;
      else high = mid - 1;
    }
    if (visit.start >= starts[0] && visit.start < to) counts[low] += 1;
  }

  return starts.map((start, index) => {
    const end = (starts[index + 1] ?? to) - 1;
    if (range.unit === 'hour') return { start, label: hourLabel.format(start), detail: `${hourLabel.format(start)} today`, value: counts[index] };
    if (range.unit === 'day') return { start, label: dayLabel.format(start), detail: dayDetail.format(start), value: counts[index] };
    return { start, label: dayLabel.format(start), detail: `Week of ${dayLabel.format(start)}–${dayLabel.format(end)}`, value: counts[index] };
  });
}

/** Visits by local hour of day across the whole range. */
export function hoursOfDay(visits: Visit[]): Bucket[] {
  const counts = new Array<number>(24).fill(0);
  for (const visit of visits) counts[new Date(visit.start).getHours()] += 1;
  return counts.map((value, hour) => {
    const at = new Date(2000, 0, 1, hour).getTime();
    return { start: at, label: hourLabel.format(at), detail: `${hourLabel.format(at)}–${hourLabel.format(at + 3_600_000)}`, value };
  });
}
