import type { DeviceType } from '../../src/analytics/types';

const BOT = /bot\b|bot\/|crawl|spider|slurp|archiver|facebookexternalhit|embedly|preview|headless|lighthouse|pingdom|uptime|monitor|curl\/|wget\/|python-|httpx|aiohttp|okhttp|go-http|java\/|axios|node-fetch|undici|scrapy|phantomjs|puppeteer|playwright|selenium/i;

// Order matters: most browsers also claim to be Chrome, and Chrome claims Safari.
const BROWSERS: [string, RegExp][] = [
  ['LinkedIn app', /LinkedInApp(?:\/([\d.]+))?/],
  ['Facebook app', /FBAN|FBAV\/([\d.]+)/],
  ['Instagram app', /Instagram ([\d.]+)/],
  ['Edge', /Edg(?:e|A|iOS)?\/([\d.]+)/],
  ['Opera', /(?:OPR|Opera|OPT)\/([\d.]+)/],
  ['Samsung Internet', /SamsungBrowser\/([\d.]+)/],
  ['Vivaldi', /Vivaldi\/([\d.]+)/],
  ['DuckDuckGo', /DuckDuckGo\/([\d.]+)/],
  ['Firefox', /(?:Firefox|FxiOS)\/([\d.]+)/],
  ['Chrome', /(?:Chrome|CriOS)\/([\d.]+)/],
  ['Safari', /Version\/([\d.]+).*Safari\//],
];

const WINDOWS: Record<string, string> = { '10.0': '10 or 11', '6.3': '8.1', '6.2': '8', '6.1': '7' };

export function isBot(userAgent: string) {
  return !userAgent || BOT.test(userAgent);
}

export function parseUserAgent(ua: string): { browser: string; browserVersion: string; os: string; device: DeviceType } {
  let browser = 'Other';
  let browserVersion = '';
  for (const [name, pattern] of BROWSERS) {
    const match = pattern.exec(ua);
    if (match) {
      browser = name;
      browserVersion = (match[1] ?? '').split('.')[0];
      break;
    }
  }

  let os = 'Other';
  let match: RegExpExecArray | null;
  if ((match = /iPad.*? OS ([\d_]+)/.exec(ua))) os = `iPadOS ${match[1].split('_')[0]}`;
  else if ((match = /(?:iPhone|iPod).*? OS ([\d_]+)/.exec(ua))) os = `iOS ${match[1].split('_')[0]}`;
  else if ((match = /Android ([\d.]+)/.exec(ua))) os = `Android ${match[1].split('.')[0]}`;
  else if (/CrOS/.test(ua)) os = 'ChromeOS';
  else if ((match = /Windows NT ([\d.]+)/.exec(ua))) os = `Windows ${WINDOWS[match[1]] ?? match[1]}`;
  // macOS stopped reporting its real version in user agents at 10.15.
  else if (/Mac OS X|Macintosh/.test(ua)) os = 'macOS';
  else if (/Linux|X11/.test(ua)) os = 'Linux';

  let device: DeviceType = 'unknown';
  if (/iPad|Tablet|Kindle|Silk|Android(?!.*Mobile)/.test(ua)) device = 'tablet';
  else if (/Mobi|iPhone|iPod|Android|Windows Phone/.test(ua)) device = 'mobile';
  else if (os !== 'Other') device = 'desktop';

  return { browser, browserVersion, os, device };
}
