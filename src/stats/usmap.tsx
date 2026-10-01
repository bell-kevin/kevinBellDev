import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { Visit } from '../analytics/types';
import { mapCounts, type AtlasState } from './aggregate';
import { formatNumber, formatPercent, plural } from './format';
// Types only: the outlines and the code that draws them load on demand.
import type { Atlas, County, Level, Point, Region } from './geo';

/**
 * Places smaller than this, in square viewport units (about 1,000 km² outside
 * Alaska), also get a dot. Many visits come from small city counties, such as
 * San Francisco, that would otherwise be a pixel or two.
 */
const SMALL = 40;
/** How close, in pixels, the pointer must come to a dot to read it. */
const DOT_REACH = 12;

const LEVELS: { id: Level; label: string; one: string; many: string }[] = [
  { id: 'states', label: 'States', one: 'state', many: 'states' },
  { id: 'counties', label: 'Counties', one: 'county', many: 'counties' },
];

/**
 * Lower bounds of up to five classes of visit counts. Visits pile up in a few
 * places, so the classes grow geometrically, rounded to 1, 2, 3, or 5 × 10ⁿ.
 */
function classBreaks(max: number) {
  if (max <= 5) return Array.from({ length: max }, (_, index) => index + 1);
  const bounds = [1];
  for (let step = 1; step < 5; step++) {
    const target = max ** (step / 5);
    const power = 10 ** Math.floor(Math.log10(target));
    const nearest = [1, 2, 3, 5, 10]
      .map((multiple) => multiple * power)
      .reduce((best, next) => (Math.abs(Math.log(next / target)) < Math.abs(Math.log(best / target)) ? next : best));
    if (nearest > bounds[bounds.length - 1] && nearest <= max) bounds.push(nearest);
  }
  return bounds;
}

/** Steps of the five-step ramp for each class, spread so neighbors differ most. */
const shades = (classes: number) =>
  classes === 1 ? [5] : Array.from({ length: classes }, (_, index) => 1 + Math.round((index * 4) / (classes - 1)));

function classOf(bounds: number[], value: number) {
  let index = bounds.length - 1;
  while (index > 0 && value < bounds[index]) index -= 1;
  return index;
}

function classLabel(bounds: number[], index: number, max: number) {
  const low = bounds[index];
  const high = index < bounds.length - 1 ? bounds[index + 1] - 1 : max;
  return low === high ? formatNumber(low) : `${formatNumber(low)}–${formatNumber(high)}`;
}

/** A county with its state, except the District of Columbia, which is both. */
function fullName(region: Region) {
  const { state } = region as Partial<County>;
  return state && state.name !== region.name ? `${region.name}, ${state.name}` : region.name;
}

