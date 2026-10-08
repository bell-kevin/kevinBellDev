import assert from 'node:assert/strict';
import test from 'node:test';
import { clock, loadTypeScript, memoryStorage } from './helpers.mjs';

const VISITOR_KEY = 'kevinbell-visitor';
const LAST_VISIT_KEY = 'kevinbell-last-visit';
const VISIT_KEY = 'kevinbell-visit';

function browser({ local = memoryStorage(), session = memoryStorage(), time = clock(), webdriver = false, navigator: nav = {}, href = 'https://portfolio.example/' } = {}) {
  const beacons = [];
  const listeners = new Map();
  const addEventListener = (name, listener) => {
    listeners.set(name, [...(listeners.get(name) ?? []), listener]);
  };
  const window = { localStorage: local, sessionStorage: session, scrollY: 0, innerWidth: 1280, innerHeight: 800, addEventListener };
  const document = {
    referrer: '', title: 'Kevin Bell', visibilityState: 'visible',
    documentElement: { scrollHeight: 1600 }, addEventListener,
  };
  const location = new URL(href);
  const { startTracking } = loadTypeScript('src/analytics/tracker.ts', {
    globals: {
      window, document, Date: time.Date, location,
      history: { state: null, replaceState: (_state, _title, url) => { location.href = String(url); } },
      screen: { width: 1920, height: 1080 },
      navigator: { language: 'en-US', webdriver, sendBeacon: (_url, data) => { beacons.push(JSON.parse(data)); return true; }, ...nav },
    },
    mocks: { './origin': { statsOrigin: () => 'https://stats.example' } },
  });
  startTracking();
  return {
    beacons, local, session, time, location,
    visibility(state) {
      document.visibilityState = state;
      for (const listener of listeners.get('visibilitychange') ?? []) listener();
    },
  };
}

test('fresh browser, same-tab reload, and later new-tab visits preserve the correct return status', () => {
  const first = browser();
  const initial = first.beacons[0];
  assert.equal(initial.returning, false);
  assert.ok(initial.visitor);
  assert.equal(first.local.getItem(LAST_VISIT_KEY), initial.id);
  first.time.advance(1000);
  const reload = browser(first);
  assert.equal(reload.beacons[0].id, initial.id);
  assert.equal(reload.beacons[0].visitor, initial.visitor);
  assert.equal(reload.beacons[0].returning, false);
  const nextTab = browser({ local: first.local, time: first.time });
  assert.notEqual(nextTab.beacons[0].id, initial.id);
  assert.equal(nextTab.beacons[0].visitor, initial.visitor);
  assert.equal(nextTab.beacons[0].returning, true);
});

test('returning to an idle tab starts a new returning visit', () => {
  const tab = browser();
  const firstId = tab.beacons[0].id;
  tab.visibility('hidden');
  tab.time.advance(31 * 60 * 1000);
  tab.visibility('visible');
  const last = tab.beacons.at(-1);
  assert.notEqual(last.id, firstId);
  assert.equal(last.returning, true);
});

test('clearing storage while a tab is idle starts a fresh browser identity', () => {
  const tab = browser();
  const originalVisitor = tab.beacons[0].visitor;
  tab.visibility('hidden');
  tab.local.removeItem(VISITOR_KEY);
  tab.local.removeItem(LAST_VISIT_KEY);
  tab.time.advance(31 * 60 * 1000);
  tab.visibility('visible');
  const last = tab.beacons.at(-1);
  assert.ok(last.visitor);
  assert.notEqual(last.visitor, originalVisitor);
  assert.equal(last.returning, false);
});

test('storage becoming blocked while a tab is idle does not reuse its old browser identity', () => {
  const tab = browser();
  tab.visibility('hidden');
  tab.local.getItem = () => { throw new Error('Blocked'); };
  tab.local.setItem = () => { throw new Error('Blocked'); };
  tab.time.advance(31 * 60 * 1000);
  tab.visibility('visible');
  const last = tab.beacons.at(-1);
  assert.equal(last.visitor, '');
  assert.equal(Object.hasOwn(last, 'returning'), false);
});

