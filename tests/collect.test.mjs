import assert from 'node:assert/strict';
import test from 'node:test';
import { clock, loadTypeScript } from './helpers.mjs';

function collector({ owner = false } = {}) {
  const time = clock();
  const records = new Map();
  let revision = 0;
  const store = {
    getWithMetadata: async (key) => records.get(key) ?? null,
    setJSON: async (key, value, condition) => {
      const current = records.get(key);
      if (condition?.onlyIfNew && current) return { modified: false };
      if (condition?.onlyIfMatch && condition.onlyIfMatch !== current?.etag) return { modified: false };
      records.set(key, { data: JSON.parse(JSON.stringify(value)), etag: String(++revision) });
      return { modified: true };
    },
  };
  const { default: handler } = loadTypeScript('netlify/functions/collect.ts', {
    globals: { Date: time.Date },
    mocks: {
      '../../src/analytics/origin': { REMOTE_HOSTS: ['reporting.example'] },
      '../lib/session': { readSession: async () => owner ? { login: 'owner' } : null },
      '../lib/visits': { visitStore: () => store, visitKey: (id) => id },
    },
  });
  const beacon = (changes = {}) => ({
    v: 1, id: `${time.now().toString(36)}-0123456789abcdef`, visitor: '0123456789abcdefabcd',
    seq: 1, returning: false, automation: { webdriver: false }, pages: [], clicks: [],
    ...changes,
  });
  const send = ({ method = 'GET', headers = {}, body } = {}) => handler(new Request('https://stats.example/api/collect', {
    method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }), { ip: '192.0.2.1', geo: { city: 'Boise', country: { code: 'US', name: 'United States' } } });
  return { send, beacon, records, time, visits: () => [...records.values()].map(({ data }) => data) };
}

test('pixel requests retain bots and useful bounded request evidence without sensitive headers', async () => {
  const app = collector();
  const response = await app.send({ headers: {
    'user-agent': 'Googlebot/2.1',
    accept: 'a'.repeat(600), 'accept-language': 'en-US,en;q=0.9',
    referer: 'https://reporting.example/work?private=query',
    'sec-fetch-dest': 'image', 'sec-fetch-mode': 'no-cors', 'sec-fetch-site': 'cross-site',
    'sec-fetch-user': '?1', 'sec-ch-ua': '"Chromium";v="130"',
    'sec-ch-ua-platform': '"Linux"', 'sec-ch-ua-mobile': '?0', 'sec-purpose': 'prefetch',
    cookie: 'secret-cookie', authorization: 'Bearer secret-token', 'x-private': 'secret-extra',
  } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/gif');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const [visit] = app.visits();
  assert.equal(visit.js, false);
  assert.equal(visit.userAgent, 'Googlebot/2.1');
  assert.equal(visit.ip, '192.0.2.1');
  assert.equal(visit.language, 'en-US');
  assert.equal(visit.request.accept.length, 500);
  assert.equal(visit.request.fetchDest, 'image');
  assert.equal(visit.request.clientPlatform, '"Linux"');
  assert.equal(visit.request.purpose, 'prefetch');
  assert.equal(visit.request.referer, 'https://reporting.example/work?private=query');
  assert.equal(visit.referrer, '');
  assert.deepEqual(visit.pages, [{ path: '/work', title: '', at: 0 }]);
  assert.doesNotMatch(JSON.stringify(visit), /secret-cookie|secret-token|secret-extra|authorization/);
});

test('pixel requests without a trusted page referrer leave the visited page unknown', async () => {
  for (const referer of [undefined, 'not a URL', 'https://unrelated.example/work']) {
    const app = collector();
    await app.send({ headers: referer ? { referer } : {} });
    const [visit] = app.visits();
    assert.equal(visit.userAgent, '');
    assert.equal(visit.visitor, '');
    assert.equal(visit.referrer, '');
    assert.deepEqual(visit.pages, []);
  }
});

test('beacons accept only boolean return and automation evidence', async () => {
  for (const value of [true, false, 'true', 'false', 1, null, {}, []]) {
    const app = collector();
    const response = await app.send({ method: 'POST', body: app.beacon({ returning: value, automation: { webdriver: value, secret: 'discard' } }) });
    assert.equal(response.status, 204);
    const [visit] = app.visits();
    if (typeof value === 'boolean') {
      assert.equal(visit.returning, value);
      assert.deepEqual(visit.automation, { webdriver: value });
    } else {
      assert.equal(visit.returning, undefined);
      assert.equal(visit.automation, undefined);
    }
  }
});

test('later and reordered beacons preserve first-visit status and positive automation evidence', async () => {
  const app = collector();
  const first = app.beacon({ returning: false, automation: { webdriver: true }, engagedMs: 100, maxScroll: 40 });
  await app.send({ method: 'POST', body: first, headers: { 'user-agent': 'First UA', 'sec-fetch-site': 'same-origin' } });
  app.time.advance(1000);
  await app.send({ method: 'POST', body: { ...first, seq: 3, returning: true, automation: { webdriver: false }, engagedMs: 300, maxScroll: 60 }, headers: { 'user-agent': 'Later UA' } });
  await app.send({ method: 'POST', body: { ...first, seq: 2, engagedMs: 999, maxScroll: 100 } });
  const [visit] = app.visits();
  assert.equal(visit.seq, 3);
  assert.equal(visit.returning, false);
  assert.equal(visit.automation.webdriver, true);
  assert.equal(visit.userAgent, 'First UA');
  assert.equal(visit.request.fetchSite, 'same-origin');
  assert.equal(visit.engagedMs, 300);
  assert.equal(visit.maxScroll, 60);
});

test('an automation signal on a later beacon is retained when subsequent legacy beacons omit it', async () => {
  const app = collector();
  const first = app.beacon({ returning: undefined, automation: undefined });
  for (const body of [first, { ...first, seq: 2, automation: { webdriver: true } }, { ...first, seq: 3 }]) {
    await app.send({ method: 'POST', body });
  }
  assert.equal(app.visits()[0].automation.webdriver, true);
  assert.equal(app.visits()[0].returning, undefined);
});

test('privacy and owner opt-outs still skip both pixel and beacon storage', async () => {
  for (const options of [{ headers: { dnt: '1' } }, { headers: { 'sec-gpc': '1' } }, { owner: true }]) {
    const app = collector(options);
    const pixel = await app.send({ headers: options.headers });
    const beacon = await app.send({ method: 'POST', headers: options.headers, body: app.beacon() });
    assert.equal(pixel.status, 200);
    assert.equal(beacon.status, 204);
    assert.equal(app.records.size, 0);
  }
});

test('recording additional automation evidence does not bypass beacon origin validation', async () => {
  const app = collector();
  const response = await app.send({ method: 'POST', headers: { origin: 'https://unrelated.example' }, body: app.beacon({ automation: { webdriver: true } }) });
  assert.equal(response.status, 403);
  assert.equal(app.records.size, 0);
});
