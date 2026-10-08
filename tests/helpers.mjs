import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createContext, Script } from 'node:vm';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));

// Execute the actual TypeScript modules with isolated browser/server boundaries.
// TypeScript is already a project dependency; no test-only bundler is needed.
export function loadTypeScript(path, { globals = {}, mocks = {} } = {}) {
  const context = createContext({
    console, URL, URLSearchParams, Request, Response, Headers, TextEncoder,
    Uint8Array, atob, crypto: webcrypto, Date, setTimeout, clearTimeout,
    ...globals,
  });
  const modules = new Map();
  function load(filename) {
    if (modules.has(filename)) return modules.get(filename).exports;
    const module = { exports: {} };
    modules.set(filename, module);
    const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
      fileName: filename,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    });
    const require = (specifier) => {
      if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
      if (!specifier.startsWith('.')) throw new Error(`Unmocked external dependency: ${specifier}`);
      const dependency = resolve(dirname(filename), specifier);
      return load(dependency.endsWith('.ts') ? dependency : `${dependency}.ts`);
    };
    new Script(`(function(require, module, exports) {\n${outputText}\n})`, { filename })
      .runInContext(context)(require, module, module.exports);
    return module.exports;
  }
  return load(resolve(root, path));
}

export function clock(start = Date.parse('2026-10-08T12:00:00Z')) {
  let now = start;
  return {
    Date: class extends Date { static now() { return now; } },
    now: () => now,
    advance: (ms) => { now += ms; },
  };
}

export function memoryStorage(entries = {}) {
  const values = new Map(Object.entries(entries));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, String(value)); },
    removeItem: (key) => { values.delete(key); },
  };
}

export function visit(overrides = {}) {
  return {
    id: 'first', visitor: '', seq: 1, js: true, start: 1000, end: 1000,
    ip: '192.0.2.1', location: {}, browser: 'Chrome', browserVersion: '130',
    os: 'Linux', device: 'desktop',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36',
    referrer: '', utm: {}, language: '', timeZone: '', screen: '', viewport: '',
    pages: [{ path: '/', title: '', at: 0 }], clicks: [], engagedMs: 0, maxScroll: 0,
    ...overrides,
  };
}
