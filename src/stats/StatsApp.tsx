import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Github, Lock, LogOut, RefreshCw } from 'lucide-react';
import { OWNER_KEY, type StatsResponse, type Visit } from '../analytics/types';
import { RANGES, breakdowns, hoursOfDay, rangeBounds, summarize, timeline, type Range } from './aggregate';
import { BarList, ColumnChart } from './charts';
import { formatCompact, formatDuration, formatPercent, visitorKey } from './format';
import { VisitDialog, VisitsTable } from './visits';

type State =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: StatsResponse; demo: boolean };

const SIGN_IN_ERRORS: Record<string, string> = {
  config: 'GitHub sign-in is not set up yet. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to the site’s environment variables in Netlify, then redeploy.',
  state: 'That sign-in attempt expired or was already used. Please try again.',
  denied: 'GitHub sign-in was cancelled.',
  github: 'GitHub didn’t confirm the sign-in. Please try again.',
  forbidden: 'That GitHub account can’t view these statistics.',
};

function initialRange() {
  const id = new URLSearchParams(location.search).get('range');
  return RANGES.find((range) => range.id === id) ?? RANGES[2];
}

async function fetchStats(range: Range): Promise<{ data: StatsResponse; demo: boolean } | 'signed-out'> {
  const { from, to } = rangeBounds(range);
  let response: Response | null = null;
  try {
    response = await fetch(`/api/stats?from=${from}&to=${to}`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
  } catch (error) {
    if (!import.meta.env.DEV) throw error;
  }
  if (response?.status === 401) return 'signed-out';
  if (response?.ok && response.headers.get('content-type')?.includes('application/json')) {
    return { data: (await response.json()) as StatsResponse, demo: false };
  }
  // `vite dev` has no functions; show sample data so the page can be worked on.
  if (import.meta.env.DEV) {
    const { demoStats } = await import('./demo');
    return { data: demoStats(from, to), demo: true };
  }
  throw new Error(`The statistics service answered ${response?.status ?? 'nothing'}.`);
}

function SignIn({ error }: { error: string | null }) {
  return (
    <main className="sign-in">
      <div className="card sign-in-card">
        <span className="sign-in-icon"><Lock size={22} aria-hidden="true" /></span>
        <h1>Site statistics</h1>
        <p>Visitor statistics for kevinbell.dev are private. Sign in with the GitHub account that owns the site.</p>
        {error && <p className="notice" role="alert">{SIGN_IN_ERRORS[error] ?? 'Sign-in failed. Please try again.'}</p>}
        <a className="button button-primary" href="/api/auth/login"><Github size={18} aria-hidden="true" /> Sign in with GitHub</a>
        <a className="back-link" href="/"><ArrowLeft size={15} aria-hidden="true" /> Back to kevinbell.dev</a>
      </div>
    </main>
  );
}

function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="stat">
      <dt>{label}</dt>
      <dd>
        <span className="stat-value">{value}</span>
        {note && <span className="stat-note">{note}</span>}
      </dd>
    </div>
  );
}

