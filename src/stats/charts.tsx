import { useId, useState, type KeyboardEvent } from 'react';
import type { Breakdown, Bucket } from './aggregate';
import { formatCompact, formatNumber, formatPercent } from './format';

/** Round axis ticks: 0 and two or three steps of 1, 2, or 5 × 10ⁿ. */
function scale(max: number) {
  if (max <= 0) return { top: 1, ticks: [0, 1] };
  const rough = max / 3;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? 10 * magnitude);
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let tick = 0; tick <= top; tick += step) ticks.push(tick);
  return { top, ticks };
}

const plural = (value: number, [one, many]: [string, string]) => `${formatNumber(value)} ${value === 1 ? one : many}`;

export function ColumnChart({ label, buckets, unit = ['visit', 'visits'] }: { label: string; buckets: Bucket[]; unit?: [string, string] }) {
  const [active, setActive] = useState<number | null>(null);
  const tableId = useId();
  const { top, ticks } = scale(Math.max(0, ...buckets.map((bucket) => bucket.value)));
  const labelEvery = Math.max(1, Math.ceil(buckets.length / 7));
  const columns = { gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))` };
  const current = active === null ? null : buckets[active];

  const onKeyDown = (event: KeyboardEvent) => {
    const last = buckets.length - 1;
    const moves: Record<string, (index: number) => number> = {
      ArrowLeft: (index) => Math.max(0, index - 1),
      ArrowRight: (index) => Math.min(last, index + 1),
      Home: () => 0,
      End: () => last,
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    setActive((index) => move(index ?? last));
  };

  return (
    <div className="column-chart">
      <div
        className="plot"
        tabIndex={0}
        aria-label={`${label}. Use the arrow keys to read each value, or open the table below.`}
        aria-describedby={tableId}
        onKeyDown={onKeyDown}
        onFocus={() => setActive((index) => index ?? buckets.length - 1)}
        onBlur={() => setActive(null)}
        onPointerLeave={() => setActive(null)}
      >
        <div className="y-axis" aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick} style={{ bottom: `${(tick / top) * 100}%` }}>{formatCompact(tick)}</span>
          ))}
        </div>
        <div className="gridlines" aria-hidden="true">
          {ticks.map((tick) => <span key={tick} style={{ bottom: `${(tick / top) * 100}%` }} />)}
        </div>
        <div className="columns" style={columns} aria-hidden="true">
          {buckets.map((bucket, index) => (
            <div key={bucket.start} className={index === active ? 'slot active' : 'slot'} onPointerEnter={() => setActive(index)}>
              {bucket.value > 0 && <div className="column" style={{ height: `max(2px, ${(bucket.value / top) * 100}%)` }} />}
            </div>
          ))}
        </div>
        {current && active !== null && (
          <div className="tooltip" role="status" style={{ left: `clamp(4.5rem, ${((active + 0.5) / buckets.length) * 100}%, calc(100% - 4.5rem))` }}>
            <strong>{plural(current.value, unit)}</strong>
            <span>{current.detail}</span>
          </div>
        )}
      </div>
      <div className="x-axis" style={columns} aria-hidden="true">
        {buckets.map((bucket, index) => (
          <span key={bucket.start}>{index % labelEvery === 0 ? bucket.label : ''}</span>
        ))}
      </div>
      <details className="table-view" id={tableId}>
        <summary>Show as table</summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th scope="col">Period</th><th scope="col">{unit[1][0].toUpperCase() + unit[1].slice(1)}</th></tr>
            </thead>
            <tbody>
              {buckets.map((bucket) => (
                <tr key={bucket.start}><th scope="row">{bucket.detail}</th><td>{formatNumber(bucket.value)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

export function BarList({ breakdown, limit = 8 }: { breakdown: Breakdown; limit?: number }) {
  const [expanded, setExpanded] = useState(false);
  const headingId = useId();
  const total = breakdown.rows.reduce((sum, row) => sum + row.value, 0);
  const max = breakdown.rows[0]?.value ?? 0;
  const rows = expanded ? breakdown.rows : breakdown.rows.slice(0, limit);

  return (
    <section className="card breakdown" aria-labelledby={headingId}>
      <div className="card-heading">
        <h3 id={headingId}>{breakdown.title}</h3>
        <span>{breakdown.unit}</span>
      </div>
      {rows.length === 0 ? (
        <p className="empty">None in this period.</p>
      ) : (
        <table className="bar-list">
          <colgroup>
            <col />
            <col className="count" />
            <col className="share" />
          </colgroup>
          <thead className="sr-only">
            <tr><th scope="col">{breakdown.title}</th><th scope="col">{breakdown.unit}</th><th scope="col">Share</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <th scope="row">
                  <span className="bar-label">
                    <span>{row.label}</span>
                    {row.detail && <small>{row.detail}</small>}
                  </span>
                  <span className="bar" style={{ width: `${(row.value / max) * 100}%` }} aria-hidden="true" />
                </th>
                <td>{formatNumber(row.value)}</td>
                <td className="share">{formatPercent(row.value, total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {breakdown.rows.length > limit && (
        <button type="button" className="text-button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Show fewer' : `Show all ${breakdown.rows.length}`}
        </button>
      )}
    </section>
  );
}
