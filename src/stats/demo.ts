// Sample visits for working on the stats page with `vite dev`, which has no
// Netlify Functions. Only loaded in development (see StatsApp.tsx).
import type { DeviceType, LinkClick, StatsResponse, Visit } from '../analytics/types';

function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Weighted<T> = [T, number][];

const PLACES: Weighted<[string, string, string, string, string, number, number]> = [
  [['Salt Lake City', 'Utah', 'United States', 'US', 'America/Denver', 40.76, -111.89], 14],
  [['Ogden', 'Utah', 'United States', 'US', 'America/Denver', 41.22, -111.97], 8],
  [['Seattle', 'Washington', 'United States', 'US', 'America/Los_Angeles', 47.61, -122.33], 6],
  [['Arlington', 'Virginia', 'United States', 'US', 'America/New_York', 38.88, -77.1], 6],
  [['Austin', 'Texas', 'United States', 'US', 'America/Chicago', 30.27, -97.74], 4],
  [['San Francisco', 'California', 'United States', 'US', 'America/Los_Angeles', 37.77, -122.42], 5],
  [['Bengaluru', 'Karnataka', 'India', 'IN', 'Asia/Kolkata', 12.97, 77.59], 5],
  [['Berlin', 'Berlin', 'Germany', 'DE', 'Europe/Berlin', 52.52, 13.4], 4],
  [['London', 'England', 'United Kingdom', 'GB', 'Europe/London', 51.51, -0.13], 4],
  [['Toronto', 'Ontario', 'Canada', 'CA', 'America/Toronto', 43.65, -79.38], 3],
  [['Mexico City', 'Mexico City', 'Mexico', 'MX', 'America/Mexico_City', 19.43, -99.13], 3],
  [['Madrid', 'Madrid', 'Spain', 'ES', 'Europe/Madrid', 40.42, -3.7], 2],
  [['São Paulo', 'São Paulo', 'Brazil', 'BR', 'America/Sao_Paulo', -23.55, -46.63], 2],
  [['Amsterdam', 'North Holland', 'Netherlands', 'NL', 'Europe/Amsterdam', 52.37, 4.9], 2],
];

