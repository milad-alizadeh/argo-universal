import { readControlToken } from '@repo/engine/server-runtime';
import type { OnBeforeSendHeadersListenerDetails, Session } from 'electron';

// The Server's two routes that answer bytes rather than a procedure's result.
const byteRoutes = ['/blobs/', '/plugin-assets/'];

// A URL pattern cannot name a port, so this matches any port on this computer and the listener checks which one it was.
const loopbackUrls = ['http://127.0.0.1/*', 'http://localhost/*'];

export interface ServerTokenTarget {
  // The session whose requests get the token: the window's, which is the default one.
  session: Session;
  home: string;
  port: number;
}

// What the Server is to a load: where it listens, and the token that proves the load is this Device's.
export interface TokenisedServer {
  port: number;
  token: string;
}

type Headers = Record<string, string>;

type SentRequest = Pick<
  OnBeforeSendHeadersListenerDetails,
  'url' | 'requestHeaders'
>;

/*
 * The App's page loads a Blob and a Plugin asset as media, and an `<img>` is no CORS request: the browser sends no `Origin`, so the Server has nothing from the page but where it came from (#1696).
 * This process can read the user token the Server minted (ADR-0044), so it attaches it to those two routes on the way out. The renderer never sees the token, and no other route carries it: a token on every call would hand a page the owner's own scope over `operations.*`.
 */
export async function attachServerToken({
  session,
  home,
  port,
}: ServerTokenTarget): Promise<void> {
  const token = await readControlToken(home).catch((): undefined => undefined);

  if (token === undefined) return;
  session.webRequest.onBeforeSendHeaders(
    { urls: loopbackUrls },
    (details, callback): void => {
      callback({ requestHeaders: sentHeaders(details, { port, token }) });
    },
  );
}

// The headers this request goes out with: the token on the Server's two byte routes, and what the page sent on everything else.
export const sentHeaders = (
  details: SentRequest,
  server: TokenisedServer,
): Headers =>
  servesBytes(details.url, server.port)
    ? { ...details.requestHeaders, authorization: `Bearer ${server.token}` }
    : details.requestHeaders;

function servesBytes(url: string, port: number): boolean {
  const asked = new URL(url);

  return (
    asked.port === String(port) &&
    byteRoutes.some((route): boolean => asked.pathname.startsWith(route))
  );
}
