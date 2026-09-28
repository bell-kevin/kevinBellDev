import type { Config } from '@netlify/functions';
import type { StatsResponse } from '../../src/analytics/types';
import { readSession } from '../lib/session';
import { DAY_MS, loadVisits } from '../lib/visits';

// Visit data for the private stats page. Requires the owner's session cookie.

export const config: Config = {
  path: '/api/stats',
  method: 'GET',
};

const MAX_RANGE_MS = 400 * DAY_MS;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' },
  });

export default async (req: Request) => {
  const session = await readSession(req);
  if (!session) return json({ error: 'unauthorized' }, 401);

  const now = Date.now();
  const params = new URL(req.url).searchParams;
  let to = Number(params.get('to'));
  let from = Number(params.get('from'));
  if (!params.has('to') || !Number.isFinite(to) || to > now + DAY_MS) to = now + DAY_MS;
  if (!params.has('from') || !Number.isFinite(from) || from >= to) from = to - 30 * DAY_MS;
  from = Math.max(from, to - MAX_RANGE_MS);

  const response: StatsResponse = { viewer: { login: session.login }, from, to, visits: await loadVisits(from, to, now) };
  return json(response);
};
