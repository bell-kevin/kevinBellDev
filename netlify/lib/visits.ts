import { getStore, type Store } from '@netlify/blobs';
import { LIMITS, type Visit } from '../../src/analytics/types';

// Storage layout in the `visits` Netlify Blobs store:
//
//   visits/<YYYY-MM-DD>/<visit id>  one visit while it can still change
//   days/<YYYY-MM-DD>               every visit of a finished day, as one array
//
// The date is the UTC day encoded in the visit id. Once no visit from a day can
// report any more (see isFinal), reading that day folds its visits into a
// single `days/` entry, so a year of statistics is one read per day.

const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

export const visitStore = () => getStore({ name: 'visits', consistency: 'strong' });

export const dayOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export const visitKey = (id: string, startedAt: number) => `visits/${dayOf(startedAt)}/${id}`;

/**
 * The collect function accepts a visit only while its id time is within
 * LIMITS.visitMs of now, so nothing can be written to a day after this.
 */
export function isFinal(day: string, now: number) {
  return now > Date.parse(day) + DAY_MS + LIMITS.visitMs + HOUR_MS;
}

export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function loadDay(store: Store, day: string, now: number): Promise<Visit[]> {
  const final = isFinal(day, now);
  if (final) {
    const compacted = await store.get(`days/${day}`, { type: 'json' });
    if (Array.isArray(compacted)) return compacted as Visit[];
  }

  const { blobs } = await store.list({ prefix: `visits/${day}/` });
  const visits = (await mapLimit(blobs, 16, (blob) => store.get(blob.key, { type: 'json' }) as Promise<Visit | null>))
    .filter((visit): visit is Visit => visit !== null);

  if (final) {
    await store.setJSON(`days/${day}`, visits);
    await mapLimit(blobs, 16, (blob) => store.delete(blob.key));
  }
  return visits;
}

/** Visits that started in [from, to), newest first. */
export async function loadVisits(from: number, to: number, now: number) {
  const store = visitStore();
  // Visits are filed by the visitor's clock but filtered by the server's, so
  // read a day either side to cover a visitor whose clock is off.
  const days: string[] = [];
  for (let at = from - DAY_MS; at < Math.min(to, now) + DAY_MS; at += DAY_MS) days.push(dayOf(at));
  const lastDay = dayOf(Math.min(to, now) + DAY_MS);
  if (days[days.length - 1] !== lastDay) days.push(lastDay);

  const visits = (await mapLimit(days, 6, (day) => loadDay(store, day, now))).flat();
  return visits.filter((visit) => visit.start >= from && visit.start < to).sort((a, b) => b.start - a.start);
}
