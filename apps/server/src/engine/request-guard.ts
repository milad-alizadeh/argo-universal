import type { IncomingHttpHeaders } from 'node:http';
import { z } from 'zod';

// No Origin (the native Apps), the desktop app, or a web App on this machine on any port.
const AllowedOrigin = z.union([
  z.undefined(),
  z.literal('app://app'),
  z.string().regex(/^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/),
]);

const headerExcerptLength = 100;

type RequestHeaders = Record<'host', IncomingHttpHeaders['host']>;
type UpgradeHeaders = RequestHeaders &
  Record<'origin', IncomingHttpHeaders['origin']>;

export interface RequestGuard {
  allowsRequest: (headers: RequestHeaders) => boolean;
  allowsUpgrade: (headers: UpgradeHeaders) => boolean;
  allowsOrigin: (origin: IncomingHttpHeaders['origin']) => boolean;
  report: (subject: string, value: string | undefined) => void;
}

// Checks Host on every request and Origin on every tRPC call, so a website cannot reach the Server (ADR 0002).
export function createRequestGuard(port: number): RequestGuard {
  const AllowedHost = z.enum([`127.0.0.1:${port}`, `localhost:${port}`]);
  let rejectedRequests = 0;

  // Logs and counts every rejected request, whichever check rejected it.
  const report = (subject: string, value: string | undefined): void => {
    rejectedRequests += 1;
    console.error(
      `engine: rejected ${subject} ${JSON.stringify(value?.slice(0, headerExcerptLength))} #${rejectedRequests}`,
    );
  };

  const allowsHost = (host: string | undefined): boolean => {
    if (AllowedHost.safeParse(host).success) return true;
    report('Host', host);
    return false;
  };

  const allowsOrigin = (origin: string | undefined): boolean => {
    if (AllowedOrigin.safeParse(origin).success) return true;
    report('Origin', origin);
    return false;
  };

  return {
    allowsRequest: (headers: RequestHeaders): boolean =>
      allowsHost(headers.host),
    allowsUpgrade: (headers: UpgradeHeaders): boolean =>
      allowsHost(headers.host) && allowsOrigin(headers.origin),
    allowsOrigin,
    report,
  };
}
