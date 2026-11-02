import type { IncomingHttpHeaders, IncomingMessage } from 'node:http';
import { createRejectionCounter } from '@repo/machine-log';
import { z } from 'zod';

// The desktop app, or a web App on this computer on any port. A browser attaches one of these to every CORS request and every WebSocket upgrade, and a page cannot write another page's.
const AllowedOrigin = z.union([
  z.literal('app://app'),
  z.string().regex(/^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/),
]);

const originPattern = /^[a-z][a-z\d+.-]*:\/\/[^/?#]*/i;

const headerExcerptLength = 100;

// What a request has to show for itself; the socket it arrived on is no part of it.
export type ProvingRequest = Pick<IncomingMessage, 'headers' | 'url'>;

// What a Connection shows for itself: the Origin of the page that opened it, and the token its caller sent, which on a WebSocket arrives in the connection's parameters rather than a header.
export interface ProvingConnection {
  readonly origin: string | undefined;
  readonly token: string | undefined;
}

export interface RequestGuardDeps {
  // Whether this is a token the Server issued: the user token in `~/.argo/control.token`, or a Session's own (ADR-0044).
  readonly recognisesToken: (token: string | undefined) => boolean;
}

export interface RequestGuard {
  // Whether a plain-HTTP request proved it comes from the Server Device, the only Device the loopback door serves.
  allowsRequest: (request: ProvingRequest) => boolean;
  // Whether a WebSocket Connection proved the same, once its parameters have arrived.
  allowsConnection: (connection: ProvingConnection) => boolean;
  // Whether this is an Origin the Server answers, which is what a CORS answer is addressed to.
  allowsOrigin: (origin: string) => boolean;
  // Whether an upgrade may complete at all. It proves nothing; `allowsConnection` decides who the Connection is.
  allowsHandshake: (origin: IncomingHttpHeaders['origin']) => boolean;
  report: (subject: string, value: string | undefined) => void;
}

/*
 * What a caller on the loopback plain-HTTP door has to prove before it is served, now that arriving on that door proves nothing: a web page on a name that resolves to this computer arrives on it too (#1696).
 * Two things prove the Server Device. A token the Server issued, which lives in a file only a process on this computer can read (ADR-0044), and which the `argo` CLI, an Agent and the desktop App's own main process send. Or, for the App's own browser page, which has no such file, an Origin the Server serves, which a browser writes itself and no page can forge.
 * The `Host` allowlist that used to sit here is gone and stays gone: it matched spellings of this computer's address, which is not an identity (ADR-0045).
 */
const allowsOrigin = (origin: string | undefined): boolean =>
  AllowedOrigin.safeParse(origin).success;

export function createRequestGuard(deps: RequestGuardDeps): RequestGuard {
  const report = createReporter();

  return {
    allowsRequest: (request) =>
      proves(deps, request) || refuse(report, request),
    allowsConnection: (connection) =>
      provesConnection(deps, connection) ||
      refuseConnection(report, connection),
    allowsOrigin,
    allowsHandshake: (origin) => handshakeAllowed(report, origin),
    report,
  };
}

// A browser sends Origin on every upgrade, so a page elsewhere is turned away here whatever name it dialled. An upgrade with no Origin is no page at all, and is left to prove itself by token.
const handshakeAllowed = (
  report: RequestGuard['report'],
  origin: string | undefined,
): boolean =>
  origin === undefined || allowsOrigin(origin) || refuseOrigin(report, origin);

function proves(deps: RequestGuardDeps, { headers }: ProvingRequest): boolean {
  if (deps.recognisesToken(bearerToken(headers))) return true;

  if (headers.origin !== undefined) return allowsOrigin(headers.origin);

  return loadedByAnAppPage(headers);
}

// A Connection carries no media load, so the two proofs are all it has: the token its caller sent, or the Origin of the page that opened it.
function provesConnection(
  deps: RequestGuardDeps,
  { origin, token }: ProvingConnection,
): boolean {
  return deps.recognisesToken(token) || allowsOrigin(origin);
}

export const bearerToken = (headers: IncomingHttpHeaders): string | undefined =>
  headers.authorization?.replace(/^Bearer /, '');

/*
 * A media load — an `<img>`, a video, a Plugin asset — is not a CORS request, so a browser sends no `Origin` on it, and a page has no token to send instead.
 * What a browser does attach is the page the load came from, which a page cannot write either. A `Referer` whose origin this Server serves is the App's own page; the desktop App's main process attaches the user token to these loads instead, so a renderer never has to be taken on trust.
 * `Sec-Fetch-Site: cross-site` is deliberately not a proof: every site on the web is cross-site to this Server, so taking it would let any page load a Blob or a Plugin asset, and `<script src>` run one in its own page.
 */
function loadedByAnAppPage(headers: IncomingHttpHeaders): boolean {
  return allowsOrigin(refererOrigin(headers.referer));
}

// The scheme and host as the browser wrote them. `new URL()` is no use here: it reports a null origin for a scheme it does not know, and `app://app` is the desktop App's own.
function refererOrigin(referer: string | undefined): string | undefined {
  if (referer === undefined) return undefined;

  return originPattern.exec(referer)?.[0];
}

// A refused request is reported by what it did send: the Origin of the page that asked, or the route it asked for when no page owns up to it.
function refuse(
  report: RequestGuard['report'],
  { headers, url }: ProvingRequest,
): false {
  if (headers.origin !== undefined) return refuseOrigin(report, headers.origin);
  report('unproved request', url);

  return false;
}

function refuseConnection(
  report: RequestGuard['report'],
  { origin }: ProvingConnection,
): false {
  if (origin !== undefined) return refuseOrigin(report, origin);
  report('unproved Connection', 'no Origin and no token');

  return false;
}

function refuseOrigin(report: RequestGuard['report'], origin: string): false {
  report('Origin', origin);

  return false;
}

function createReporter(): RequestGuard['report'] {
  const rejections = createRejectionCounter('engine');

  return (subject, value): void => {
    rejections.report(
      `rejected ${subject} ${JSON.stringify(value?.slice(0, headerExcerptLength))}`,
    );
  };
}
