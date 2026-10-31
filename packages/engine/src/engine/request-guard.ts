import type { IncomingHttpHeaders, IncomingMessage } from 'node:http';
import { createRejectionCounter } from '@repo/machine-log';
import { z } from 'zod';

// The desktop app, or a web App on this computer on any port. A browser attaches one of these to every CORS request and every WebSocket upgrade, and a page cannot write another page's.
const AllowedOrigin = z.union([
  z.literal('app://app'),
  z.string().regex(/^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/),
]);

const headerExcerptLength = 100;

// What a request has to show for itself; the socket it arrived on is no part of it.
export type ProvingRequest = Pick<IncomingMessage, 'headers' | 'url'>;

export interface RequestGuardDeps {
  // Whether this is a token the Server issued: the user token in `~/.argo/control.token`, or a Session's own (ADR-0044).
  readonly recognisesToken: (token: string | undefined) => boolean;
}

export interface RequestGuard {
  // Whether a plain-HTTP request proved it comes from the Server Device, the only Device the loopback door serves.
  allowsRequest: (request: ProvingRequest) => boolean;
  // Whether this is an Origin the Server answers, which is what a CORS answer is addressed to.
  allowsOrigin: (origin: string) => boolean;
  // Whether a WebSocket upgrade is not a web page from somewhere this Server has no business with.
  allowsUpgrade: (origin: IncomingHttpHeaders['origin']) => boolean;
  report: (subject: string, value: string | undefined) => void;
}

/*
 * What a request on the loopback plain-HTTP door has to prove before it is served, now that arriving on that door proves nothing: a web page on a name that resolves to this computer arrives on it too (#1696).
 * Two things prove the Server Device. A token the Server issued, which lives in a file only a process on this computer can read (ADR-0044), and which the `argo` CLI and an Agent already send. Or, for the App's own browser page, which has no such file, the provenance a browser attaches itself and no page can forge.
 * The `Host` allowlist that used to sit here is gone and stays gone: it matched spellings of this computer's address, which is not an identity (ADR-0045).
 */
const allowsOrigin = (origin: string | undefined): boolean =>
  AllowedOrigin.safeParse(origin).success;

export function createRequestGuard(deps: RequestGuardDeps): RequestGuard {
  const report = createReporter();

  return {
    allowsRequest: (request) =>
      proves(deps, request) || refuse(report, request),
    allowsOrigin,
    // A browser sends Origin on every upgrade, so one the allowlist takes is this computer's own App, and a page elsewhere is turned away whatever name it dialled.
    allowsUpgrade: (origin) =>
      origin === undefined ||
      allowsOrigin(origin) ||
      refuseOrigin(report, origin),
    report,
  };
}

function proves(deps: RequestGuardDeps, { headers }: ProvingRequest): boolean {
  if (deps.recognisesToken(bearerToken(headers))) return true;

  if (headers.origin !== undefined) return allowsOrigin(headers.origin);

  return loadedFromAnotherOrigin(headers);
}

export const bearerToken = (headers: IncomingHttpHeaders): string | undefined =>
  headers.authorization?.replace(/^Bearer /, '');

/*
 * A media load — an `<img>`, a video, a Plugin asset — is not a CORS request, so a browser sends no `Origin` on it, and the App's own page has no token to send instead.
 * What a browser does attach is where the load came from, and the page this door keeps out reads the body it asks for, which only a same-origin request can do. So a load the browser itself calls cross-site, or one whose `Referer` is a page on this computer, is the App: `Sec-Fetch-Site` covers a page on a scheme that carries no `Referer`, and `Referer` covers a browser that sends no `Sec-Fetch-Site`.
 */
function loadedFromAnotherOrigin(headers: IncomingHttpHeaders): boolean {
  return (
    headers['sec-fetch-site'] === 'cross-site' ||
    allowsOrigin(refererOrigin(headers.referer))
  );
}

function refererOrigin(referer: string | undefined): string | undefined {
  if (referer === undefined) return undefined;

  try {
    return new URL(referer).origin;
  } catch {
    return undefined;
  }
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
