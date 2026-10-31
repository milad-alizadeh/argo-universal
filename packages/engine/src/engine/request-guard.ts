import type { IncomingHttpHeaders } from 'node:http';
import { createRejectionCounter } from '@repo/machine-log';
import { z } from 'zod';
import type { LocalNetworkAccess } from '../network-access';
import { requestHostAllowed } from '../rpc/request-host';
import { isLoopback } from './network-listener';

// No Origin (the native Apps), the desktop app, or a web App on this machine on any port.
const AllowedOrigin = z.union([
  z.undefined(),
  z.literal('app://app'),
  z.string().regex(/^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/),
]);

const headerExcerptLength = 100;

type RequestHeaders = Record<'host', IncomingHttpHeaders['host']> &
  Record<'remoteAddress', string | undefined>;

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
  const allowsOrigin = allowHeader(AllowedOrigin, 'Origin', report);
  const allowsHost = hostCheck(port, access, report);

  return {
    allowsRequest: (headers) => allowsHost(headers),
    allowsUpgrade: (headers) =>
      allowsHost(headers) && allowsOrigin(headers.origin),
    allowsOrigin,
    report,
  };
}

// A Device on the network arrives by whatever name or address it has, so while Local network access is on its Host is not matched (ADR-0045 deletes this check for the handshake). A Connection from loopback keeps the check on or off, or a web page could rebind a name to this computer.
function hostCheck(
  port: number,
  access: Pick<LocalNetworkAccess, 'enabled'>,
  report: RequestGuard['report'],
): (headers: RequestHeaders) => boolean {
  const allowsHost = allowHeader(AllowedHost(port), 'Host', report);

  return ({ host, remoteAddress }): boolean =>
    (access.enabled && !isLoopback(remoteAddress)) || allowsHost(host);
}

const AllowedHost = (port: number): z.ZodType =>
  z.custom<string>(
    (host) => typeof host === 'string' && requestHostAllowed(port, host),
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
