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

// City, state or region, country, country code, time zone, latitude, longitude,
// postal code. An empty city, region, or postal code is unknown, as when a
// visitor can only be placed in a country.
const PLACES: Weighted<[string, string, string, string, string, number, number, string]> = [
  [['Salt Lake City', 'Utah', 'United States', 'US', 'America/Denver', 40.76, -111.89, '84101'], 14],
  [['Ogden', 'Utah', 'United States', 'US', 'America/Denver', 41.22, -111.97, '84401'], 8],
  [['Provo', 'Utah', 'United States', 'US', 'America/Denver', 40.23, -111.66, '84601'], 4],
  [['Lehi', 'Utah', 'United States', 'US', 'America/Denver', 40.39, -111.85, '84043'], 3],
  [['Seattle', 'Washington', 'United States', 'US', 'America/Los_Angeles', 47.61, -122.33, '98101'], 6],
  [['Arlington', 'Virginia', 'United States', 'US', 'America/New_York', 38.88, -77.1, '22201'], 6],
  [['Austin', 'Texas', 'United States', 'US', 'America/Chicago', 30.27, -97.74, '78701'], 4],
  [['San Francisco', 'California', 'United States', 'US', 'America/Los_Angeles', 37.77, -122.42, '94103'], 5],
  [['Denver', 'Colorado', 'United States', 'US', 'America/Denver', 39.74, -104.99, '80202'], 3],
  [['Boise', 'Idaho', 'United States', 'US', 'America/Boise', 43.62, -116.2, '83702'], 2],
  [['Chicago', 'Illinois', 'United States', 'US', 'America/Chicago', 41.88, -87.63, '60601'], 3],
  [['New York', 'New York', 'United States', 'US', 'America/New_York', 40.75, -74.0, '10001'], 3],
  [['Boston', 'Massachusetts', 'United States', 'US', 'America/New_York', 42.36, -71.06, '02108'], 2],
  [['Raleigh', 'North Carolina', 'United States', 'US', 'America/New_York', 35.78, -78.64, '27601'], 2],
  [['Kansas City', 'Missouri', 'United States', 'US', 'America/Chicago', 39.1, -94.58, '64105'], 1],
  [['Kansas City', 'Kansas', 'United States', 'US', 'America/Chicago', 39.11, -94.63, '66101'], 1],
  [['Miami', 'Florida', 'United States', 'US', 'America/New_York', 25.76, -80.19, '33130'], 1],
  [['Honolulu', 'Hawaii', 'United States', 'US', 'Pacific/Honolulu', 21.31, -157.86, '96813'], 1],
  [['Anchorage', 'Alaska', 'United States', 'US', 'America/Anchorage', 61.22, -149.9, '99501'], 1],
  [['', '', 'United States', 'US', 'America/Chicago', 37.751, -97.822, ''], 2],
  [['Bengaluru', 'Karnataka', 'India', 'IN', 'Asia/Kolkata', 12.97, 77.59, '560001'], 5],
  [['Berlin', 'Berlin', 'Germany', 'DE', 'Europe/Berlin', 52.52, 13.4, '10115'], 4],
  [['London', 'England', 'United Kingdom', 'GB', 'Europe/London', 51.51, -0.13, 'EC1A'], 4],
  [['Toronto', 'Ontario', 'Canada', 'CA', 'America/Toronto', 43.65, -79.38, 'M5H'], 3],
  [['Mexico City', 'Mexico City', 'Mexico', 'MX', 'America/Mexico_City', 19.43, -99.13, '06000'], 3],
  [['Madrid', 'Madrid', 'Spain', 'ES', 'Europe/Madrid', 40.42, -3.7, '28013'], 2],
  [['São Paulo', 'São Paulo', 'Brazil', 'BR', 'America/Sao_Paulo', -23.55, -46.63, '01000'], 2],
  [['Amsterdam', 'North Holland', 'Netherlands', 'NL', 'Europe/Amsterdam', 52.37, 4.9, '1012'], 2],
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
    const [city, region, country, countryCode, timezone, latitude, longitude, postalCode] = person.place;
    const [browser, browserVersion, os, device, screen, userAgent] = person.client;
    const js = next() > 0.03;
    const engagedMs = js ? Math.round(Math.exp(2.5 + next() * 3.2) * 1000) : 0;
    const clicks: LinkClick[] = [];
    for (let c = 0; js && c < 4 && next() < 0.45; c++) clicks.push({ ...pick(LINKS), at: Math.round(next() * engagedMs) });
    const referrer = pick(REFERRERS);
    const utm = referrer.includes('linkedin') && next() < 0.3 ? { source: 'linkedin', medium: 'social', campaign: 'profile' } : {};
    const timeZone = next() < 0.95 ? timezone : 'UTC';
    visits.push({
      id: `${Math.floor(at).toString(36)}-demo${i.toString(36).padStart(8, '0')}`,
      visitor: js ? person.id : '',
      seq: js ? 3 : 0,
      js,
      start: Math.floor(at),
      end: Math.floor(at + (js ? engagedMs + 2000 : 0)),
      ip: `198.51.100.${(i * 7) % 250}`,
      location: { city: city || undefined, region: region || undefined, country, countryCode, postalCode: postalCode || undefined, timezone, latitude, longitude },
      browser,
      browserVersion,
      os,
      device,
      userAgent,
      referrer: js ? referrer : '',
      utm: js ? utm : {},
      language: js ? person.language : '',
      timeZone: js ? timeZone : '',
      screen: js ? screen : '',
      viewport: js ? screen.replace(/x(\d+)/, (_, h) => `x${Number(h) - 120}`) : '',
      pages: [{ path: '/', title: js ? 'Kevin Bell' : '', at: 0 }],
      clicks: clicks.sort((a, b) => a.at - b.at),
      engagedMs,
      maxScroll: js ? Math.min(100, Math.round(30 + next() * 80)) : 0,
    });
  }

  // Keep representative evidence visible in every range, including Today.
  // Documentation IP ranges avoid associating example activity with real users.
  const example = (index: number, changes: Partial<Visit>): Visit => {
    const at = Math.max(from, Math.min(now, to - 1) - (index + 1) * 60_000);
    return {
      ...visits[0],
      id: `${Math.floor(at).toString(36)}-signal-demo-${index}`,
      visitor: '',
      seq: 0,
      js: false,
      start: at,
      end: at + (changes.engagedMs ?? 0),
      ip: `203.0.113.${index + 1}`,
      browser: 'Chrome',
      browserVersion: '140',
      os: 'Windows 10 or 11',
      device: 'desktop',
      userAgent: CLIENTS[0][0][5],
      referrer: '',
      language: 'en-US',
      utm: {},
      timeZone: '',
      screen: '',
      viewport: '',
      pages: [{ path: '/', title: '', at: 0 }],
      clicks: [],
      engagedMs: 0,
      maxScroll: 0,
      request: { accept: 'image/avif,image/webp,image/*,*/*;q=0.8', acceptLanguage: 'en-US,en;q=0.9', referer: 'https://kevinbell.dev/', fetchDest: 'image', fetchMode: 'no-cors', fetchSite: 'cross-site', clientPlatform: '"Windows"', clientMobile: '?0' },
      ...changes,
    };
  };
  visits.push(
    example(0, { userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', browser: 'Googlebot', browserVersion: '2.1', os: 'Unknown', device: 'unknown' }),
    example(1, { js: true, visitor: 'headless-demo-browser', userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/140.0.0.0 Safari/537.36', os: 'Linux', automation: { webdriver: true }, request: { accept: '*/*', fetchDest: 'empty', fetchMode: 'cors', fetchSite: 'cross-site' } }),
    example(2, { userAgent: '', browser: 'Unknown', browserVersion: '', os: 'Unknown', device: 'unknown', request: { accept: '*/*' }, language: '' }),
    example(3, {}),
    example(4, { js: true, visitor: 'return-demo-browser', returning: true, engagedMs: 38_000, maxScroll: 75, screen: '1920x1080', viewport: '1920x960', ip: '2001:db8:1234:5678:abcd:1234:5678:9012', request: { accept: '*/*', acceptLanguage: 'en-US,en;q=0.9', fetchDest: 'empty', fetchMode: 'cors', fetchSite: 'cross-site' } }),
    example(5, { ip: '203.0.113.80' }),
    example(6, { ip: '203.0.113.80' }),
    example(7, { js: true, visitor: 'return-demo-browser', returning: false, engagedMs: 65_000, maxScroll: 100, screen: '1920x1080', viewport: '1920x960', request: { accept: '*/*', acceptLanguage: 'en-US,en;q=0.9', fetchDest: 'empty', fetchMode: 'cors', fetchSite: 'cross-site' } }),
    example(8, { request: undefined }),
  );

  return {
    viewer: { login: 'bell-kevin' },
    from,
    to,
    visits: visits.filter((visit) => visit.start >= from && visit.start < to).sort((a, b) => b.start - a.start),
  };
}