const CLIENTS: Weighted<[string, string, string, DeviceType, string, string]> = [
  [['Chrome', '140', 'Windows 10 or 11', 'desktop', '1920x1080', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'], 24],
  [['Safari', '18', 'iOS 18', 'mobile', '393x852', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1'], 16],
  [['Chrome', '140', 'macOS', 'desktop', '1512x982', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'], 12],
  [['Firefox', '143', 'Linux', 'desktop', '2560x1440', 'Mozilla/5.0 (X11; Linux x86_64; rv:143.0) Gecko/20100101 Firefox/143.0'], 9],
  [['Edge', '140', 'Windows 10 or 11', 'desktop', '1920x1080', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0'], 8],
  [['Chrome', '140', 'Android 15', 'mobile', '412x915', 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'], 8],
  [['LinkedIn app', '9', 'iOS 18', 'mobile', '393x852', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]/9.31.1'], 5],
  [['Safari', '18', 'iPadOS 18', 'tablet', '1024x1366', 'Mozilla/5.0 (iPad; CPU OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1'], 2],
];

const REFERRERS: Weighted<string> = [
  ['', 30],
  ['https://www.linkedin.com/', 22],
  ['https://github.com/bell-kevin', 16],
  ['https://www.google.com/', 14],
  ['https://duckduckgo.com/', 5],
  ['https://www.bing.com/', 3],
  ['android-app://com.linkedin.android/', 4],
  ['https://news.ycombinator.com/', 2],
];

const LINKS: Weighted<Omit<LinkClick, 'at'>> = [
  [{ href: 'https://github.com/bell-kevin', label: 'GitHub', section: 'about' }, 18],
  [{ href: 'https://www.linkedin.com/in/kev-bell/', label: 'LinkedIn', section: 'about' }, 14],
  [{ href: '#contact', label: 'Get in touch', section: 'about' }, 8],
  [{ href: '#skills', label: 'Skills', section: 'header' }, 9],
  [{ href: '#skills', label: 'Explore my skills', section: 'about' }, 6],
  [{ href: 'mailto:kevinBell@Linux.com', label: 'kevinBell@Linux.com Send me an email', section: 'contact' }, 5],
  [{ href: 'https://github.com/bell-kevin', label: 'GitHub Code and projects', section: 'contact' }, 4],
  [{ href: 'https://www.linkedin.com/in/kev-bell/', label: 'LinkedIn Experience and volunteering', section: 'contact' }, 4],
  [{ href: 'https://github.com/bell-kevin', label: 'Find me on GitHub', section: 'footer' }, 2],
];

const LANGUAGES: Weighted<string> = [['en-US', 30], ['en-GB', 5], ['es-MX', 3], ['de-DE', 3], ['en-IN', 4], ['pt-BR', 1], ['nl-NL', 1]];

export function demoStats(from: number, to: number): StatsResponse {
  const next = random(65);
  const pick = <T,>(options: Weighted<T>) => {
    let roll = next() * options.reduce((sum, [, weight]) => sum + weight, 0);
    for (const [value, weight] of options) if ((roll -= weight) < 0) return value;
    return options[0][0];
  };

  const now = Date.now();
  const start = now - 400 * 86_400_000;
  const visitors = Array.from({ length: 260 }, (_, i) => ({
    id: `${Math.floor(next() * 36 ** 8).toString(36).padStart(8, '0')}demo${i.toString(36).padStart(4, '0')}`,
    place: pick(PLACES),
    client: pick(CLIENTS),
    language: pick(LANGUAGES),
  }));

  const visits: Visit[] = [];
  for (let i = 0; i < 1400; i++) {
    // More visits recently, and more during the visitor's daytime.
    const age = Math.pow(next(), 1.6) * (now - start);
    const at = now - age;
    const person = visitors[Math.floor(Math.pow(next(), 1.7) * visitors.length)];
    const [city, region, country, countryCode, timezone, latitude, longitude] = person.place;
    const [browser, browserVersion, os, device, screen, userAgent] = person.client;
    const js = next() > 0.03;
    const engagedMs = js ? Math.round(Math.exp(2.5 + next() * 3.2) * 1000) : 0;
    const clicks: LinkClick[] = [];
    for (let c = 0; js && c < 4 && next() < 0.45; c++) clicks.push({ ...pick(LINKS), at: Math.round(next() * engagedMs) });
    const referrer = pick(REFERRERS);
    visits.push({
      id: `${Math.floor(at).toString(36)}-demo${i.toString(36).padStart(8, '0')}`,
      visitor: js ? person.id : '',
      seq: 3,
      js,
      start: Math.floor(at),
      end: Math.floor(at + engagedMs + 2000),
      ip: `198.51.100.${(i * 7) % 250}`,
      location: { city, region, country, countryCode, timezone, latitude, longitude },
      browser,
      browserVersion,
      os,
      device,
      userAgent,
      referrer,
      utm: referrer.includes('linkedin') && next() < 0.3 ? { source: 'linkedin', medium: 'social', campaign: 'profile' } : {},
      language: person.language,
      timeZone: next() < 0.95 ? timezone : 'UTC',
      screen: js ? screen : '',
      viewport: js ? screen.replace(/x(\d+)/, (_, h) => `x${Number(h) - 120}`) : '',
      pages: [{ path: '/', title: 'Kevin Bell', at: 0 }],
      clicks: clicks.sort((a, b) => a.at - b.at),
      engagedMs,
      maxScroll: js ? Math.min(100, Math.round(30 + next() * 80)) : 0,
    });
  }

  return {
    viewer: { login: 'bell-kevin' },
    from,
    to,
    visits: visits.filter((visit) => visit.start >= from && visit.start < to).sort((a, b) => b.start - a.start),
  };
}
