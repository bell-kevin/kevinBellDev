import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { ExternalLink, Search, X } from 'lucide-react';
import type { Visit } from '../analytics/types';
import type { VisitInsight } from './signals';
import {
  browserName,
  deviceName,
  flag,
  formatDateTime,
  formatDuration,
  formatLongDateTime,
  formatOffset,
  languageName,
  place,
  returnLabel,
  shortPlace,
  source,
  visitorKey,
} from './format';

const PAGE_SIZE = 50;
const REQUEST_HEADERS: [keyof NonNullable<Visit['request']>, string][] = [
  ['accept', 'Accept'],
  ['acceptLanguage', 'Accept-Language'],
  ['referer', 'Referer (requesting page)'],
  ['fetchDest', 'Sec-Fetch-Dest'],
  ['fetchMode', 'Sec-Fetch-Mode'],
  ['fetchSite', 'Sec-Fetch-Site'],
  ['fetchUser', 'Sec-Fetch-User'],
  ['clientUa', 'Sec-CH-UA'],
  ['clientPlatform', 'Sec-CH-UA-Platform'],
  ['clientMobile', 'Sec-CH-UA-Mobile'],
  ['purpose', 'Request purpose'],
];

function searchText(visit: Visit, insight?: VisitInsight) {
  return [
    place(visit),
    visit.location.countryCode,
    visit.location.postalCode,
    visit.ip,
    browserName(visit),
    visit.os,
    deviceName(visit),
    source(visit),
    visit.referrer,
    visit.visitor,
    visit.userAgent,
    visit.js ? 'JavaScript beacon' : 'Pixel request',
    insight?.traffic.label,
    insight?.traffic.headless ? 'Headless' : '',
    insight && returnLabel(insight.returning),
    ...(insight?.traffic.reasons ?? []),
    languageName(visit.language),
    ...Object.values(visit.utm),
    ...visit.clicks.map((click) => `${click.label} ${click.href}`),
  ].join(' ').toLowerCase();
}

