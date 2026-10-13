import type { IncomingHttpHeaders } from 'node:http';
import { createRejectionCounter } from '@repo/machine-log';
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

const createReporter = (): RequestGuard['report'] => {
  const rejections = createRejectionCounter('engine');
  return (subject, value): void => {
    rejections.report(
      `rejected ${subject} ${JSON.stringify(value?.slice(0, headerExcerptLength))}`,
    );
  };
};

const allowsHeader =
  (
    schema: z.ZodType,
    report: RequestGuard['report'],
    subject: string,
  ): ((value: string | undefined) => boolean) =>
  (value): boolean => {
    if (schema.safeParse(value).success) return true;
    report(subject, value);
    return false;
  };

// Checks Host on every request and Origin on every tRPC call (ADR 0002).
export function createRequestGuard(port: number): RequestGuard {
  const report = createReporter();
  const hosts = z.enum([`127.0.0.1:${port}`, `localhost:${port}`]);
  const allowsHost = allowsHeader(hosts, report, 'Host');
  const allowsOrigin = allowsHeader(AllowedOrigin, report, 'Origin');
  return {
    allowsRequest: (headers): boolean => allowsHost(headers.host),
    allowsUpgrade: (headers): boolean =>
      allowsHost(headers.host) && allowsOrigin(headers.origin),
    allowsOrigin,
    report,
  };
}
