import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTypeScript, visit } from './helpers.mjs';

const { classifyTraffic, visitInsights } = loadTypeScript('src/stats/signals.ts');

test('explicit crawler, tool, and headless identifiers carry explainable strong evidence', () => {
  for (const userAgent of ['Googlebot/2.1', 'GPTBot/1.0', 'curl/8.5.0', 'python-requests/2.32', 'HeadlessChrome/130.0']) {
    const result = classifyTraffic(visit({ userAgent }));
    assert.equal(result.kind, 'automated', userAgent);
    assert.ok(result.reasons.length > 0, userAgent);
    assert.equal(result.headless, userAgent.includes('Headless'), userAgent);
  }
});

test('weak signatures and missing UA are possible automation, without invented certainty', () => {
  for (const userAgent of ['', 'ExampleCrawler/1.0', 'UnrecognizedBot/3']) {
    assert.equal(classifyTraffic(visit({ userAgent })).kind, 'possible', userAgent);
  }
});

test('ordinary browsers and browser apps are not classified as strong automation', () => {
  const browser = visit().userAgent;
  for (const userAgent of [browser, `${browser} WhatsApp/2.24.19.86`, `${browser} Instagram 351.0.0.0`,
    'Mozilla/5.0 (Linux; Android 10; CUBOT NOTE 20) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36']) {
    assert.equal(classifyTraffic(visit({ userAgent })).kind, 'unknown', userAgent);
  }
});

test('pixel-only collection and absent historical headers do not establish automation', () => {
  for (const request of [undefined, {}, { fetchDest: 'image' }]) {
    const result = classifyTraffic(visit({ js: false, request }));
    assert.equal(result.kind, 'unknown');
    assert.equal(result.headless, false);
  }
  assert.equal(classifyTraffic(visit({ js: false, request: { fetchDest: 'document' } })).kind, 'possible');
});

test('webdriver is an automation signal only when true and does not imply headless', () => {
  const controlled = classifyTraffic(visit({ automation: { webdriver: true } }));
  assert.equal(controlled.kind, 'automated');
  assert.equal(controlled.headless, false);
  assert.match(controlled.reasons.join(' '), /webdriver/);
  assert.equal(classifyTraffic(visit({ automation: { webdriver: false } })).kind, 'unknown');
});

test('a headless client hint is evidence even if the user agent looks ordinary', () => {
  const result = classifyTraffic(visit({ request: { clientUa: '"Chromium";v="130", "HeadlessChrome";v="130"' } }));
  assert.equal(result.kind, 'automated');
  assert.equal(result.headless, true);
});

test('return detection sorts chronology without mutating input or relabeling a first visit', () => {
  const first = visit({ id: 'first', visitor: 'browser1', start: 1000 });
  const last = visit({ id: 'last', visitor: 'browser1', start: 2000 });
  const input = [last, first];
  const result = visitInsights(input);
  assert.equal(result.get('first').returning, 'first-observed');
  assert.equal(result.get('last').returning, 'returning');
  assert.equal(input[0], last);
});

test('simultaneous timestamps are not evidence of an earlier visit', () => {
  const input = [
    visit({ id: 'a', visitor: 'browser1' }),
    visit({ id: 'b', visitor: 'browser1' }),
    visit({ id: 'c' }),
  ];
  const result = visitInsights(input);
  assert.equal(result.get('a').returning, 'first-observed');
  assert.equal(result.get('b').returning, 'first-observed');
  assert.equal(result.get('c').returning, 'unknown');
});

test('shared IP and UA never merge distinct saved browser IDs', () => {
  const result = visitInsights([
    visit({ id: 'a', visitor: 'browser1', start: 1000 }),
    visit({ id: 'b', visitor: 'browser2', start: 2000 }),
    visit({ id: 'c', visitor: '', start: 3000 }),
  ]);
  assert.equal(result.get('b').returning, 'first-observed');
  assert.equal(result.get('c').returning, 'possible');
  assert.match(result.get('c').returnReason, /not a confirmed returning visitor/);
});

test('network matches need both IP and UA and remain only possible returns', () => {
  for (const identity of [{ ip: '' }, { userAgent: '' }, { userAgent: ' ' }]) {
    const result = visitInsights([visit({ id: 'a', ...identity }), visit({ id: 'b', start: 2000, ...identity })]);
    assert.equal(result.get('b').returning, 'unknown');
  }
  const result = visitInsights([
    visit({ id: 'a', js: false }), visit({ id: 'b', js: false, start: 2000 }),
    visit({ id: 'c', userAgent: 'Other browser', start: 3000 }),
  ]);
  assert.equal(result.get('b').returning, 'possible');
  assert.equal(result.get('c').returning, 'unknown');
});

test('a persisted return marker remains true when the earlier visit is outside the loaded range', () => {
  const first = visit({ id: 'first', visitor: 'browser1', returning: false, start: 1000 });
  const returning = visit({ id: 'returning', visitor: 'browser1', returning: true, start: 2000 });
  assert.equal(visitInsights([first, returning]).get('returning').returning, 'returning');
  assert.equal(visitInsights([returning]).get('returning').returning, 'returning');
  assert.equal(visitInsights([first]).get('first').returning, 'first-observed');
  assert.equal(visitInsights([visit({ returning: true })]).get('first').returning, 'unknown');
});
