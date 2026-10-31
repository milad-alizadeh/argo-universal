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

export interface RequestGuard {
  allowsOrigin: (origin: IncomingHttpHeaders['origin']) => boolean;
  report: (subject: string, value: string | undefined) => void;
}

/*
 * Checks Origin on every tRPC call, so a web page in a browser cannot reach a Server it has no business with (ADR 0002).
 * The `Host` allowlist that used to sit beside it is gone: the front door and the handshake are the gate, and an allowlist of address spellings is a second half-check that drifts out of step with it (ADR-0045).
 */
export function createRequestGuard(): RequestGuard {
  const report = createReporter();

  return { allowsOrigin: allowHeader(AllowedOrigin, 'Origin', report), report };
}

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
