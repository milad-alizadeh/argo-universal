import type { IncomingHttpHeaders } from 'node:http';
import { createRejectionCounter } from '@repo/machine-log';
import { z } from 'zod';
import type { LocalNetworkAccess } from '../network-access';
import { requestHostAllowed } from '../rpc/request-host';

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
export function createRequestGuard(
  port: number,
  access: Pick<LocalNetworkAccess, 'enabled'>,
): RequestGuard {
  const report = createReporter();
  const allowsHost = allowHeader(allowedHost(port, access), 'Host', report);
  const allowsOrigin = allowHeader(AllowedOrigin, 'Origin', report);

  return {
    allowsRequest: (headers) => allowsHost(headers.host),
    allowsUpgrade: (headers) =>
      allowsHost(headers.host) && allowsOrigin(headers.origin),
    allowsOrigin,
    report,
  };
}

// Beyond loopback a Device reaches the Server by any name or address it has; ADR-0045 deletes this check for the handshake.
const allowedHost = (
  port: number,
  networkAccess: Pick<LocalNetworkAccess, 'enabled'>,
): z.ZodType =>
  z.custom<string>(
    (host) =>
      networkAccess.enabled ||
      (typeof host === 'string' && requestHostAllowed(port, host)),
  );

function createReporter(): RequestGuard['report'] {
  const rejections = createRejectionCounter('engine');

  return (subject, value): void => {
    rejections.report(
      `rejected ${subject} ${JSON.stringify(value?.slice(0, headerExcerptLength))}`,
    );
  };
}

function allowHeader(
  schema: z.ZodType,
  subject: string,
  report: RequestGuard['report'],
): RequestGuard['allowsOrigin'] {
  return (value): boolean => {
    if (schema.safeParse(value).success) return true;
    report(subject, value);

    return false;
  };
}
