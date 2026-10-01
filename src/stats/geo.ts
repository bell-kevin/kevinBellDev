// State and county outlines for the stats page's map and its county breakdown.
// Loaded on demand (see StatsApp.tsx): the outlines are about 250 kB compressed.
//
// The outlines come from the us-atlas package: the Census Bureau's 2017
// cartographic county boundaries, already projected into a 975×610 viewport.
// Netlify's geolocation has no county, so a visit's county is the one holding
// the coordinates recorded with it.
import { geoAlbersUsa, geoPath } from 'd3-geo';
import type { MultiPolygon, Polygon, Position } from 'geojson';
import { feature, mesh } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import atlasUrl from 'us-atlas/counties-albers-10m.json?url';
import type { Visit } from '../analytics/types';

/** The projection us-atlas used, so coordinates land on its outlines. */
const projection = geoAlbersUsa().scale(1300).translate([487.5, 305]);
const path = geoPath();

/**
 * How far, in viewport units (about 5 km each), coordinates may sit outside
 * every outline and still count for the nearest county. The outlines are
 * simplified, so a coastal city's coordinates can fall just offshore.
 */
const TOLERANCE = 4;

export type Point = [number, number];
export type Level = 'states' | 'counties';

export interface Region {
  /** FIPS code: two digits for a state, five for a county. */
  id: string;
  name: string;
  /** SVG path data in the 975×610 viewport. */
  readonly path: string;
  readonly centroid: Point;
  /** In square viewport units. */
  readonly area: number;
}

export interface County extends Region {
  state: Region;
}

export interface Atlas {
  /** The viewport the outlines were projected into. */
  width: number;
  height: number;
  states: Region[];
  counties: County[];
  land: string;
  stateBorders: string;
  /** The state or county under a point in the viewport. */
  regionAt: (point: Point, level: Level) => Region | undefined;
  stateOf: (visit: Visit) => Region | undefined;
  countyOf: (visit: Visit) => County | undefined;
}

interface Shape<T extends Region> {
  region: T;
  rings: Position[][];
  box: [number, number, number, number];
}

/** Path data and the rest are worked out when first drawn: most counties never are. */
function createRegion(id: string, name: string, geometry: Polygon | MultiPolygon): Region {
  let data: string | undefined;
  let centroid: Point | undefined;
  let area: number | undefined;
  return {
    id,
    name,
    get path() {
      return (data ??= path(geometry) ?? '');
    },
    get centroid() {
      return (centroid ??= path.centroid(geometry));
    },
    get area() {
      return (area ??= path.area(geometry));
    },
  };
}

function shape<T extends Region>(region: T, geometry: Polygon | MultiPolygon): Shape<T> {
  const [[x0, y0], [x1, y1]] = path.bounds(geometry);
  return {
    region,
    rings: geometry.type === 'Polygon' ? geometry.coordinates : geometry.coordinates.flat(),
    box: [x0, y0, x1, y1],
  };
}

