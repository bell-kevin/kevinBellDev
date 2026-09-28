import type { Config } from '@netlify/functions';
import { DAY_MS, dayOf, isFinal, loadDay, visitStore } from '../lib/visits';

// Folds each finished day's visits into one entry every night, so the stats
// page reads one entry per day even when it has not been opened for a while.
// Reading a day does the same, so a missed run only makes that read slower.

export const config: Config = {
  schedule: '@daily',
};

export default async () => {
  const now = Date.now();
  const store = visitStore();
  for (let daysAgo = 2; daysAgo <= 10; daysAgo++) {
    const day = dayOf(now - daysAgo * DAY_MS);
    if (isFinal(day, now)) await loadDay(store, day, now);
  }
};