export function VisitsList({ visits, visitCounts, insights, onOpen }: {
  visits: Visit[];
  visitCounts: Map<string, number>;
  insights: Map<string, VisitInsight>;
  onOpen: (visit: Visit) => void;
}) {
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE_SIZE);
  const searchId = useId();
  const index = useMemo(() => visits.map((visit) => [visit, searchText(visit, insights.get(visit.id))] as const), [visits, insights]);
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = terms.length ? index.filter(([, text]) => terms.every((term) => text.includes(term))).map(([visit]) => visit) : visits;

  return (
    <section className="card visits" aria-labelledby="visits-heading">
      <div className="card-heading visits-heading">
        <div>
          <h2 id="visits-heading">Visits</h2>
          <p>{matches.length === visits.length ? `${visits.length} in this view` : `${matches.length} of ${visits.length} match`} · Search filters this list only.</p>
        </div>
        <label className="search" htmlFor={searchId}>
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search visits</span>
          <input
            id={searchId}
            type="search"
            placeholder="Place, IP, browser, traffic signal…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setShown(PAGE_SIZE);
            }}
          />
        </label>
      </div>
      {matches.length === 0 ? (
        <p className="empty">{visits.length ? 'No visits match that search.' : 'No visits match this traffic filter and period.'}</p>
      ) : (
        <ul className="visits-list" role="list">
          {matches.slice(0, shown).map((visit) => {
            const visitsByVisitor = visitCounts.get(visitorKey(visit)) ?? 1;
            const insight = insights.get(visit.id);
            return (
              <li className="visit-entry" key={visit.id}>
                <dl className="visit-fields">
                  <Fact term="When">
                    <button type="button" className="text-button" onClick={() => onOpen(visit)}>{formatDateTime(visit.start)}</button>
                  </Fact>
                  <Fact term="Where"><span className="flag" aria-hidden="true">{flag(visit.location.countryCode)}</span> {shortPlace(visit)}</Fact>
                  <Fact term="IP address"><code>{visit.ip || 'Unknown'}</code></Fact>
                  <Fact term="Traffic">
                    <span className={`signal signal-${insight?.traffic.kind ?? 'unknown'}`} title={insight?.traffic.reasons.join(' ')}>{insight?.traffic.label ?? 'No automation signal'}</span>
                    {insight?.traffic.headless && <span className="signal signal-headless">Headless signal</span>}
                    <span className="cell-note">{visit.js ? 'JavaScript beacon' : 'Pixel request'}</span>
                  </Fact>
                  <Fact term="Return signal"><span title={insight?.returnReason}>{returnLabel(insight?.returning ?? 'unknown')}</span></Fact>
                  <Fact term="Browser">{browserName(visit)} <span className="muted">· {visit.os} · {deviceName(visit)}</span></Fact>
                  <Fact term="Source">{source(visit)}</Fact>
                  <Fact term="Time">{visit.js ? formatDuration(visit.engagedMs) : <span className="muted">Not measured</span>}</Fact>
                  <Fact term="Clicks">{visit.js ? visit.clicks.length : <span className="muted">Not measured</span>}</Fact>
                  <Fact term="Browser ID">
                    {visit.visitor ? (
                      <button type="button" className="chip" onClick={() => { setQuery(visit.visitor); setShown(PAGE_SIZE); }} title="Search this stored browser ID">
                        {visit.visitor.slice(0, 6)}
                        {visitsByVisitor > 1 && <span> · {visitsByVisitor} visits</span>}
                      </button>
                    ) : (
                      <span className="muted">Not available</span>
                    )}
                  </Fact>
                </dl>
              </li>
            );
          })}
        </ul>
      )}
      {matches.length > shown && (
        <button type="button" className="button button-secondary more" onClick={() => setShown(shown + PAGE_SIZE)}>
          Show {Math.min(PAGE_SIZE, matches.length - shown)} more
        </button>
      )}
    </section>
  );
}

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="fact">
      <dt>{term}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Outbound({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="outbound" href={href} target="_blank" rel="noopener noreferrer">
      {children} <ExternalLink size={13} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export function VisitDialog({ visit, related, insight, onOpen, onClose }: {
  visit: Visit | null;
  related: Visit[];
  insight?: VisitInsight;
  onOpen: (visit: Visit) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (visit && !element.open) element.showModal();
    if (!visit && element.open) element.close();
    element.querySelector('.dialog-body')?.scrollTo(0, 0);
  }, [visit]);

  const events = visit
    ? [
        ...visit.pages.map((page) => ({ at: page.at, kind: 'page' as const, text: page.title || page.path, detail: page.path })),
        ...visit.clicks.map((click) => ({ at: click.at, kind: 'click' as const, text: click.label || click.href, detail: `${click.href} · ${click.section}` })),
      ].sort((a, b) => a.at - b.at)
    : [];
  const { latitude, longitude } = visit?.location ?? {};
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
  const utm = visit ? Object.entries(visit.utm) : [];

  return (
    <dialog
      ref={dialog}
      className="visit-dialog"
      aria-labelledby="visit-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialog.current) dialog.current.close();
      }}
    >
      {visit && (
        <div className="dialog-body">
          <div className="dialog-header">
            <div>
              <p className="eyebrow">{visit.js ? 'JavaScript visit' : 'Pixel request'}</p>
              <h2 id="visit-title">{formatLongDateTime(visit.start)}</h2>
            </div>
            <button type="button" className="icon-button" onClick={() => dialog.current?.close()} aria-label="Close">
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <div className="visit-signals">
            <h3>Traffic assessment</h3>
            <p><span className={`signal signal-${insight?.traffic.kind ?? 'unknown'}`}>{insight?.traffic.label ?? 'No automation signal'}</span></p>
            {insight?.traffic.reasons.length ? <ul className="signal-reasons">{insight.traffic.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : <p className="measurement-note">No affirmative automation evidence was recorded. This does not establish that a person visited.</p>}
            <p className="measurement-note">User agents and browser reports can be spoofed. These are evidence-based labels, not calibrated probabilities or verified crawler identities.</p>
            <dl className="facts">
              <Fact term="Headless browser">{insight?.traffic.headless ? 'Headless signal detected' : 'Unknown — no affirmative headless signal'}</Fact>
              <Fact term="Return signal">{returnLabel(insight?.returning ?? 'unknown')}<div className="muted">{insight?.returnReason ?? 'No return information recorded.'}</div></Fact>
            </dl>
          </div>

          {!visit.js && <p className="notice">The tracking pixel was requested. This may be a browser with JavaScript disabled, a crawler, or a direct request. Time, scroll depth, clicks, screen size, and a stored browser ID are not measured by the pixel.</p>}

          <dl className="facts">
            <Fact term="Location">
              <span className="flag" aria-hidden="true">{flag(visit.location.countryCode)}</span> {place(visit)}
              {visit.location.postalCode && <span className="muted"> · {visit.location.postalCode}</span>}
              {hasCoordinates && (
                <div>
                  <Outbound href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=11/${latitude}/${longitude}`}>Map</Outbound>
                  <span className="muted"> · approximate, from the IP address</span>
                </div>
              )}
            </Fact>
            <Fact term="Network">
              <code>{visit.ip || 'Unknown'}</code>
              {visit.ip && <div><Outbound href={`https://ipinfo.io/${encodeURIComponent(visit.ip)}`}>Who owns this address</Outbound></div>}
            </Fact>
            <Fact term="Recorded time on page">
              {visit.js ? `${formatDuration(visit.engagedMs)} visible` : 'Not measured'}
              {visit.js && <span className="muted"> · scrolled {visit.maxScroll}%</span>}
              {visit.end > visit.start && <div className="muted">Last heard from at {formatDateTime(visit.end)}</div>}
            </Fact>
            <Fact term="Referral source">
              {visit.referrer ? <span className="break">{visit.referrer}</span> : source(visit)}
              {utm.map(([key, value]) => <div key={key} className="muted">utm_{key}: {value}</div>)}
            </Fact>
            <Fact term="Browser">{browserName(visit)} on {visit.os}</Fact>
            <Fact term="Device">
              {deviceName(visit)}
              {visit.screen && <span className="muted"> · screen {visit.screen}</span>}
              {visit.viewport && <span className="muted"> · window {visit.viewport}</span>}
            </Fact>
            <Fact term={visit.js ? 'Reported language' : 'Preferred request language'}>{languageName(visit.language)} {visit.language && <span className="muted">({visit.language})</span>}</Fact>
            <Fact term="Time zone">
              {visit.timeZone || visit.location.timezone || 'Unknown'}
              {visit.timeZone && visit.location.timezone && visit.timeZone !== visit.location.timezone && (
                <div className="muted">The IP address points to {visit.location.timezone} (VPN or travel?)</div>
              )}
            </Fact>
          </dl>

          <h3>Recorded activity</h3>
          {visit.js && <p className="measurement-note">Time and clicks reflect received JavaScript updates. Missing updates can leave the recorded activity incomplete.</p>}
          {events.length ? (
            <ol className="timeline">
              {events.map((event, index) => (
                <li key={index} className={event.kind}>
                  <span className="offset">{formatOffset(event.at)}</span>
                  <span>
                    <strong>{event.kind === 'page' ? `${visit.js ? 'Opened' : 'Pixel requested for'} ${event.text}` : `Clicked “${event.text}”`}</strong>
                    <small className="break">{event.detail}</small>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted">Nothing recorded beyond the request.</p>
          )}

          <h3>Browser identity</h3>
          {visit.visitor ? (
            <>
              <p className="muted">
                Stored browser ID <code>{visit.visitor}</code>. It identifies a browser profile, not a person, and can change when storage is cleared or unavailable. {related.length > 1 ? `${related.length} visits in this period:` : 'No other visits with this ID in this period.'}
              </p>
              {related.length > 1 && (
                <ul className="related">
                  {related.map((other) => (
                    <li key={other.id}>
                      {other.id === visit.id ? (
                        <span aria-current="true">{formatDateTime(other.start)} (this visit)</span>
                      ) : (
                        <button type="button" className="text-button" onClick={() => onOpen(other)}>{formatDateTime(other.start)}</button>
                      )}
                      <span className="muted"> · {other.js ? `${formatDuration(other.engagedMs)} · ${other.clicks.length} recorded clicks` : 'Pixel; activity not measured'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="muted">No stored browser ID was recorded. A matching IP address and user agent can suggest a repeat request, but shared networks, proxies, and browser defaults mean it cannot establish the same browser or person.</p>
          )}

          <h3>User agent</h3>
          <p><code className="break">{visit.userAgent || 'None sent'}</code></p>

          <h3>Request evidence</h3>
          <p className="measurement-note">Selected request headers, stored with length limits. Missing values are unknown; older visits may have no saved headers. A pixel’s Referer usually identifies the page containing the pixel, not how the visitor originally found the site.</p>
          {visit.request && Object.values(visit.request).some(Boolean) ? (
            <dl className="facts request-facts">
              {REQUEST_HEADERS.map(([key, label]) => visit.request?.[key] ? <Fact key={key} term={label}><code>{visit.request[key]}</code></Fact> : null)}
            </dl>
          ) : <p className="muted">No request headers recorded.</p>}
        </div>
      )}
    </dialog>
  );
}