function Choropleth({ atlas, level, values, total }: {
  atlas: Atlas;
  level: (typeof LEVELS)[number];
  values: Map<string, number>;
  total: number;
}) {
  const [active, setActive] = useState<Region | null>(null);
  const tableId = useId();
  const ranked = useMemo(
    () => (level.id === 'states' ? atlas.states : atlas.counties)
      .filter((region) => values.has(region.id))
      .sort((a, b) => values.get(b.id)! - values.get(a.id)! || a.name.localeCompare(b.name)),
    [atlas, level, values],
  );
  const dots = useMemo(() => ranked.filter((region) => region.area < SMALL), [ranked]);
  const max = ranked.length ? values.get(ranked[0].id)! : 0;
  const bounds = classBreaks(max);
  const steps = shades(bounds.length);
  const shade = (region: Region) => `shade-${steps[classOf(bounds, values.get(region.id)!)]}`;
  const placed = ranked.reduce((sum, region) => sum + values.get(region.id)!, 0);

  const onPointer = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const scale = box.width / atlas.width;
    const point: Point = [(event.clientX - box.left) / scale, (event.clientY - box.top) / scale];
    // A dot wins over the outlines around it, so a small place is easy to point at.
    let nearest: Region | undefined;
    let reach = DOT_REACH / scale;
    for (const dot of dots) {
      const away = Math.hypot(dot.centroid[0] - point[0], dot.centroid[1] - point[1]);
      if (away <= reach) {
        nearest = dot;
        reach = away;
      }
    }
    setActive(nearest ?? atlas.regionAt(point, level.id) ?? null);
  };

  // The arrow keys step through the places with visits, most visits first.
  const onKeyDown = (event: KeyboardEvent) => {
    const last = ranked.length - 1;
    const moves: Record<string, (index: number) => number> = {
      ArrowLeft: (index) => Math.max(0, index - 1),
      ArrowRight: (index) => Math.min(last, index + 1),
      Home: () => 0,
      End: () => last,
    };
    const move = moves[event.key];
    if (!move || last < 0) return;
    event.preventDefault();
    setActive((current) => ranked[move(current ? ranked.indexOf(current) : -1)]);
  };

  const value = active ? values.get(active.id) ?? 0 : 0;
  // Where the tooltip points, in percent of the map. It slides along so it
  // never overhangs the map, and opens downward near the top.
  const across = active ? (active.centroid[0] / atlas.width) * 100 : 0;
  const down = active ? (active.centroid[1] / atlas.height) * 100 : 0;
  const dotAt = ({ centroid: [cx, cy] }: Region) => `M${cx},${cy}h0`;

  return (
    <>
      <div className="map-frame">
        <div
          className="map-plot"
          role="group"
          tabIndex={ranked.length ? 0 : undefined}
          aria-label={`Map of visits by ${level.one}. Use the arrow keys to read each ${level.one} with visits, or open the table below.`}
          aria-describedby={ranked.length ? tableId : undefined}
          onKeyDown={onKeyDown}
          onFocus={(event) => {
            // A click already shows what's under the pointer.
            if (event.currentTarget.matches(':focus-visible')) setActive((current) => current ?? ranked[0] ?? null);
          }}
          onBlur={() => setActive(null)}
        >
          <svg
            viewBox={`0 0 ${atlas.width} ${atlas.height}`}
            aria-hidden="true"
            onPointerMove={onPointer}
            onPointerDown={onPointer}
            onPointerLeave={(event) => {
              // A tap leaves its place showing until the next one.
              if (event.pointerType !== 'touch') setActive(null);
            }}
          >
            <path className="map-land" d={atlas.land} />
            <g className={`map-fills map-${level.id}`}>
              {ranked.map((region) => <path key={region.id} className={shade(region)} d={region.path} />)}
            </g>
            <path className="map-borders" d={atlas.stateBorders} />
            {active && !dots.includes(active) && <path className="map-active" d={active.path} />}
            {dots.length > 0 && (
              // Zero-length strokes with round caps: dots that keep their size as the map scales.
              <g className="map-dots">
                <path className="ring" d={dots.map(dotAt).join('')} />
                {active && dots.includes(active) && <path className="ring active" d={dotAt(active)} />}
                {dots.map((region) => <path key={region.id} className={shade(region)} d={dotAt(region)} />)}
              </g>
            )}
          </svg>
          {active && (
            <div
              className="tooltip map-tooltip"
              role="status"
              style={{
                left: `${across}%`,
                top: `${down}%`,
                transform: `translate(-${across}%, ${down < 30 ? '0.6rem' : 'calc(-100% - 0.6rem)'})`,
              }}
            >
              <strong>{value ? plural(value, ['visit', 'visits']) : 'No visits'}</strong>
              <span>{fullName(active)}{value ? ` · ${formatPercent(value, total)}` : ''}</span>
            </div>
          )}
        </div>
      </div>

      <div className="map-key">
        <span>Visits per {level.one}</span>
        <ul className="map-legend">
          <li><span className="swatch" aria-hidden="true" />0</li>
          {bounds.map((bound, index) => (
            <li key={bound}><span className={`swatch shade-${steps[index]}`} aria-hidden="true" />{classLabel(bounds, index, max)}</li>
          ))}
        </ul>
        {dots.length > 0 && <p>Dots mark {level.many} too small to see.</p>}
        {total > placed && (
          <p>Not shown: {plural(total - placed, ['visit', 'visits'])} without a known {level.one}.</p>
        )}
      </div>

      {ranked.length > 0 && (
        <details className="table-view map-table" id={tableId}>
          <summary>Show as table</summary>
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th scope="col">{level.one[0].toUpperCase() + level.one.slice(1)}</th><th scope="col">Visits</th><th scope="col">Share</th></tr>
              </thead>
              <tbody>
                {ranked.map((region) => (
                  <tr key={region.id}>
                    <th scope="row">{fullName(region)}</th>
                    <td>{formatNumber(values.get(region.id)!)}</td>
                    <td>{formatPercent(values.get(region.id)!, total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </>
  );
}

export function UsMap({ atlas, visits }: { atlas: AtlasState; visits: Visit[] }) {
  const [level, setLevel] = useState(LEVELS[0]);
  const groupName = useId();
  const counts = useMemo(() => (typeof atlas === 'string' ? null : mapCounts(visits, atlas)), [atlas, visits]);
  const fromUs = useMemo(() => visits.filter((visit) => visit.location.countryCode === 'US').length, [visits]);

  return (
    <section className="card chart-card" aria-labelledby="map-heading">
      <div className="card-heading map-heading">
        <div>
          <h2 id="map-heading">United States</h2>
          <p>{fromUs ? `${plural(fromUs, ['visit', 'visits'])} · ${formatPercent(fromUs, visits.length)} of the total` : 'No visits from the United States in this period.'}</p>
        </div>
        <fieldset className="segmented">
          <legend className="sr-only">Map by</legend>
          {LEVELS.map((option) => (
            <label key={option.id}>
              <input type="radio" name={groupName} checked={option.id === level.id} onChange={() => setLevel(option)} />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>
      </div>
      {counts && typeof atlas !== 'string' ? (
        <Choropleth key={level.id} atlas={atlas} level={level} values={counts[level.id]} total={counts.total} />
      ) : (
        <div className="map-frame map-placeholder">
          <p>{atlas === 'error' ? 'The map didn’t load. Reload the page to try again.' : 'Loading the map…'}</p>
        </div>
      )}
    </section>
  );
}
