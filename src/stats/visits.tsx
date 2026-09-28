import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { ExternalLink, Search, X } from 'lucide-react';
import type { Visit } from '../analytics/types';
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
  shortPlace,
  source,
  visitorKey,
} from './format';

const PAGE_SIZE = 50;

function searchText(visit: Visit) {
  return [
    place(visit),
    visit.location.countryCode,
    visit.ip,
    browserName(visit),
    visit.os,
    deviceName(visit),
    source(visit),
    visit.referrer,
    visit.visitor,
    languageName(visit.language),
    ...Object.values(visit.utm),
    ...visit.clicks.map((click) => `${click.label} ${click.href}`),
  ].join(' ').toLowerCase();
}

export function VisitsTable({ visits, visitCounts, onOpen }: {
  visits: Visit[];
  visitCounts: Map<string, number>;
  onOpen: (visit: Visit) => void;
}) {
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE_SIZE);
  const searchId = useId();
  const index = useMemo(() => visits.map((visit) => [visit, searchText(visit)] as const), [visits]);
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = terms.length ? index.filter(([, text]) => terms.every((term) => text.includes(term))).map(([visit]) => visit) : visits;

  return (
    <section className="card visits" aria-labelledby="visits-heading">
      <div className="card-heading visits-heading">
        <div>
          <h2 id="visits-heading">Visits</h2>
          <p>{matches.length === visits.length ? `${visits.length} in this period` : `${matches.length} of ${visits.length} match`}</p>
        </div>
        <label className="search" htmlFor={searchId}>
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search visits</span>
          <input
            id={searchId}
            type="search"
            placeholder="Place, IP, browser, source, visitor…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setShown(PAGE_SIZE);
            }}
          />
        </label>
      </div>
      {matches.length === 0 ? (
        <p className="empty">{visits.length ? 'No visits match that search.' : 'No visits in this period yet.'}</p>
      ) : (
        <div className="table-scroll">
          <table className="visits-table">
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Where</th>
                <th scope="col">Browser</th>
                <th scope="col">Source</th>
                <th scope="col" className="number">Time</th>
                <th scope="col" className="number">Clicks</th>
                <th scope="col">Visitor</th>
              </tr>
            </thead>
            <tbody>
              {matches.slice(0, shown).map((visit) => {
                const visitsByVisitor = visitCounts.get(visitorKey(visit)) ?? 1;
                return (
                  <tr key={visit.id}>
                    <th scope="row">
                      <button type="button" className="text-button" onClick={() => onOpen(visit)}>{formatDateTime(visit.start)}</button>
                    </th>
                    <td><span className="flag" aria-hidden="true">{flag(visit.location.countryCode)}</span> {shortPlace(visit)}</td>
                    <td>{browserName(visit)} <span className="muted">· {visit.os} · {deviceName(visit)}</span></td>
                    <td>{source(visit)}</td>
                    <td className="number">{visit.js ? formatDuration(visit.engagedMs) : '—'}</td>
                    <td className="number">{visit.clicks.length}</td>
                    <td>
                      {visit.visitor ? (
                        <button type="button" className="chip" onClick={() => { setQuery(visit.visitor); setShown(PAGE_SIZE); }} title="Show only this visitor">
                          {visit.visitor.slice(0, 6)}
                          {visitsByVisitor > 1 && <span> · {visitsByVisitor} visits</span>}
                        </button>
                      ) : (
                        <span className="muted">{visit.js ? '—' : 'No JavaScript'}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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

export function VisitDialog({ visit, related, onOpen, onClose }: {
  visit: Visit | null;
  related: Visit[];
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
              <p className="eyebrow">{visit.js ? 'Visit' : 'Visit without JavaScript'}</p>
              <h2 id="visit-title">{formatLongDateTime(visit.start)}</h2>
            </div>
            <button type="button" className="icon-button" onClick={() => dialog.current?.close()} aria-label="Close">
              <X size={20} aria-hidden="true" />
            </button>
          </div>

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
            <Fact term="Time on page">
              {visit.js ? `${formatDuration(visit.engagedMs)} visible` : 'Not measured'}
              {visit.js && <span className="muted"> · scrolled {visit.maxScroll}%</span>}
              {visit.end > visit.start && <div className="muted">Last heard from at {formatDateTime(visit.end)}</div>}
            </Fact>
            <Fact term="Came from">
              {visit.referrer ? <span className="break">{visit.referrer}</span> : source(visit)}
              {utm.map(([key, value]) => <div key={key} className="muted">utm_{key}: {value}</div>)}
            </Fact>
            <Fact term="Browser">{browserName(visit)} on {visit.os}</Fact>
            <Fact term="Device">
              {deviceName(visit)}
              {visit.screen && <span className="muted"> · screen {visit.screen}</span>}
              {visit.viewport && <span className="muted"> · window {visit.viewport}</span>}
            </Fact>
            <Fact term="Language">{languageName(visit.language)} {visit.language && <span className="muted">({visit.language})</span>}</Fact>
            <Fact term="Time zone">
              {visit.timeZone || visit.location.timezone || 'Unknown'}
              {visit.timeZone && visit.location.timezone && visit.timeZone !== visit.location.timezone && (
                <div className="muted">The IP address points to {visit.location.timezone} (VPN or travel?)</div>
              )}
            </Fact>
          </dl>

          <h3>What they did</h3>
          {events.length ? (
            <ol className="timeline">
              {events.map((event, index) => (
                <li key={index} className={event.kind}>
                  <span className="offset">{formatOffset(event.at)}</span>
                  <span>
                    <strong>{event.kind === 'page' ? `Opened ${event.text}` : `Clicked “${event.text}”`}</strong>
                    <small className="break">{event.detail}</small>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted">Nothing recorded beyond the page load.</p>
          )}

          <h3>Visitor</h3>
          {visit.visitor ? (
            <>
              <p className="muted">
                Browser id <code>{visit.visitor}</code>, kept in the visitor's local storage. {related.length > 1 ? `${related.length} visits in this period:` : 'No other visits in this period.'}
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
                      <span className="muted"> · {formatDuration(other.engagedMs)} · {other.clicks.length} clicks</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="muted">Browsers without JavaScript can't be told apart between visits.</p>
          )}

          <h3>User agent</h3>
          <p><code className="break">{visit.userAgent || 'None sent'}</code></p>
        </div>
      )}
    </dialog>
  );
}