function Dashboard({ data, demo, range, refreshing, onRange, onRefresh }: {
  data: StatsResponse;
  demo: boolean;
  range: Range;
  refreshing: boolean;
  onRange: (range: Range) => void;
  onRefresh: () => void;
}) {
  const [selected, setSelected] = useState<Visit | null>(null);
  const { visits } = data;
  const summary = useMemo(() => summarize(visits), [visits]);
  const lists = useMemo(() => breakdowns(visits), [visits]);
  const buckets = useMemo(() => timeline(visits, range, data.from, data.to), [visits, range, data.from, data.to]);
  const hours = useMemo(() => hoursOfDay(visits), [visits]);
  const visitCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const visit of visits) counts.set(visitorKey(visit), (counts.get(visitorKey(visit)) ?? 0) + 1);
    return counts;
  }, [visits]);
  const related = selected ? visits.filter((visit) => visitorKey(visit) === visitorKey(selected)) : [];
  const perUnit = { hour: 'hour', day: 'day', week: 'week' }[range.unit];

  return (
    <>
      <header className="stats-header">
        <div className="stats-container header-row">
          <a className="site-name" href="/">Kevin Bell</a>
          <span className="header-title">Site statistics</span>
          <span className="viewer">@{data.viewer.login}</span>
          <form method="post" action="/api/auth/logout">
            <button type="submit" className="button button-secondary compact"><LogOut size={16} aria-hidden="true" /> Sign out</button>
          </form>
        </div>
      </header>

      <main className={refreshing ? 'stats-container dashboard refreshing' : 'stats-container dashboard'} aria-busy={refreshing}>
        {demo && (
          <p className="notice" role="note">
            Sample data. The Vite dev server doesn’t run Netlify Functions; use <code>netlify dev</code> for real visits.
          </p>
        )}

        <div className="filters">
          <fieldset className="segmented">
            <legend className="sr-only">Period</legend>
            {RANGES.map((option) => (
              <label key={option.id}>
                <input type="radio" name="range" checked={option.id === range.id} onChange={() => onRange(option)} />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
          <button type="button" className="button button-secondary compact" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw size={16} aria-hidden="true" /> Refresh
          </button>
        </div>

        <h1 className="sr-only">Site statistics, {range.label.toLowerCase()}</h1>
        <dl className="stats-row">
          <StatTile label="Visits" value={formatCompact(summary.visits)} note={summary.withoutJs ? `${summary.withoutJs} without JavaScript` : undefined} />
          <StatTile label="Visitors" value={formatCompact(summary.visitors)} note={`${summary.returningVisitors} came back (${formatPercent(summary.returningVisitors, summary.visitors)})`} />
          <StatTile label="Average time on page" value={formatDuration(summary.averageEngagedMs)} note="while the tab was visible" />
          <StatTile label="Link clicks" value={formatCompact(summary.clicks)} />
          <StatTile label="Countries" value={formatCompact(summary.countries)} />
        </dl>

        <section className="card chart-card" aria-labelledby="timeline-heading">
          <div className="card-heading">
            <h2 id="timeline-heading">Visits per {perUnit}</h2>
            <span>{range.unit === 'hour' ? 'today, your time' : `last ${range.label}`}</span>
          </div>
          <ColumnChart label={`Visits per ${perUnit}`} buckets={buckets} />
        </section>

        {range.unit !== 'hour' && (
          <section className="card chart-card" aria-labelledby="hours-heading">
            <div className="card-heading">
              <h2 id="hours-heading">Time of day</h2>
              <span>when visits began, your time</span>
            </div>
            <ColumnChart label="Visits by hour of day" buckets={hours} />
          </section>
        )}

        <div className="breakdowns">
          {lists.map((breakdown) => <BarList key={breakdown.id} breakdown={breakdown} />)}
        </div>

        <VisitsTable visits={visits} visitCounts={visitCounts} onOpen={setSelected} />
        <VisitDialog visit={selected} related={related} onOpen={setSelected} onClose={() => setSelected(null)} />

        <p className="footnote">
          Your own visits aren’t counted while you’re signed in, or ever from this browser. Visitors who send Global Privacy Control or Do Not Track aren’t counted. Locations are approximate, from each visitor’s IP address.
        </p>
      </main>
    </>
  );
}

export default function StatsApp() {
  const [range, setRange] = useState(initialRange);
  const [state, setState] = useState<State>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [signInError] = useState(() => new URLSearchParams(location.search).get('error'));

  const load = useCallback(async (next: Range) => {
    setRefreshing(true);
    try {
      const result = await fetchStats(next);
      if (result === 'signed-out') {
        setState({ status: 'signed-out' });
      } else {
        setState({ status: 'ready', ...result });
        try {
          localStorage.setItem(OWNER_KEY, '1');
        } catch {
          // The session cookie still keeps the owner's visits out while signed in.
        }
      }
    } catch (error) {
      setState({ status: 'error', message: error instanceof Error ? error.message : String(error) });
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(range);
    const url = new URL(location.href);
    url.searchParams.delete('error');
    url.searchParams.set('range', range.id);
    history.replaceState(null, '', url);
  }, [range, load]);

  if (state.status === 'loading') return <main className="loading" aria-busy="true"><p>Loading statistics…</p></main>;
  if (state.status === 'signed-out') return <SignIn error={signInError} />;
  if (state.status === 'error') {
    return (
      <main className="sign-in">
        <div className="card sign-in-card">
          <h1>Statistics are unavailable</h1>
          <p role="alert">{state.message}</p>
          <button type="button" className="button button-primary" onClick={() => load(range)}>Try again</button>
        </div>
      </main>
    );
  }
  return (
    <Dashboard
      data={state.data}
      demo={state.demo}
      range={range}
      refreshing={refreshing}
      onRange={setRange}
      onRefresh={() => load(range)}
    />
  );
}
