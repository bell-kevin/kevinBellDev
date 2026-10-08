import type { Visit } from '../analytics/types';

export interface TrafficSignal {
  kind: 'automated' | 'possible' | 'unknown';
  label: string;
  reasons: string[];
  headless: boolean;
}

export interface VisitInsight {
  traffic: TrafficSignal;
  returning: 'returning' | 'first-observed' | 'possible' | 'unknown';
  returnReason: string;
}

// Explicit software identifiers are strong evidence of automation, not proof
// of the operator's identity. Anyone can spoof headers or a client beacon.
const CRAWLER = /Googlebot|GoogleOther|Google-InspectionTool|bingbot|BingPreview|Applebot|DuckDuckBot|Baiduspider|YandexBot|Sogou.*spider|Slurp|GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|Claude-User|Claude-SearchBot|anthropic-ai|PerplexityBot|Perplexity-User|CCBot|Bytespider|PetalBot|AhrefsBot|SemrushBot|MJ12bot|DotBot|facebookexternalhit|meta-externalagent|Twitterbot|LinkedInBot|Slackbot|Discordbot|TelegramBot|archive\.org_bot|ia_archiver/i;
const TOOL = /(?:curl|wget|python-requests|python-urllib|httpx|aiohttp|Go-http-client|node-fetch|undici|axios|Scrapy|Lighthouse|Pingdom|UptimeRobot|Site24x7|PhantomJS|Puppeteer|Playwright|Selenium)(?:\b|\/)/i;
const HEADLESS = /HeadlessChrome|HeadlessFirefox|PhantomJS/i;
// A hardware name such as CUBOT in an Android UA is not a bot identifier.
const POSSIBLE_BOT = /\bbot\b|[a-z][a-z0-9_-]*bot\/|crawl|spider|archiver|headless|monitor|preview|okhttp|java\//i;

/** Explainable rules only: these labels are not calibrated probabilities. */
export function classifyTraffic(visit: Visit): TrafficSignal {
  const ua = visit.userAgent ?? '';
  const reasons: string[] = [];
  const headless = HEADLESS.test(ua) || HEADLESS.test(visit.request?.clientUa ?? '');
  if (headless) reasons.push('The user agent or client hint explicitly identifies a headless browser.');
  if (visit.automation?.webdriver === true) reasons.push('The browser reports navigator.webdriver = true (automation control).');
  const crawler = CRAWLER.exec(ua);
  if (crawler) reasons.push(`The user agent identifies a crawler or preview fetcher (${crawler[0]}). Its operator has not been verified.`);
  const tool = TOOL.exec(ua);
  if (tool) reasons.push(`The user agent identifies an automated tool or HTTP client (${tool[0]}).`);
  if (reasons.length) {
    return { kind: 'automated', label: 'High-confidence automation', reasons, headless };
  }

  if (!ua.trim()) reasons.push('No user agent was sent. Privacy tools and custom clients can also omit it.');
  else if (POSSIBLE_BOT.test(ua)) reasons.push('The user agent contains a possible automation identifier, without a recognized tool or crawler signature.');
  if (!visit.js && visit.request?.fetchDest && visit.request.fetchDest !== 'image') {
    reasons.push(`The pixel was requested as “${visit.request.fetchDest}”, rather than as an image. A direct human request is also possible.`);
  }
  if (reasons.length) return { kind: 'possible', label: 'Possible automation', reasons, headless };

  return {
    kind: 'unknown',
    label: 'No automation signal',
    reasons: ['No recognized automation signal was recorded. This does not establish that a person visited.'],
    headless,
  };
}

/**
 * Evaluate the full loaded range before applying UI filters. Only an earlier
 * visit establishes a return; later visits never relabel the first one.
 * Network matches remain tentative and never merge browser identities.
 */
export function visitInsights(visits: Visit[]): Map<string, VisitInsight> {
  const insights = new Map<string, VisitInsight>();
  const firstBrowser = new Map<string, number>();
  const firstNetwork = new Map<string, number>();
  for (const visit of [...visits].sort((a, b) => a.start - b.start || a.id.localeCompare(b.id))) {
    const browser = visit.visitor;
    const network = visit.ip && visit.userAgent?.trim() ? JSON.stringify([visit.ip, visit.userAgent]) : '';
    const earlierBrowser = browser ? firstBrowser.get(browser) : undefined;
    const earlierNetwork = network ? firstNetwork.get(network) : undefined;
    let returning: VisitInsight['returning'] = 'unknown';
    let returnReason = 'No saved browser identity is available. Return visits cannot be established.';

    if (browser) {
      if (earlierBrowser !== undefined && earlierBrowser < visit.start) {
        returning = 'returning';
        returnReason = 'An earlier visit in this period has the same saved browser ID.';
      } else if (visit.returning === true) {
        returning = 'returning';
        returnReason = 'Browser storage remembers an earlier visit, which may be outside this period.';
      } else {
        returning = 'first-observed';
        returnReason = visit.returning === false
          ? 'First visit observed with this browser’s saved marker. Clearing storage or using another browser starts over.'
          : 'First visit with this browser ID in this period. Earlier history is unknown.';
      }
    } else if (earlierNetwork !== undefined && earlierNetwork < visit.start) {
      returning = 'possible';
      returnReason = 'An earlier request in this period shares this IP address and user agent. Shared networks, proxies, and bots can match; this is not a confirmed returning visitor.';
    }

    insights.set(visit.id, { traffic: classifyTraffic(visit), returning, returnReason });
    if (browser && earlierBrowser === undefined) firstBrowser.set(browser, visit.start);
    if (network && earlierNetwork === undefined) firstNetwork.set(network, visit.start);
  }
  return insights;
}
