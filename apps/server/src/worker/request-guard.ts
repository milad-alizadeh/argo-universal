import { z } from 'zod';

// No Origin (the native Apps), the desktop app, or a web App on this machine on any port.
const AllowedOrigin = z.union([
  z.undefined(),
  z.literal('app://app'),
  z.string().regex(/^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/),
]);

const headerExcerptLength = 100;

export type RequestGuard = ReturnType<typeof createRequestGuard>;

// Checks Host on every request and Origin on WebSocket upgrades, so a website cannot reach the Server (ADR 0002).
export function createRequestGuard(port: number) {
  const AllowedHost = z.enum([`127.0.0.1:${port}`, `localhost:${port}`]);
  let rejectedRequests = 0;

  // Logs and counts every rejected request, whichever check rejected it.
  const report = (subject: string, value: string | undefined) => {
    rejectedRequests += 1;
    console.error(
      `worker: rejected ${subject} ${JSON.stringify(value?.slice(0, headerExcerptLength))} #${rejectedRequests}`,
    );
  };

  const allowsHost = (host: string | undefined) => {
    if (AllowedHost.safeParse(host).success) return true;
    report('Host', host);
    return false;
  };

  const allowsOrigin = (origin: string | undefined) => {
    if (AllowedOrigin.safeParse(origin).success) return true;
    report('Origin', origin);
    return false;
  };

  return {
    allowsRequest: (headers: { host: string | undefined }) =>
      allowsHost(headers.host),
    allowsUpgrade: (headers: {
      host: string | undefined;
      origin: string | undefined;
    }) => allowsHost(headers.host) && allowsOrigin(headers.origin),
    report,
  };
}