/** Even-odd ray casting, so a point in a hole is outside. */
function contains(rings: Position[][], [x, y]: Point) {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

function distance(rings: Position[][], [x, y]: Point) {
  let nearest = Infinity;
  for (const ring of rings) {
    for (let i = 1; i < ring.length; i++) {
      const [ax, ay] = ring[i - 1];
      const dx = ring[i][0] - ax;
      const dy = ring[i][1] - ay;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
      nearest = Math.min(nearest, Math.hypot(x - ax - t * dx, y - ay - t * dy));
    }
  }
  return nearest;
}

/** The region holding a point, or with a tolerance, the nearest one within it. */
function find<T extends Region>(shapes: Shape<T>[], [x, y]: Point, tolerance = 0) {
  const near = shapes.filter(({ box: [x0, y0, x1, y1] }) =>
    x >= x0 - tolerance && x <= x1 + tolerance && y >= y0 - tolerance && y <= y1 + tolerance);
  const inside = near.find((candidate) => contains(candidate.rings, [x, y]));
  if (inside || !tolerance) return inside?.region;
  let best: Shape<T> | undefined;
  let bestDistance = tolerance;
  for (const candidate of near) {
    const away = distance(candidate.rings, [x, y]);
    if (away <= bestDistance) {
      best = candidate;
      bestDistance = away;
    }
  }
  return best?.region;
}

// us-atlas names counties without their kind. Louisiana has parishes, Alaska
// boroughs and census areas, and Maryland, Missouri, Nevada, and Virginia have
// independent cities, numbered from 500.
const CITY_STATES = new Set(['24', '29', '32', '51']);

function countyName(id: string, name: string) {
  const state = id.slice(0, 2);
  if (state === '02' || state === '11') return name;
  if (state === '22') return `${name} Parish`;
  if (CITY_STATES.has(state) && Number(id.slice(2)) >= 500) return name.endsWith(' City') ? name : `${name} city`;
  return `${name} County`;
}

type Outlines = GeometryCollection<{ name: string }>;

export function buildAtlas(topology: Topology): Atlas {
  const objects = topology.objects as Record<'nation' | 'states' | 'counties', Outlines>;
  const outlines = (collection: Outlines) =>
    feature(topology, collection).features.map((outline) => ({
      id: String(outline.id),
      name: outline.properties.name,
      geometry: outline.geometry as Polygon | MultiPolygon,
    }));

  const stateShapes = outlines(objects.states).map(({ id, name, geometry }) => shape(createRegion(id, name, geometry), geometry));
  const statesById = new Map(stateShapes.map(({ region }) => [region.id, region]));
  const statesByName = new Map(stateShapes.map(({ region }) => [region.name, region]));
  const countyShapes = outlines(objects.counties).map(({ id, name, geometry }) => {
    const county: County = Object.assign(createRegion(id, countyName(id, name), geometry), { state: statesById.get(id.slice(0, 2))! });
    return shape(county, geometry);
  });
  const countiesByState = new Map<string, Shape<County>[]>();
  for (const county of countyShapes) {
    const list = countiesByState.get(county.region.state.id);
    if (list) list.push(county);
    else countiesByState.set(county.region.state.id, [county]);
  }

  const found = new Map<string, County | undefined>();
  const countyOf = (visit: Visit) => {
    const { countryCode, region, city, postalCode, latitude, longitude } = visit.location;
    // Without a city or ZIP code, the coordinates are the middle of a state or
    // of the country, which says nothing about the county.
    if (countryCode !== 'US' || !(city || postalCode) || typeof latitude !== 'number' || typeof longitude !== 'number') return undefined;
    const key = `${latitude},${longitude},${region}`;
    if (!found.has(key)) {
      const point = projection([longitude, latitude]);
      // Search the state Netlify reported, so the county always agrees with it.
      const state = region ? statesByName.get(region) : undefined;
      const candidates = state ? countiesByState.get(state.id) ?? [] : countyShapes;
      found.set(key, point ? find(candidates, point as Point, TOLERANCE) : undefined);
    }
    return found.get(key);
  };

  return {
    width: 975,
    height: 610,
    states: stateShapes.map(({ region }) => region),
    counties: countyShapes.map(({ region }) => region),
    land: path(feature(topology, objects.nation)) ?? '',
    stateBorders: path(mesh(topology, objects.states, (a, b) => a !== b)) ?? '',
    regionAt: (point, level) => find(level === 'states' ? stateShapes : countyShapes, point),
    stateOf: (visit) => {
      if (visit.location.countryCode !== 'US') return undefined;
      const { region } = visit.location;
      return (region ? statesByName.get(region) : undefined) ?? countyOf(visit)?.state;
    },
    countyOf,
  };
}

export async function loadAtlas() {
  const response = await fetch(atlasUrl);
  if (!response.ok) throw new Error(`The map outlines answered ${response.status}.`);
  return buildAtlas((await response.json()) as Topology);
}
