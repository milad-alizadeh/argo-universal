import type { IncomingMessage } from 'node:http';
import { z } from 'zod';

// No Origin (the native Apps), the desktop app, or a web App on this machine on any port.
const AllowedOrigin = z.union([
  z.undefined(),
  z.literal('app://app'),
  z.string().regex(/^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/),
]);

const headerExcerptLength = 100;

// Checks Host on every request and Origin on WebSocket upgrades, so a website cannot reach the Server (ADR 0002).
export function createRequestGuard(port: number) {
  const AllowedHost = z.enum([`127.0.0.1:${port}`, `localhost:${port}`]);
  let rejectedRequests = 0;

  const reject = (header: string, value: string | undefined) => {
    rejectedRequests += 1;
    console.error(
      `worker: rejected ${header} ${JSON.stringify(value?.slice(0, headerExcerptLength))} #${rejectedRequests}`,
    );
    return false;
  };

  const allowsHost = (request: IncomingMessage) =>
    AllowedHost.safeParse(request.headers.host).success ||
    reject('Host', request.headers.host);

  return {
    allowsRequest: allowsHost,
    allowsUpgrade: (request: IncomingMessage) =>
      allowsHost(request) &&
      (AllowedOrigin.safeParse(request.headers.origin).success ||
        reject('Origin', request.headers.origin)),
  };
}