test('a pre-existing browser ID without a visit marker has unknown return history', () => {
  const local = memoryStorage({ [VISITOR_KEY]: '0123456789abcdefabcd' });
  const first = browser({ local });
  assert.equal(Object.hasOwn(first.beacons[0], 'returning'), false);
  const next = browser({ local });
  assert.equal(next.beacons[0].returning, true);
});

test('reloading a legacy saved visit leaves its return history unknown and records a marker for future visits', () => {
  const first = browser();
  const saved = JSON.parse(first.session.getItem(VISIT_KEY));
  delete saved.returning;
  first.session.setItem(VISIT_KEY, JSON.stringify(saved));
  first.local.removeItem(LAST_VISIT_KEY);
  const reload = browser(first);
  assert.equal(reload.beacons[0].id, saved.id);
  assert.equal(Object.hasOwn(reload.beacons[0], 'returning'), false);
  assert.equal(first.local.getItem(LAST_VISIT_KEY), saved.id);
  const next = browser({ local: first.local });
  assert.equal(next.beacons[0].returning, true);
});

test('blocked or nonpersisting browser storage cannot produce a saved identity or return label', () => {
  const blocked = { getItem: () => { throw new Error('Blocked'); }, setItem: () => { throw new Error('Blocked'); } };
  const nonpersisting = { getItem: () => null, setItem: () => {} };
  for (const local of [blocked, nonpersisting]) {
    const tab = browser({ local, session: blocked });
    assert.equal(tab.beacons[0].visitor, '');
    assert.equal(Object.hasOwn(tab.beacons[0], 'returning'), false);
    tab.visibility('hidden');
    tab.time.advance(31 * 60 * 1000);
    tab.visibility('visible');
    assert.equal(Object.hasOwn(tab.beacons.at(-1), 'returning'), false);
  }
});

test('webdriver evidence preserves true and false while missing browser support remains unknown', () => {
  assert.equal(browser({ webdriver: true }).beacons[0].automation.webdriver, true);
  assert.equal(browser({ webdriver: false }).beacons[0].automation.webdriver, false);
  assert.equal(Object.hasOwn(browser({ navigator: { webdriver: undefined } }).beacons[0], 'automation'), false);
});

test('privacy and owner opt-outs prevent browser beacons and identity creation', () => {
  for (const nav of [{ doNotTrack: '1' }, { globalPrivacyControl: true }]) {
    const tab = browser({ navigator: nav });
    assert.equal(tab.beacons.length, 0);
    assert.equal(tab.local.getItem(VISITOR_KEY), null);
  }
  assert.equal(browser({ local: memoryStorage({ 'kevinbell-stats-owner': '1' }) }).beacons.length, 0);
});

test('owner opt-out enabled after startup stops subsequent browser beacons', () => {
  const tab = browser();
  assert.equal(tab.beacons.length, 1);
  tab.local.setItem('kevinbell-stats-owner', '1');
  tab.visibility('hidden');
  tab.time.advance(31 * 60 * 1000);
  tab.visibility('visible');
  assert.equal(tab.beacons.length, 1);
});

test('an owner URL flag skips tracking even when storage cannot remember the opt-out', () => {
  const blocked = { getItem: () => { throw new Error('Blocked'); }, setItem: () => { throw new Error('Blocked'); } };
  const nonpersisting = { getItem: () => null, setItem: () => {} };
  for (const local of [blocked, nonpersisting]) {
    const tab = browser({ local, href: 'https://portfolio.example/?stats-owner=1&other=kept' });
    assert.equal(tab.beacons.length, 0);
    assert.equal(tab.location.searchParams.has('stats-owner'), false);
    assert.equal(tab.location.searchParams.get('other'), 'kept');
  }
});
